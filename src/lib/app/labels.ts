/** Display labels and tones for learning states. */
import { m } from '#lib/paraglide/messages.js';
import type { ConceptState, LessonState } from '#learning';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

export const conceptStateLabel: Record<ConceptState, () => string> = {
	locked: m.state_locked,
	ready: m.state_ready,
	learning: m.state_learning,
	practicing: m.state_practicing,
	mastered: m.state_mastered,
	review_due: m.state_review_due,
	needs_work: m.state_needs_work
};

export const conceptStateTone: Record<ConceptState, Tone> = {
	locked: 'neutral',
	ready: 'info',
	learning: 'violet',
	practicing: 'brand',
	mastered: 'success',
	review_due: 'warning',
	needs_work: 'danger'
};

export const lessonStateLabel: Record<LessonState, () => string> = {
	locked: m.state_locked,
	available: m.state_available,
	in_progress: m.state_in_progress,
	completed: m.state_completed
};

export const lessonStateTone: Record<LessonState, Tone> = {
	locked: 'neutral',
	available: 'brand',
	in_progress: 'violet',
	completed: 'success'
};

/** Tailwind classes for a tone: soft background + strong text. */
export const toneClass: Record<Tone, string> = {
	neutral: 'bg-surface-2 text-ink-2 border-line',
	brand: 'bg-sage text-sage-ink border-transparent',
	success: 'bg-success-soft text-success border-transparent',
	warning: 'bg-warning-soft text-warning border-transparent',
	danger: 'bg-danger-soft text-danger border-transparent',
	info: 'bg-info-soft text-info border-transparent',
	violet: 'bg-violet text-violet-ink border-transparent'
};

/** Solid colour (CSS var) for a tone, used in SVG graphics. */
export const toneVar: Record<Tone, string> = {
	neutral: 'var(--ink-3)',
	brand: 'var(--sage-ink)',
	success: 'var(--success)',
	warning: 'var(--warning)',
	danger: 'var(--danger)',
	info: 'var(--info)',
	violet: 'var(--violet-ink)'
};
