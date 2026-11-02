/** Framework-independent learning workflows. Course and persistence are injected. */
import type { PackIndex } from '../domain/catalog.js';
import type { Exercise } from '../domain/course.js';
import type { LearningRepository } from './ports.js';
import type { SubmitContext } from '../api/contracts.js';
import { grade, type Grade, type Response } from '../engine/scoring.js';
import type { SubmissionPayload } from '../engine/events.js';
import {
	examAvailability,
	scoreAttempt,
	completedAttempts,
	lessonState
} from '../engine/status.js';
import { selectDrill, selectExamForm } from '../engine/selection.js';
import { uuid } from '../domain/id.js';
import { ApplicationError } from './errors.js';

export class LearningWorkflows {
	constructor(
		readonly ix: PackIndex,
		private store: LearningRepository,
		readonly appSession: string
	) {}
	get p() {
		return this.store.state;
	}
	private exercise(id: string): Exercise {
		const ex = this.ix.exercises.get(id);
		if (!ex) throw new ApplicationError('not_found', 'Unknown exercise');
		return ex;
	}
	private validateContext(ex: Exercise, c: SubmitContext) {
		if (c.kind === 'exam') {
			const a = this.p.examAttempts[c.refId];
			if (
				!a ||
				a.completedAt ||
				a.abandonedAt ||
				!a.itemIds.includes(ex.id) ||
				c.sessionId !== a.attemptId
			)
				throw new ApplicationError('conflict', 'Exercise is not in an active exam attempt');
			if (a.answers[ex.id] || c.hintsUsed || c.submissionIndex)
				throw new ApplicationError('conflict', 'Exam answers are final and cannot use hints');
		} else if (c.kind === 'lesson') {
			const lesson = this.ix.lessons.get(c.refId);
			if (
				!lesson ||
				!this.p.lessons[lesson.id]?.startedAt ||
				!lesson.cards.some((card) => card.type === 'exercise' && card.exerciseId === ex.id)
			)
				throw new ApplicationError('conflict', 'Exercise is not in a started lesson');
		} else if (c.kind === 'drill') {
			const a = Object.values(this.p.examAttempts).find((a) => a.drill?.drillId === c.refId);
			if (!a?.drill || a.drill.completedAt || !a.drill.itemIds.includes(ex.id))
				throw new ApplicationError('conflict', 'Exercise is not in an active drill');
		} else if (ex.pool !== 'practice' || ex.kind === 'guided') {
			throw new ApplicationError('conflict', 'Exercise is not available for practice');
		}
		if (c.kind === 'review' && (!c.reviewConceptId || !ex.conceptIds.includes(c.reviewConceptId)))
			throw new ApplicationError('invalid_request', 'Review concept does not match exercise');
	}
	// ───────── Lessons ─────────
	async startLesson(lessonId: string) {
		const l = this.ix.lessons.get(lessonId);
		if (!l) throw new ApplicationError('not_found', 'Unknown lesson');
		if (lessonState(this.ix, this.p, lessonId) === 'locked')
			throw new ApplicationError('conflict', 'Lesson prerequisites are not complete');
		if (!this.p.lessons[lessonId]?.startedAt) {
			await this.store.append(
				'LESSON_STARTED',
				{ lessonId, lessonVersion: l.version },
				{ entityId: lessonId, entityVersion: l.version, sessionId: this.appSession }
			);
		}
	}

	async viewCard(lessonId: string, cardId: string, cardIndex: number) {
		const lesson = this.ix.lessons.get(lessonId);
		if (!lesson) throw new ApplicationError('not_found', 'Unknown lesson');
		if (lesson.cards[cardIndex]?.id !== cardId)
			throw new ApplicationError(
				'invalid_request',
				'Card does not belong to this lesson and position'
			);
		await this.startLesson(lessonId);
		const lp = this.p.lessons[lessonId];
		if (lp?.lastCardIndex === cardIndex && lp.viewedCardIds.includes(cardId)) return;
		await this.store.append(
			'CARD_VIEWED',
			{ lessonId, cardId, cardIndex },
			{ entityId: lessonId, sessionId: this.appSession }
		);
	}

	async completeLesson(lessonId: string) {
		const l = this.ix.lessons.get(lessonId);
		if (!l) throw new ApplicationError('not_found', 'Unknown lesson');
		if (!this.p.lessons[lessonId]?.startedAt)
			throw new ApplicationError('conflict', 'Lesson has not been started');
		if (this.p.lessons[lessonId]?.completedAt) return;
		await this.store.append(
			'LESSON_COMPLETED',
			{ lessonId, lessonVersion: l.version, conceptIds: l.conceptsTaught },
			{ entityId: lessonId, entityVersion: l.version, sessionId: this.appSession }
		);
	}

