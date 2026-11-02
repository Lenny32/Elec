import {
	EXPORT_FORMAT_VERSION,
	MAX_IMPORT_BYTES,
	ExportSchema,
	type ExportFile,
	type ImportCheck,
	type ImportPreview
} from '../domain/backup-format.js';
/**
 * Export / import of all local learning records (SPEC §8). Import never executes or trusts text:
 * it is size-limited, schema-validated, checksum-verified, de-duplicated by eventId and atomic.
 */

import type { LearningRepository } from './ports.js';
const META = { lastExportAt: 'lastExportAt' };
import type { AnyEvent } from '../engine/events.js';

/** Canonical JSON (sorted keys) so checksums are stable across engines. */
export function canonicalJSON(v: unknown): string {
	if (v === null || typeof v !== 'object') return JSON.stringify(v);
	if (Array.isArray(v)) return `[${v.map(canonicalJSON).join(',')}]`;
	const o = v as Record<string, unknown>;
	return `{${Object.keys(o)
		.filter((k) => o[k] !== undefined)
		.sort()
		.map((k) => `${JSON.stringify(k)}:${canonicalJSON(o[k])}`)
		.join(',')}}`;
}

export async function sha256(text: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildExport(
	j: LearningRepository,
	appVersion: string,
	packs: ExportFile['packs']
): Promise<ExportFile> {
	const { events, preferences, labSnapshots } = await j.readRecords();
	const body = {
		formatVersion: EXPORT_FORMAT_VERSION as 1,
		app: 'circuitpath' as const,
		exportedAt: new Date().toISOString(),
		appVersion,
		deviceId: j.device,
		packs,
		events: events as unknown as ExportFile['events'],
		preferences,
		labSnapshots
	};
	return { ...body, checksum: await sha256(canonicalJSON(body.events)) };
}

export async function markExported(j: LearningRepository): Promise<void> {
	await j.setMeta(META.lastExportAt, new Date().toISOString());
}

export async function inspectImport(
	j: LearningRepository,
	text: string,
	knownPacks: string[]
): Promise<ImportCheck> {
	if (new Blob([text]).size > MAX_IMPORT_BYTES) return { ok: false, error: 'too_large' };
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { ok: false, error: 'not_json' };
	}
	const parsed = ExportSchema.safeParse(raw);
	if (!parsed.success)
		return {
			ok: false,
			error: 'invalid_schema',
			detail: parsed.error.issues
				.slice(0, 3)
				.map((i) => `${i.path.join('.')}: ${i.message}`)
				.join('; ')
		};
	const file = parsed.data;
	if ((await sha256(canonicalJSON(file.events))) !== file.checksum)
		return { ok: false, error: 'checksum_mismatch' };
	const ids = new Set(file.events.map((e) => e.eventId));
	if (ids.size !== file.events.length) return { ok: false, error: 'duplicate_ids' };
	const existing = new Set((await j.allEvents()).map((e) => e.eventId));
	const newEvents = file.events.filter((e) => !existing.has(e.eventId)).length;
	const times = file.events.map((e) => e.occurredAt).sort();
	return {
		ok: true,
		preview: {
			file,
			total: file.events.length,
			newEvents,
			duplicates: file.events.length - newEvents,
			firstAt: times[0],
			lastAt: times[times.length - 1],
			sourceDeviceId: file.deviceId,
			unknownPacks: file.packs
				.map((p) => `${p.packId}@${p.packVersion}`)
				.filter((k) => !knownPacks.includes(k))
		}
	};
}

/** Applies an inspected import atomically, then rebuilds projections from the merged log. */
export async function applyImport(
	j: LearningRepository,
	preview: ImportPreview,
	mode: 'merge' | 'replace'
): Promise<number> {
	return j.importRecords(
		{
			events: preview.file.events as unknown as AnyEvent[],
			preferences: preview.file.preferences,
			labSnapshots: preview.file.labSnapshots
		},
		mode
	);
}

/** Human-readable CSV of learning history (separate from the JSON backup). */
export function historyCSV(events: AnyEvent[]): string {
	const rows = [
		['occurredAt', 'timezone', 'type', 'entityId', 'detail', 'correct', 'hintsUsed', 'packVersion']
	];
	for (const e of events) {
		const p = e.payload as unknown as Record<string, unknown>;
		const detail = (p.exerciseId ?? p.lessonId ?? p.examId ?? p.labId ?? p.key ?? '') as string;
		rows.push([
			e.occurredAt,
			e.timezone,
			e.type,
			e.entityId,
			detail,
			'correct' in p ? String(p.correct) : '',
			'hintsUsed' in p ? String(p.hintsUsed) : '',
			e.packVersion
		]);
	}
	return rows
		.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
		.join('\n');
}

export { EXPORT_FORMAT_VERSION, MAX_IMPORT_BYTES, ExportSchema } from '../domain/backup-format.js';
export type { ExportFile, ImportCheck, ImportPreview } from '../domain/backup-format.js';
