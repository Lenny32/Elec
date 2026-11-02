/** Fixture helpers for engine tests (not shipped in the app bundle; only imported by *.spec.ts). */
import { indexPack, type PackIndex } from '../domain/catalog.js';
import type { Exercise, Pack } from '../domain/course.js';
import type { AnyEvent, EventPayloads, EventType, SubmissionPayload } from './events.js';
import { PAYLOAD_SCHEMA_VERSION, RULES_VERSION } from './events.js';
import type { ReducerContext } from './projection.js';

const t = (s: string) => ({ en: s, fr: s });

function mcq(
	id: string,
	conceptIds: string[],
	pool: 'practice' | 'exam',
	kind: Exercise['kind'] = 'independent'
): Exercise {
	return {
		id,
		version: 1,
		type: 'multiple_choice',
		conceptIds,
		formulaIds: [],
		difficulty: 1,
		kind,
		pool,
		prompt: t(id),
		hints: [],
		solution: [t('s')],
		options: [
			{ id: 'a', text: t('a'), rationale: t('a') },
			{ id: 'b', text: t('b'), rationale: t('b') }
		],
		correctOptionId: 'a'
	};
}

/** Two chapters: c1 teaches x.a/x.b; c2 requires x.a. Exam forms A/B on c1. */
export function fixturePack(): PackIndex {
	const exercises: Exercise[] = [
		mcq('exercise.a1', ['x.a'], 'practice'),
		mcq('exercise.a2', ['x.a'], 'practice'),
		mcq('exercise.a3', ['x.a'], 'practice'),
		mcq('exercise.a4', ['x.a'], 'practice', 'applied'),
		mcq('exercise.b1', ['x.b'], 'practice'),
		mcq('exercise.b2', ['x.b'], 'practice'),
		mcq('exercise.b3', ['x.b'], 'practice', 'applied'),
		...['1', '2', '3', '4', '5'].map((n) =>
			mcq(`exercise.ea${n}`, [Number(n) % 2 ? 'x.a' : 'x.b'], 'exam')
		),
		...['1', '2', '3', '4', '5'].map((n) =>
			mcq(`exercise.eb${n}`, [Number(n) % 2 ? 'x.a' : 'x.b'], 'exam')
		)
	];
	const pack = {
		manifest: {
			packId: 'test',
			packVersion: '1.0.0',
			rulesVersion: RULES_VERSION,
			locales: ['en', 'fr'],
			title: t('t'),
			description: t('d')
		},
		modules: [
			{
				id: 'module.a',
				number: 1,
				title: t('m'),
				summary: t('m'),
				chapterIds: ['chapter.01', 'chapter.02']
			}
		],
		chapters: [
			{
				id: 'chapter.01',
				number: '01',
				moduleId: 'module.a',
				title: t('c1'),
				summary: t('c1'),
				status: 'authored',
				goals: [t('g')],
				prerequisites: [],
				topics: [t('t')],
				lessonIds: ['lesson.01.01.a', 'lesson.01.02.b'],
				labIds: [],
				examId: 'exam.ch01',
				safetyNotes: [],
				practicalOutcome: t('o')
			},
			{
				id: 'chapter.02',
				number: '02',
				moduleId: 'module.a',
				title: t('c2'),
				summary: t('c2'),
				status: 'authored',
				goals: [t('g')],
				prerequisites: ['x.a'],
				topics: [t('t')],
				lessonIds: ['lesson.02.01.c'],
				labIds: [],
				safetyNotes: [],
				practicalOutcome: t('o')
			}
		],
		concepts: [
			{ id: 'x.a', chapterId: 'chapter.01', name: t('A'), summary: t('A'), prerequisites: [] },
			{ id: 'x.b', chapterId: 'chapter.01', name: t('B'), summary: t('B'), prerequisites: [] },
			{ id: 'x.c', chapterId: 'chapter.02', name: t('C'), summary: t('C'), prerequisites: [] }
		],
		formulas: [],
		diagrams: [],
		labs: [],
		lessons: [
			{
				id: 'lesson.01.01.a',
				version: 1,
				chapterId: 'chapter.01',
				number: '01.01',
				title: t('a'),
				objectives: [t('o')],
				conceptsTaught: ['x.a'],
				formulasUsed: [],
				estimatedMinutes: 5,
				safetyClass: 'none',
				cards: [],
				references: []
			},
			{
				id: 'lesson.01.02.b',
				version: 1,
				chapterId: 'chapter.01',
				number: '01.02',
				title: t('b'),
				objectives: [t('o')],
				conceptsTaught: ['x.b'],
				formulasUsed: [],
				estimatedMinutes: 5,
				safetyClass: 'none',
				cards: [],
				references: []
			},
			{
				id: 'lesson.02.01.c',
				version: 1,
				chapterId: 'chapter.02',
				number: '02.01',
				title: t('c'),
				objectives: [t('o')],
				conceptsTaught: ['x.c'],
				formulasUsed: [],
				estimatedMinutes: 5,
				safetyClass: 'none',
				cards: [],
				references: []
			}
		],
		exercises,
		exams: [
			{
				id: 'exam.ch01',
				version: 1,
				scope: 'chapter',
				scopeId: 'chapter.01',
				title: t('exam'),
				passPercent: 80,
				drillItemsPerConcept: 2,
				forms: [
					{
						id: 'A',
						itemIds: [
							'exercise.ea1',
							'exercise.ea2',
							'exercise.ea3',
							'exercise.ea4',
							'exercise.ea5'
						]
					},
					{
						id: 'B',
						itemIds: [
							'exercise.eb1',
							'exercise.eb2',
							'exercise.eb3',
							'exercise.eb4',
							'exercise.eb5'
						]
					}
				]
			}
		]
	} as unknown as Pack;
	return indexPack(pack);
}

export function ctxFor(ix: PackIndex): ReducerContext {
	return { teachingLesson: (c) => ix.teachingLesson.get(c) };
}

/** Builds events with deterministic ids/sequence. */
export function eventFactory(zone = 'Europe/Paris') {
	let seq = 0;
	return function ev<T extends EventType>(
		type: T,
		occurredAt: string,
		payload: EventPayloads[T],
		sessionId = 's1'
	): AnyEvent {
		seq++;
		return {
			eventId: `e${String(seq).padStart(5, '0')}`,
			deviceId: 'dev',
			sequence: seq,
			occurredAt,
			timezone: zone,
			rulesVersion: RULES_VERSION,
			packId: 'test',
			packVersion: '1.0.0',
			entityId: 'x',
			entityVersion: 1,
			sessionId,
			type,
			payload,
			payloadSchemaVersion: PAYLOAD_SCHEMA_VERSION
		} as AnyEvent;
	};
}

let presentationCounter = 0;
export function submission(
	exerciseId: string,
	conceptIds: string[],
	correct: boolean,
	o: Partial<SubmissionPayload> = {}
): SubmissionPayload {
	return {
		exerciseId,
		exerciseVersion: 1,
		presentationId: `${exerciseId}-${++presentationCounter}`,
		context: { kind: 'practice', refId: 'p' },
		submissionIndex: 0,
		response: { type: 'choice', optionId: correct ? 'a' : 'b' },
		correct,
		feedback: correct ? 'correct' : 'incorrect',
		hintsUsed: 0,
		independent: true,
		conceptIds,
		exerciseKind: 'independent',
		...o
	};
}
