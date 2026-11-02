import { describe, expect, it } from 'vitest';
import { assembleCorePack } from './packs/core/loader.js';
import { validatePack } from './validate.js';

describe('core content pack', () => {
	it('passes schema, cross-reference, pedagogy and math checks', () => {
		const result = validatePack(assembleCorePack());
		if (!result.ok) {
			// Optional filter: CONTENT_FILTER=ch01 (matches issue paths containing the text)
			const filter = process.env.CONTENT_FILTER;
			const issues = filter
				? result.issues.filter((i) => i.path.includes(filter) || i.message.includes(filter))
				: result.issues;
			console.error(
				`${result.issues.length} issue(s)\n` +
					issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')
			);
		}
		expect(result.ok ? [] : result.issues).toEqual([]);
	});
});
