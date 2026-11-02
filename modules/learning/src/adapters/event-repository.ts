/** Portable repository for headless consumers; no browser or framework imports. */
import type { LearningRepository, AppendOptions, StoredRecords } from '../application/ports.js';
import type { Pack } from '../domain/course.js';
import { indexPack } from '../domain/catalog.js';
import { uuid } from '../domain/id.js';
import { apply, fold, emptyProjection, type Projection } from '../engine/projection.js';
import type { AnyEvent, EventType, EventPayloads, LearningEvent } from '../engine/events.js';
import { RULES_VERSION, PAYLOAD_SCHEMA_VERSION } from '../engine/events.js';
import { currentZone } from '../engine/time.js';

export interface RepositoryDocument extends StoredRecords {
	deviceId: string;
	meta: Record<string, unknown>;
	packs: Record<string, { content: Pack; contentHash: string }>;
}
export interface RecordPersistence {
	load(): Promise<RepositoryDocument | undefined>;
	/** Must replace the complete document atomically. */
	save(document: RepositoryDocument): Promise<void>;
}
export class MemoryPersistence implements RecordPersistence {
	private value?: RepositoryDocument;
	async load() {
		return structuredClone(this.value);
	}
	async save(document: RepositoryDocument) {
		this.value = structuredClone(document);
	}
}

export class EventRepository implements LearningRepository {
	private document: RepositoryDocument = {
		deviceId: uuid(),
		events: [],
		preferences: [],
		labSnapshots: [],
		meta: {},
		packs: {}
	};
	private projection = emptyProjection();
	private listeners = new Set<(state: Projection) => void>();
	private readonly ctx;
	constructor(
		private pack: Pack,
		private persistence: RecordPersistence = new MemoryPersistence()
	) {
		const ix = indexPack(pack);
		this.ctx = { teachingLesson: (id: string) => ix.teachingLesson.get(id) };
	}
	get state() {
		return this.projection;
	}
	get device() {
		return this.document.deviceId;
	}
	async init() {
		this.document = (await this.persistence.load()) ?? this.document;
		this.projection = fold(this.document.events, this.ctx);
		return this.projection;
	}
	private async commit(document: RepositoryDocument) {
		const projection = fold(document.events, this.ctx);
		await this.persistence.save(document);
		this.document = document;
		this.projection = projection;
		for (const listener of this.listeners) listener(this.projection);
	}
	async append<T extends EventType>(
		type: T,
		payload: EventPayloads[T],
		options: AppendOptions
	): Promise<LearningEvent<T>> {
		const document = structuredClone(this.document);
		const event = {
			eventId: uuid(),
			deviceId: this.device,
			sequence: document.events.reduce((max, event) => Math.max(max, event.sequence), 0) + 1,
			occurredAt: (options.now ?? new Date()).toISOString(),
			timezone: currentZone(),
			rulesVersion: RULES_VERSION,
			packId: this.pack.manifest.packId,
			packVersion: this.pack.manifest.packVersion,
			entityId: options.entityId,
			entityVersion: options.entityVersion ?? 1,
			sessionId: options.sessionId,
			type,
			payload,
			payloadSchemaVersion: PAYLOAD_SCHEMA_VERSION
		} as LearningEvent<T>;
		document.events.push(event as AnyEvent);
		if (type === 'PREFERENCE_CHANGED') {
			const value = payload as EventPayloads['PREFERENCE_CHANGED'];
			document.preferences = [...document.preferences.filter((p) => p.key !== value.key), value];
		}
		if (type === 'LAB_PARAMETER_CHANGED') {
			const value = payload as EventPayloads['LAB_PARAMETER_CHANGED'];
			document.labSnapshots = [
				...document.labSnapshots.filter((l) => l.labId !== value.labId),
				{
					labId: value.labId,
					params: value.params,
					updatedAt: event.occurredAt
				}
			];
		}
		// Reduce before persistence so failed application never leaves an unreplayable event on disk.
		apply(structuredClone(this.projection), event as AnyEvent, this.ctx);
		await this.commit(document);
		return event;
	}
	async allEvents() {
		return structuredClone(this.document.events).sort((a, b) => a.sequence - b.sequence);
	}
	async getMeta<T>(key: string) {
		return structuredClone(this.document.meta[key]) as T | undefined;
	}
	async setMeta(key: string, value: unknown) {
		const document = structuredClone(this.document);
		document.meta[key] = value;
		await this.commit(document);
	}
	subscribe(listener: (state: Projection) => void) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	async readRecords(): Promise<StoredRecords> {
		const { events, preferences, labSnapshots } = this.document;
		return structuredClone({ events, preferences, labSnapshots });
	}
	async importRecords(records: StoredRecords, mode: 'merge' | 'replace') {
		const document = structuredClone(this.document);
		if (mode === 'replace') {
			document.events = [];
			document.preferences = [];
			document.labSnapshots = [];
		}
		const ids = new Set(document.events.map((e) => e.eventId));
		const fresh = records.events.filter((e) => !ids.has(e.eventId));
		document.events.push(...fresh);
		if (fresh.length || mode === 'replace') {
			for (const preference of records.preferences)
				document.preferences = [
					...document.preferences.filter((p) => p.key !== preference.key),
					preference
				];
			for (const lab of records.labSnapshots)
				document.labSnapshots = [
					...document.labSnapshots.filter((l) => l.labId !== lab.labId),
					lab
				];
		}
		await this.commit(document);
		return fresh.length;
	}
	async installPack(pack: Pack, contentHash: string) {
		const key = `${pack.manifest.packId}@${pack.manifest.packVersion}`;
		if (this.document.packs[key]) return false;
		const document = structuredClone(this.document);
		document.packs[key] = { content: pack, contentHash };
		await this.commit(document);
		return true;
	}
	async erase() {
		await this.commit({
			deviceId: uuid(),
			events: [],
			preferences: [],
			labSnapshots: [],
			meta: {},
			packs: {}
		});
	}
	close() {
		this.listeners.clear();
	}
}
