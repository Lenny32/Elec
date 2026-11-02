import type { SelectedItem, Selection } from '../domain/selection.js';
/**
 * Deterministic item selection (SPEC §7.3). No randomness: same projection + pack + clock → same ids.
 */
import type { PackIndex } from '../domain/catalog.js';
import type { Exercise } from '../domain/course.js';
import type { Projection, ExamAttemptProjection } from './projection.js';
import { dueConcepts } from './status.js';
import { SELECTION_POLICY_VERSION } from './events.js';

const seenCount = (p: Projection, id: string) => p.exerciseStats[id]?.presentations.length ?? 0;

/** Exercise ids answered in the previous `n` practice/review/drill sessions. */
function recentlySeen(p: Projection, n: number, currentSessionId?: string): Set<string> {
	const sessions = p.practiceSessions.filter((s) => s !== currentSessionId).slice(-n);
	const out = new Set<string>();
	for (const [id, st] of Object.entries(p.exerciseStats))
		if (st.sessionIds.some((s) => sessions.includes(s))) out.add(id);
	return out;
}

function pick(
	p: Projection,
	candidates: Exercise[],
	exclude: Set<string>,
	recent: Set<string>
): { ex: Exercise; repeated: boolean } | undefined {
	const pool = candidates.filter((e) => !exclude.has(e.id));
	if (!pool.length) return undefined;
	const fresh = pool.filter((e) => !recent.has(e.id));
	if (fresh.length) {
		const ex = [...fresh].sort(
			(a, b) =>
				seenCount(p, a.id) - seenCount(p, b.id) ||
				a.difficulty - b.difficulty ||
				(a.id < b.id ? -1 : 1)
		)[0];
		return { ex, repeated: false };
	}
	const ex = [...pool].sort((a, b) => {
		const la = p.exerciseStats[a.id]?.lastSeenAt ?? '';
		const lb = p.exerciseStats[b.id]?.lastSeenAt ?? '';
		return la < lb ? -1 : la > lb ? 1 : a.id < b.id ? -1 : 1;
	})[0];
	return { ex, repeated: true };
}

const practicePool = (ix: PackIndex, conceptId: string) =>
	(ix.exercisesByConcept.get(conceptId) ?? []).filter(
		(e) => e.pool === 'practice' && e.kind !== 'guided'
	);

/** Spaced review: one item per due concept, at most `max` concepts. */
export function selectReview(
	ix: PackIndex,
	p: Projection,
	nowISO: string,
	max = 5,
	sessionId?: string
): Selection {
	const recent = recentlySeen(p, 2, sessionId);
	const used = new Set<string>();
	const items: SelectedItem[] = [];
	for (const cid of dueConcepts(ix, p, nowISO).slice(0, max)) {
		const r = pick(p, practicePool(ix, cid), used, recent);
		if (!r) continue;
		used.add(r.ex.id);
		items.push({ exerciseId: r.ex.id, conceptId: cid, repeated: r.repeated });
	}
	return { policyVersion: SELECTION_POLICY_VERSION, items };
}

/**
 * Practice set for given concepts (e.g. a chapter's not-yet-mastered concepts), `perConcept` items each,
 * interleaved concept by concept for spacing.
 */
export function selectPractice(
	ix: PackIndex,
	p: Projection,
	conceptIds: string[],
	perConcept = 2,
	sessionId?: string
): Selection {
	const recent = recentlySeen(p, 2, sessionId);
	const used = new Set<string>();
	const items: SelectedItem[] = [];
	const ordered = [...conceptIds].sort();
	for (let round = 0; round < perConcept; round++) {
		for (const cid of ordered) {
			const r = pick(p, practicePool(ix, cid), used, recent);
			if (!r) continue;
			used.add(r.ex.id);
			items.push({ exerciseId: r.ex.id, conceptId: cid, repeated: r.repeated });
		}
	}
	return { policyVersion: SELECTION_POLICY_VERSION, items };
}

/** Exam form rotation A → B → C by completed attempt count. */
export function selectExamForm(ix: PackIndex, examId: string, completedCount: number) {
	const exam = ix.exams.get(examId)!;
	const form = exam.forms[completedCount % exam.forms.length];
	return { policyVersion: SELECTION_POLICY_VERSION, formId: form.id, itemIds: [...form.itemIds] };
}

/**
 * Consolidation drill after a failed exam (ADR 0001): for each missed concept (sorted), up to
 * `drillItemsPerConcept` practice-pool items that were NOT in the failed attempt, least-seen first.
 */
export function selectDrill(
	ix: PackIndex,
	p: Projection,
	attempt: ExamAttemptProjection
): Selection {
	const exam = ix.exams.get(attempt.examId)!;
	const exclude = new Set(attempt.itemIds);
	const items: SelectedItem[] = [];
	for (const cid of [...attempt.missedConceptIds].sort()) {
		const pool = (ix.exercisesByConcept.get(cid) ?? []).filter((e) => e.pool === 'practice');
		for (let k = 0; k < exam.drillItemsPerConcept; k++) {
			const r = pick(p, pool, exclude, new Set());
			if (!r) break;
			exclude.add(r.ex.id);
			items.push({ exerciseId: r.ex.id, conceptId: cid, repeated: false });
		}
	}
	return { policyVersion: SELECTION_POLICY_VERSION, items };
}

export type { SelectedItem, Selection } from '../domain/selection.js';
