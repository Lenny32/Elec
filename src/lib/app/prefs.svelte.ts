/**
 * Device-local appearance preferences. Stored in localStorage so they apply before first paint
 * (see app.html), and recorded in the journal as PREFERENCE_CHANGED for the history.
 */
import { learning } from './learning.svelte.ts';

export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 'small' | 'normal' | 'large' | 'xlarge';
/** Schematic symbol convention: IEC 60617 (Europe: FR, AT, DE…) or ANSI/IEEE 315 (US). */
export type SymbolNorm = 'iec' | 'ansi';

function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}
function write(key: string, value: string | null) {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		/* storage blocked: preference lasts for this session only */
	}
}

class Prefs {
	theme = $state<Theme>('system');
	textSize = $state<TextSize>('normal');
	reducedMotion = $state(false);
	symbolNorm = $state<SymbolNorm>('iec');

	load() {
		const t = read('cp.theme');
		this.theme = t === 'light' || t === 'dark' ? t : 'system';
		const s = read('cp.textSize');
		this.textSize = s === 'small' || s === 'large' || s === 'xlarge' ? s : 'normal';
		this.reducedMotion = read('cp.reducedMotion') === 'true';
		this.symbolNorm = read('cp.symbolNorm') === 'ansi' ? 'ansi' : 'iec';
		this.apply();
	}

	apply() {
		const d = document.documentElement;
		if (this.theme === 'system') delete d.dataset.theme;
		else d.dataset.theme = this.theme;
		if (this.textSize === 'normal') delete d.dataset.textSize;
		else d.dataset.textSize = this.textSize;
		if (this.reducedMotion) d.dataset.reducedMotion = 'true';
		else delete d.dataset.reducedMotion;
	}

	setTheme(theme: Theme) {
		this.theme = theme;
		write('cp.theme', theme === 'system' ? null : theme);
		this.apply();
		void this.#record('theme', theme);
	}

	setTextSize(size: TextSize) {
		this.textSize = size;
		write('cp.textSize', size === 'normal' ? null : size);
		this.apply();
		void this.#record('textSize', size);
	}

	setReducedMotion(on: boolean) {
		this.reducedMotion = on;
		write('cp.reducedMotion', on ? 'true' : null);
		this.apply();
		void this.#record('reducedMotion', on);
	}

	setSymbolNorm(norm: SymbolNorm) {
		this.symbolNorm = norm;
		write('cp.symbolNorm', norm === 'iec' ? null : norm);
		void this.#record('symbolNorm', norm);
	}

	/** True when animations should be skipped (user setting or OS setting). */
	get motionReduced(): boolean {
		return (
			this.reducedMotion ||
			(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
		);
	}

	async #record(key: string, value: unknown) {
		if (learning.status !== 'ready') return;
		try {
			await learning.call('setPreference', { key, value });
		} catch {
			/* history entry is best-effort */
		}
	}
}

export const prefs = new Prefs();
