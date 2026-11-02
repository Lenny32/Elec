/** Shared learning contracts, independent of the engine implementation. */
import type { UnitId } from './units.js';

/** Learner response as stored verbatim in ANSWER_SUBMITTED. */
export type Response =
	| { type: 'numeric'; raw: string; unit: UnitId }
	| { type: 'choice'; optionId: string }
	| { type: 'ordering'; order: string[] };

export type GradeFeedback =
	| 'correct'
	| 'incorrect'
	| 'unparseable'
	| 'wrong_unit_dimension'
	| 'unit_not_accepted'
	| 'right_value_wrong_unit';

export interface Grade {
	correct: boolean;
	feedback: GradeFeedback;
	/** Learner value normalised to SI, when numeric. */
	valueSI?: number;
}
