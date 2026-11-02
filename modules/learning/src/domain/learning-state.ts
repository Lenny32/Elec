/** Shared learning contracts, independent of the engine implementation. */
import type { SubmissionPayload } from './events.js';

export interface Evidence {
	eventId: string;
	exerciseId: string;
	correct: boolean;
	applied: boolean;
	at: string;
	context: SubmissionPayload['context']['kind'];
}

export interface ReviewRecord {
	eventId: string;
	at: string;
	exerciseId: string;
	scheduled: boolean;
	success: boolean;
}

export interface ConceptProjection {
	conceptId: string;
	evidence: Evidence[];
	submissions: number;
	masteredAt?: string;
	masteredEventId?: string;
	reviewStage: number;
	dueAt?: string;
	reviews: ReviewRecord[];
	consecutiveReviewFailures: number;
	consecutiveReviewSuccesses: number;
	needsWork: boolean;
	needsWorkSince?: string;
}

export interface LessonProjection {
	lessonId: string;
	startedAt?: string;
	completedAt?: string;
	lastCardIndex: number;
	viewedCardIds: string[];
	lastVisitedAt?: string;
}

export interface DrillProjection {
	drillId: string;
	examAttemptId: string;
	itemIds: string[];
	startedAt: string;
	correctItemIds: string[];
	completedAt?: string;
}

export interface ExamAttemptProjection {
	attemptId: string;
	examId: string;
	examVersion: number;
	formId: string;
	itemIds: string[];
	startedAt: string;
	/** first (and only) submission per item */
	answers: Record<
		string,
		{ eventId: string; correct: boolean; response: SubmissionPayload['response'] }
	>;
	completedAt?: string;
	abandonedAt?: string;
	correctCount?: number;
	total?: number;
	passed?: boolean;
	passPercent?: number;
	missedConceptIds: string[];
	wrongItemIds: string[];
	drill?: DrillProjection;
}

export interface ExerciseStats {
	presentations: string[];
	sessionIds: string[];
	lastSeenAt?: string;
	firstSeenAt?: string;
}

export interface Projection {
	rulesVersion: string;
	eventCount: number;
	lastEventId?: string;
	concepts: Record<string, ConceptProjection>;
	lessons: Record<string, LessonProjection>;
	examAttempts: Record<string, ExamAttemptProjection>;
	/** examId → attemptIds in start order */
	examAttemptOrder: Record<string, string[]>;
	exerciseStats: Record<string, ExerciseStats>;
	/** Ordered distinct sessions in which practice/review/drill items were answered. */
	practiceSessions: string[];
	labs: Record<string, Record<string, number>>;
	preferences: Record<string, unknown>;
	/** local dates (YYYY-MM-DD) with learning activity, for a non-punitive activity count */
	activeDays: string[];
}

export interface MasteryCheck {
	lessonCompleted: boolean;
	evidenceCount: number;
	distinctExercises: number;
	correctInWindow: number;
	windowSize: number;
	appliedCorrect: boolean;
	met: boolean;
}

/** Context for the reducer: maps concepts to their teaching lesson (from the pack). */
export interface ReducerContext {
	teachingLesson: (conceptId: string) => string | undefined;
}
