import { indexPack, chapterConcepts } from '../domain/catalog.js';
import { validatePack } from '../domain/validate-course.js';
import {
	canonicalJSON,
	sha256,
	buildExport,
	inspectImport,
	applyImport,
	historyCSV
} from './backup.js';
import { uuid } from '../domain/id.js';
import {
	chapterProgress,
	conceptStatus,
	lessonState,
	examAvailability,
	examPassed,
	attemptsOf,
	dueConcepts,
	nextLesson,
	missingChapterPrerequisites
} from '../engine/status.js';
import { selectPractice, selectReview } from '../engine/selection.js';
import { LearningWorkflows } from './workflows.js';
import type { CourseSource, RepositoryFactory } from './ports.js';
import type {
	LearningAPI,
	LearningSnapshot,
	LearningViews,
	Operation,
	Input,
	Output
} from '../api/contracts.js';
import { parseInput } from '../api/validation.js';
import { ApplicationError } from './errors.js';

export class CourseValidationError extends Error {
	constructor(readonly issues: { path: string; message: string }[]) {
		super('Course validation failed');
	}
}

/** The composition root chooses a course and storage. No Svelte or browser globals. */
export async function createLearningAPI(
	source: CourseSource,
	repository: RepositoryFactory,
	options: { now?: () => Date; appSession?: string } = {}
): Promise<LearningAPI> {
	const raw = await source.load();
	const validated = validatePack(raw);
	if (!validated.ok) throw new CourseValidationError(validated.issues);
	const pack = validated.pack;
	const ix = indexPack(pack);
	const contentHash = await sha256(canonicalJSON(pack));
	const store = repository(pack);
	const now = options.now ?? (() => new Date());
	const appSession = options.appSession ?? uuid();
	const workflows = new LearningWorkflows(ix, store, appSession);
	try {
		await store.init();
		if (await store.installPack(pack, contentHash)) {
			const { packId, packVersion } = pack.manifest;
			await store.append(
				'PACK_INSTALLED',
				{ packId, packVersion, contentHash },
				{
					entityId: `${packId}@${packVersion}`,
					sessionId: appSession
				}
			);
		}
	} catch (error) {
		store.close();
		throw error;
	}

	async function snapshot(): Promise<LearningSnapshot> {
		const p = store.state;
		const generatedAt = now().toISOString();
		const views: LearningViews = {
			chapters: Object.fromEntries(pack.chapters.map((c) => [c.id, chapterProgress(ix, p, c.id)])),
			missingPrerequisites: Object.fromEntries(
				pack.chapters.map((c) => [c.id, missingChapterPrerequisites(ix, p, c.id)])
			),
			concepts: Object.fromEntries(
				pack.concepts.map((c) => [c.id, conceptStatus(ix, p, c.id, generatedAt)])
			),
			lessons: Object.fromEntries(pack.lessons.map((l) => [l.id, lessonState(ix, p, l.id)])),
			exams: Object.fromEntries(pack.exams.map((e) => [e.id, examAvailability(ix, p, e.id)])),
			passedExams: Object.fromEntries(pack.exams.map((e) => [e.id, examPassed(p, e.id)])),
			attempts: Object.fromEntries(pack.exams.map((e) => [e.id, attemptsOf(p, e.id)])),
			nextLessonId: nextLesson(ix, p),
			dueConceptIds: dueConcepts(ix, p, generatedAt),
			examsToConsolidate: pack.exams
				.flatMap((e) => {
					const done = attemptsOf(p, e.id).filter((a) => a.completedAt);
					const last = done.at(-1);
					return last && !done.some((a) => a.passed) ? [last] : [];
				})
				.sort((a, b) => b.completedAt!.localeCompare(a.completedAt!)),
			masteredCount: pack.concepts.filter((c) => p.concepts[c.id]?.masteredAt).length
		};
		return {
			projection: p,
			views,
			generatedAt,
			contentHash,
			lastExportAt: await store.getMeta<string>('lastExportAt')
		};
	}

	// Every request goes through runtime validation, including in-process calls.
	async function dispatch<K extends Operation>(op: K, rawInput: Input<K>): Promise<Output<K>> {
		const input = parseInput(op, rawInput);
		// A mapped handler table preserves command/result types without untyped event APIs.
		const handlers: { [P in Operation]: (input: Input<P>) => Promise<Output<P>> } = {
			catalog: async () => pack,
			snapshot,
			startLesson: async (i) => {
				await workflows.startLesson(i.lessonId);
				return null;
			},
			viewCard: async (i) => {
				await workflows.viewCard(i.lessonId, i.cardId, i.cardIndex);
				return null;
			},
			completeLesson: async (i) => {
				await workflows.completeLesson(i.lessonId);
				return null;
			},
			submit: (i) => workflows.submit(i.exerciseId, i.response, i.context),
			useHint: async (i) => {
				await workflows.useHint(i.exerciseId, i.presentationId, i.hintIndex, i.sessionId);
				return null;
			},
			revealSolution: async (i) => {
				await workflows.revealSolution(i.exerciseId, i.presentationId, i.sessionId);
				return null;
			},
			startExam: async (i) => (await workflows.startExam(i.examId)) ?? null,
			finishExam: async (i) => {
				await workflows.finishExam(i.attemptId);
				return null;
			},
			startDrill: async (i) => (await workflows.startDrill(i.attemptId)) ?? null,
			selectPractice: async (i) => {
				for (const id of i.conceptIds)
					if (!ix.concepts.has(id)) throw new ApplicationError('not_found', 'Unknown concept');
				let concepts = i.conceptIds;
				if (i.chapterId) {
					if (!ix.chapters.has(i.chapterId))
						throw new ApplicationError('not_found', 'Unknown chapter');
					const all = chapterConcepts(ix, i.chapterId);
					const open = all.filter((id) => !store.state.concepts[id]?.masteredAt);
					concepts = open.length ? open : all;
				}
				return selectPractice(ix, store.state, concepts, i.perConcept, i.sessionId);
			},
			selectReview: async (i) =>
				selectReview(ix, store.state, now().toISOString(), i.max, i.sessionId),
			labChanged: async (i) => {
				const lab = ix.labs.get(i.labId);
				if (!lab) throw new ApplicationError('not_found', 'Unknown lab');
				if (
					Object.keys(i.params).length !== lab.params.length ||
					lab.params.some(
						(p) =>
							!Object.hasOwn(i.params, p.key) || i.params[p.key] < p.min || i.params[p.key] > p.max
					)
				)
					throw new ApplicationError(
						'invalid_request',
						'Lab parameters must match the course definition and ranges'
					);
				await store.append(
					'LAB_PARAMETER_CHANGED',
					{ labId: lab.id, labVersion: lab.version, params: i.params },
					{
						entityId: lab.id,
						entityVersion: lab.version,
						sessionId: appSession
					}
				);
				return null;
			},
			setPreference: async (i) => {
				await store.append('PREFERENCE_CHANGED', i, {
					entityId: `pref.${i.key}`,
					sessionId: appSession
				});
				return null;
			},
			allEvents: () => store.allEvents(),
			exportData: () =>
				buildExport(store, '1.0.0', [
					{ packId: pack.manifest.packId, packVersion: pack.manifest.packVersion, contentHash }
				]),
			exportCSV: async () => historyCSV(await store.allEvents()),
			inspectImport: (i) =>
				inspectImport(store, i.text, [`${pack.manifest.packId}@${pack.manifest.packVersion}`]),
			importData: async (i) => {
				// Revalidate on commit; a caller-supplied preview is never trusted.
				const check = await inspectImport(store, i.text, [
					`${pack.manifest.packId}@${pack.manifest.packVersion}`
				]);
				if (!check.ok)
					throw new ApplicationError('invalid_request', `Invalid import: ${check.error}`);
				if (check.preview.unknownPacks.length)
					throw new ApplicationError(
						'invalid_request',
						'Import contains an uninstalled course version'
					);
				const count = await applyImport(store, check.preview, i.mode);
				await store.append(
					'DATA_IMPORTED',
					{ mode: i.mode, importedCount: count, sourceDeviceId: check.preview.sourceDeviceId },
					{ entityId: 'import', sessionId: appSession }
				);
				return count;
			},
			markExported: async () => {
				await store.setMeta('lastExportAt', now().toISOString());
				return null;
			},
			eraseAll: async () => {
				await store.erase();
				return null;
			}
		};
		return handlers[op](input);
	}

	let pending: Promise<unknown> = Promise.resolve();
	let closed = false;
	return {
		call(op, input) {
			if (closed) return Promise.reject(new Error('Learning API is closed'));
			// Serialize workflows, not just appends: exam starts and answer checks need the latest state.
			const result = pending
				.then(() => dispatch(op, structuredClone(input)))
				.then((value) => JSON.parse(JSON.stringify(value)) as typeof value);
			pending = result.catch(() => {});
			return result;
		},
		subscribe(listener) {
			return store.subscribe(() => listener());
		},
		close() {
			closed = true;
			store.close();
		}
	};
}
