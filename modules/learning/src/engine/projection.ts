import type {
	ConceptProjection,
	LessonProjection,
	Projection,
	MasteryCheck,
	ReducerContext
} from '../domain/learning-state.js';
/**
 * Deterministic projection reducer (SPEC §7). `apply` folds one event; `fold` rebuilds from scratch.
 * Uses only event timestamps (never the current clock). Plain JSON-serialisable state.
 */
import type { AnyEvent, SubmissionPayload } from './events.js';
import { compareEvents, RULES_VERSION } from './events.js';
import { addLocalDaysAt0900 } from './time.js';

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120, 180] as const;
export const MAX_REVIEW_STAGE = 8;
export const MASTERY_RULES = {
	minEvidence: 4,
	minDistinctExercises: 3,
	window: 4,
	minCorrectInWindow: 3,
	needsWorkConsecutiveFailures: 2,
	needsWorkWindow: 4,
	needsWorkMinRatio: 0.75,
	clearNeedsWorkAfterSuccesses: 2
} as const;

export function emptyProjection(): Projection {
	return {
		rulesVersion: RULES_VERSION,
		eventCount: 0,
		concepts: {},
		lessons: {},
		examAttempts: {},
		examAttemptOrder: {},
		exerciseStats: {},
		practiceSessions: [],
		labs: {},
		preferences: {},
		activeDays: []
	};
}

function concept(p: Projection, id: string): ConceptProjection {
	return (p.concepts[id] ??= {
		conceptId: id,
		evidence: [],
		submissions: 0,
		reviewStage: 0,
		reviews: [],
		consecutiveReviewFailures: 0,
		consecutiveReviewSuccesses: 0,
		needsWork: false
	});
}

function lesson(p: Projection, id: string): LessonProjection {
	return (p.lessons[id] ??= { lessonId: id, lastCardIndex: 0, viewedCardIds: [] });
}

/** Explains SPEC §7.2 criteria for a concept. `teachingLessonId` resolved by the caller from the pack. */
export function masteryCheck(
	p: Projection,
	conceptId: string,
	teachingLessonId: string | undefined
): MasteryCheck {
	const c = p.concepts[conceptId];
	const ev = c?.evidence ?? [];
	const lessonCompleted = !!(teachingLessonId && p.lessons[teachingLessonId]?.completedAt);
	const last = ev.slice(-MASTERY_RULES.window);
	const correctInWindow = last.filter((e) => e.correct).length;
	const distinctExercises = new Set(ev.map((e) => e.exerciseId)).size;
	const appliedCorrect = ev.some((e) => e.applied && e.correct);
	const met =
		lessonCompleted &&
		ev.length >= MASTERY_RULES.minEvidence &&
		distinctExercises >= MASTERY_RULES.minDistinctExercises &&
		correctInWindow >= MASTERY_RULES.minCorrectInWindow &&
		appliedCorrect;
	return {
		lessonCompleted,
		evidenceCount: ev.length,
		distinctExercises,
		correctInWindow,
		windowSize: last.length,
		appliedCorrect,
		met
	};
}

function tryMaster(p: Projection, ctx: ReducerContext, conceptId: string, ev: AnyEvent) {
	const c = concept(p, conceptId);
	if (c.masteredAt) return;
	if (!masteryCheck(p, conceptId, ctx.teachingLesson(conceptId)).met) return;
	c.masteredAt = ev.occurredAt;
	c.masteredEventId = ev.eventId;
	c.reviewStage = 0;
	c.dueAt = addLocalDaysAt0900(ev.occurredAt, ev.timezone, 1);
}

function recordExposure(p: Projection, s: SubmissionPayload, ev: AnyEvent) {
	const st = (p.exerciseStats[s.exerciseId] ??= { presentations: [], sessionIds: [] });
	if (!st.presentations.includes(s.presentationId)) st.presentations.push(s.presentationId);
	if (!st.sessionIds.includes(ev.sessionId)) st.sessionIds.push(ev.sessionId);
	st.firstSeenAt ??= ev.occurredAt;
	st.lastSeenAt = ev.occurredAt;
	if (s.context.kind !== 'lesson' && s.context.kind !== 'exam') {
		if (
			p.practiceSessions[p.practiceSessions.length - 1] !== ev.sessionId &&
			!p.practiceSessions.includes(ev.sessionId)
		)
			p.practiceSessions.push(ev.sessionId);
	}
}

