/** Shared learning contracts, independent of the engine implementation. */
import type { MasteryCheck } from './learning-state.js';

export type ConceptState =
	'locked' | 'ready' | 'learning' | 'practicing' | 'mastered' | 'review_due' | 'needs_work';

export interface ConceptStatus {
	state: ConceptState;
	check: MasteryCheck;
	dueAt?: string;
	masteredAt?: string;
	/** Prerequisites not yet mastered (why locked). */
	missingPrerequisites: string[];
}

export type LessonState = 'locked' | 'available' | 'in_progress' | 'completed';

export type ExamAvailability =
	| { kind: 'available'; formIndex: number }
	| { kind: 'in_progress'; attemptId: string }
	| { kind: 'needs_drill'; attemptId: string; drillStarted: boolean }
	| {
			kind: 'locked';
			reason: 'chapter_locked' | 'lessons_incomplete' | 'chapters_not_passed' | 'not_authored';
			detail: string[];
	  };

export interface ExamScore {
	correctCount: number;
	total: number;
	percent: number;
	passed: boolean;
	wrongItemIds: string[];
	missedConceptIds: string[];
}

// ───────────── Chapters & dashboard ─────────────

export interface ChapterProgress {
	unlocked: boolean;
	lessonsCompleted: number;
	lessonCount: number;
	conceptsMastered: number;
	conceptCount: number;
	examPassed: boolean;
	complete: boolean;
}
