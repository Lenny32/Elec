/** Which symbols appear where in the course: per lesson (diagram cards) and per concept. */
import type { ComponentType } from '#learning';
import type { PackIndex } from '#learning/domain/catalog.ts';
import { SYMBOLS } from './catalog.ts';

const cache = new WeakMap<PackIndex, Map<string, ComponentType[]>>();

/** Distinct component types drawn in a diagram, in catalog order (junction dots excluded). */
export function diagramSymbols(ix: PackIndex, diagramId: string): ComponentType[] {
	const d = ix.diagrams.get(diagramId);
	if (!d) return [];
	const used = new Set(d.components.map((c) => c.type));
	return SYMBOLS.filter((s) => s.type !== 'node' && used.has(s.type)).map((s) => s.type);
}

function lessonDiagramIds(ix: PackIndex, lessonId: string): string[] {
	const l = ix.lessons.get(lessonId);
	if (!l) return [];
	return l.cards.flatMap((c) => (c.type === 'diagram' ? [c.diagramId] : []));
}

/** Symbols drawn in a lesson's diagram cards. */
export function lessonSymbols(ix: PackIndex, lessonId: string): ComponentType[] {
	const used = new Set(lessonDiagramIds(ix, lessonId).flatMap((id) => diagramSymbols(ix, id)));
	return SYMBOLS.filter((s) => used.has(s.type)).map((s) => s.type);
}

/** Symbols linked to a concept: declared in the catalog, or drawn in the lesson teaching it. */
export function conceptSymbols(ix: PackIndex, conceptId: string): ComponentType[] {
	let byConcept = cache.get(ix);
	if (!byConcept) {
		byConcept = new Map();
		cache.set(ix, byConcept);
	}
	const hit = byConcept.get(conceptId);
	if (hit) return hit;
	const lessonId = ix.teachingLesson.get(conceptId);
	const drawn = new Set(lessonId ? lessonSymbols(ix, lessonId) : []);
	const out = SYMBOLS.filter((s) => s.conceptIds.includes(conceptId) || drawn.has(s.type)).map(
		(s) => s.type
	);
	byConcept.set(conceptId, out);
	return out;
}
