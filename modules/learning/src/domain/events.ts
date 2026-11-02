/**
 * Learning event journal types (SPEC §7.5). Events are immutable; projections are folded from them.
 * `correct` and `independent` are frozen at submission time so content updates never rewrite history.
 */
import type { Response, GradeFeedback } from './answer.js';

export const RULES_VERSION = 'rules-1';
export const SELECTION_POLICY_VERSION = 'select-1';
export const PAYLOAD_SCHEMA_VERSION = 1;

export type ContextKind = 'lesson' | 'practice' | 'review' | 'exam' | 'drill';

export interface SubmissionPayload {
	exerciseId: string;
	exerciseVersion: number;
	/** One presentation of an item to the learner; retries share it. */
	presentationId: string;
	context: { kind: ContextKind; refId: string };
	/** 0 for the first submission in this presentation. */
	submissionIndex: number;
	response: Response;
	correct: boolean;
	feedback: GradeFeedback;
	hintsUsed: number;
	/** First submission, no hint used (SPEC §7.2) — frozen. */
	independent: boolean;
	conceptIds: string[];
	exerciseKind: 'guided' | 'independent' | 'applied';
}

export type EventPayloads = {
	LESSON_STARTED: { lessonId: string; lessonVersion: number };
	CARD_VIEWED: { lessonId: string; cardId: string; cardIndex: number };
	LESSON_COMPLETED: { lessonId: string; lessonVersion: number; conceptIds: string[] };
	ANSWER_SUBMITTED: SubmissionPayload;
	/** Spaced-review answer for `reviewConceptId` (also counts as evidence). */
	REVIEW_SUBMITTED: SubmissionPayload & { reviewConceptId: string; scheduled: boolean };
	HINT_USED: { exerciseId: string; presentationId: string; hintIndex: number };
	SOLUTION_REVEALED: { exerciseId: string; presentationId: string };
	ASSESSMENT_STARTED: {
		attemptId: string;
		examId: string;
		examVersion: number;
		formId: string;
		itemIds: string[];
		selectionPolicyVersion: string;
	};
	ASSESSMENT_COMPLETED: {
		attemptId: string;
		examId: string;
		formId: string;
		correctCount: number;
		total: number;
		passPercent: number;
		passed: boolean;
		/** Concepts touched by wrongly answered items, sorted. */
		missedConceptIds: string[];
		wrongItemIds: string[];
	};
	ASSESSMENT_ABANDONED: { attemptId: string; examId: string };
	DRILL_STARTED: {
		drillId: string;
		examAttemptId: string;
		examId: string;
		itemIds: string[];
		selectionPolicyVersion: string;
	};
	DRILL_COMPLETED: { drillId: string; examAttemptId: string };
	LAB_PARAMETER_CHANGED: { labId: string; labVersion: number; params: Record<string, number> };
	PACK_INSTALLED: { packId: string; packVersion: string; contentHash: string };
	DATA_IMPORTED: { mode: 'merge' | 'replace'; importedCount: number; sourceDeviceId: string };
	PREFERENCE_CHANGED: { key: string; value: unknown };
};

export type EventType = keyof EventPayloads;

export interface LearningEvent<T extends EventType = EventType> {
	eventId: string;
	deviceId: string;
	/** Monotonic per device. */
	sequence: number;
	occurredAt: string; // ISO UTC
	timezone: string; // IANA
	rulesVersion: string;
	packId: string;
	packVersion: string;
	entityId: string;
	entityVersion: number;
	sessionId: string;
	type: T;
	payload: EventPayloads[T];
	payloadSchemaVersion: number;
	previousEventHash?: string;
}

export type AnyEvent = { [K in EventType]: LearningEvent<K> }[EventType];

/** Deterministic merge ordering (SPEC §7.5). */
export function compareEvents(a: LearningEvent, b: LearningEvent): number {
	if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
	if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
	if (a.sequence !== b.sequence) return a.sequence - b.sequence;
	return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}
