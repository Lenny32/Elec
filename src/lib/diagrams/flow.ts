/**
 * Conventional-current direction for the flow animation of a diagram.
 *
 * Builds a graph from wire segments (split at junctions/pins) and conducting components,
 * removes the source itself, prunes dead ends (e.g. voltmeter leads) and orients every remaining
 * segment from the source's + terminal towards its − terminal by breadth-first distance.
 * Good for the idealised series/parallel loops used in the course; diagrams it cannot analyse
 * simply get no animation.
 */
import type { Diagram } from '#learning';
import {
	pinPositions,
	segments,
	onSegment,
	isTwoTerminal,
	type Pt
} from '#learning/domain/geometry.ts';

export type FlowSegment = { from: Pt; to: Pt };

const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;

export function currentPaths(d: Diagram): FlowSegment[] {
	const source = d.components.find((c) => c.type === 'battery' || c.type === 'dc_source');
	if (!source) return [];
	const sp = pinPositions(source);
	const plus = key(sp.a);
	const minus = key(sp.b);

	// Points that split wire segments: junctions + every component pin.
	const splitters: Pt[] = [...d.junctions];
	for (const c of d.components) splitters.push(...Object.values(pinPositions(c)));

	type Edge = { a: string; b: string; pa: Pt; pb: Pt; wire: boolean };
	const edges: Edge[] = [];
	for (const w of d.wires) {
		for (const [a, b] of segments(w.points as Pt[])) {
			const cuts = splitters
				.filter((p) => onSegment(p, a, b))
				.concat([a, b])
				.sort(
					(p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1])
				);
			for (let i = 1; i < cuts.length; i++) {
				const ka = key(cuts[i - 1]);
				const kb = key(cuts[i]);
				if (ka !== kb) edges.push({ a: ka, b: kb, pa: cuts[i - 1], pb: cuts[i], wire: true });
			}
		}
	}
	// Conducting two-terminal parts join their pins (voltmeters, capacitors and open switches do
	// not; series cells do). Multi-terminal parts are not analysed.
	const blocking = new Set(['meter_v', 'capacitor', 'polarized_capacitor']);
	for (const c of d.components) {
		if (c === source || !isTwoTerminal(c.type) || blocking.has(c.type)) continue;
		if ((c.type === 'switch' || c.type === 'push_button') && !c.closed) continue;
		const pins = pinPositions(c);
		edges.push({ a: key(pins.a), b: key(pins.b), pa: pins.a, pb: pins.b, wire: false });
	}
	// Ground symbols on the same net are connected without a drawn wire.
	const grounds = d.components.filter((c) => c.type === 'ground' || c.type === 'chassis_ground');
	for (let i = 1; i < grounds.length; i++) {
		const p = pinPositions(grounds[0]).a;
		const q = pinPositions(grounds[i]).a;
		edges.push({ a: key(p), b: key(q), pa: p, pb: q, wire: false });
	}

	// Prune dead ends (degree-1 nodes other than the source terminals), repeatedly.
	let live = edges.slice();
	for (;;) {
		const degree = new Map<string, number>();
		for (const e of live) {
			degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
			degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
		}
		const next = live.filter((e) => {
			const da = degree.get(e.a)!;
			const db = degree.get(e.b)!;
			return !(
				(da === 1 && e.a !== plus && e.a !== minus) ||
				(db === 1 && e.b !== plus && e.b !== minus)
			);
		});
		if (next.length === live.length) break;
		live = next;
	}

	// BFS distance from + terminal.
	const adj = new Map<string, string[]>();
	for (const e of live) {
		adj.set(e.a, [...(adj.get(e.a) ?? []), e.b]);
		adj.set(e.b, [...(adj.get(e.b) ?? []), e.a]);
	}
	if (!adj.has(plus) || !adj.has(minus)) return [];
	const dist = new Map<string, number>([[plus, 0]]);
	const queue = [plus];
	while (queue.length) {
		const n = queue.shift()!;
		for (const m of adj.get(n) ?? []) {
			if (!dist.has(m)) {
				dist.set(m, dist.get(n)! + 1);
				if (m !== minus) queue.push(m);
			}
		}
	}
	if (!dist.has(minus)) return [];

	const out: FlowSegment[] = [];
	for (const e of live) {
		if (!e.wire) continue;
		const da = dist.get(e.a);
		const db = dist.get(e.b);
		if (da === undefined || db === undefined) continue;
		out.push(da <= db ? { from: e.pa, to: e.pb } : { from: e.pb, to: e.pa });
	}
	return out;
}
