/**
 * Pack validator (SPEC §13.12): schema + cross-reference + pedagogy + math-domain checks.
 * Runs in unit tests (build gate) and at pack install time.
 */
import {
	Pack,
	type Diagram,
	type Exercise,
	type NumericAnswer,
	type Pack as PackT
} from './course.js';
import { dimensionOf, toSI, type UnitId } from './units.js';
import { inputDimension, runAlgorithm, algorithmDef, type AlgorithmId } from './formulas.js';
import { pinNames, pinPositions, samePoint, onSegment, segments, type Pt } from './geometry.js';
import { isCorrectNumeric } from './numeric-answer.js';

export interface ValidationIssue {
	path: string;
	message: string;
}

export type ValidationResult = { ok: true; pack: PackT } | { ok: false; issues: ValidationIssue[] };

export function validatePack(input: unknown): ValidationResult {
	const parsed = Pack.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
		};
	}
	const issues = crossCheck(parsed.data);
	return issues.length ? { ok: false, issues } : { ok: true, pack: parsed.data };
}

export function crossCheck(pack: PackT): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const err = (path: string, message: string) => issues.push({ path, message });

	const index = <T extends { id: string }>(kind: string, arr: T[]) => {
		const m = new Map<string, T>();
		for (const x of arr) {
			if (m.has(x.id)) err(`${kind}.${x.id}`, 'duplicate id');
			m.set(x.id, x);
		}
		return m;
	};
	const modules = index('module', pack.modules);
	const chapters = index('chapter', pack.chapters);
	const concepts = index('concept', pack.concepts);
	const formulas = index('formula', pack.formulas);
	const diagrams = index('diagram', pack.diagrams);
	const labs = index('lab', pack.labs);
	const lessons = index('lesson', pack.lessons);
	const exercises = index('exercise', pack.exercises);
	const exams = index('exam', pack.exams);

	const ref = (path: string, map: Map<string, unknown>, id: string | undefined) => {
		if (id !== undefined && !map.has(id)) err(path, `unknown reference ${id}`);
	};

	// Modules & chapters
	for (const m of pack.modules) {
		m.chapterIds.forEach((c) => ref(`module.${m.id}.chapterIds`, chapters, c));
		ref(`module.${m.id}.examId`, exams, m.examId);
	}
	for (const c of pack.chapters) {
		const p = `chapter.${c.id}`;
		ref(`${p}.moduleId`, modules, c.moduleId);
		if (!modules.get(c.moduleId)?.chapterIds.includes(c.id))
			err(p, 'chapter not listed by its module');
		c.prerequisites.forEach((x) => {
			ref(`${p}.prerequisites`, concepts, x);
			if (concepts.get(x)?.chapterId === c.id)
				err(`${p}.prerequisites`, `${x} is taught in this same chapter`);
		});
		c.lessonIds.forEach((x) => {
			ref(`${p}.lessonIds`, lessons, x);
			if (lessons.get(x) && lessons.get(x)!.chapterId !== c.id)
				err(`${p}.lessonIds`, `${x} belongs to another chapter`);
		});
		c.labIds.forEach((x) => ref(`${p}.labIds`, labs, x));
		ref(`${p}.examId`, exams, c.examId);
		if (c.status === 'authored') {
			if (c.lessonIds.length < 4 || c.lessonIds.length > 8)
				err(p, 'authored chapter needs 4–8 lessons');
			if (c.labIds.length < 1) err(p, 'authored chapter needs ≥1 lab');
			if (!c.examId) err(p, 'authored chapter needs an exam');
			if (!c.miniProject) err(p, 'authored chapter needs a mini-project');
			const chapterExercises = pack.exercises.filter((e) =>
				e.conceptIds.some((cid) => concepts.get(cid)?.chapterId === c.id)
			);
			if (chapterExercises.length < 8)
				err(p, `authored chapter needs ≥8 exercises (has ${chapterExercises.length})`);
		} else if (c.lessonIds.length || c.examId) {
			err(p, 'outline chapter must not reference lessons or exams');
		}
	}

	// Concepts: references + acyclic prerequisite graph (concept → prerequisites)
	for (const c of pack.concepts) {
		ref(`concept.${c.id}.chapterId`, chapters, c.chapterId);
		c.prerequisites.forEach((x) => ref(`concept.${c.id}.prerequisites`, concepts, x));
	}
	const cycle = findCycle(
		pack.concepts.map((c) => c.id),
		(id) => [
			...(concepts.get(id)?.prerequisites ?? []),
			...(chapters.get(concepts.get(id)?.chapterId ?? '')?.prerequisites ?? [])
		]
	);
	if (cycle) err('concepts', `prerequisite cycle: ${cycle.join(' → ')}`);

	// Formulas
	for (const f of pack.formulas) {
		const p = `formula.${f.id}`;
		f.conceptIds.forEach((x) => ref(`${p}.conceptIds`, concepts, x));
		const def = algorithmDef(f.algorithm as AlgorithmId);
		if (def.output !== dimensionOf(f.output.unit))
			err(p, `output unit ${f.output.unit} ≠ algorithm dimension ${def.output}`);
		for (const v of f.inputs) {
			const d = inputDimension(f.algorithm, v.symbol);
			if (!d) err(p, `input ${v.symbol} not accepted by ${f.algorithm}`);
			else if (d !== dimensionOf(v.unit))
				err(p, `input ${v.symbol} unit ${v.unit} has wrong dimension`);
		}
		checkComputation(
			p + '.workedExample',
			f.algorithm,
			f.workedExample.inputs,
			f.workedExample.result,
			f.workedExample.unit,
			err,
			1e-3
		);
	}

	// Diagrams
	for (const d of pack.diagrams) validateDiagram(d, err);

	// Labs
	for (const l of pack.labs) {
		const p = `lab.${l.id}`;
		ref(`${p}.diagramId`, diagrams, l.diagramId);
		for (const prm of l.params) {
			if (prm.min > prm.max) err(p, `param ${prm.key} min > max`);
			if (prm.default < prm.min || prm.default > prm.max)
				err(p, `param ${prm.key} default out of range`);
		}
		const d = diagrams.get(l.diagramId);
		const keys = new Set([...l.params.map((x) => x.key), ...Object.keys(l.constants)]);
		d?.components.forEach((c) => {
			if (c.value && 'param' in c.value && !keys.has(c.value.param))
				err(p, `diagram ${d.id} binds unknown param ${c.value.param}`);
		});
	}

	// Exercises
	for (const e of pack.exercises) validateExercise(e, err, { concepts, formulas, diagrams });

	// Lessons
	for (const l of pack.lessons) {
		const p = `lesson.${l.id}`;
		ref(`${p}.chapterId`, chapters, l.chapterId);
		l.conceptsTaught.forEach((x) => {
			ref(`${p}.conceptsTaught`, concepts, x);
			if (concepts.get(x) && concepts.get(x)!.chapterId !== l.chapterId)
				err(p, `${x} is owned by another chapter`);
		});
		l.formulasUsed.forEach((x) => ref(`${p}.formulasUsed`, formulas, x));
		const cardIds = new Set<string>();
		for (const card of l.cards) {
			if (cardIds.has(card.id)) err(p, `duplicate card id ${card.id}`);
			cardIds.add(card.id);
			if (card.type === 'diagram') ref(`${p}.${card.id}`, diagrams, card.diagramId);
			if (card.type === 'formula') ref(`${p}.${card.id}`, formulas, card.formulaId);
			if (card.type === 'parameter_lab') ref(`${p}.${card.id}`, labs, card.labId);
			if (card.type === 'exercise') {
				ref(`${p}.${card.id}`, exercises, card.exerciseId);
				if (exercises.get(card.exerciseId)?.pool === 'exam')
					err(p, `lesson uses exam-pool item ${card.exerciseId}`);
			}
		}
		if (!l.cards.some((c) => c.type === 'exercise'))
			err(p, 'lesson needs at least one exercise card');
	}
	// Every concept is taught by exactly one lesson in authored chapters
	for (const c of pack.concepts) {
		const ch = chapters.get(c.chapterId);
		if (ch?.status !== 'authored') continue;
		const teaching = pack.lessons.filter((l) => l.conceptsTaught.includes(c.id));
		if (teaching.length !== 1)
			err(`concept.${c.id}`, `must be taught by exactly one lesson (found ${teaching.length})`);
		// Mastery feasibility (SPEC §7.2): ≥4 distinct items, ≥1 applied, ≥3 practice-pool for reviews/drills
		const items = pack.exercises.filter((e) => e.conceptIds.includes(c.id));
		const practice = items.filter((e) => e.pool === 'practice');
		if (items.length < 4)
			err(`concept.${c.id}`, `needs ≥4 exercises for mastery (has ${items.length})`);
		if (!items.some((e) => e.kind === 'applied'))
			err(`concept.${c.id}`, 'needs ≥1 applied exercise');
		if (practice.length < 3)
			err(`concept.${c.id}`, `needs ≥3 practice-pool exercises (has ${practice.length})`);
	}

	// Exams
	for (const x of pack.exams) {
		const p = `exam.${x.id}`;
		if (x.scope === 'chapter') {
			ref(`${p}.scopeId`, chapters, x.scopeId);
			if (chapters.get(x.scopeId)?.examId !== x.id)
				err(p, 'chapter does not point back to this exam');
		} else if (x.scope === 'module') {
			ref(`${p}.scopeId`, modules, x.scopeId);
			if (modules.get(x.scopeId)?.examId !== x.id)
				err(p, 'module does not point back to this exam');
		}
		const formIds = new Set<string>();
		const seenItems = new Map<string, string>();
		for (const f of x.forms) {
			if (formIds.has(f.id)) err(p, `duplicate form ${f.id}`);
			formIds.add(f.id);
			if (new Set(f.itemIds).size !== f.itemIds.length) err(p, `form ${f.id} repeats an item`);
			if (x.scope === 'chapter' && f.itemIds.length !== 10)
				err(p, `chapter exam form ${f.id} must have 10 items`);
			for (const it of f.itemIds) {
				ref(`${p}.${f.id}`, exercises, it);
				const e = exercises.get(it);
				if (e && e.pool !== 'exam') err(p, `form ${f.id} uses practice-pool item ${it}`);
				if (x.scope === 'chapter') {
					if (seenItems.has(it))
						err(
							p,
							`item ${it} appears in forms ${seenItems.get(it)} and ${f.id} (chapter forms must be disjoint)`
						);
					seenItems.set(it, f.id);
					if (e && !e.conceptIds.some((cid) => concepts.get(cid)?.chapterId === x.scopeId))
						err(p, `item ${it} does not assess this chapter`);
				}
			}
		}
		// Drill feasibility: every assessed concept has enough practice items.
		const assessed = new Set(
			x.forms.flatMap((f) => f.itemIds.flatMap((i) => exercises.get(i)?.conceptIds ?? []))
		);
		for (const cid of assessed) {
			const n = pack.exercises.filter(
				(e) => e.pool === 'practice' && e.conceptIds.includes(cid)
			).length;
			if (n < x.drillItemsPerConcept)
				err(p, `concept ${cid} has ${n} practice items, drill needs ${x.drillItemsPerConcept}`);
		}
	}

	// Unused content is a smell, not an error — but orphaned exam items are errors.
	for (const e of pack.exercises) {
		if (e.pool === 'exam' && !pack.exams.some((x) => x.forms.some((f) => f.itemIds.includes(e.id))))
			err(`exercise.${e.id}`, 'exam-pool item not used by any exam form');
	}
	return issues;
}