function addEvidence(p: Projection, ctx: ReducerContext, s: SubmissionPayload, ev: AnyEvent) {
	for (const cid of s.conceptIds) {
		const c = concept(p, cid);
		c.submissions++;
		if (s.independent) {
			c.evidence.push({
				eventId: ev.eventId,
				exerciseId: s.exerciseId,
				correct: s.correct,
				applied: s.exerciseKind === 'applied',
				at: ev.occurredAt,
				context: s.context.kind
			});
		}
		tryMaster(p, ctx, cid, ev);
	}
}

function markActive(p: Projection, ev: AnyEvent) {
	const d = new Intl.DateTimeFormat('en-CA', {
		timeZone: ev.timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(ev.occurredAt));
	if (!p.activeDays.includes(d)) p.activeDays.push(d);
}

export function apply(p: Projection, ev: AnyEvent, ctx: ReducerContext): Projection {
	p.eventCount++;
	p.lastEventId = ev.eventId;
	switch (ev.type) {
		case 'LESSON_STARTED': {
			const l = lesson(p, ev.payload.lessonId);
			l.startedAt ??= ev.occurredAt;
			l.lastVisitedAt = ev.occurredAt;
			markActive(p, ev);
			break;
		}
		case 'CARD_VIEWED': {
			const l = lesson(p, ev.payload.lessonId);
			l.startedAt ??= ev.occurredAt;
			l.lastCardIndex = ev.payload.cardIndex;
			l.lastVisitedAt = ev.occurredAt;
			if (!l.viewedCardIds.includes(ev.payload.cardId)) l.viewedCardIds.push(ev.payload.cardId);
			break;
		}
		case 'LESSON_COMPLETED': {
			const l = lesson(p, ev.payload.lessonId);
			l.startedAt ??= ev.occurredAt;
			l.completedAt ??= ev.occurredAt;
			l.lastVisitedAt = ev.occurredAt;
			for (const cid of ev.payload.conceptIds) {
				concept(p, cid);
				tryMaster(p, ctx, cid, ev);
			}
			markActive(p, ev);
			break;
		}
		case 'ANSWER_SUBMITTED': {
			const s = ev.payload;
			recordExposure(p, s, ev);
			markActive(p, ev);
			if (s.context.kind === 'exam') {
				const a = p.examAttempts[s.context.refId];
				if (a && !a.completedAt && !a.answers[s.exerciseId])
					a.answers[s.exerciseId] = {
						eventId: ev.eventId,
						correct: s.correct,
						response: s.response
					};
			}
			if (s.context.kind === 'drill') {
				const a = Object.values(p.examAttempts).find((x) => x.drill?.drillId === s.context.refId);
				if (a?.drill && s.correct && !a.drill.correctItemIds.includes(s.exerciseId))
					a.drill.correctItemIds.push(s.exerciseId);
			}
			addEvidence(p, ctx, s, ev);
			break;
		}
		case 'REVIEW_SUBMITTED': {
			const s = ev.payload;
			recordExposure(p, s, ev);
			markActive(p, ev);
			const c = concept(p, s.reviewConceptId);
			const wasMastered = !!c.masteredAt;
			const due = wasMastered && !!c.dueAt && c.dueAt <= ev.occurredAt;
			addEvidence(p, ctx, s, ev);
			if (wasMastered && s.submissionIndex === 0) {
				const success = s.correct && s.independent;
				c.reviews.push({
					eventId: ev.eventId,
					at: ev.occurredAt,
					exerciseId: s.exerciseId,
					scheduled: due,
					success
				});
				if (due) {
					if (success) {
						c.reviewStage = Math.min(c.reviewStage + 1, MAX_REVIEW_STAGE);
						c.dueAt = addLocalDaysAt0900(
							ev.occurredAt,
							ev.timezone,
							REVIEW_INTERVALS_DAYS[c.reviewStage - 1]
						);
						c.consecutiveReviewFailures = 0;
						c.consecutiveReviewSuccesses++;
						if (
							c.needsWork &&
							c.consecutiveReviewSuccesses >= MASTERY_RULES.clearNeedsWorkAfterSuccesses
						) {
							c.needsWork = false;
							c.needsWorkSince = undefined;
						}
					} else {
						c.reviewStage = 0;
						c.dueAt = addLocalDaysAt0900(ev.occurredAt, ev.timezone, 1);
						c.consecutiveReviewFailures++;
						c.consecutiveReviewSuccesses = 0;
					}
					const scheduled = c.reviews
						.filter((r) => r.scheduled)
						.slice(-MASTERY_RULES.needsWorkWindow);
					const ratio = scheduled.filter((r) => r.success).length / scheduled.length;
					if (
						c.consecutiveReviewFailures >= MASTERY_RULES.needsWorkConsecutiveFailures ||
						(scheduled.length >= MASTERY_RULES.needsWorkWindow &&
							ratio < MASTERY_RULES.needsWorkMinRatio)
					) {
						if (!c.needsWork) c.needsWorkSince = ev.occurredAt;
						c.needsWork = true;
					}
				}
			}
			break;
		}
		case 'ASSESSMENT_STARTED': {
			const x = ev.payload;
			p.examAttempts[x.attemptId] = {
				attemptId: x.attemptId,
				examId: x.examId,
				examVersion: x.examVersion,
				formId: x.formId,
				itemIds: x.itemIds,
				startedAt: ev.occurredAt,
				answers: {},
				missedConceptIds: [],
				wrongItemIds: []
			};
			(p.examAttemptOrder[x.examId] ??= []).push(x.attemptId);
			markActive(p, ev);
			break;
		}
		case 'ASSESSMENT_COMPLETED': {
			const a = p.examAttempts[ev.payload.attemptId];
			if (!a || a.completedAt) break;
			a.completedAt = ev.occurredAt;
			a.correctCount = ev.payload.correctCount;
			a.total = ev.payload.total;
			a.passed = ev.payload.passed;
			a.passPercent = ev.payload.passPercent;
			a.missedConceptIds = ev.payload.missedConceptIds;
			a.wrongItemIds = ev.payload.wrongItemIds;
			break;
		}
		case 'ASSESSMENT_ABANDONED': {
			const a = p.examAttempts[ev.payload.attemptId];
			if (a && !a.completedAt) a.abandonedAt = ev.occurredAt;
			break;
		}
		case 'DRILL_STARTED': {
			const a = p.examAttempts[ev.payload.examAttemptId];
			if (a && !a.drill)
				a.drill = {
					drillId: ev.payload.drillId,
					examAttemptId: a.attemptId,
					itemIds: ev.payload.itemIds,
					startedAt: ev.occurredAt,
					correctItemIds: []
				};
			break;
		}
		case 'DRILL_COMPLETED': {
			const a = p.examAttempts[ev.payload.examAttemptId];
			if (a?.drill && a.drill.drillId === ev.payload.drillId) a.drill.completedAt ??= ev.occurredAt;
			break;
		}
		case 'LAB_PARAMETER_CHANGED':
			p.labs[ev.payload.labId] = { ...ev.payload.params };
			break;
		case 'PREFERENCE_CHANGED':
			p.preferences[ev.payload.key] = ev.payload.value;
			break;
		case 'HINT_USED':
		case 'SOLUTION_REVEALED':
		case 'PACK_INSTALLED':
		case 'DATA_IMPORTED':
			break;
	}
	return p;
}

export function fold(events: AnyEvent[], ctx: ReducerContext): Projection {
	// Single device: local sequence order (SPEC §7.5). Several devices (imports): stable merge order.
	const singleDevice = new Set(events.map((e) => e.deviceId)).size <= 1;
	const sorted = [...events].sort(singleDevice ? (a, b) => a.sequence - b.sequence : compareEvents);
	const p = emptyProjection();
	for (const e of sorted) apply(p, e, ctx);
	return p;
}

export type {
	Evidence,
	ReviewRecord,
	ConceptProjection,
	LessonProjection,
	DrillProjection,
	ExamAttemptProjection,
	ExerciseStats,
	Projection,
	MasteryCheck,
	ReducerContext
} from '../domain/learning-state.js';
