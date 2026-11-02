import { describe, expect, it } from 'vitest';
import { convert, parseNumberInput, toSI, formatQuantity } from './units.js';
import { runAlgorithm, DomainError } from './formulas.js';
import { grade, isCorrectNumeric } from './scoring.js';
import { addLocalDaysAt0900, zonedToUtcISO } from './time.js';
import { fold } from './projection.js';
import {
	conceptStatus,
	examAvailability,
	isChapterUnlocked,
	scoreAttempt,
	lessonState
} from './status.js';
import { selectDrill, selectExamForm, selectReview } from './selection.js';
import { runLabModel } from '../domain/lab-models.js';
import { ctxFor, eventFactory, fixturePack, submission } from './test-utils.js';
import type { AnyEvent } from './events.js';
import type { Exercise } from '../domain/course.js';

describe('units & formulas (SPEC §13.2)', () => {
	it('computes the reference values', () => {
		expect(runAlgorithm('ohm_current', { V: 5, R: 330 })).toBeCloseTo(0.0151515, 6);
		expect(runAlgorithm('ohm_current', { V: 9, R: 300 })).toBeCloseTo(0.03, 12);
		expect(runAlgorithm('led_current', { Vs: 3, Vf: 2, R: 100 })).toBeCloseTo(0.01, 12);
		expect(runAlgorithm('parallel_resistance', { R1: 100, R2: 100 })).toBeCloseTo(50, 9);
		expect(runAlgorithm('series_resistance', { R2: 20, R1: 10 })).toBe(30);
	});
	it('converts with prefixes and rejects incompatible dimensions', () => {
		expect(convert(0.03, 'A', 'mA')).toBe(30);
		expect(convert(4.7, 'kohm', 'ohm')).toBe(4700);
		expect(() => convert(1, 'V', 'A')).toThrow();
		expect(toSI(15, 'uF')).toBeCloseTo(15e-6, 15);
	});
	it('parses learner input without eval', () => {
		expect(parseNumberInput('0,03')).toBe(0.03);
		expect(parseNumberInput(' 1 000 ')).toBe(1000);
		expect(parseNumberInput('3e-2')).toBe(0.03);
		expect(parseNumberInput('9/300')).toBeNaN();
		expect(parseNumberInput('alert(1)')).toBeNaN();
	});
	it('guards domains (R = 0, negative)', () => {
		expect(() => runAlgorithm('ohm_current', { V: 5, R: 0 })).toThrow(DomainError);
		expect(() => runAlgorithm('led_resistor', { Vs: 2, Vf: 2, I: 0.01 })).toThrow(DomainError);
	});
	it('formats quantities with engineering prefixes', () => {
		expect(formatQuantity(0.0151515, 'current', { sig: 4 })).toBe('15.15 mA');
		expect(formatQuantity(4700, 'resistance', { locale: 'fr' })).toBe('4,7 kΩ');
	});
});

describe('safety feedback in lab models (SPEC §13.3)', () => {
	it('flags short circuit, missing resistor, negative R, overcurrent', () => {
		expect(runLabModel('ohm', { V: 5, R: 0 }).warnings[0].code).toBe('short_circuit');
		expect(runLabModel('led_series', { Vs: 5, Vf: 2, R: 0 }).warnings[0].code).toBe(
			'missing_resistor'
		);
		expect(runLabModel('ohm', { V: 5, R: -1 }).valid).toBe(false);
		expect(
			runLabModel('led_series', { Vs: 9, Vf: 2, R: 100 }).warnings.map((w) => w.code)
		).toContain('overcurrent');
		expect(runLabModel('led_series', { Vs: 1.5, Vf: 2, R: 100 }).loopCurrentA).toBe(0);
		expect(runLabModel('ohm', { V: Number.NaN, R: 10 }).valid).toBe(false);
	});
});