function checkComputation(
	path: string,
	algorithm: AlgorithmId,
	inputs: Record<string, { value: number; unit: UnitId }>,
	expected: number,
	unit: UnitId,
	err: (p: string, m: string) => void,
	relTol: number
) {
	const si: Record<string, number> = {};
	for (const [k, v] of Object.entries(inputs)) {
		const d = inputDimension(algorithm, k);
		if (!d) return err(path, `input ${k} not accepted by ${algorithm}`);
		if (d !== dimensionOf(v.unit)) return err(path, `input ${k} unit ${v.unit} should be ${d}`);
		si[k] = toSI(v.value, v.unit);
	}
	try {
		const out = runAlgorithm(algorithm, si);
		const exp = toSI(expected, unit);
		if (Math.abs(out - exp) > Math.max(1e-12, relTol * Math.abs(exp)))
			err(path, `stated result ${expected} ${unit} but ${algorithm} gives ${out} (SI)`);
	} catch (e) {
		err(path, `algorithm error: ${(e as Error).message}`);
	}
}

function validateNumeric(path: string, a: NumericAnswer, err: (p: string, m: string) => void) {
	const d = dimensionOf(a.canonicalUnit);
	if (!a.acceptedUnits.includes(a.canonicalUnit))
		err(path, 'acceptedUnits must include canonicalUnit');
	for (const u of a.acceptedUnits)
		if (dimensionOf(u) !== d) err(path, `accepted unit ${u} has wrong dimension`);
	if (a.absoluteTolerance === 0 && a.relativeTolerance === 0)
		err(path, 'tolerance cannot be zero (no float equality)');
	if (a.relativeTolerance > 0.05) err(path, 'relativeTolerance > 5% is too lax');
	if (a.algorithm) {
		if (!a.inputs) return err(path, 'algorithm requires inputs');
		if (algorithmDef(a.algorithm).output !== d)
			err(path, `canonicalUnit dimension ≠ ${a.algorithm} output`);
		checkComputation(path, a.algorithm, a.inputs, a.canonicalValue, a.canonicalUnit, err, 1e-9);
		// The canonical value itself must grade as correct.
		if (!isCorrectNumeric(toSI(a.canonicalValue, a.canonicalUnit), a))
			err(path, 'canonical value does not pass its own tolerance');
	}
}

