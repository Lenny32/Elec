import type { Response, Grade } from '../domain/answer.js';
/**
 * Deterministic grading (SPEC §7.2, §11, §12). Pure.
 */
import type { Exercise, NumericAnswer } from '../domain/course.js';
import { dimensionOf, parseNumberInput, toSI, type UnitId } from './units.js';

import { isCorrectNumeric } from '../domain/numeric-answer.js';
export { isCorrectNumeric } from '../domain/numeric-answer.js';

export function grade(ex: Exercise, r: Response): Grade {
	switch (ex.type) {
		case 'numeric':
		case 'unit_conversion': {
			if (r.type !== 'numeric') return { correct: false, feedback: 'unparseable' };
			const v = parseNumberInput(r.raw);
			if (!Number.isFinite(v)) return { correct: false, feedback: 'unparseable' };
			if (dimensionOf(r.unit) !== dimensionOf(ex.answer.canonicalUnit))
				return { correct: false, feedback: 'wrong_unit_dimension' };
			if (!ex.answer.acceptedUnits.includes(r.unit))
				return { correct: false, feedback: 'unit_not_accepted' };
			const valueSI = toSI(v, r.unit);
			if (isCorrectNumeric(valueSI, ex.answer))
				return { correct: true, feedback: 'correct', valueSI };
			// Common slip: right number typed in the canonical unit but a different prefix chosen.
			const asCanonical = toSI(v, ex.answer.canonicalUnit);
			if (r.unit !== ex.answer.canonicalUnit && isCorrectNumeric(asCanonical, ex.answer))
				return { correct: false, feedback: 'right_value_wrong_unit', valueSI };
			return { correct: false, feedback: 'incorrect', valueSI };
		}
		case 'multiple_choice':
		case 'diagnose':
		case 'prediction':
			if (r.type !== 'choice') return { correct: false, feedback: 'unparseable' };
			return r.optionId === ex.correctOptionId
				? { correct: true, feedback: 'correct' }
				: { correct: false, feedback: 'incorrect' };
		case 'ordering':
			if (r.type !== 'ordering') return { correct: false, feedback: 'unparseable' };
			return r.order.length === ex.correctOrder.length &&
				r.order.every((id, i) => id === ex.correctOrder[i])
				? { correct: true, feedback: 'correct' }
				: { correct: false, feedback: 'incorrect' };
	}
}

/** Human-readable tolerance for display (SPEC §11: no tolerance hidden from the UI). */
export function toleranceDescription(a: NumericAnswer): {
	absolute: number;
	relativePercent: number;
	unit: UnitId;
} {
	return {
		absolute: a.absoluteTolerance,
		relativePercent: a.relativeTolerance * 100,
		unit: a.canonicalUnit
	};
}

export type { Response, GradeFeedback, Grade } from '../domain/answer.js';