	// ───────── Answers ─────────
	async submit(exerciseId: string, response: Response, c: SubmitContext): Promise<Grade> {
		const ex = this.exercise(exerciseId);
		this.validateContext(ex, c);
		const g = grade(ex, response);
		const payload: SubmissionPayload = {
			exerciseId: ex.id,
			exerciseVersion: ex.version,
			presentationId: c.presentationId,
			context: { kind: c.kind, refId: c.refId },
			submissionIndex: c.submissionIndex,
			response,
			correct: g.correct,
			feedback: g.feedback,
			hintsUsed: c.hintsUsed,
			independent: c.submissionIndex === 0 && c.hintsUsed === 0,
			conceptIds: ex.conceptIds,
			exerciseKind: ex.kind
		};
		const opts = { entityId: ex.id, entityVersion: ex.version, sessionId: c.sessionId };
		if (c.kind === 'review' && c.reviewConceptId) {
			await this.store.append(
				'REVIEW_SUBMITTED',
				{ ...payload, reviewConceptId: c.reviewConceptId, scheduled: true },
				opts
			);
		} else {
			await this.store.append('ANSWER_SUBMITTED', payload, opts);
		}
		if (c.kind === 'drill') await this.maybeCompleteDrill(c.refId);
		return g;
	}

	async useHint(exerciseId: string, presentationId: string, hintIndex: number, sessionId: string) {
		const ex = this.exercise(exerciseId);
		if (!ex.hints[hintIndex]) throw new ApplicationError('invalid_request', 'Unknown hint');
		await this.store.append(
			'HINT_USED',
			{ exerciseId: ex.id, presentationId, hintIndex },
			{ entityId: ex.id, entityVersion: ex.version, sessionId }
		);
	}

	async revealSolution(exerciseId: string, presentationId: string, sessionId: string) {
		const ex = this.exercise(exerciseId);
		await this.store.append(
			'SOLUTION_REVEALED',
			{ exerciseId: ex.id, presentationId },
			{ entityId: ex.id, entityVersion: ex.version, sessionId }
		);
	}

	// ───────── Exams ─────────
	/** Starts (or resumes) an attempt. Returns the attempt id, or undefined if not available. */
	async startExam(examId: string): Promise<string | undefined> {
		const ix = this.ix;
		if (!ix.exams.has(examId)) throw new ApplicationError('not_found', 'Unknown exam');
		const av = examAvailability(ix, this.p, examId);
		if (av.kind === 'in_progress') return av.attemptId;
		if (av.kind !== 'available') return undefined;
		const exam = ix.exams.get(examId)!;
		const sel = selectExamForm(ix, examId, completedAttempts(this.p, examId).length);
		const attemptId = uuid();
		await this.store.append(
			'ASSESSMENT_STARTED',
			{
				attemptId,
				examId,
				examVersion: exam.version,
				formId: sel.formId,
				itemIds: sel.itemIds,
				selectionPolicyVersion: sel.policyVersion
			},
			{ entityId: examId, entityVersion: exam.version, sessionId: attemptId }
		);
		return attemptId;
	}

	async finishExam(attemptId: string) {
		const a = this.p.examAttempts[attemptId];
		if (!a) throw new ApplicationError('not_found', 'Unknown exam attempt');
		if (a.completedAt) return;
		const exam = this.ix.exams.get(a.examId)!;
		const s = scoreAttempt(this.ix, a, exam.passPercent);
		await this.store.append(
			'ASSESSMENT_COMPLETED',
			{
				attemptId,
				examId: a.examId,
				formId: a.formId,
				correctCount: s.correctCount,
				total: s.total,
				passPercent: exam.passPercent,
				passed: s.passed,
				missedConceptIds: s.missedConceptIds,
				wrongItemIds: s.wrongItemIds
			},
			{ entityId: a.examId, entityVersion: a.examVersion, sessionId: attemptId }
		);
	}

	async startDrill(attemptId: string): Promise<string | undefined> {
		const a = this.p.examAttempts[attemptId];
		if (!a?.completedAt || a.passed) return undefined;
		if (a.drill) return a.drill.drillId;
		const sel = selectDrill(this.ix, this.p, a);
		const drillId = uuid();
		await this.store.append(
			'DRILL_STARTED',
			{
				drillId,
				examAttemptId: attemptId,
				examId: a.examId,
				itemIds: sel.items.map((i) => i.exerciseId),
				selectionPolicyVersion: sel.policyVersion
			},
			{ entityId: a.examId, sessionId: drillId }
		);
		return drillId;
	}

	private async maybeCompleteDrill(drillId: string) {
		const a = Object.values(this.p.examAttempts).find((x) => x.drill?.drillId === drillId);
		const d = a?.drill;
		if (!a || !d || d.completedAt) return;
		if (d.itemIds.every((id) => d.correctItemIds.includes(id)))
			await this.store.append(
				'DRILL_COMPLETED',
				{ drillId, examAttemptId: a.attemptId },
				{ entityId: a.examId, sessionId: drillId }
			);
	}
}
