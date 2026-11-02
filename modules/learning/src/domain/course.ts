/**
 * Content pack schema (SPEC §5, §6, §10, §11 + ADR 0001/0002).
 * Pure module: no Svelte imports. Every authored record is validated against this at test/build
 * time (`modules/learning/src/content/validate.spec.ts`) and again when a pack is installed.
 */
import { z } from 'zod';
import { UNIT_IDS } from './units.js';
import { ALGORITHM_IDS } from './formulas.js';
import { LAB_MODEL_IDS } from './lab-models.js';

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

/** Every learner-facing string exists in every shipped locale. */
export const L = z.object({ en: z.string().min(1), fr: z.string().min(1) }).strict();
export type LocalizedText = z.infer<typeof L>;

const id = (prefix: string) =>
	z
		.string()
		.regex(new RegExp(`^${prefix.replace('.', '\\.')}[a-z0-9_.]+$`), `must start with "${prefix}"`);

export const ConceptId = z.string().regex(/^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/);
export const UnitId = z.enum(UNIT_IDS);
export const AlgorithmId = z.enum(ALGORITHM_IDS);

// ───────────────────────────── Concepts ─────────────────────────────
export const Concept = z
	.object({
		id: ConceptId,
		chapterId: id('chapter.'),
		name: L,
		summary: L,
		/** Concepts that must be MASTERED before this concept's chapter unlocks (cross-chapter only). */
		prerequisites: z.array(ConceptId)
	})
	.strict();

// ───────────────────────────── Formulas ─────────────────────────────
export const FormulaVar = z.object({ symbol: z.string(), name: L, unit: UnitId }).strict();

export const Formula = z
	.object({
		id: id('formula.'),
		version: z.number().int().positive(),
		name: L,
		symbolic: z.string(),
		latex: z.string(),
		output: FormulaVar,
		inputs: z.array(FormulaVar).min(1),
		algorithm: AlgorithmId,
		/** Validity domain, e.g. "R > 0". Compulsory (SPEC §4). */
		constraints: z.array(L).min(1),
		assumptions: z.array(L).min(1),
		rearrangements: z.array(z.string()),
		explanation: L,
		derivation: L.optional(),
		workedExample: z
			.object({
				inputs: z.record(z.string(), z.object({ value: z.number(), unit: UnitId })),
				result: z.number(),
				unit: UnitId,
				steps: z.array(L).min(1)
			})
			.strict(),
		commonMistakes: z.array(L).min(1),
		counterexample: L.optional(),
		conceptIds: z.array(ConceptId).min(1)
	})
	.strict();

// ───────────────────────────── Diagrams ─────────────────────────────
export const COMPONENT_TYPES = [
	// sources & references
	'dc_source',
	'battery',
	'ac_source',
	'current_source',
	'ground',
	'chassis_ground',
	// passive
	'resistor',
	'variable_resistor',
	'potentiometer',
	'ldr',
	'capacitor',
	'polarized_capacitor',
	'inductor',
	'transformer',
	// switching & protection
	'switch',
	'push_button',
	'relay_coil',
	'fuse',
	// semiconductors
	'diode',
	'led',
	'zener',
	'photodiode',
	'npn',
	'pnp',
	'nmos',
	'pmos',
	'opamp',
	// loads & measurement
	'lamp',
	'motor',
	'meter_v',
	'meter_a',
	'meter_ohm',
	// wiring
	'node'
] as const;

/** A value shown on a component: literal or bound to a lab parameter. */
export const ComponentValue = z.union([
	z.object({ value: z.number(), unit: UnitId }).strict(),
	z.object({ param: z.string() }).strict()
]);

export const DiagramComponent = z
	.object({
		id: z.string().regex(/^[A-Z][A-Za-z0-9]*$/),
		type: z.enum(COMPONENT_TYPES),
		/** Centre of the symbol in viewBox coordinates. */
		x: z.number(),
		y: z.number(),
		/** 0 = horizontal (pins left→right "a"→"b"); 90 = vertical (a on top). */
		rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
		label: z.string().optional(),
		value: ComponentValue.optional(),
		/** pin name → net id. Two-terminal parts use "a"/"b" ("a" = + / anode / positive). */
		pins: z.record(z.string(), z.string()),
		/** switch / push-button state */
		closed: z.boolean().optional()
	})
	.strict();

export const Wire = z
	.object({
		net: z.string(),
		/** Polyline points [x,y]; endpoints must sit on pins or junctions of the same net. */
		points: z.array(z.tuple([z.number(), z.number()])).min(2)
	})
	.strict();

