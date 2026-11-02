/**
 * Idealised DC lab models (SPEC §10). Pure functions, SI in → SI out.
 * These are educational models with documented assumptions, never SPICE equivalents.
 */
import type { Dimension } from './units.js';

type Text = { en: string; fr: string };

export interface Reading {
	key: string;
	label: Text;
	dimension: Dimension;
	valueSI: number;
}

export interface LabWarning {
	code: string;
	severity: 'info' | 'warning' | 'danger';
	message: Text;
}

export interface LabResult {
	valid: boolean;
	readings: Reading[];
	warnings: LabWarning[];
	/** Conventional current through the main loop, used for flow animation (A). */
	loopCurrentA: number;
}

type Params = Record<string, number>;

const t = (en: string, fr: string): Text => ({ en, fr });

const invalid = (code: string, message: Text): LabResult => ({
	valid: false,
	readings: [],
	warnings: [{ code, severity: 'danger', message }],
	loopCurrentA: 0
});

function finite(p: Params, keys: string[]): LabResult | null {
	for (const k of keys) {
		if (!Number.isFinite(p[k]))
			return invalid(
				'not_a_number',
				t(`${k} is not a valid number.`, `${k} n’est pas un nombre valide.`)
			);
	}
	return null;
}

const shortWarning = invalid(
	'short_circuit',
	t(
		'R = 0 Ω: this is a short circuit. A real battery would heat up and could be damaged — never do this.',
		'R = 0 Ω : c’est un court-circuit. Une vraie pile chaufferait et pourrait être endommagée — ne faites jamais cela.'
	)
);
const negativeR = invalid(
	'negative_resistance',
	t(
		'Resistance cannot be negative for a passive resistor.',
		'Une résistance passive ne peut pas être négative.'
	)
);

