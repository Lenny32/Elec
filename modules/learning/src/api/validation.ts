import { z } from 'zod';
import { UNIT_IDS } from '../domain/units.js';
import type { Input, Operation } from './contracts.js';
import { ApplicationError } from '../application/errors.js';

const id = z.string().min(1).max(200);
const count = z.number().int().nonnegative();
const empty = z.object({}).strict();
const attempt = z.object({ attemptId: id }).strict();
const lesson = z.object({ lessonId: id }).strict();
const presentation = { exerciseId: id, presentationId: id, sessionId: id };
export const operationSchemas = {
	catalog: empty,
	snapshot: empty,
	startLesson: lesson,
	viewCard: lesson.extend({ cardId: id, cardIndex: count }).strict(),
	completeLesson: lesson,
	submit: z
		.object({
			exerciseId: id,
			response: z.discriminatedUnion('type', [
				z
					.object({ type: z.literal('numeric'), raw: z.string().max(1000), unit: z.enum(UNIT_IDS) })
					.strict(),
				z.object({ type: z.literal('choice'), optionId: id }).strict(),
				z.object({ type: z.literal('ordering'), order: z.array(id).max(100) }).strict()
			]),
			context: z
				.object({
					kind: z.enum(['lesson', 'practice', 'review', 'exam', 'drill']),
					refId: z.string().max(2000),
					presentationId: id,
					submissionIndex: count,
					hintsUsed: count,
					sessionId: id,
					reviewConceptId: id.optional()
				})
				.strict()
		})
		.strict(),
	useHint: z.object({ ...presentation, hintIndex: count }).strict(),
	revealSolution: z.object(presentation).strict(),
	startExam: z.object({ examId: id }).strict(),
	finishExam: attempt,
	startDrill: attempt,
	selectPractice: z
		.object({
			conceptIds: z.array(id).max(1000),
			chapterId: id.optional(),
			perConcept: z.number().int().min(1).max(20),
			sessionId: id
		})
		.strict(),
	selectReview: z.object({ max: z.number().int().min(1).max(100), sessionId: id }).strict(),
	labChanged: z.object({ labId: id, params: z.record(id, z.number().finite()) }).strict(),
	setPreference: z.object({ key: id, value: z.json() }).strict(),
	allEvents: empty,
	exportData: empty,
	exportCSV: empty,
	inspectImport: z.object({ text: z.string() }).strict(),
	importData: z.object({ text: z.string(), mode: z.enum(['merge', 'replace']) }).strict(),
	markExported: empty,
	eraseAll: empty
} satisfies Record<Operation, z.ZodType>;

export function parseInput<K extends Operation>(operation: K, input: unknown): Input<K> {
	const result = operationSchemas[operation].safeParse(input);
	if (!result.success)
		throw new ApplicationError(
			'invalid_request',
			result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
		);
	return result.data as Input<K>;
}
