/** Locale helpers for authored course text (LocalizedText) and dates/numbers. */
import { getLocale, setLocale, locales } from '#lib/paraglide/runtime.js';
import type { LocalizedText } from '#learning';

export { getLocale, setLocale, locales };
export type AppLocale = ReturnType<typeof getLocale>;

/** Picks the current locale from an authored `{ en, fr }` text. */
export function tx(text: LocalizedText | undefined | null): string {
	if (!text) return '';
	return text[getLocale()] ?? text.en;
}

export function fmtDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
	if (!iso) return '—';
	return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', ...opts }).format(
		new Date(iso)
	);
}

export function fmtDateTime(iso: string | undefined): string {
	return fmtDate(iso, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "in 3 days", "yesterday"… */
export function fmtRelative(iso: string | undefined, now = Date.now()): string {
	if (!iso) return '—';
	const diff = new Date(iso).getTime() - now;
	const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
	const abs = Math.abs(diff);
	const minute = 60_000,
		hour = 60 * minute,
		day = 24 * hour;
	if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
	if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
	if (abs < 60 * day) return rtf.format(Math.round(diff / day), 'day');
	return rtf.format(Math.round(diff / (30 * day)), 'month');
}

export function fmtNumber(n: number, maxDigits = 4): string {
	return new Intl.NumberFormat(getLocale(), { maximumSignificantDigits: maxDigits }).format(n);
}
