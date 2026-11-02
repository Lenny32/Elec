/**
 * Whitelisted formula algorithms (SPEC §11). Formula metadata lives in content packs and only
 * references these by id — the `symbolic` string is never evaluated.
 * All inputs/outputs are SI values.
 */
import type { Dimension } from './units.js';

export class DomainError extends Error {
	constructor(
		message: string,
		readonly code:
			'non_positive' | 'zero_division' | 'negative' | 'not_finite' | 'missing' | 'reverse_bias'
	) {
		super(message);
	}
}

interface AlgorithmDef {
	/** Named inputs and their dimensions. A trailing `*` marks a variadic family (R1, R2, …). */
	inputs: Record<string, Dimension>;
	output: Dimension;
	compute(x: Record<string, number>): number;
}

function need(x: Record<string, number>, k: string): number {
	const v = x[k];
	if (v === undefined) throw new DomainError(`Missing input ${k}`, 'missing');
	if (!Number.isFinite(v)) throw new DomainError(`${k} is not a finite number`, 'not_finite');
	return v;
}
function positive(x: Record<string, number>, k: string): number {
	const v = need(x, k);
	if (v <= 0) throw new DomainError(`${k} must be > 0`, 'non_positive');
	return v;
}
function nonNegative(x: Record<string, number>, k: string): number {
	const v = need(x, k);
	if (v < 0) throw new DomainError(`${k} must be ≥ 0`, 'negative');
	return v;
}
/** Values of a variadic family sorted by index: R1, R2, … */
function family(x: Record<string, number>, prefix: string): number[] {
	const keys = Object.keys(x)
		.filter((k) => new RegExp(`^${prefix}\\d+$`).test(k))
		.sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));
	if (keys.length === 0) throw new DomainError(`Need at least one ${prefix}n input`, 'missing');
	return keys.map((k) => positive(x, k));
}

