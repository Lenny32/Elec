/** Human-readable descriptions of journal events (shared by History and Profile). */
import type { AnyEvent, ContextKind } from '#learning';
import { m } from '#lib/paraglide/messages.js';
import { learning } from '#lib/app/learning.svelte.ts';
import { tx } from '#lib/app/i18n.ts';
import type { IconName } from '#lib/ui/Icon.svelte';
import type { Tone } from '#lib/app/labels.ts';

export const EVENT_LABEL: Record<AnyEvent['type'], () => string> = {
	LESSON_STARTED: m.ev_LESSON_STARTED,
	LESSON_COMPLETED: m.ev_LESSON_COMPLETED,
	CARD_VIEWED: m.ev_CARD_VIEWED,
	ANSWER_SUBMITTED: m.ev_ANSWER_SUBMITTED,
	REVIEW_SUBMITTED: m.ev_REVIEW_SUBMITTED,
	HINT_USED: m.ev_HINT_USED,
	SOLUTION_REVEALED: m.ev_SOLUTION_REVEALED,
	ASSESSMENT_STARTED: m.ev_ASSESSMENT_STARTED,
	ASSESSMENT_COMPLETED: m.ev_ASSESSMENT_COMPLETED,
	ASSESSMENT_ABANDONED: m.ev_ASSESSMENT_ABANDONED,
	DRILL_STARTED: m.ev_DRILL_STARTED,
	DRILL_COMPLETED: m.ev_DRILL_COMPLETED,
	LAB_PARAMETER_CHANGED: m.ev_LAB_PARAMETER_CHANGED,
	PACK_INSTALLED: m.ev_PACK_INSTALLED,
	DATA_IMPORTED: m.ev_DATA_IMPORTED,
	PREFERENCE_CHANGED: m.ev_PREFERENCE_CHANGED
};

export const EVENT_ICON: Record<AnyEvent['type'], IconName> = {
	LESSON_STARTED: 'play',
	LESSON_COMPLETED: 'check-circle',
	CARD_VIEWED: 'eye',
	ANSWER_SUBMITTED: 'target',
	REVIEW_SUBMITTED: 'refresh',
	HINT_USED: 'bulb',
	SOLUTION_REVEALED: 'eye',
	ASSESSMENT_STARTED: 'exam',
	ASSESSMENT_COMPLETED: 'flag',
	ASSESSMENT_ABANDONED: 'x-circle',
	DRILL_STARTED: 'layers',
	DRILL_COMPLETED: 'check-circle',
	LAB_PARAMETER_CHANGED: 'flask',
	PACK_INSTALLED: 'download',
	DATA_IMPORTED: 'upload',
	PREFERENCE_CHANGED: 'settings'
};

const CONTEXT_LABEL: Record<ContextKind, () => string> = {
	lesson: m.history_ctx_lesson,
	practice: m.history_ctx_practice,
	review: m.history_ctx_review,
	exam: m.history_ctx_exam,
	drill: m.history_ctx_drill
};

function lessonName(id: string) {
	const l = learning.ix.lessons.get(id);
	return l ? `${l.number} · ${tx(l.title)}` : id;
}
function examName(id: string) {
	const e = learning.ix.exams.get(id);
	return e ? tx(e.title) : id;
}
function exerciseName(id: string) {
	const ex = learning.ix.exercises.get(id);
	if (!ex) return id;
	const plain = tx(ex.prompt)
		.replace(/\$[^$]*\$/g, '…')
		.replace(/\*\*/g, '')
		.replace(/\s+/g, ' ');
	return plain.length > 80 ? `${plain.slice(0, 79)}…` : plain;
}

export interface EventDescription {
	label: string;
	icon: IconName;
	entity: string;
	detail?: string;
	tone: Tone;
}

export function describe(e: AnyEvent): EventDescription {
	const base = { label: EVENT_LABEL[e.type](), icon: EVENT_ICON[e.type], tone: 'neutral' as Tone };
	switch (e.type) {
		case 'LESSON_STARTED':
		case 'LESSON_COMPLETED':
			return {
				...base,
				entity: lessonName(e.payload.lessonId),
				tone: e.type === 'LESSON_COMPLETED' ? 'success' : 'neutral'
			};
		case 'CARD_VIEWED':
			return {
				...base,
				entity: lessonName(e.payload.lessonId),
				detail: `#${e.payload.cardIndex + 1}`
			};
		case 'ANSWER_SUBMITTED':
		case 'REVIEW_SUBMITTED':
			return {
				...base,
				entity: exerciseName(e.payload.exerciseId),
				detail: `${e.payload.correct ? m.correct() : m.incorrect()} · ${CONTEXT_LABEL[e.payload.context.kind]()}${
					e.payload.independent ? ` · ${m.independent_badge()}` : ''
				}`,
				tone: e.payload.correct ? 'success' : 'danger'
			};
		case 'HINT_USED':
		case 'SOLUTION_REVEALED':
			return { ...base, entity: exerciseName(e.payload.exerciseId) };
		case 'ASSESSMENT_STARTED':
		case 'ASSESSMENT_ABANDONED':
			return { ...base, entity: examName(e.payload.examId) };
		case 'ASSESSMENT_COMPLETED': {
			const p = e.payload;
			const percent = p.total ? Math.round((p.correctCount / p.total) * 100) : 0;
			return {
				...base,
				entity: examName(p.examId),
				detail: `${p.passed ? m.exam_passed() : m.exam_failed()} · ${m.exam_score({
					correct: p.correctCount,
					total: p.total,
					percent
				})}`,
				tone: p.passed ? 'success' : 'warning'
			};
		}
		case 'DRILL_STARTED':
			return { ...base, entity: examName(e.payload.examId) };
		case 'DRILL_COMPLETED': {
			const a = learning.projection.examAttempts[e.payload.examAttemptId];
			return { ...base, entity: a ? examName(a.examId) : '', tone: 'success' };
		}
		case 'LAB_PARAMETER_CHANGED': {
			const lab = learning.ix.labs.get(e.payload.labId);
			return { ...base, entity: lab ? tx(lab.title) : e.payload.labId };
		}
		case 'PACK_INSTALLED':
			return { ...base, entity: `${e.payload.packId} v${e.payload.packVersion}` };
		case 'DATA_IMPORTED':
			return {
				...base,
				entity: e.payload.mode,
				detail: m.settings_import_done({ count: e.payload.importedCount })
			};
		case 'PREFERENCE_CHANGED':
			return { ...base, entity: `${e.payload.key}: ${String(e.payload.value)}` };
	}
}

/** Newest first. */
export function newestFirst(events: AnyEvent[]): AnyEvent[] {
	return [...events].sort((a, b) =>
		a.occurredAt === b.occurredAt ? b.sequence - a.sequence : a.occurredAt < b.occurredAt ? 1 : -1
	);
}
