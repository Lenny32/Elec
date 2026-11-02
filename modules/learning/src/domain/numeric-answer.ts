import type { NumericAnswer } from './course.js';
import { toSI } from './units.js';

/** The same tolerance rule validates authored answers and grades learner responses. */
export function isCorrectNumeric(actualSI: number, spec: NumericAnswer): boolean {
	const expected = toSI(spec.canonicalValue, spec.canonicalUnit);
	const absTolSI = toSI(spec.absoluteTolerance, spec.canonicalUnit);
	const tolerance = Math.max(absTolSI, spec.relativeTolerance * Math.abs(expected));
	return Number.isFinite(actualSI) && Math.abs(actualSI - expected) <= tolerance;
}