function validateExercise(
	e: Exercise,
	err: (p: string, m: string) => void,
	maps: {
		concepts: Map<string, unknown>;
		formulas: Map<string, unknown>;
		diagrams: Map<string, unknown>;
	}
) {
	const p = `exercise.${e.id}`;
	e.conceptIds.forEach((x) => (maps.concepts.has(x) ? null : err(p, `unknown concept ${x}`)));
	e.formulaIds.forEach((x) => (maps.formulas.has(x) ? null : err(p, `unknown formula ${x}`)));
	if (e.diagramId && !maps.diagrams.has(e.diagramId)) err(p, `unknown diagram ${e.diagramId}`);
	switch (e.type) {
		case 'numeric':
		case 'unit_conversion':
			validateNumeric(p, e.answer, err);
			if (e.type === 'numeric' && !e.answer.algorithm)
				err(p, 'numeric exercises must declare their algorithm and inputs');
			break;
		case 'multiple_choice':
		case 'diagnose':
		case 'prediction': {
			const ids = e.options.map((o) => o.id);
			if (new Set(ids).size !== ids.length) err(p, 'duplicate option ids');
			if (!ids.includes(e.correctOptionId)) err(p, 'correctOptionId not among options');
			break;
		}
		case 'ordering': {
			const ids = e.items
				.map((i) => i.id)
				.sort()
				.join();
			if ([...e.correctOrder].sort().join() !== ids)
				err(p, 'correctOrder must be a permutation of items');
			if ([...e.displayOrder].sort().join() !== ids)
				err(p, 'displayOrder must be a permutation of items');
			if (e.displayOrder.join() === e.correctOrder.join())
				err(p, 'displayOrder must differ from correctOrder');
			break;
		}
	}
	if (e.pool === 'exam' && e.hints.length)
		err(p, 'exam items must not have hints (no hints allowed in exams)');
}

