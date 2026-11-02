import type {
	ConceptStatus,
	LessonState,
	ExamAvailability,
	ExamScore,
	ChapterProgress
} from '../domain/learning-status.js';
/**
 * Derived, display-time statuses (SPEC §7.1, §13.11 "why" explanations).
 * `now` is only used for due/not-due display and availability, never to rewrite history.
 */
import type { PackIndex } from '../domain/catalog.js';
import { chapterConcepts } from '../domain/catalog.js';
import { masteryCheck, type Projection, type ExamAttemptProjection } from './projection.js';

export function isChapterUnlocked(ix: PackIndex, p: Projection, chapterId: string): boolean {
	const ch = ix.chapters.get(chapterId);
	if (!ch || ch.status !== 'authored') return false;
	return ch.prerequisites.every((c) => !!p.concepts[c]?.masteredAt);
}

export function missingChapterPrerequisites(
	ix: PackIndex,
	p: Projection,
	chapterId: string
): string[] {
	const ch = ix.chapters.get(chapterId);
	return (ch?.prerequisites ?? []).filter((c) => !p.concepts[c]?.masteredAt);
}

export function conceptStatus(
	ix: PackIndex,
	p: Projection,
	conceptId: string,
	nowISO: string
): ConceptStatus {
	const def = ix.concepts.get(conceptId);
	const c = p.concepts[conceptId];
	const lessonId = ix.teachingLesson.get(conceptId);
	const check = masteryCheck(p, conceptId, lessonId);
	const missingPrerequisites = def ? missingChapterPrerequisites(ix, p, def.chapterId) : [];
	const base = { check, dueAt: c?.dueAt, masteredAt: c?.masteredAt, missingPrerequisites };
	if (c?.masteredAt) {
		if (c.needsWork) return { ...base, state: 'needs_work' };
		if (c.dueAt && c.dueAt <= nowISO) return { ...base, state: 'review_due' };
		return { ...base, state: 'mastered' };
	}
	if (!def || !isChapterUnlocked(ix, p, def.chapterId)) return { ...base, state: 'locked' };
	const l = lessonId ? p.lessons[lessonId] : undefined;
	if (l?.completedAt || (c?.submissions ?? 0) > 0)
		return { ...base, state: l?.completedAt ? 'practicing' : 'learning' };
	if (l?.startedAt) return { ...base, state: 'learning' };
	return { ...base, state: 'ready' };
}

export function lessonState(ix: PackIndex, p: Projection, lessonId: string): LessonState {
	const l = ix.lessons.get(lessonId);
	if (!l) return 'locked';
	const lp = p.lessons[lessonId];
	if (lp?.completedAt) return 'completed';
	if (!isChapterUnlocked(ix, p, l.chapterId)) return 'locked';
	const ch = ix.chapters.get(l.chapterId)!;
	const i = ch.lessonIds.indexOf(lessonId);
	if (i > 0 && !p.lessons[ch.lessonIds[i - 1]]?.completedAt) return 'locked';
	return lp?.startedAt ? 'in_progress' : 'available';
}

// ───────────── Exams ─────────────

export function attemptsOf(p: Projection, examId: string): ExamAttemptProjection[] {
	return (p.examAttemptOrder[examId] ?? []).map((id) => p.examAttempts[id]).filter(Boolean);
}

export function completedAttempts(p: Projection, examId: string): ExamAttemptProjection[] {
	return attemptsOf(p, examId).filter((a) => a.completedAt);
}

export function examPassed(p: Projection, examId: string): boolean {
	return completedAttempts(p, examId).some((a) => a.passed);
}

export function inProgressAttempt(
	p: Projection,
	examId: string
): ExamAttemptProjection | undefined {
	return attemptsOf(p, examId).find((a) => !a.completedAt && !a.abandonedAt);
}

