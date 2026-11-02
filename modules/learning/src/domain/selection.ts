/** Shared learning contracts, independent of the engine implementation. */

export interface SelectedItem {
	exerciseId: string;
	conceptId: string;
	/** True when every candidate was seen recently and the oldest one is repeated (labelled in UI). */
	repeated: boolean;
}

export interface Selection {
	policyVersion: string;
	items: SelectedItem[];
}