export const Annotation = z.discriminatedUnion('kind', [
	z
		.object({
			kind: z.literal('current_arrow'),
			x: z.number(),
			y: z.number(),
			direction: z.enum(['left', 'right', 'up', 'down']),
			label: L.optional()
		})
		.strict(),
	z.object({ kind: z.literal('text'), x: z.number(), y: z.number(), text: L }).strict(),
	z
		.object({
			kind: z.literal('voltage_marker'),
			x1: z.number(),
			y1: z.number(),
			x2: z.number(),
			y2: z.number(),
			label: L
		})
		.strict()
]);

export const Diagram = z
	.object({
		id: id('diagram.'),
		version: z.number().int().positive(),
		title: L,
		/** Text alternative; required (SPEC §3, §13.12). */
		alt: L,
		viewBox: z.tuple([z.number().positive(), z.number().positive()]),
		components: z.array(DiagramComponent).min(1),
		wires: z.array(Wire),
		/** Explicit joined-node dots: crossings without a junction are NOT connected. */
		junctions: z.array(z.tuple([z.number(), z.number()])),
		annotations: z.array(Annotation).default([])
	})
	.strict();

// ───────────────────────────── Labs ─────────────────────────────
export const LabParam = z
	.object({
		key: z.string(),
		label: L,
		unit: UnitId,
		min: z.number(),
		max: z.number(),
		step: z.number().positive(),
		default: z.number()
	})
	.strict();

export const Lab = z
	.object({
		id: id('lab.'),
		version: z.number().int().positive(),
		title: L,
		intro: L,
		diagramId: id('diagram.'),
		model: z.enum(LAB_MODEL_IDS),
		params: z.array(LabParam).min(1),
		/** Fixed model inputs not exposed as controls (e.g. Imax, Prating). */
		constants: z.record(z.string(), z.number()).default({}),
		assumptions: z.array(L).min(1),
		safety: z.array(L).default([])
	})
	.strict();

// ───────────────────────────── Exercises ─────────────────────────────
export const NumericAnswer = z
	.object({
		/** When set, the validator recomputes canonicalValue from `inputs` with this algorithm. */
		algorithm: AlgorithmId.optional(),
		inputs: z.record(z.string(), z.object({ value: z.number(), unit: UnitId })).optional(),
		canonicalValue: z.number(),
		canonicalUnit: UnitId,
		acceptedUnits: z.array(UnitId).min(1),
		absoluteTolerance: z.number().nonnegative(),
		relativeTolerance: z.number().nonnegative()
	})
	.strict();

const ExerciseBase = {
	id: id('exercise.'),
	version: z.number().int().positive(),
	conceptIds: z.array(ConceptId).min(1),
	formulaIds: z.array(id('formula.')).default([]),
	/** 1 easy … 3 hard */
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	/** guided = inside lessons with scaffolding; independent = standard; applied = transfer/real-world. */
	kind: z.enum(['guided', 'independent', 'applied']),
	/** practice items feed lessons, practice, review and drills; exam items are reserved for exam forms. */
	pool: z.enum(['practice', 'exam']),
	prompt: L,
	diagramId: id('diagram.').optional(),
	hints: z.array(L).default([]),
	solution: z.array(L).min(1),
	assumptions: L.optional()
};

export const Exercise = z.discriminatedUnion('type', [
	z.object({ ...ExerciseBase, type: z.literal('numeric'), answer: NumericAnswer }).strict(),
	z.object({ ...ExerciseBase, type: z.literal('unit_conversion'), answer: NumericAnswer }).strict(),
	z
		.object({
			...ExerciseBase,
			type: z.enum(['multiple_choice', 'diagnose', 'prediction']),
			options: z
				.array(z.object({ id: z.string(), text: L, rationale: L }).strict())
				.min(2)
				.max(6),
			correctOptionId: z.string()
		})
		.strict(),
	z
		.object({
			...ExerciseBase,
			type: z.literal('ordering'),
			items: z
				.array(z.object({ id: z.string(), text: L }).strict())
				.min(3)
				.max(7),
			/** Authoring order is the correct order; UI shows items in `displayOrder`. */
			correctOrder: z.array(z.string()),
			displayOrder: z.array(z.string())
		})
		.strict()
]);