export function examAvailability(ix: PackIndex, p: Projection, examId: string): ExamAvailability {
	const exam = ix.exams.get(examId);
	if (!exam) return { kind: 'locked', reason: 'not_authored', detail: [] };
	const prog = inProgressAttempt(p, examId);
	if (prog) return { kind: 'in_progress', attemptId: prog.attemptId };
	if (exam.scope === 'chapter') {
		const ch = ix.chapters.get(exam.scopeId);
		if (!ch || !isChapterUnlocked(ix, p, ch.id))
			return {
				kind: 'locked',
				reason: 'chapter_locked',
				detail: missingChapterPrerequisites(ix, p, exam.scopeId)
			};
		const missing = ch.lessonIds.filter((l) => !p.lessons[l]?.completedAt);
		if (missing.length) return { kind: 'locked', reason: 'lessons_incomplete', detail: missing };
	} else {
		const chapterIds =
			exam.scope === 'module'
				? (ix.modules.get(exam.scopeId)?.chapterIds ?? [])
				: ix.pack.chapters.map((c) => c.id);
		const notPassed = chapterIds.filter((cid) => {
			const ch = ix.chapters.get(cid);
			return !ch || ch.status !== 'authored' || !ch.examId || !examPassed(p, ch.examId);
		});
		if (notPassed.length)
			return { kind: 'locked', reason: 'chapters_not_passed', detail: notPassed };
	}
	const done = completedAttempts(p, examId);
	const last = done[done.length - 1];
	// ADR 0001: a failed attempt requires its consolidation drill before a retake.
	if (last && !last.passed && !last.drill?.completedAt)
		return { kind: 'needs_drill', attemptId: last.attemptId, drillStarted: !!last.drill };
	return { kind: 'available', formIndex: done.length % exam.forms.length };
}

/** Scores a finished attempt (unanswered items count as wrong). */
export function scoreAttempt(
	ix: PackIndex,
	a: ExamAttemptProjection,
	passPercent: number
): ExamScore {
	const wrongItemIds = a.itemIds.filter((id) => !a.answers[id]?.correct);
	const correctCount = a.itemIds.length - wrongItemIds.length;
	const percent = (correctCount / a.itemIds.length) * 100;
	const missed = new Set<string>();
	for (const id of wrongItemIds)
		for (const c of ix.exercises.get(id)?.conceptIds ?? []) missed.add(c);
	return {
		correctCount,
		total: a.itemIds.length,
		percent,
		// integer comparison avoids float edge cases: correct*100 >= pass*total
		passed: correctCount * 100 >= passPercent * a.itemIds.length,
		wrongItemIds,
		missedConceptIds: [...missed].sort()
	};
}

export function failedAttempts(p: Projection): ExamAttemptProjection[] {
	return Object.values(p.examAttempts)
		.filter((a) => a.completedAt && !a.passed)
		.sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1));
}

export function chapterProgress(ix: PackIndex, p: Projection, chapterId: string): ChapterProgress {
	const ch = ix.chapters.get(chapterId)!;
	const concepts = chapterConcepts(ix, chapterId);
	const conceptsMastered = concepts.filter((c) => p.concepts[c]?.masteredAt).length;
	const lessonsCompleted = ch.lessonIds.filter((l) => p.lessons[l]?.completedAt).length;
	const passed = ch.examId ? examPassed(p, ch.examId) : false;
	return {
		unlocked: isChapterUnlocked(ix, p, chapterId),
		lessonsCompleted,
		lessonCount: ch.lessonIds.length,
		conceptsMastered,
		conceptCount: concepts.length,
		examPassed: passed,
		complete: ch.status === 'authored' && passed && conceptsMastered === concepts.length
	};
}

export function dueConcepts(ix: PackIndex, p: Projection, nowISO: string): string[] {
	return Object.values(p.concepts)
		.filter((c) => c.masteredAt && c.dueAt && c.dueAt <= nowISO && ix.concepts.has(c.conceptId))
		.sort((a, b) =>
			a.dueAt! < b.dueAt!
				? -1
				: a.dueAt! > b.dueAt!
					? 1
					: a.needsWork !== b.needsWork
						? a.needsWork
							? -1
							: 1
						: a.conceptId < b.conceptId
							? -1
							: 1
		)
		.map((c) => c.conceptId);
}

/** The next lesson to continue: first in-progress, else first available, in course order. */
export function nextLesson(ix: PackIndex, p: Projection): string | undefined {
	const order = ix.pack.chapters.flatMap((c) => c.lessonIds);
	return (
		order.find((l) => lessonState(ix, p, l) === 'in_progress') ??
		order.find((l) => lessonState(ix, p, l) === 'available')
	);
}

export type {
	ConceptState,
	ConceptStatus,
	LessonState,
	ExamAvailability,
	ExamScore,
	ChapterProgress
} from '../domain/learning-status.js';