function validateDiagram(d: Diagram, err: (p: string, m: string) => void) {
	const p = `diagram.${d.id}`;
	const ids = new Set<string>();
	const netPins = new Map<string, Pt[]>();
	const allPins: { net: string; at: Pt; ref: string }[] = [];
	for (const c of d.components) {
		if (ids.has(c.id)) err(p, `duplicate component id ${c.id}`);
		ids.add(c.id);
		const expected = pinNames(c.type);
		const pos = pinPositions(c);
		for (const pin of expected) {
			const net = c.pins[pin];
			if (!net) {
				err(p, `${c.id} pin ${pin} is unconnected`);
				continue;
			}
			netPins.set(net, [...(netPins.get(net) ?? []), pos[pin]]);
			allPins.push({ net, at: pos[pin], ref: `${c.id}.${pin}` });
		}
		for (const pin of Object.keys(c.pins))
			if (!expected.includes(pin)) err(p, `${c.id} has unknown pin ${pin}`);
		if (c.x < 0 || c.y < 0 || c.x > d.viewBox[0] || c.y > d.viewBox[1])
			err(p, `${c.id} outside viewBox`);
	}
	for (const [net, pins] of netPins) {
		if (pins.length < 2) err(p, `net ${net} has a single pin (dangling)`);
	}
	for (const w of d.wires) {
		if (!netPins.has(w.net)) err(p, `wire on unknown net ${w.net}`);
		for (const s of segments(w.points)) {
			if (s[0][0] !== s[1][0] && s[0][1] !== s[1][1])
				err(p, `wire on ${w.net} has a non-orthogonal segment`);
		}
		for (const end of [w.points[0], w.points[w.points.length - 1]]) {
			const pinHere = allPins.filter((x) => samePoint(x.at, end));
			if (pinHere.some((x) => x.net !== w.net))
				err(p, `wire on ${w.net} ends on pin of another net at ${end}`);
			if (pinHere.length) continue;
			const touches = d.wires.some(
				(o) =>
					o !== w && o.net === w.net && segments(o.points).some(([a, b]) => onSegment(end, a, b))
			);
			const junction = d.junctions.some((j) => samePoint(j, end));
			if (!touches && !junction) err(p, `wire on ${w.net} has a dangling end at ${end}`);
		}
	}
	// Junction dots may only sit where a single net meets; different nets crossing at a dot is ambiguous.
	for (const j of d.junctions) {
		const nets = new Set(
			d.wires
				.filter((w) => segments(w.points).some(([a, b]) => onSegment(j, a, b)))
				.map((w) => w.net)
		);
		if (nets.size === 0) err(p, `junction at ${j} touches no wire`);
		if (nets.size > 1) err(p, `junction at ${j} joins different nets ${[...nets].join(', ')}`);
	}
}

function findCycle(nodes: string[], edges: (id: string) => string[]): string[] | null {
	const state = new Map<string, 1 | 2>();
	const stack: string[] = [];
	const visit = (n: string): string[] | null => {
		if (state.get(n) === 2) return null;
		if (state.get(n) === 1) return [...stack.slice(stack.indexOf(n)), n];
		state.set(n, 1);
		stack.push(n);
		for (const m of edges(n)) {
			const c = visit(m);
			if (c) return c;
		}
		stack.pop();
		state.set(n, 2);
		return null;
	};
	for (const n of [...nodes].sort()) {
		const c = visit(n);
		if (c) return c;
	}
	return null;
}
