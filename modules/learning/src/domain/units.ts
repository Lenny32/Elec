/**
 * Unit registry with dimensional analysis (SPEC §11). Pure, no UI imports.
 * All grading normalises to SI base values before comparison.
 */

export const DIMENSIONS = [
	'current',
	'voltage',
	'resistance',
	'power',
	'capacitance',
	'time',
	'frequency',
	'charge',
	'inductance',
	'energy',
	'dimensionless'
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

interface UnitDef {
	dimension: Dimension;
	/** multiply a value in this unit by `factor` to get SI */
	factor: number;
	/** display symbol */
	symbol: string;
}

const defs = {
	A: { dimension: 'current', factor: 1, symbol: 'A' },
	mA: { dimension: 'current', factor: 1e-3, symbol: 'mA' },
	uA: { dimension: 'current', factor: 1e-6, symbol: 'µA' },
	kA: { dimension: 'current', factor: 1e3, symbol: 'kA' },
	V: { dimension: 'voltage', factor: 1, symbol: 'V' },
	mV: { dimension: 'voltage', factor: 1e-3, symbol: 'mV' },
	uV: { dimension: 'voltage', factor: 1e-6, symbol: 'µV' },
	kV: { dimension: 'voltage', factor: 1e3, symbol: 'kV' },
	ohm: { dimension: 'resistance', factor: 1, symbol: 'Ω' },
	mohm: { dimension: 'resistance', factor: 1e-3, symbol: 'mΩ' },
	kohm: { dimension: 'resistance', factor: 1e3, symbol: 'kΩ' },
	Mohm: { dimension: 'resistance', factor: 1e6, symbol: 'MΩ' },
	W: { dimension: 'power', factor: 1, symbol: 'W' },
	mW: { dimension: 'power', factor: 1e-3, symbol: 'mW' },
	uW: { dimension: 'power', factor: 1e-6, symbol: 'µW' },
	kW: { dimension: 'power', factor: 1e3, symbol: 'kW' },
	F: { dimension: 'capacitance', factor: 1, symbol: 'F' },
	mF: { dimension: 'capacitance', factor: 1e-3, symbol: 'mF' },
	uF: { dimension: 'capacitance', factor: 1e-6, symbol: 'µF' },
	nF: { dimension: 'capacitance', factor: 1e-9, symbol: 'nF' },
	pF: { dimension: 'capacitance', factor: 1e-12, symbol: 'pF' },
	s: { dimension: 'time', factor: 1, symbol: 's' },
	ms: { dimension: 'time', factor: 1e-3, symbol: 'ms' },
	us: { dimension: 'time', factor: 1e-6, symbol: 'µs' },
	min: { dimension: 'time', factor: 60, symbol: 'min' },
	h: { dimension: 'time', factor: 3600, symbol: 'h' },
	Hz: { dimension: 'frequency', factor: 1, symbol: 'Hz' },
	kHz: { dimension: 'frequency', factor: 1e3, symbol: 'kHz' },
	MHz: { dimension: 'frequency', factor: 1e6, symbol: 'MHz' },
	C: { dimension: 'charge', factor: 1, symbol: 'C' },
	mC: { dimension: 'charge', factor: 1e-3, symbol: 'mC' },
	uC: { dimension: 'charge', factor: 1e-6, symbol: 'µC' },
	mAh: { dimension: 'charge', factor: 3.6, symbol: 'mAh' },
	Ah: { dimension: 'charge', factor: 3600, symbol: 'Ah' },
	H: { dimension: 'inductance', factor: 1, symbol: 'H' },
	mH: { dimension: 'inductance', factor: 1e-3, symbol: 'mH' },
	uH: { dimension: 'inductance', factor: 1e-6, symbol: 'µH' },
	J: { dimension: 'energy', factor: 1, symbol: 'J' },
	mJ: { dimension: 'energy', factor: 1e-3, symbol: 'mJ' },
	kJ: { dimension: 'energy', factor: 1e3, symbol: 'kJ' },
	Wh: { dimension: 'energy', factor: 3600, symbol: 'Wh' },
	one: { dimension: 'dimensionless', factor: 1, symbol: '' },
	percent: { dimension: 'dimensionless', factor: 0.01, symbol: '%' }
} as const satisfies Record<string, UnitDef>;

export type UnitId = keyof typeof defs;
export const UNIT_IDS = Object.keys(defs) as [UnitId, ...UnitId[]];
export const UNITS: Readonly<Record<UnitId, UnitDef>> = defs;

export const SI_UNIT: Record<Dimension, UnitId> = {
	current: 'A',
	voltage: 'V',
	resistance: 'ohm',
	power: 'W',
	capacitance: 'F',
	time: 's',
	frequency: 'Hz',
	charge: 'C',
	inductance: 'H',
	energy: 'J',
	dimensionless: 'one'
};

export class UnitError extends Error {}

export function isUnitId(u: string): u is UnitId {
	return Object.hasOwn(defs, u);
}

export function dimensionOf(u: UnitId): Dimension {
	return defs[u].dimension;
}

export function unitSymbol(u: UnitId): string {
	return defs[u].symbol;
}

/** Units sharing a dimension, ordered small → large. */
export function unitsOfDimension(d: Dimension): UnitId[] {
	return UNIT_IDS.filter((u) => defs[u].dimension === d).sort(
		(a, b) => defs[a].factor - defs[b].factor
	);
}

export function toSI(value: number, unit: UnitId): number {
	return value * defs[unit].factor;
}

export function fromSI(valueSI: number, unit: UnitId): number {
	return valueSI / defs[unit].factor;
}

/** Converts between units; throws on incompatible dimensions (never silently coerces). */
export function convert(value: number, from: UnitId, to: UnitId): number {
	if (defs[from].dimension !== defs[to].dimension) {
		throw new UnitError(
			`Cannot convert ${from} (${defs[from].dimension}) to ${to} (${defs[to].dimension})`
		);
	}
	if (from === to) return value;
	// Divide by the ratio expressed as an exact-ish quotient to limit drift (e.g. 0.03 A → 30 mA).
	return roundSig((value * defs[from].factor) / defs[to].factor, 15);
}

/** Round to `sig` significant figures (deterministic, for display / float-drift cleanup). */
export function roundSig(x: number, sig: number): number {
	if (x === 0 || !Number.isFinite(x)) return x;
	return Number.parseFloat(x.toPrecision(sig));
}

/**
 * Parses learner numeric input. Accepts "30", "0.03", "0,03" (French decimal comma), "3e-2", "1 000".
 * Rejects anything else (no eval). Returns NaN when invalid.
 */
export function parseNumberInput(raw: string): number {
	const s = raw
		.trim()
		.replace(/[\s\u00a0\u202f]/g, '')
		.replace(',', '.');
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number.NaN;
	return Number.parseFloat(s);
}

/** Picks a readable unit (engineering prefix) for an SI value of a given dimension. */
export function bestUnit(valueSI: number, d: Dimension): UnitId {
	const candidates = unitsOfDimension(d).filter(
		(u) => u !== 'percent' && u !== 'mAh' && u !== 'Ah' && u !== 'Wh' && u !== 'min' && u !== 'h'
	);
	const abs = Math.abs(valueSI);
	if (abs === 0 || !Number.isFinite(abs)) return SI_UNIT[d];
	let best = candidates[0];
	for (const u of candidates) if (abs / defs[u].factor >= 1) best = u;
	return best;
}

/** Formats an SI value in its best (or given) unit with `sig` significant figures, locale-aware. */
export function formatQuantity(
	valueSI: number,
	d: Dimension,
	opts: { unit?: UnitId; sig?: number; locale?: string } = {}
): string {
	if (!Number.isFinite(valueSI)) return '—';
	const unit = opts.unit ?? bestUnit(valueSI, d);
	const v = roundSig(fromSI(valueSI, unit), opts.sig ?? 4);
	const num = new Intl.NumberFormat(opts.locale ?? 'en', {
		maximumSignificantDigits: opts.sig ?? 4
	}).format(v);
	const sym = defs[unit].symbol;
	return sym ? `${num} ${sym}` : num;
}
