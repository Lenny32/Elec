<script lang="ts">
	import type { AnyEvent } from '#learning';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, fmtRelative } from '#lib/app/i18n.ts';
	import { toneClass, type Tone } from '#lib/app/labels.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import ProgressRing from '#lib/ui/ProgressRing.svelte';
	import { describe, newestFirst } from '../history/events.ts';

	let recent = $state.raw<AnyEvent[] | null>(null);
	onMount(() => {
		void learning.call('allEvents', {}).then((e) => {
			recent = newestFirst(e.filter((x) => x.type !== 'CARD_VIEWED')).slice(0, 15);
		});
	});

	const counts = $derived.by(() => {
		const c = { mastered: 0, review: 0, progress: 0, work: 0 };
		for (const s of Object.values(learning.views.concepts)) {
			if (s.state === 'mastered') c.mastered++;
			else if (s.state === 'review_due') c.review++;
			else if (s.state === 'learning' || s.state === 'practicing') c.progress++;
			else if (s.state === 'needs_work') c.work++;
		}
		return c;
	});
	const total = $derived(learning.ix.pack.concepts.length);
	const tiles = $derived<{ label: string; value: number; icon: IconName; tone: Tone }[]>([
		{ label: m.profile_mastered(), value: counts.mastered, icon: 'star', tone: 'success' },
		{ label: m.profile_to_review(), value: counts.review, icon: 'refresh', tone: 'warning' },
		{ label: m.profile_in_progress(), value: counts.progress, icon: 'target', tone: 'violet' },
		{ label: m.profile_needs_work(), value: counts.work, icon: 'alert', tone: 'danger' }
	]);
	const chapters = $derived(
		learning.ix.pack.chapters
			.filter((c) => c.status === 'authored')
			.map((c) => ({ chapter: c, p: learning.views.chapters[c.id] }))
	);
	const activeDays = $derived(learning.projection.activeDays.length);
</script>

<svelte:head><title>{m.profile_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.nav_progress()} title={m.profile_title()} subtitle={m.profile_subtitle()} />

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
	<div class="min-w-0 space-y-6">
		<section aria-labelledby="states-title">
			<h2 id="states-title" class="sr-only">{m.profile_states()}</h2>
			<ul class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{#each tiles as t (t.label)}
					<li class="card p-5">
						<span class="mb-4 grid size-9 place-items-center rounded-lg border {toneClass[t.tone]}">
							<Icon name={t.icon} size={18} />
						</span>
						<p class="font-mono text-3xl tabular-nums">{t.value}</p>
						<p class="mt-1 text-sm font-medium">{t.label}</p>
					</li>
				{/each}
			</ul>
			<p class="mt-3 flex items-start gap-2 text-xs text-ink-2">
				<Icon name="info" size={14} class="mt-px" />{m.profile_note()}
			</p>
		</section>

		<section class="card p-6" aria-labelledby="chapters-title">
			<h2 id="chapters-title" class="mb-5 text-lg font-semibold">{m.profile_chapters()}</h2>
			<ul class="space-y-5">
				{#each chapters as { chapter, p } (chapter.id)}
					<li>
						<div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
							<span class="font-mono text-xs text-ink-3">{chapter.number}</span>
							<a
								href={resolve('/course/[chapterId]', { chapterId: chapter.id })}
								class="font-medium hover:underline">{tx(chapter.title)}</a
							>
							{#if p.complete}
								<Icon
									name="check-circle"
									size={16}
									class="text-success"
									label={m.chapter_complete()}
								/>
							{:else if !p.unlocked}
								<Icon name="lock" size={14} class="text-ink-3" label={m.locked()} />
							{/if}
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<p class="mb-1 text-xs text-ink-2">
									{m.chapter_lessons_done({ done: p.lessonsCompleted, total: p.lessonCount })}
								</p>
								<ProgressBar
									value={p.lessonCount ? p.lessonsCompleted / p.lessonCount : 0}
									label={m.chapter_lessons()}
								/>
							</div>
							<div>
								<p class="mb-1 text-xs text-ink-2">
									{m.chapter_concepts_mastered({ done: p.conceptsMastered, total: p.conceptCount })}
								</p>
								<ProgressBar
									value={p.conceptCount ? p.conceptsMastered / p.conceptCount : 0}
									label={m.chapter_concepts()}
									color="var(--success)"
								/>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<div class="space-y-6">
		<section class="card flex items-center gap-5 p-6">
			<ProgressRing
				value={total ? counts.mastered / total : 0}
				size={96}
				stroke={8}
				label={m.today_knowledge()}
			>
				<span class="font-mono text-lg tabular-nums">{counts.mastered}/{total}</span>
			</ProgressRing>
			<div>
				<p class="font-semibold">{m.today_knowledge()}</p>
				<p class="mt-1 text-sm text-ink-2">
					{m.today_mastered_of({ mastered: counts.mastered, total })}
				</p>
				<p class="mt-3 flex items-center gap-1.5 text-sm text-ink-2">
					<Icon name="clock" size={15} />{m.profile_active_days_count({ count: activeDays })}
				</p>
			</div>
		</section>

		<section class="card p-6" aria-labelledby="timeline-title">
			<h2 id="timeline-title" class="mb-4 text-lg font-semibold">{m.profile_timeline()}</h2>
			{#if recent === null}
				<p class="text-sm text-ink-2">{m.loading()}</p>
			{:else if recent.length === 0}
				<p class="text-sm text-ink-2">{m.profile_timeline_empty()}</p>
			{:else}
				<ol class="relative space-y-4 border-l border-line pl-5">
					{#each recent as e (e.eventId)}
						{@const d = describe(e)}
						<li class="relative">
							<span
								class="absolute top-1 -left-[1.6rem] grid size-4 place-items-center rounded-full border-2 border-surface {toneClass[
									d.tone
								]}"
							></span>
							<p class="text-sm"><span class="font-medium">{d.label}</span></p>
							{#if d.entity}<p class="truncate text-sm text-ink-2">{d.entity}</p>{/if}
							<time datetime={e.occurredAt} class="text-xs text-ink-3"
								>{fmtRelative(e.occurredAt)}</time
							>
						</li>
					{/each}
				</ol>
			{/if}
			<a
				href={resolve('/history')}
				class="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold hover:underline"
			>
				{m.profile_all_history()}<Icon name="arrow-right" size={16} />
			</a>
		</section>
	</div>
</div>
