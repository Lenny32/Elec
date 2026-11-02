/**
 * Composition root + reactive UI adapter (ADR 0003): the UI only talks to the learning module
 * through its typed in-process API. This file picks the concrete course (bundled core pack)
 * and storage (IndexedDB journal), and exposes the latest snapshot as reactive state.
 */
import {
	createLearningAPI,
	indexPack,
	CourseValidationError,
	type LearningAPI,
	type LearningSnapshot,
	type Pack,
	type Operation,
	type Input,
	type Output
} from '#learning';
import type { PackIndex } from '#learning/domain/catalog.ts';
import { Journal } from '#learning/data/journal.ts';
import { assembleCorePack } from '#learning/content/packs/core/loader.ts';

export type StartupFailure =
	| { kind: 'storage'; message: string }
	| { kind: 'pack'; message: string; issues: { path: string; message: string }[] }
	| { kind: 'unknown'; message: string };

/** Operations that only read; everything else changes the journal and triggers a refresh. */
const READ_ONLY = new Set<Operation>([
	'catalog',
	'snapshot',
	'selectPractice',
	'selectReview',
	'allEvents',
	'exportData',
	'exportCSV',
	'inspectImport'
]);

class LearningStore {
	status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	failure = $state.raw<StartupFailure | null>(null);
	pack = $state.raw<Pack>(null as unknown as Pack);
	ix = $state.raw<PackIndex>(null as unknown as PackIndex);
	snapshot = $state.raw<LearningSnapshot>(null as unknown as LearningSnapshot);

	#api: LearningAPI | null = null;
	#starting: Promise<void> | null = null;
	#unsubscribe: (() => void) | null = null;

	get views() {
		return this.snapshot.views;
	}
	get projection() {
		return this.snapshot.projection;
	}

	start(): Promise<void> {
		this.#starting ??= this.#start();
		return this.#starting;
	}

	async #start() {
		this.status = 'loading';
		this.failure = null;
		try {
			if (typeof indexedDB === 'undefined') throw new StorageError('IndexedDB is not available');
			const api = await createLearningAPI({ load: async () => assembleCorePack() }, (pack) => {
				const ix = indexPack(pack);
				return new Journal({ teachingLesson: (id) => ix.teachingLesson.get(id) }, pack.manifest);
			});
			this.#api = api;
			const pack = await api.call('catalog', {});
			this.pack = pack;
			this.ix = indexPack(pack);
			this.snapshot = await api.call('snapshot', {});
			// Another tab wrote to the journal → pull a fresh snapshot.
			this.#unsubscribe = api.subscribe?.(() => void this.refresh()) ?? null;
			this.status = 'ready';
		} catch (error) {
			this.#starting = null;
			this.status = 'error';
			if (error instanceof CourseValidationError)
				this.failure = { kind: 'pack', message: error.message, issues: error.issues };
			else if (
				error instanceof StorageError ||
				(error instanceof Error && /indexeddb|database|quota|dexie|open/i.test(error.message))
			)
				this.failure = { kind: 'storage', message: error.message };
			else this.failure = { kind: 'unknown', message: String(error) };
		}
	}

	async refresh() {
		if (!this.#api) return;
		this.snapshot = await this.#api.call('snapshot', {});
	}

	async call<K extends Operation>(op: K, input: Input<K>): Promise<Output<K>> {
		if (!this.#api) await this.start();
		if (!this.#api) throw new Error('Learning API unavailable');
		const out = await this.#api.call(op, input);
		if (!READ_ONLY.has(op)) await this.refresh();
		return out;
	}

	close() {
		this.#unsubscribe?.();
		this.#api?.close();
		this.#api = null;
		this.#starting = null;
		this.status = 'idle';
	}
}

class StorageError extends Error {}

export const learning = new LearningStore();

/** Random id for a learning session (one practice run, one lesson visit…). */
export function newId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36)}`
	);
}
