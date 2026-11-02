/** IndexedDB schema `circuitpath_v1` (SPEC §8) via Dexie, behind repository functions. */
import Dexie, { type EntityTable } from 'dexie';
import type { AnyEvent } from '../engine/events.js';
import type { ConceptProjection, LessonProjection, Projection } from '../engine/projection.js';

export interface PackRow {
	key: string; // packId@version
	packId: string;
	packVersion: string;
	contentHash: string;
	installedAt: string;
	state: 'active' | 'retained';
	content: unknown;
}

export interface AttemptRow {
	attemptId: string; // = eventId of the submission
	exerciseId: string;
	exerciseVersion: number;
	conceptIds: string[];
	occurredAt: string;
	correct: boolean;
	independent: boolean;
	contextKind: string;
	packVersion: string;
}

export interface ReviewRow {
	conceptId: string;
	dueAt: string;
	reviewStage: number;
	needsWork: boolean;
}

export interface KV<T = unknown> {
	key: string;
	value: T;
}

export interface MigrationRow {
	migrationId: string;
	startedAt: string;
	completedAt?: string;
	status: 'running' | 'done' | 'failed';
	detail?: string;
}

export type CircuitDB = Dexie & {
	contentPacks: EntityTable<PackRow, 'key'>;
	events: EntityTable<AnyEvent, 'eventId'>;
	conceptState: EntityTable<ConceptProjection, 'conceptId'>;
	lessonState: EntityTable<LessonProjection, 'lessonId'>;
	attempts: EntityTable<AttemptRow, 'attemptId'>;
	reviewQueue: EntityTable<ReviewRow, 'conceptId'>;
	labSnapshots: EntityTable<
		{ labId: string; params: Record<string, number>; updatedAt: string },
		'labId'
	>;
	preferences: EntityTable<KV, 'key'>;
	meta: EntityTable<KV, 'key'>;
	migrations: EntityTable<MigrationRow, 'migrationId'>;
};

export const DB_NAME = 'circuitpath_v1';

export function openDB(name = DB_NAME): CircuitDB {
	const db = new Dexie(name) as CircuitDB;
	db.version(1).stores({
		contentPacks: 'key, packId',
		events: 'eventId, sequence, occurredAt, entityId, sessionId, type',
		conceptState: 'conceptId',
		lessonState: 'lessonId',
		attempts: 'attemptId, exerciseId, *conceptIds, occurredAt',
		reviewQueue: 'conceptId, dueAt',
		labSnapshots: 'labId',
		preferences: 'key',
		meta: 'key',
		migrations: 'migrationId'
	});
	return db;
}

export const META = {
	deviceId: 'deviceId',
	sequence: 'sequence',
	projection: 'projection',
	lastExportAt: 'lastExportAt',
	schemaVersion: 'schemaVersion',
	onboardedAt: 'onboardedAt',
	persistRequested: 'persistRequested'
} as const;

export type ProjectionSnapshot = {
	lastEventId?: string;
	eventCount: number;
	projection: Projection;
};