describe('numeric grading', () => {
	const ex = {
		id: 'exercise.x',
		version: 1,
		type: 'numeric',
		conceptIds: ['x.a'],
		formulaIds: [],
		difficulty: 1,
		kind: 'independent',
		pool: 'practice',
		prompt: { en: '', fr: '' },
		hints: [],
		solution: [{ en: '', fr: '' }],
		answer: {
			canonicalValue: 0.03,
			canonicalUnit: 'A',
			acceptedUnits: ['A', 'mA'],
			absoluteTolerance: 0.000001,
			relativeTolerance: 0.001
		}
	} as Exercise;
	it('accepts equivalent units and tolerances, never string compare', () => {
		expect(grade(ex, { type: 'numeric', raw: '30', unit: 'mA' }).correct).toBe(true);
		expect(grade(ex, { type: 'numeric', raw: '0.03', unit: 'A' }).correct).toBe(true);
		expect(grade(ex, { type: 'numeric', raw: '30.02', unit: 'mA' }).correct).toBe(true);
		expect(grade(ex, { type: 'numeric', raw: '31', unit: 'mA' }).correct).toBe(false);
		expect(grade(ex, { type: 'numeric', raw: '0.03', unit: 'mA' }).feedback).toBe(
			'right_value_wrong_unit'
		);
		expect(grade(ex, { type: 'numeric', raw: '30', unit: 'V' }).feedback).toBe(
			'wrong_unit_dimension'
		);
		expect(grade(ex, { type: 'numeric', raw: 'abc', unit: 'A' }).feedback).toBe('unparseable');
	});
	it('handles zero expected values with absolute tolerance', () => {
		const spec = {
			canonicalValue: 0,
			canonicalUnit: 'A' as const,
			acceptedUnits: ['A' as const],
			absoluteTolerance: 1e-9,
			relativeTolerance: 0.01
		};
		expect(isCorrectNumeric(0, spec)).toBe(true);
		expect(isCorrectNumeric(1e-6, spec)).toBe(false);
	});
});

describe('timezone-aware scheduling (SPEC §7.4)', () => {
	it('schedules 09:00 local across DST changes', () => {
		// Paris switches to summer time on 2026-03-29.
		expect(addLocalDaysAt0900('2026-03-28T20:00:00Z', 'Europe/Paris', 1)).toBe(
			'2026-03-29T07:00:00.000Z'
		);
		expect(addLocalDaysAt0900('2026-03-27T20:00:00Z', 'Europe/Paris', 1)).toBe(
			'2026-03-28T08:00:00.000Z'
		);
		// Late evening UTC is already next local day in Tokyo.
		expect(addLocalDaysAt0900('2026-05-01T20:00:00Z', 'Asia/Tokyo', 1)).toBe(
			'2026-05-03T00:00:00.000Z'
		);
		expect(zonedToUtcISO({ year: 2026, month: 11, day: 1 }, 9, 0, 'America/New_York')).toBe(
			'2026-11-01T14:00:00.000Z'
		);
	});
});

/** Lesson + 4 practice answers on x.a, last 4 with 3 correct, incl. applied. */
function masterA(ev: ReturnType<typeof eventFactory>, day = '2026-01-10'): AnyEvent[] {
	return [
		ev('LESSON_COMPLETED', `${day}T08:00:00Z`, {
			lessonId: 'lesson.01.01.a',
			lessonVersion: 1,
			conceptIds: ['x.a']
		}),
		ev('ANSWER_SUBMITTED', `${day}T08:01:00Z`, submission('exercise.a1', ['x.a'], true)),
		ev('ANSWER_SUBMITTED', `${day}T08:02:00Z`, submission('exercise.a2', ['x.a'], false)),
		ev('ANSWER_SUBMITTED', `${day}T08:03:00Z`, submission('exercise.a3', ['x.a'], true)),
		ev(
			'ANSWER_SUBMITTED',
			`${day}T08:04:00Z`,
			submission('exercise.a4', ['x.a'], true, { exerciseKind: 'applied' })
		)
	];
}

