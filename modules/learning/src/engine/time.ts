/**
 * Timezone-aware calendar arithmetic (SPEC §7.4): no `24*60*60*1000` offsets.
 * Uses Intl only; deterministic for a given (instant, IANA zone).
 */

export interface LocalDate {
	year: number;
	month: number; // 1-12
	day: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(zone: string): Intl.DateTimeFormat {
	let f = fmtCache.get(zone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
		fmtCache.set(zone, f);
	}
	return f;
}

function parts(instantMs: number, zone: string) {
	const out: Record<string, number> = {};
	for (const p of fmt(zone).formatToParts(new Date(instantMs))) {
		if (p.type !== 'literal') out[p.type] = Number(p.value);
	}
	return out as {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
	};
}

/** Offset (ms) of `zone` from UTC at a given instant. */
function offsetAt(instantMs: number, zone: string): number {
	const p = parts(instantMs, zone);
	const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return asUTC - Math.floor(instantMs / 1000) * 1000;
}

export function localDateOf(iso: string, zone: string): LocalDate {
	const p = parts(Date.parse(iso), zone);
	return { year: p.year, month: p.month, day: p.day };
}

/** Pure Gregorian calendar day addition (no time involved). */
export function addCalendarDays(d: LocalDate, days: number): LocalDate {
	const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
	return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/**
 * Converts a local wall-clock time in `zone` to a UTC ISO instant. For DST gaps the time shifts
 * forward; for overlaps the earlier instant is chosen — both deterministic.
 */
export function zonedToUtcISO(d: LocalDate, hour: number, minute: number, zone: string): string {
	const wall = Date.UTC(d.year, d.month - 1, d.day, hour, minute);
	let guess = wall - offsetAt(wall, zone);
	guess = wall - offsetAt(guess, zone);
	const check = parts(guess, zone);
	if (check.hour !== hour) {
		// Gap or overlap: try the other offset and keep the earliest valid-ish instant.
		const alt = wall - offsetAt(guess - 3600_000, zone);
		if (parts(alt, zone).hour === hour) guess = Math.min(guess, alt);
	}
	return new Date(guess).toISOString();
}

export const REVIEW_HOUR = 9;

/** Local `days` calendar days after the event's local date, at 09:00 local, as UTC ISO. */
export function addLocalDaysAt0900(occurredAtISO: string, zone: string, days: number): string {
	return zonedToUtcISO(
		addCalendarDays(localDateOf(occurredAtISO, zone), days),
		REVIEW_HOUR,
		0,
		zone
	);
}

export function localDateKey(iso: string, zone: string): string {
	const d = localDateOf(iso, zone);
	return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function currentZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