const algorithms = {
	identity: {
		inputs: { x: 'dimensionless' },
		output: 'dimensionless',
		compute: (x) => need(x, 'x')
	},
	ohm_current: {
		inputs: { V: 'voltage', R: 'resistance' },
		output: 'current',
		compute: (x) => need(x, 'V') / positive(x, 'R')
	},
	ohm_voltage: {
		inputs: { I: 'current', R: 'resistance' },
		output: 'voltage',
		compute: (x) => need(x, 'I') * nonNegative(x, 'R')
	},
	ohm_resistance: {
		inputs: { V: 'voltage', I: 'current' },
		output: 'resistance',
		compute: (x) => {
			const i = need(x, 'I');
			if (i === 0) throw new DomainError('I must be ≠ 0', 'zero_division');
			return need(x, 'V') / i;
		}
	},
	power_vi: {
		inputs: { V: 'voltage', I: 'current' },
		output: 'power',
		compute: (x) => need(x, 'V') * need(x, 'I')
	},
	power_i2r: {
		inputs: { I: 'current', R: 'resistance' },
		output: 'power',
		compute: (x) => need(x, 'I') ** 2 * nonNegative(x, 'R')
	},
	power_v2r: {
		inputs: { V: 'voltage', R: 'resistance' },
		output: 'power',
		compute: (x) => need(x, 'V') ** 2 / positive(x, 'R')
	},
	charge_it: {
		inputs: { I: 'current', t: 'time' },
		output: 'charge',
		compute: (x) => need(x, 'I') * nonNegative(x, 't')
	},
	current_qt: {
		inputs: { Q: 'charge', t: 'time' },
		output: 'current',
		compute: (x) => need(x, 'Q') / positive(x, 't')
	},
	time_qi: {
		inputs: { Q: 'charge', I: 'current' },
		output: 'time',
		compute: (x) => nonNegative(x, 'Q') / positive(x, 'I')
	},
	energy_pt: {
		inputs: { P: 'power', t: 'time' },
		output: 'energy',
		compute: (x) => need(x, 'P') * nonNegative(x, 't')
	},
	series_resistance: {
		inputs: { 'R*': 'resistance' },
		output: 'resistance',
		compute: (x) => family(x, 'R').reduce((a, b) => a + b, 0)
	},
	parallel_resistance: {
		inputs: { 'R*': 'resistance' },
		output: 'resistance',
		compute: (x) => 1 / family(x, 'R').reduce((a, r) => a + 1 / r, 0)
	},
	voltage_divider_unloaded: {
		inputs: { Vin: 'voltage', Rtop: 'resistance', Rbottom: 'resistance' },
		output: 'voltage',
		compute: (x) => {
			const rt = nonNegative(x, 'Rtop');
			const rb = nonNegative(x, 'Rbottom');
			if (rt + rb === 0) throw new DomainError('Rtop + Rbottom must be > 0', 'zero_division');
			return (need(x, 'Vin') * rb) / (rt + rb);
		}
	},
	led_resistor: {
		inputs: { Vs: 'voltage', Vf: 'voltage', I: 'current' },
		output: 'resistance',
		compute: (x) => {
			const head = need(x, 'Vs') - nonNegative(x, 'Vf');
			if (head <= 0) throw new DomainError('Vs must exceed Vf', 'reverse_bias');
			return head / positive(x, 'I');
		}
	},
	led_current: {
		inputs: { Vs: 'voltage', Vf: 'voltage', R: 'resistance' },
		output: 'current',
		compute: (x) => Math.max(0, (need(x, 'Vs') - nonNegative(x, 'Vf')) / positive(x, 'R'))
	},
	kvl_remaining: {
		inputs: { Vs: 'voltage', 'V*': 'voltage' },
		output: 'voltage',
		compute: (x) => {
			const drops = Object.keys(x)
				.filter((k) => /^V\d+$/.test(k))
				.reduce((a, k) => a + need(x, k), 0);
			return need(x, 'Vs') - drops;
		}
	},
	kcl_remaining: {
		inputs: { Iin: 'current', 'I*': 'current' },
		output: 'current',
		compute: (x) => {
			const outs = Object.keys(x)
				.filter((k) => /^I\d+$/.test(k))
				.reduce((a, k) => a + need(x, k), 0);
			return need(x, 'Iin') - outs;
		}
	},
	rc_tau: {
		inputs: { R: 'resistance', C: 'capacitance' },
		output: 'time',
		compute: (x) => positive(x, 'R') * positive(x, 'C')
	},
	capacitor_charge: {
		inputs: { C: 'capacitance', V: 'voltage' },
		output: 'charge',
		compute: (x) => positive(x, 'C') * need(x, 'V')
	},
	frequency_from_period: {
		inputs: { T: 'time' },
		output: 'frequency',
		compute: (x) => 1 / positive(x, 'T')
	},
	period_from_frequency: {
		inputs: { f: 'frequency' },
		output: 'time',
		compute: (x) => 1 / positive(x, 'f')
	}
} as const satisfies Record<string, AlgorithmDef>;

export type AlgorithmId = keyof typeof algorithms;
export const ALGORITHM_IDS = Object.keys(algorithms) as [AlgorithmId, ...AlgorithmId[]];

export function algorithmDef(id: AlgorithmId): AlgorithmDef {
	return algorithms[id];
}

/** Runs a whitelisted algorithm on SI inputs. Throws DomainError outside the validity domain. */
export function runAlgorithm(id: AlgorithmId, inputsSI: Record<string, number>): number {
	const def: AlgorithmDef = algorithms[id];
	const out = def.compute(inputsSI);
	if (!Number.isFinite(out))
		throw new DomainError(`${id} produced a non-finite result`, 'not_finite');
	return out;
}

/** Expected dimension of an input key for an algorithm (handles variadic families). */
export function inputDimension(id: AlgorithmId, key: string): Dimension | undefined {
	const def: AlgorithmDef = algorithms[id];
	if (def.inputs[key]) return def.inputs[key];
	for (const [k, d] of Object.entries(def.inputs)) {
		if (k.endsWith('*') && new RegExp(`^${k.slice(0, -1)}\\d+$`).test(key)) return d;
	}
	return undefined;
}