describe('mastery rules (SPEC §7.2, §13.4)', () => {
	const ix = fixturePack();
	const ctx = ctxFor(ix);

	it('one correct answer never masters', () => {
		const ev = eventFactory();
		const p = fold(
			[
				ev('LESSON_COMPLETED', '2026-01-10T08:00:00Z', {
					lessonId: 'lesson.01.01.a',
					lessonVersion: 1,
					conceptIds: ['x.a']
				}),
				ev(
					'ANSWER_SUBMITTED',
					'2026-01-10T08:01:00Z',
					submission('exercise.a4', ['x.a'], true, { exerciseKind: 'applied' })
				)
			],
			ctx
		);
		expect(p.concepts['x.a'].masteredAt).toBeUndefined();
		expect(conceptStatus(ix, p, 'x.a', '2026-01-10T09:00:00Z').state).toBe('practicing');
	});

	it('4 qualifying attempts, 3/4 correct, applied correct → mastered; unlocks dependent chapter', () => {
		const ev = eventFactory();
		const p = fold(masterA(ev), ctx);
		expect(p.concepts['x.a'].masteredAt).toBe('2026-01-10T08:04:00Z');
		expect(p.concepts['x.a'].dueAt).toBe('2026-01-11T08:00:00.000Z'); // 09:00 Paris (winter)
		expect(isChapterUnlocked(ix, p, 'chapter.02')).toBe(true);
	});

	it('hinted attempts are not independent evidence', () => {
		const ev = eventFactory();
		const events = masterA(ev).map((e) =>
			e.type === 'ANSWER_SUBMITTED' && e.payload.exerciseId === 'exercise.a3'
				? { ...e, payload: { ...e.payload, hintsUsed: 1, independent: false } }
				: e
		) as AnyEvent[];
		const p = fold(events, ctx);
		expect(p.concepts['x.a'].evidence).toHaveLength(3);
		expect(p.concepts['x.a'].masteredAt).toBeUndefined();
	});

	it('mastery requires the teaching lesson to be completed', () => {
		const ev = eventFactory();
		const p = fold(masterA(ev).slice(1), ctx);
		expect(p.concepts['x.a'].masteredAt).toBeUndefined();
	});

	it('review failures never relock an unlocked chapter; 2 failures → needs work', () => {
		const ev = eventFactory();
		const rv = (at: string, ok: boolean) =>
			ev('REVIEW_SUBMITTED', at, {
				...submission('exercise.a1', ['x.a'], ok, { context: { kind: 'review', refId: 'r' } }),
				reviewConceptId: 'x.a',
				scheduled: true
			});
		const p = fold(
			[...masterA(ev), rv('2026-01-11T10:00:00Z', false), rv('2026-01-12T10:00:00Z', false)],
			ctx
		);
		expect(p.concepts['x.a'].needsWork).toBe(true);
		expect(conceptStatus(ix, p, 'x.a', '2026-01-12T11:00:00Z').state).toBe('needs_work');
		expect(isChapterUnlocked(ix, p, 'chapter.02')).toBe(true);
		expect(p.concepts['x.a'].masteredAt).toBeDefined();
	});

	it('successful reviews follow the 1,3,7… schedule; early reviews do not advance', () => {
		const ev = eventFactory();
		const rv = (at: string) =>
			ev('REVIEW_SUBMITTED', at, {
				...submission('exercise.a2', ['x.a'], true, { context: { kind: 'review', refId: 'r' } }),
				reviewConceptId: 'x.a',
				scheduled: true
			});
		const p = fold(
			[
				...masterA(ev),
				rv('2026-01-10T12:00:00Z'),
				rv('2026-01-11T10:00:00Z'),
				rv('2026-01-12T10:00:00Z')
			],
			ctx
		);
		const c = p.concepts['x.a'];
		expect(c.reviews.map((r) => r.scheduled)).toEqual([false, true, true]);
		expect(c.reviewStage).toBe(2);
		expect(c.dueAt).toBe('2026-01-15T08:00:00.000Z'); // +3 local days at 09:00
	});
});

