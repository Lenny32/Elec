/**
 * Symbol pin geometry shared by the SVG renderer and the pack validator.
 * Coordinates are in diagram viewBox units. Two-terminal parts span 60 units (pins at ±30).
 */
import type { ComponentType, DiagramComponent } from './course.js';

export type Pt = readonly [number, number];

export const TWO_TERMINAL_HALF = 30;

const H = TWO_TERMINAL_HALF;
const TWO: Record<string, Pt> = { a: [-H, 0], b: [H, 0] };
const ONE: Record<string, Pt> = { a: [0, 0] };
/** Bipolar transistor: base left, collector top, emitter bottom. */
const BJT: Record<string, Pt> = { b: [-H, 0], c: [10, -H], e: [10, H] };
/** MOSFET: gate left, drain top, source bottom. */
const FET: Record<string, Pt> = { g: [-H, 0], d: [10, -H], s: [10, H] };

/**
 * Pin offsets at rotation 0. Two-terminal parts use "a"/"b" ("a" = + / anode / positive).
 * Multi-terminal parts use their usual pin letters.
 */
const PIN_OFFSETS: Record<ComponentType, Record<string, Pt>> = {
	dc_source: TWO,
	battery: TWO,
	ac_source: TWO,
	current_source: TWO,
	/** Ground symbols hang below their single pin. */
	ground: ONE,
	chassis_ground: ONE,
	resistor: TWO,
	variable_resistor: TWO,
	/** Wiper "w" enters from above. */
	potentiometer: { a: [-H, 0], b: [H, 0], w: [0, -H] },
	ldr: TWO,
	capacitor: TWO,
	polarized_capacitor: TWO,
	inductor: TWO,
	/** Primary p1/p2 on the left, secondary s1/s2 on the right (1 = top, dot end). */
	transformer: { p1: [-H, -20], p2: [-H, 20], s1: [H, -20], s2: [H, 20] },
	switch: TWO,
	push_button: TWO,
	relay_coil: TWO,
	fuse: TWO,
	diode: TWO,
	led: TWO,
	zener: TWO,
	photodiode: TWO,
	npn: BJT,
	pnp: BJT,
	nmos: FET,
	pmos: FET,
	/** Inverting input on top, non-inverting below, output right. */
	opamp: { inn: [-H, -10], inp: [-H, 10], out: [H, 0] },
	lamp: TWO,
	motor: TWO,
	meter_v: TWO,
	meter_a: TWO,
	meter_ohm: TWO,
	node: ONE
};

/** True for parts with exactly the two pins "a" and "b". */
export function isTwoTerminal(type: ComponentType): boolean {
	return PIN_OFFSETS[type] === TWO;
}

/** Rotate a vector clockwise (screen coordinates, y down). */
export function rotate([x, y]: Pt, deg: 0 | 90 | 180 | 270): Pt {
	switch (deg) {
		case 0:
			return [x, y];
		case 90:
			return [-y, x];
		case 180:
			return [-x, -y];
		case 270:
			return [y, -x];
	}
}

export function pinNames(type: ComponentType): string[] {
	return Object.keys(PIN_OFFSETS[type]);
}

/** Absolute pin positions of a placed component. */
export function pinPositions(
	c: Pick<DiagramComponent, 'type' | 'x' | 'y' | 'rotation'>
): Record<string, Pt> {
	const out: Record<string, Pt> = {};
	for (const [name, off] of Object.entries(PIN_OFFSETS[c.type])) {
		const [dx, dy] = rotate(off, c.rotation);
		out[name] = [c.x + dx, c.y + dy];
	}
	return out;
}

export const samePoint = (a: Pt, b: Pt) =>
	Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;

/** True when p lies on the axis-aligned or diagonal segment a–b (inclusive). */
export function onSegment(p: Pt, a: Pt, b: Pt): boolean {
	const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
	if (Math.abs(cross) > 0.5 * Math.hypot(b[0] - a[0], b[1] - a[1])) return false;
	return (
		p[0] >= Math.min(a[0], b[0]) - 0.5 &&
		p[0] <= Math.max(a[0], b[0]) + 0.5 &&
		p[1] >= Math.min(a[1], b[1]) - 0.5 &&
		p[1] <= Math.max(a[1], b[1]) + 0.5
	);
}

export function segments(points: readonly Pt[]): [Pt, Pt][] {
	const out: [Pt, Pt][] = [];
	for (let i = 1; i < points.length; i++) out.push([points[i - 1], points[i]]);
	return out;
}
