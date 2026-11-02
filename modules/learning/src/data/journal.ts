/**
 * Event journal repository (SPEC §7.5, §8).
 * - Each append writes the event AND the updated projections in ONE IndexedDB transaction.
 * - Single-writer across tabs with Web Locks; optimistic revision check (lastEventId) as fallback.
 * - On startup or mismatch, projections are rebuilt from the event log.
 */
import { openDB, META, type CircuitDB, type ProjectionSnapshot } from './db.js';
import type { AnyEvent, EventPayloads, EventType, LearningEvent } from '../engine/events.js';
import { PAYLOAD_SCHEMA_VERSION, RULES_VERSION } from '../engine/events.js';
import { apply, fold, type Projection, type ReducerContext } from '../engine/projection.js';
import { currentZone } from '../engine/time.js';
import type { LearningRepository, StoredRecords } from '../application/ports.js';
import type { Pack } from '../domain/course.js';

export interface AppendOptions {
	entityId: string;
	entityVersion?: number;
	sessionId: string;
	/** Injected clock (tests). */
	now?: Date;
}

export interface JournalInfo {
	packId: string;
	packVersion: string;
}

const LOCK = 'circuitpath-journal-writer';
const CHANNEL = 'circuitpath-journal';

export function uuid(): string {
	return (
		globalThis.crypto?.randomUUID?.() ??
		'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
		})
	);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
	const locks = (globalThis.navigator as Navigator | undefined)?.locks;
	if (locks?.request) return locks.request(LOCK, { mode: 'exclusive' }, fn) as Promise<T>;
	return fn();
}

export class Journal implements LearningRepository {
	readonly db: CircuitDB;
	private projection!: Projection;
	private deviceId!: string;
	private listeners = new Set<(p: Projection) => void>();
	private channel?: BroadcastChannel;

	constructor(
		private ctx: ReducerContext,
		private info: JournalInfo,
		dbName?: string
	) {
		this.db = openDB(dbName);
	}

	get state(): Projection {
		return this.projection;
	}

	get device(): string {
		return this.deviceId;
	}

	/** Opens the DB, ensures device id, loads or rebuilds projections. */
	async init(): Promise<Projection> {
		await this.db.open();
		this.deviceId = await this.db.transaction('rw', this.db.meta, async () => {
			const row = await this.db.meta.get(META.deviceId);
			if (row) return row.value as string;
			const id = uuid();
			await this.db.meta.put({ key: META.deviceId, value: id });
			await this.db.meta.put({ key: META.schemaVersion, value: 1 });
			return id;
		});
		await this.reload();
		if (typeof BroadcastChannel !== 'undefined') {
			this.channel = new BroadcastChannel(CHANNEL);
			this.channel.onmessage = () => void this.reload();
		}
		return this.projection;
	}

	/** Loads the snapshot; if missing/stale/from another rules version, rebuilds from the log. */
	async reload(): Promise<Projection> {
		const [snap, count, last] = await Promise.all([
			this.db.meta.get(META.projection) as Promise<
				{ key: string; value: ProjectionSnapshot } | undefined
			>,
			this.db.events.count(),
			this.db.events.orderBy('sequence').last()
		]);
		const s = snap?.value;
		const valid =
			s &&
			s.eventCount === count &&
			s.lastEventId === last?.eventId &&
			s.projection?.rulesVersion === RULES_VERSION;
		this.projection = valid ? s!.projection : await this.rebuild();
		this.emit();
		return this.projection;
	}

	/** Full rebuild from the immutable event log; rewrites all projection stores atomically. */
	async rebuild(): Promise<Projection> {
		const events = await this.db.events.toArray();
		const p = fold(events, this.ctx);
		await this.db.transaction(
			'rw',
			[
				this.db.meta,
				this.db.conceptState,
				this.db.lessonState,
				this.db.attempts,
				this.db.reviewQueue,
				this.db.labSnapshots
			],
			async () => {
				await Promise.all([
					this.db.conceptState.clear(),
					this.db.lessonState.clear(),
					this.db.attempts.clear(),
					this.db.reviewQueue.clear()
				]);
				await this.writeProjectionRows(p, events);
				await this.db.meta.put({
					key: META.projection,
					value: { lastEventId: p.lastEventId, eventCount: p.eventCount, projection: p }
				});
			}
		);
		return p;
	}

	private async writeProjectionRows(p: Projection, events: AnyEvent[]) {
		await this.db.conceptState.bulkPut(Object.values(p.concepts));
		await this.db.lessonState.bulkPut(Object.values(p.lessons));
		await this.db.reviewQueue.bulkPut(
			Object.values(p.concepts)
				.filter((c) => c.masteredAt && c.dueAt)
				.map((c) => ({
					conceptId: c.conceptId,
					dueAt: c.dueAt!,
					reviewStage: c.reviewStage,
					needsWork: c.needsWork
				}))
		);
		const attempts = events.flatMap((e) =>
			e.type === 'ANSWER_SUBMITTED' || e.type === 'REVIEW_SUBMITTED'
				? [
						{
							attemptId: e.eventId,
							exerciseId: e.payload.exerciseId,
							exerciseVersion: e.payload.exerciseVersion,
							conceptIds: e.payload.conceptIds,
							occurredAt: e.occurredAt,
							correct: e.payload.correct,
							independent: e.payload.independent,
							contextKind: e.payload.context.kind,
							packVersion: e.packVersion
						}
					]
				: []
		);
		if (attempts.length) await this.db.attempts.bulkPut(attempts);
	}

