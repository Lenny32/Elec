import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createLearningAPI, CourseValidationError } from './service.js';
import { EventRepository, MemoryPersistence } from '../adapters/event-repository.js';
import { Journal } from '../data/journal.js';
import { assembleCorePack } from '../content/packs/core/loader.js';
import { Pack, type Exercise } from '../domain/course.js';
import { indexPack } from '../domain/catalog.js';
import { uuid } from '../domain/id.js';
import type { LearningAPI, Response as Answer } from '../api/contracts.js';

const pack = Pack.parse(assembleCorePack());
const source = { load: async () => structuredClone(pack) };
const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => {
	for (const close of cleanup.splice(0).reverse()) await close();
});

async function localAPI(indexedDB = false) {
	const api = await createLearningAPI(source, (p) => {
		if (!indexedDB) return new EventRepository(p);
		const ix = indexPack(p);
		const journal = new Journal(
			{ teachingLesson: (id) => ix.teachingLesson.get(id) },
			p.manifest,
			`api-${uuid()}`
		);
		cleanup.push(async () => {
			journal.close();
			await journal.db.delete();
		});
		return journal;
	});
	cleanup.push(() => api.close());
	return api;
}

function answer(ex: Exercise): Answer {
	if (ex.type === 'numeric' || ex.type === 'unit_conversion')
		return {
			type: 'numeric',
			raw: String(ex.answer.canonicalValue),
			unit: ex.answer.canonicalUnit
		};
	if (ex.type === 'ordering') return { type: 'ordering', order: ex.correctOrder };
	return { type: 'choice', optionId: ex.correctOptionId };
}

async function finishChapter(api: LearningAPI) {
	const chapter = pack.chapters.find((c) => c.number === '00')!;
	for (const lessonId of chapter.lessonIds) {
		await api.call('startLesson', { lessonId });
		const lesson = pack.lessons.find((l) => l.id === lessonId)!;
		for (const [cardIndex, card] of lesson.cards.entries())
			await api.call('viewCard', { lessonId, cardId: card.id, cardIndex });
		await api.call('completeLesson', { lessonId });
	}
	return chapter;
}

