import type { Pack } from '../domain/course.js';
import type { Projection } from '../domain/learning-state.js';
import type { AnyEvent, EventPayloads, EventType, LearningEvent } from '../domain/events.js';

export interface CourseSource {
	/** Implementations can read a bundle, file, database, or another service. */
	load(): Promise<unknown>;
}

export interface AppendOptions {
	entityId: string;
	entityVersion?: number;
	sessionId: string;
	now?: Date;
}

export interface StoredRecords {
	events: AnyEvent[];
	preferences: { key: string; value: unknown }[];
	labSnapshots: { labId: string; params: Record<string, number>; updatedAt: string }[];
}

/** A repository belongs to one learner and course; all writes must be atomic. */
export interface LearningRepository {
	readonly state: Projection;
	readonly device: string;
	init(): Promise<Projection>;
	append<T extends EventType>(
		type: T,
		payload: EventPayloads[T],
		options: AppendOptions
	): Promise<LearningEvent<T>>;
	allEvents(): Promise<AnyEvent[]>;
	getMeta<T>(key: string): Promise<T | undefined>;
	setMeta(key: string, value: unknown): Promise<void>;
	subscribe(listener: (state: Projection) => void): () => void;
	readRecords(): Promise<StoredRecords>;
	importRecords(records: StoredRecords, mode: 'merge' | 'replace'): Promise<number>;
	installPack(pack: Pack, contentHash: string): Promise<boolean>;
	erase(): Promise<void>;
	close(): void;
}

export type RepositoryFactory = (pack: Pack) => LearningRepository;