const models = {
	/** V across a single resistor R. */
	ohm(p: Params): LabResult {
		const bad = finite(p, ['V', 'R']);
		if (bad) return bad;
		if (p.R < 0) return negativeR;
		if (p.R === 0) return shortWarning;
		const I = p.V / p.R;
		const P = p.V * I;
		return {
			valid: true,
			loopCurrentA: I,
			readings: [
				{ key: 'I', label: t('Current', 'Courant'), dimension: 'current', valueSI: I },
				{ key: 'P', label: t('Power in R', 'Puissance dans R'), dimension: 'power', valueSI: P }
			],
			warnings: powerWarnings(P, p.Prating)
		};
	},

	/** Source Vs, series resistor R, LED with fixed forward voltage Vf. */
	led_series(p: Params): LabResult {
		const bad = finite(p, ['Vs', 'Vf', 'R']);
		if (bad) return bad;
		if (p.R < 0) return negativeR;
		if (p.R === 0)
			return invalid(
				'missing_resistor',
				t(
					'No current-limiting resistor: the LED current is limited only by the battery and the LED would burn out.',
					'Pas de résistance de limitation : le courant n’est limité que par la pile et la LED grillerait.'
				)
			);
		const I = Math.max(0, (p.Vs - p.Vf) / p.R);
		const warnings: LabWarning[] = [];
		if (p.Vs <= p.Vf)
			warnings.push({
				code: 'below_forward_voltage',
				severity: 'info',
				message: t(
					'Supply is not above the LED forward voltage: in this model no current flows and the LED stays off.',
					'L’alimentation ne dépasse pas la tension directe de la LED : dans ce modèle aucun courant ne circule.'
				)
			});
		const Imax = p.Imax ?? 0.02;
		if (I > Imax)
			warnings.push({
				code: 'overcurrent',
				severity: 'danger',
				message: t(
					`Current exceeds the LED's recommended ${(Imax * 1000).toFixed(0)} mA. Increase R.`,
					`Le courant dépasse les ${(Imax * 1000).toFixed(0)} mA recommandés pour la LED. Augmentez R.`
				)
			});
		const PR = I * I * p.R;
		warnings.push(...powerWarnings(PR, p.Prating));
		return {
			valid: true,
			loopCurrentA: I,
			readings: [
				{ key: 'I', label: t('LED current', 'Courant LED'), dimension: 'current', valueSI: I },
				{
					key: 'VR',
					label: t('Voltage across R', 'Tension aux bornes de R'),
					dimension: 'voltage',
					valueSI: I * p.R
				},
				{ key: 'PR', label: t('Power in R', 'Puissance dans R'), dimension: 'power', valueSI: PR },
				{
					key: 'PLED',
					label: t('Power in LED', 'Puissance dans la LED'),
					dimension: 'power',
					valueSI: I > 0 ? p.Vf * I : 0
				}
			],
			warnings
		};
	},

	/** Source V with R1, R2, R3 in series (R3 may be 0 to omit). */
	series(p: Params): LabResult {
		const keys = ['R1', 'R2', 'R3'].filter((k) => p[k] !== undefined);
		const bad = finite(p, ['V', ...keys]);
		if (bad) return bad;
		if (keys.some((k) => p[k] < 0)) return negativeR;
		const Rt = keys.reduce((a, k) => a + p[k], 0);
		if (Rt === 0) return shortWarning;
		const I = p.V / Rt;
		return {
			valid: true,
			loopCurrentA: I,
			readings: [
				{
					key: 'Rt',
					label: t('Total resistance', 'Résistance totale'),
					dimension: 'resistance',
					valueSI: Rt
				},
				{
					key: 'I',
					label: t('Current (same everywhere)', 'Courant (le même partout)'),
					dimension: 'current',
					valueSI: I
				},
				...keys.map((k) => ({
					key: `V_${k}`,
					label: t(`Voltage across ${k}`, `Tension aux bornes de ${k}`),
					dimension: 'voltage' as const,
					valueSI: I * p[k]
				}))
			],
			warnings: []
		};
	},

	/** Source V with R1 and R2 in parallel. */
	parallel(p: Params): LabResult {
		const bad = finite(p, ['V', 'R1', 'R2']);
		if (bad) return bad;
		if (p.R1 < 0 || p.R2 < 0) return negativeR;
		if (p.R1 === 0 || p.R2 === 0) return shortWarning;
		const I1 = p.V / p.R1;
		const I2 = p.V / p.R2;
		const Rt = 1 / (1 / p.R1 + 1 / p.R2);
		return {
			valid: true,
			loopCurrentA: I1 + I2,
			readings: [
				{
					key: 'Rt',
					label: t('Equivalent resistance', 'Résistance équivalente'),
					dimension: 'resistance',
					valueSI: Rt
				},
				{
					key: 'I',
					label: t('Total current', 'Courant total'),
					dimension: 'current',
					valueSI: I1 + I2
				},
				{
					key: 'I1',
					label: t('Current in R1', 'Courant dans R1'),
					dimension: 'current',
					valueSI: I1
				},
				{
					key: 'I2',
					label: t('Current in R2', 'Courant dans R2'),
					dimension: 'current',
					valueSI: I2
				}
			],
			warnings: []
		};
	},

	/** Unloaded voltage divider. */
	divider(p: Params): LabResult {
		const bad = finite(p, ['Vin', 'Rtop', 'Rbottom']);
		if (bad) return bad;
		if (p.Rtop < 0 || p.Rbottom < 0) return negativeR;
		if (p.Rtop + p.Rbottom === 0) return shortWarning;
		const I = p.Vin / (p.Rtop + p.Rbottom);
		return {
			valid: true,
			loopCurrentA: I,
			readings: [
				{
					key: 'Vout',
					label: t('Output voltage', 'Tension de sortie'),
					dimension: 'voltage',
					valueSI: I * p.Rbottom
				},
				{
					key: 'I',
					label: t('Divider current', 'Courant du pont'),
					dimension: 'current',
					valueSI: I
				}
			],
			warnings: []
		};
	},

	/** Ohm's law with a switch: open switch → no current (open circuit). */
	switched(p: Params): LabResult {
		const bad = finite(p, ['V', 'R', 'closed']);
		if (bad) return bad;
		if (p.closed < 0.5)
			return {
				valid: true,
				loopCurrentA: 0,
				readings: [{ key: 'I', label: t('Current', 'Courant'), dimension: 'current', valueSI: 0 }],
				warnings: [
					{
						code: 'open_circuit',
						severity: 'info',
						message: t(
							'The switch is open: the loop is broken, so no current flows.',
							'L’interrupteur est ouvert : la boucle est coupée, aucun courant ne circule.'
						)
					}
				]
			};
		return models.ohm({ V: p.V, R: p.R, Prating: p.Prating });
	}
} satisfies Record<string, (p: Params) => LabResult>;

function powerWarnings(P: number, rating: number | undefined): LabWarning[] {
	const r = rating ?? 0.25;
	if (P > r)
		return [
			{
				code: 'resistor_overpower',
				severity: 'danger',
				message: t(
					`Resistor dissipates more than its ${r} W rating: it would overheat.`,
					`La résistance dissipe plus que ses ${r} W nominaux : elle surchaufferait.`
				)
			}
		];
	if (P > r / 2)
		return [
			{
				code: 'resistor_hot',
				severity: 'warning',
				message: t(
					'Resistor is above half its power rating: it will get warm.',
					'La résistance dépasse la moitié de sa puissance nominale : elle va chauffer.'
				)
			}
		];
	return [];
}

export type LabModelId = keyof typeof models;
export const LAB_MODEL_IDS = Object.keys(models) as [LabModelId, ...LabModelId[]];

export function runLabModel(id: LabModelId, params: Params): LabResult {
	return models[id](params);
}