describe('learning API contract', () => {
	it('selects chapter practice and review through the API without changing history', async () => {
		const api = await localAPI();
		const chapterId = pack.chapters.find((c) => c.number === '00')!.id;
		const selection = await api.call('selectPractice', {
			chapterId,
			conceptIds: [],
			perConcept: 2,
			sessionId: uuid()
		});
		expect(selection.items.length).toBeGreaterThan(0);
		expect(
			selection.items.every(
				(item) => pack.concepts.find((c) => c.id === item.conceptId)?.chapterId === chapterId
			)
		).toBe(true);
		expect((await api.call('selectReview', { max: 5, sessionId: uuid() })).items).toEqual([]);
		await expect(
			api.call('selectPractice', {
				chapterId: 'missing',
				conceptIds: [],
				perConcept: 2,
				sessionId: uuid()
			})
		).rejects.toMatchObject({ code: 'not_found' });
		expect((await api.call('snapshot', {})).projection.eventCount).toBe(1);
	});
	for (const indexedDB of [false, true]) {
		it(`runs lessons, failed exams, consolidation and retakes with ${indexedDB ? 'IndexedDB' : 'portable storage'}`, async () => {
			const api = await localAPI(indexedDB);
			const chapter = await finishChapter(api);
			const examId = chapter.examId!;
			const [attemptId, sameId] = await Promise.all([
				api.call('startExam', { examId }),
				api.call('startExam', { examId })
			]);
			expect(attemptId).toBe(sameId);
			expect(attemptId).toBeTruthy();
			await api.call('finishExam', { attemptId: attemptId! });
			let snapshot = await api.call('snapshot', {});
			expect(snapshot.views.exams[examId].kind).toBe('needs_drill');
			expect(await api.call('startExam', { examId })).toBeNull();
			const drillId = (await api.call('startDrill', { attemptId: attemptId! }))!;
			snapshot = await api.call('snapshot', {});
			for (const exerciseId of snapshot.projection.examAttempts[attemptId!].drill!.itemIds) {
				const ex = pack.exercises.find((e) => e.id === exerciseId)!;
				const grade = await api.call('submit', {
					exerciseId,
					response: answer(ex),
					context: {
						kind: 'drill',
						refId: drillId,
						sessionId: drillId,
						presentationId: uuid(),
						hintsUsed: 0,
						submissionIndex: 0
					}
				});
				expect(grade.correct).toBe(true);
			}
			snapshot = await api.call('snapshot', {});
			expect(snapshot.views.exams[examId].kind).toBe('available');
			expect(await api.call('startExam', { examId })).not.toBe(attemptId);
		});
	}

	it('resolves grading definitions from its own course and rejects invalid commands without writing', async () => {
		const api = await localAPI();
		const ex = pack.exercises.find((e) => e.pool === 'practice' && e.kind !== 'guided')!;
		const context = {
			kind: 'practice' as const,
			refId: 'practice',
			sessionId: uuid(),
			presentationId: uuid(),
			hintsUsed: 0,
			submissionIndex: 0
		};
		expect(
			(await api.call('submit', { exerciseId: ex.id, response: answer(ex), context })).correct
		).toBe(true);
		const before = (await api.call('snapshot', {})).projection.eventCount;
		await expect(
			api.call('submit', { exerciseId: 'exercise.missing', response: answer(ex), context })
		).rejects.toMatchObject({ code: 'not_found' });
		await expect(
			api.call('submit', {
				exerciseId: ex.id,
				response: answer(ex),
				context,
				correct: true
			} as never)
		).rejects.toMatchObject({ code: 'invalid_request' });
		await expect(
			api.call('viewCard', { lessonId: pack.lessons[0].id, cardId: 'foreign', cardIndex: 0 })
		).rejects.toMatchObject({ code: 'invalid_request' });
		expect((await api.call('snapshot', {})).projection.eventCount).toBe(before);
	});

	it('returns detached JSON data so a consumer cannot modify engine state or the course', async () => {
		const api = await localAPI();
		const catalog = await api.call('catalog', {});
		catalog.lessons.length = 0;
		const snapshot = await api.call('snapshot', {});
		snapshot.projection.eventCount = 900;
		expect((await api.call('catalog', {})).lessons.length).toBe(pack.lessons.length);
		expect((await api.call('snapshot', {})).projection.eventCount).toBe(1);
	});

	it('accepts a different course provider without changing the engine or UI', async () => {
		const other = structuredClone(pack);
		other.manifest.packId = 'another-course';
		other.manifest.title = { en: 'Another course', fr: 'Autre cours' };
		const api = await createLearningAPI({ load: async () => other }, (p) => new EventRepository(p));
		cleanup.push(() => api.close());
		expect((await api.call('catalog', {})).manifest.packId).toBe('another-course');
		expect((await api.call('allEvents', {}))[0].packId).toBe('another-course');
		await expect(
			createLearningAPI({ load: async () => ({}) }, () => {
				throw new Error('Must not open storage');
			})
		).rejects.toBeInstanceOf(CourseValidationError);
	});

	it('exports and imports through the API across repository implementations', async () => {
		const a = await localAPI(true),
			b = await localAPI();
		const lessonId = pack.lessons[0].id;
		await a.call('startLesson', { lessonId });
		await a.call('completeLesson', { lessonId });
		const file = await a.call('exportData', {});
		const text = JSON.stringify(file);
		expect((await b.call('inspectImport', { text })).ok).toBe(true);
		await b.call('importData', { text, mode: 'replace' });
		expect((await b.call('snapshot', {})).projection.lessons[lessonId].completedAt).toBeDefined();
		expect(await b.call('importData', { text, mode: 'merge' })).toBe(0);
		expect(await b.call('exportCSV', {})).toContain('LESSON_COMPLETED');
		await b.call('markExported', {});
		expect((await b.call('snapshot', {})).lastExportAt).toBeDefined();
	});

	it('reopens a portable repository and retains events and learning conclusions', async () => {
		const storage = new MemoryPersistence();
		const api = await createLearningAPI(source, (p) => new EventRepository(p, storage));
		const lessonId = pack.lessons[0].id;
		await api.call('startLesson', { lessonId });
		await api.call('completeLesson', { lessonId });
		api.close();
		const reopened = await createLearningAPI(source, (p) => new EventRepository(p, storage));
		cleanup.push(() => reopened.close());
		expect(
			(await reopened.call('snapshot', {})).projection.lessons[lessonId].completedAt
		).toBeDefined();
		expect(
			(await reopened.call('allEvents', {})).filter((e) => e.type === 'PACK_INSTALLED')
		).toHaveLength(1);
	});
});
