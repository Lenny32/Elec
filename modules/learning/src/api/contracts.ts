/** Public, transport-independent API. Only JSON values cross this boundary. */
import type { Pack } from '../domain/course.js';
import type { ContextKind, AnyEvent } from '../domain/events.js';
import type { Projection, ExamAttemptProjection } from '../domain/learning-state.js';
import type { Grade, Response } from '../domain/answer.js';
import type {
	ChapterProgress,
	ConceptStatus,
	ExamAvailability,
	LessonState
} from '../domain/learning-status.js';
import type { Selection } from '../domain/selection.js';
import type { ExportFile, ImportCheck } from '../domain/backup-format.js';

export type * from '../domain/course.js';
export type { AnyEvent, ContextKind } from '../domain/events.js';
export { RULES_VERSION } from '../domain/events.js';
export type { Projection, ExamAttemptProjection } from '../domain/learning-state.js';
export type { Grade, Response } from '../domain/answer.js';
export type { ConceptState, LessonState } from '../domain/learning-status.js';
export type { Selection, SelectedItem } from '../domain/selection.js';
export type { ExportFile, ImportPreview, ImportCheck } from '../domain/backup-format.js';

export interface SubmitContext {
	kind: ContextKind;
	refId: string;
	presentationId: string;
	submissionIndex: number;
	hintsUsed: number;
	sessionId: string;
	reviewConceptId?: string;
}

export interface LearningViews {
	chapters: Record<string, ChapterProgress>;
	missingPrerequisites: Record<string, string[]>;
	concepts: Record<string, ConceptStatus>;
	lessons: Record<string, LessonState>;
	exams: Record<string, ExamAvailability>;
	passedExams: Record<string, boolean>;
	attempts: Record<string, ExamAttemptProjection[]>;
	nextLessonId?: string;
	dueConceptIds: string[];
	examsToConsolidate: ExamAttemptProjection[];
	masteredCount: number;
}

export interface LearningSnapshot {
	projection: Projection;
	views: LearningViews;
	lastExportAt?: string;
	contentHash: string;
	generatedAt: string;
}

/** Commands take identifiers, never trusted exercise answers, grades, or event payloads. */
export interface Operations {
	catalog: { input: Record<string, never>; output: Pack };
	snapshot: { input: Record<string, never>; output: LearningSnapshot };
	startLesson: { input: { lessonId: string }; output: null };
	viewCard: { input: { lessonId: string; cardId: string; cardIndex: number }; output: null };
	completeLesson: { input: { lessonId: string }; output: null };
	submit: {
		input: { exerciseId: string; response: Response; context: SubmitContext };
		output: Grade;
	};
	useHint: {
		input: { exerciseId: string; presentationId: string; hintIndex: number; sessionId: string };
		output: null;
	};
	revealSolution: {
		input: { exerciseId: string; presentationId: string; sessionId: string };
		output: null;
	};
	startExam: { input: { examId: string }; output: string | null };
	finishExam: { input: { attemptId: string }; output: null };
	startDrill: { input: { attemptId: string }; output: string | null };
	selectPractice: {
		input: { conceptIds: string[]; chapterId?: string; perConcept: number; sessionId: string };
		output: Selection;
	};
	selectReview: { input: { max: number; sessionId: string }; output: Selection };
	labChanged: { input: { labId: string; params: Record<string, number> }; output: null };
	setPreference: { input: { key: string; value: unknown }; output: null };
	allEvents: { input: Record<string, never>; output: AnyEvent[] };
	exportData: { input: Record<string, never>; output: ExportFile };
	exportCSV: { input: Record<string, never>; output: string };
	inspectImport: { input: { text: string }; output: ImportCheck };
	importData: { input: { text: string; mode: 'merge' | 'replace' }; output: number };
	markExported: { input: Record<string, never>; output: null };
	eraseAll: { input: Record<string, never>; output: null };
}

export type Operation = keyof Operations;
export type Input<K extends Operation> = Operations[K]['input'];
export type Output<K extends Operation> = Operations[K]['output'];
export interface LearningAPI {
	call<K extends Operation>(operation: K, input: Input<K>): Promise<Output<K>>;
	/** Storage adapters can notify consumers when another tab updates the state. */
	subscribe?(listener: () => void): () => void;
	close(): void;
}