describe('exams, failed attempts and consolidation drills (ADR 0001)', () => {
	const ix = fixturePack();
	const ctx = ctxFor(ix);

	function failExam(ev: ReturnType<typeof eventFactory>): AnyEvent[] {
		const lessons = [
			ev('LESSON_COMPLETED', '2026-02-01T08:00:00Z', {
				lessonId: 'lesson.01.01.a',
				lessonVersion: 1,
				conceptIds: ['x.a']
			}),
			ev('LESSON_COMPLETED', '2026-02-01T08:10:00Z', {
				lessonId: 'lesson.01.02.b',
				lessonVersion: 1,
				conceptIds: ['x.b']
			})
		];
		const form = selectExamForm(ix, 'exam.ch01', 0);
		const start = ev('ASSESSMENT_STARTED', '2026-02-01T09:00:00Z', {
			attemptId: 'att1',
			examId: 'exam.ch01',
			examVersion: 1,
			formId: form.formId,
			itemIds: form.itemIds,
			selectionPolicyVersion: form.policyVersion
		});
		// 3/5 correct: ea2 (x.b) and ea3 (x.a) wrong → 60% < 80%
		const answers = form.itemIds.map((id, i) =>
			ev(
				'ANSWER_SUBMITTED',
				`2026-02-01T09:0${i + 1}:00Z`,
				submission(
					id,
					ix.exercises.get(id)!.conceptIds,
					!(id === 'exercise.ea2' || id === 'exercise.ea3'),
					{ context: { kind: 'exam', refId: 'att1' } }
				)
			)
		);
		return [...lessons, start, ...answers];
	}

	it('scores, requires drill before retake, drill excludes failed items, then rotates the form', () => {
		const ev = eventFactory();
		let events = failExam(ev);
		let p = fold(events, ctx);
		expect(examAvailability(ix, p, 'exam.ch01')).toEqual({
			kind: 'in_progress',
			attemptId: 'att1'
		});
		const score = scoreAttempt(ix, p.examAttempts.att1, 80);
		expect(score).toMatchObject({
			correctCount: 3,
			total: 5,
			passed: false,
			wrongItemIds: ['exercise.ea2', 'exercise.ea3'],
			missedConceptIds: ['x.a', 'x.b']
		});
		events = [
			...events,
			ev('ASSESSMENT_COMPLETED', '2026-02-01T09:10:00Z', {
				attemptId: 'att1',
				examId: 'exam.ch01',
				formId: 'A',
				correctCount: 3,
				total: 5,
				passPercent: 80,
				passed: false,
				missedConceptIds: score.missedConceptIds,
				wrongItemIds: score.wrongItemIds
			})
		];
		p = fold(events, ctx);
		expect(examAvailability(ix, p, 'exam.ch01')).toEqual({
			kind: 'needs_drill',
			attemptId: 'att1',
			drillStarted: false
		});

		const drill = selectDrill(ix, p, p.examAttempts.att1);
		expect(drill.items.map((i) => i.exerciseId)).toEqual([
			'exercise.a1',
			'exercise.a2',
			'exercise.b1',
			'exercise.b2'
		]);
		expect(drill.items.every((i) => !p.examAttempts.att1.itemIds.includes(i.exerciseId))).toBe(
			true
		);

		events = [
			...events,
			ev('DRILL_STARTED', '2026-02-01T10:00:00Z', {
				drillId: 'd1',
				examAttemptId: 'att1',
				examId: 'exam.ch01',
				itemIds: drill.items.map((i) => i.exerciseId),
				selectionPolicyVersion: drill.policyVersion
			})
		];
		for (const it of drill.items)
			events.push(
				ev(
					'ANSWER_SUBMITTED',
					'2026-02-01T10:05:00Z',
					submission(it.exerciseId, [it.conceptId], true, {
						context: { kind: 'drill', refId: 'd1' }
					})
				)
			);
		p = fold(events, ctx);
		expect(p.examAttempts.att1.drill?.correctItemIds).toHaveLength(4);
		expect(examAvailability(ix, p, 'exam.ch01').kind).toBe('needs_drill');
		events.push(
			ev('DRILL_COMPLETED', '2026-02-01T10:06:00Z', { drillId: 'd1', examAttemptId: 'att1' })
		);
		p = fold(events, ctx);
		expect(examAvailability(ix, p, 'exam.ch01')).toEqual({ kind: 'available', formIndex: 1 });
		expect(selectExamForm(ix, 'exam.ch01', 1).formId).toBe('B');
	});

	it('lessons are sequential within an unlocked chapter; exam locked until all lessons done', () => {
		const ev = eventFactory();
		const p = fold(
			[
				ev('LESSON_STARTED', '2026-02-01T08:00:00Z', {
					lessonId: 'lesson.01.01.a',
					lessonVersion: 1
				})
			],
			ctx
		);
		expect(lessonState(ix, p, 'lesson.01.01.a')).toBe('in_progress');
		expect(lessonState(ix, p, 'lesson.01.02.b')).toBe('locked');
		expect(lessonState(ix, p, 'lesson.02.01.c')).toBe('locked');
		expect(examAvailability(ix, p, 'exam.ch01')).toMatchObject({
			kind: 'locked',
			reason: 'lessons_incomplete'
		});
	});
});

describe('repeatability (SPEC §13.1)', () => {
	it('same events + pack + clock → identical projection and selections', () => {
		const ix = fixturePack();
		const history = masterA(eventFactory());
		const run = () => {
			const p = fold(structuredClone(history), ctxFor(ix));
			return JSON.stringify({ p, review: selectReview(ix, p, '2026-01-12T10:00:00Z') });
		};
		expect(run()).toBe(run());
		const ev = eventFactory();
		const events = masterA(ev);
		const shuffled = [events[3], events[0], events[4], events[2], events[1]];
		expect(JSON.stringify(fold(shuffled, ctxFor(ix)))).toBe(
			JSON.stringify(fold(events, ctxFor(ix)))
		);
	});
	it('review selects one unseen practice item per due concept', () => {
		const ix = fixturePack();
		const ev = eventFactory();
		const p = fold(masterA(ev), ctxFor(ix));
		const sel = selectReview(ix, p, '2026-01-12T10:00:00Z', 5, 'new-session');
		expect(sel.items).toHaveLength(1);
		expect(sel.items[0].conceptId).toBe('x.a');
		expect(sel.policyVersion).toBe('select-1');
	});
});