// ───────────────────────────── Lessons ─────────────────────────────
export const Card = z.discriminatedUnion('type', [
	z.object({ id: z.string(), type: z.literal('explain'), title: L.optional(), text: L }).strict(),
	z
		.object({ id: z.string(), type: z.literal('diagram'), diagramId: id('diagram.'), caption: L })
		.strict(),
	z.object({ id: z.string(), type: z.literal('formula'), formulaId: id('formula.') }).strict(),
	z
		.object({
			id: z.string(),
			type: z.literal('worked_example'),
			title: L,
			steps: z.array(L).min(2)
		})
		.strict(),
	z.object({ id: z.string(), type: z.literal('parameter_lab'), labId: id('lab.') }).strict(),
	z.object({ id: z.string(), type: z.literal('exercise'), exerciseId: id('exercise.') }).strict(),
	z.object({ id: z.string(), type: z.literal('safety'), text: L }).strict(),
	z.object({ id: z.string(), type: z.literal('summary'), points: z.array(L).min(1) }).strict()
]);

export const Lesson = z
	.object({
		id: id('lesson.'),
		version: z.number().int().positive(),
		chapterId: id('chapter.'),
		/** "01.05" */
		number: z.string().regex(/^\d{2}\.\d{2}$/),
		title: L,
		objectives: z.array(L).min(1).max(3),
		conceptsTaught: z.array(ConceptId).min(1),
		formulasUsed: z.array(id('formula.')).default([]),
		estimatedMinutes: z.number().int().positive(),
		safetyClass: z.enum(['none', 'low_voltage_simulated', 'low_voltage_hands_on']),
		cards: z.array(Card).min(5).max(12),
		references: z.array(z.string()).default([])
	})
	.strict();

// ───────────────────────────── Chapters, modules, exams ─────────────────────────────
export const Chapter = z
	.object({
		id: id('chapter.'),
		number: z.string().regex(/^\d{2}$/),
		moduleId: id('module.'),
		title: L,
		summary: L,
		status: z.enum(['authored', 'outline']),
		goals: z.array(L).min(1),
		/** Concepts (from earlier chapters) that must be MASTERED to unlock this chapter. */
		prerequisites: z.array(ConceptId),
		/** Outline topics, shown for every chapter (incl. locked/outline ones). */
		topics: z.array(L).min(1),
		lessonIds: z.array(id('lesson.')),
		labIds: z.array(id('lab.')),
		examId: id('exam.').optional(),
		safetyNotes: z.array(L).default([]),
		miniProject: z
			.object({ title: L, description: L, steps: z.array(L).min(1), simulationFallback: L })
			.strict()
			.optional(),
		practicalOutcome: L
	})
	.strict();

export const Module = z
	.object({
		id: id('module.'),
		number: z.number().int().nonnegative(),
		title: L,
		summary: L,
		chapterIds: z.array(id('chapter.')).min(1),
		examId: id('exam.').optional()
	})
	.strict();

export const Exam = z
	.object({
		id: id('exam.'),
		version: z.number().int().positive(),
		scope: z.enum(['chapter', 'module', 'final']),
		scopeId: z.string(),
		title: L,
		passPercent: z.number().int().min(1).max(100),
		/** Rotated formA → formB → formC by completed-attempt count (SPEC §7.3). */
		forms: z
			.array(z.object({ id: z.string(), itemIds: z.array(id('exercise.')).min(5) }).strict())
			.min(2),
		/** Max drill items per missed concept. */
		drillItemsPerConcept: z.number().int().min(1).max(4).default(2)
	})
	.strict();

export const PackManifest = z
	.object({
		packId: z.string(),
		packVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
		rulesVersion: z.string(),
		locales: z.array(z.enum(LOCALES)).min(1),
		title: L,
		description: L
	})
	.strict();

export const Pack = z
	.object({
		manifest: PackManifest,
		modules: z.array(Module),
		chapters: z.array(Chapter),
		concepts: z.array(Concept),
		formulas: z.array(Formula),
		diagrams: z.array(Diagram),
		labs: z.array(Lab),
		lessons: z.array(Lesson),
		exercises: z.array(Exercise),
		exams: z.array(Exam)
	})
	.strict();

export type Concept = z.infer<typeof Concept>;
export type Formula = z.infer<typeof Formula>;
export type Diagram = z.infer<typeof Diagram>;
export type DiagramComponent = z.infer<typeof DiagramComponent>;
export type ComponentType = (typeof COMPONENT_TYPES)[number];
export type Lab = z.infer<typeof Lab>;
export type LabParam = z.infer<typeof LabParam>;
export type NumericAnswer = z.infer<typeof NumericAnswer>;
export type Exercise = z.infer<typeof Exercise>;
export type Card = z.infer<typeof Card>;
export type Lesson = z.infer<typeof Lesson>;
export type Chapter = z.infer<typeof Chapter>;
export type Module = z.infer<typeof Module>;
export type Exam = z.infer<typeof Exam>;
export type Pack = z.infer<typeof Pack>;
export type PackInput = z.input<typeof Pack>;
