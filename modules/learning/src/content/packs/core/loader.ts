/**
 * Assembles the `core` pack from authored JSON fragments.
 *
 * Layout (one folder per chapter, file name = record kind):
 *   manifest.json, modules.json, outline.json (chapters with status "outline")
 *   chNN/chapter.json (single object) and chNN/{concepts,formulas,diagrams,labs,lessons,exercises,exams}.json (arrays)
 *   exams.json (module / final exams)
 */
import type { PackInput } from '../../schema.js';

const files = import.meta.glob<{ default: unknown }>('./**/*.json', { eager: true });

const KINDS = [
	'concepts',
	'formulas',
	'diagrams',
	'labs',
	'lessons',
	'exercises',
	'exams'
] as const;

export function assembleCorePack(): PackInput {
	const get = (p: string) => files[p]?.default;
	const pack = {
		manifest: get('./manifest.json'),
		modules: (get('./modules.json') as unknown[]) ?? [],
		chapters: [...((get('./outline.json') as unknown[]) ?? [])],
		concepts: [] as unknown[],
		formulas: [] as unknown[],
		diagrams: [] as unknown[],
		labs: [] as unknown[],
		lessons: [] as unknown[],
		exercises: [] as unknown[],
		exams: [...((get('./exams.json') as unknown[]) ?? [])]
	};
	const chapterDirs = [
		...new Set(
			Object.keys(files)
				.map((p) => /^\.\/(ch\d{2})\//.exec(p)?.[1])
				.filter((x): x is string => !!x)
		)
	].sort();
	for (const dir of chapterDirs) {
		const ch = get(`./${dir}/chapter.json`);
		if (ch) pack.chapters.push(ch);
		for (const k of KINDS) {
			const arr = get(`./${dir}/${k}.json`);
			if (Array.isArray(arr)) pack[k].push(...arr);
		}
	}
	pack.chapters.sort((a, b) =>
		String((a as { number: string }).number).localeCompare(String((b as { number: string }).number))
	);
	return pack as unknown as PackInput;
}
