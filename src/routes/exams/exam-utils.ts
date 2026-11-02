/** Shared helpers for the exam screens (route-local). */
import type { Exam, Exercise, Response, ExamAttemptProjection } from '#learning';
import type { PackIndex } from '#learning/domain/catalog.ts';
import { unitSymbol } from '#learning/domain/units.ts';
import { m } from '#lib/paraglide/messages.js';
import { tx, fmtNumber } from '#lib/app/i18n.ts';

export const formLetter = (index: number) => String.fromCharCode(65 + index);

/** Letter of a form id ("A", or position in the exam's forms). */
export function formLabel(exam: Exam | undefined, formId: string): string {
	if (!exam) return formId;
	const i = exam.forms.findIndex((f) => f.id === formId);
	return i >= 0 ? formLetter(i) : formId;
}

/** Link text for an exam: chapter exams carry the chapter number and title. */
export function examLabel(ix: PackIndex, exam: Exam): string {
	if (exam.scope === 'chapter') {
		const ch = ix.chapters.get(exam.scopeId);
		if (ch) return m.exam_chapter_link({ number: ch.number, title: tx(ch.title) });
	}
	return tx(exam.title);
}

export function scopeLabel(exam: Exam): string {
	return exam.scope === 'chapter'
		? m.exam_scope_chapter()
		: exam.scope === 'module'
			? m.exam_scope_module()
			: m.exam_scope_final();
}

export function itemCount(exam: Exam): number {
	return exam.forms[0]?.itemIds.length ?? 0;
}

/** Human label for an id in a locked-exam `detail` list (concept, lesson or chapter). */
export function detailLabel(ix: PackIndex, id: string): string {
	const lesson = ix.lessons.get(id);
	if (lesson) return `${lesson.number} · ${tx(lesson.title)}`;
	const chapter = ix.chapters.get(id);
	if (chapter) return m.exam_chapter_link({ number: chapter.number, title: tx(chapter.title) });
	const concept = ix.concepts.get(id);
	if (concept) return tx(concept.name);
	return id;
}

export function percentOf(a: ExamAttemptProjection): number {
	if (!a.total) return 0;
	return Math.round(((a.correctCount ?? 0) / a.total) * 100);
}

/** Learner response formatted for display. */
export function formatResponse(ex: Exercise, r: Response): string[] {
	if (r.type === 'numeric') return [`${r.raw} ${unitSymbol(r.unit)}`.trim()];
	if (r.type === 'choice') {
		const opt = 'options' in ex ? ex.options.find((o) => o.id === r.optionId) : undefined;
		return [opt ? tx(opt.text) : r.optionId];
	}
	const items = ex.type === 'ordering' ? new Map(ex.items.map((i) => [i.id, tx(i.text)])) : null;
	return r.order.map((id) => items?.get(id) ?? id);
}

/** The expected answer formatted for display. */
export function formatCorrect(ex: Exercise): string[] {
	if (ex.type === 'numeric' || ex.type === 'unit_conversion')
		return [
			`${fmtNumber(ex.answer.canonicalValue, 6)} ${unitSymbol(ex.answer.canonicalUnit)}`.trim()
		];
	if (ex.type === 'ordering') {
		const items = new Map(ex.items.map((i) => [i.id, tx(i.text)]));
		return ex.correctOrder.map((id) => items.get(id) ?? id);
	}
	const opt = ex.options.find((o) => o.id === ex.correctOptionId);
	return [opt ? tx(opt.text) : ex.correctOptionId];
}
