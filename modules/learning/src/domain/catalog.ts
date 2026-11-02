/** Fast lookups over a validated pack. Pure. */
import type {
	Chapter,
	Concept,
	Diagram,
	Exam,
	Exercise,
	Formula,
	Lab,
	Lesson,
	Module,
	Pack
} from './course.js';

export interface PackIndex {
	pack: Pack;
	modules: Map<string, Module>;
	chapters: Map<string, Chapter>;
	concepts: Map<string, Concept>;
	formulas: Map<string, Formula>;
	diagrams: Map<string, Diagram>;
	labs: Map<string, Lab>;
	lessons: Map<string, Lesson>;
	exercises: Map<string, Exercise>;
	exams: Map<string, Exam>;
	/** concept → the lesson teaching it */
	teachingLesson: Map<string, string>;
	/** concept → exercises assessing it (sorted by id) */
	exercisesByConcept: Map<string, Exercise[]>;
	/** formula → lessons / exercises using it */
	lessonsByFormula: Map<string, string[]>;
	exercisesByFormula: Map<string, string[]>;
	/** exercise → exam ids whose forms contain it */
	examsByExercise: Map<string, string[]>;
	moduleOfChapter: Map<string, string>;
}

const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));

export function indexPack(pack: Pack): PackIndex {
	const teachingLesson = new Map<string, string>();
	const lessonsByFormula = new Map<string, string[]>();
	for (const l of pack.lessons) {
		for (const c of l.conceptsTaught) teachingLesson.set(c, l.id);
		const fs = new Set([
			...l.formulasUsed,
			...l.cards.flatMap((c) => (c.type === 'formula' ? [c.formulaId] : []))
		]);
		for (const f of fs) lessonsByFormula.set(f, [...(lessonsByFormula.get(f) ?? []), l.id]);
	}
	const exercisesByConcept = new Map<string, Exercise[]>();
	const exercisesByFormula = new Map<string, string[]>();
	for (const e of [...pack.exercises].sort((a, b) => (a.id < b.id ? -1 : 1))) {
		for (const c of e.conceptIds)
			exercisesByConcept.set(c, [...(exercisesByConcept.get(c) ?? []), e]);
		for (const f of e.formulaIds)
			exercisesByFormula.set(f, [...(exercisesByFormula.get(f) ?? []), e.id]);
	}
	const examsByExercise = new Map<string, string[]>();
	for (const x of pack.exams)
		for (const f of x.forms)
			for (const i of f.itemIds) {
				const list = examsByExercise.get(i) ?? [];
				if (!list.includes(x.id)) list.push(x.id);
				examsByExercise.set(i, list);
			}
	const moduleOfChapter = new Map<string, string>();
	for (const m of pack.modules) for (const c of m.chapterIds) moduleOfChapter.set(c, m.id);
	return {
		pack,
		modules: byId(pack.modules),
		chapters: byId(pack.chapters),
		concepts: byId(pack.concepts),
		formulas: byId(pack.formulas),
		diagrams: byId(pack.diagrams),
		labs: byId(pack.labs),
		lessons: byId(pack.lessons),
		exercises: byId(pack.exercises),
		exams: byId(pack.exams),
		teachingLesson,
		exercisesByConcept,
		lessonsByFormula,
		exercisesByFormula,
		examsByExercise,
		moduleOfChapter
	};
}

/** Exam items of a module/final exam: the forms list them explicitly. */
export function chapterConcepts(ix: PackIndex, chapterId: string): string[] {
	return ix.pack.concepts.filter((c) => c.chapterId === chapterId).map((c) => c.id);
}