	/** Appends one event atomically with its projection update. Never silently drops an event. */
	async append<T extends EventType>(
		type: T,
		payload: EventPayloads[T],
		opts: AppendOptions
	): Promise<LearningEvent<T>> {
		return withLock(async () => {
			const db = this.db;
			const event = await db.transaction(
				'rw',
				[
					db.events,
					db.meta,
					db.conceptState,
					db.lessonState,
					db.attempts,
					db.reviewQueue,
					db.labSnapshots,
					db.preferences
				],
				async () => {
					const seqRow = await db.meta.get(META.sequence);
					const sequence = ((seqRow?.value as number | undefined) ?? 0) + 1;
					const snap = (await db.meta.get(META.projection))?.value as
						ProjectionSnapshot | undefined;
					// Optimistic revision check: another tab may have written since we loaded.
					let base = this.projection;
					if ((snap?.lastEventId ?? undefined) !== (base.lastEventId ?? undefined)) {
						base = fold(await db.events.toArray(), this.ctx);
					}
					const now = opts.now ?? new Date();
					const ev = {
						eventId: uuid(),
						deviceId: this.deviceId,
						sequence,
						occurredAt: now.toISOString(),
						timezone: currentZone(),
						rulesVersion: RULES_VERSION,
						packId: this.info.packId,
						packVersion: this.info.packVersion,
						entityId: opts.entityId,
						entityVersion: opts.entityVersion ?? 1,
						sessionId: opts.sessionId,
						type,
						payload,
						payloadSchemaVersion: PAYLOAD_SCHEMA_VERSION
					} as LearningEvent<T>;
					const next = apply(structuredClone(base), ev as unknown as AnyEvent, this.ctx);
					await db.events.add(ev as unknown as AnyEvent);
					await db.meta.put({ key: META.sequence, value: sequence });
					await this.writeProjectionRows(next, [ev as unknown as AnyEvent]);
					if (type === 'LAB_PARAMETER_CHANGED') {
						const lp = payload as EventPayloads['LAB_PARAMETER_CHANGED'];
						await db.labSnapshots.put({
							labId: lp.labId,
							params: lp.params,
							updatedAt: ev.occurredAt
						});
					}
					if (type === 'PREFERENCE_CHANGED') {
						const pp = payload as EventPayloads['PREFERENCE_CHANGED'];
						await db.preferences.put({ key: pp.key, value: pp.value });
					}
					await db.meta.put({
						key: META.projection,
						value: { lastEventId: next.lastEventId, eventCount: next.eventCount, projection: next }
					});
					// Only commit the in-memory state once the transaction body succeeded.
					return { ev, next };
				}
			);
			this.projection = event.next;
			this.emit();
			this.channel?.postMessage('changed');
			return event.ev;
		});
	}

	async allEvents(): Promise<AnyEvent[]> {
		return this.db.events.orderBy('sequence').toArray();
	}

	async getMeta<T>(key: string): Promise<T | undefined> {
		return (await this.db.meta.get(key))?.value as T | undefined;
	}

	async setMeta(key: string, value: unknown): Promise<void> {
		await this.db.meta.put({ key, value });
	}

	subscribe(fn: (p: Projection) => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit() {
		for (const l of this.listeners) l(this.projection);
	}

	async readRecords(): Promise<StoredRecords> {
		const [events, preferences, labSnapshots] = await Promise.all([
			this.allEvents(),
			this.db.preferences.toArray(),
			this.db.labSnapshots.toArray()
		]);
		return { events, preferences, labSnapshots };
	}

	async importRecords(records: StoredRecords, mode: 'merge' | 'replace'): Promise<number> {
		const db = this.db;
		const incoming = records.events;
		let added = 0;
		await db.transaction('rw', [db.events, db.preferences, db.labSnapshots, db.meta], async () => {
			if (mode === 'replace') {
				await db.events.clear();
				await db.preferences.clear();
				await db.labSnapshots.clear();
			}
			const existing = new Set((await db.events.toCollection().primaryKeys()) as string[]);
			const fresh = incoming.filter((e) => !existing.has(e.eventId));
			// Imported events from this device keep their sequence; foreign ones are appended after ours.
			let maxSeq = ((await db.meta.get(META.sequence))?.value as number | undefined) ?? 0;
			for (const e of fresh) maxSeq = Math.max(maxSeq, e.deviceId === this.device ? e.sequence : 0);
			await db.events.bulkAdd(fresh);
			added = fresh.length;
			await db.meta.put({
				key: META.sequence,
				value: Math.max(maxSeq, ...(await db.events.toArray()).map((e) => e.sequence))
			});
			if (mode === 'replace' || added) {
				for (const p of records.preferences) await db.preferences.put(p);
				for (const l of records.labSnapshots) await db.labSnapshots.put(l);
			}
			await db.meta.delete(META.projection);
		});
		await this.reload();
		return added;
	}

	async installPack(pack: Pack, contentHash: string): Promise<boolean> {
		const { packId, packVersion } = pack.manifest;
		const key = `${packId}@${packVersion}`;
		return this.db.transaction('rw', this.db.contentPacks, async () => {
			if (await this.db.contentPacks.get(key)) return false;
			await this.db.contentPacks.put({
				key,
				packId,
				packVersion,
				contentHash,
				installedAt: new Date().toISOString(),
				state: 'active',
				content: pack
			});
			return true;
		});
	}

	async erase(): Promise<void> {
		this.close();
		await this.db.delete();
	}

	close() {
		this.channel?.close();
		this.db.close();
	}
}
