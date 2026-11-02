<script lang="ts">
	import type { AnyEvent } from '#learning';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { fmtDate, getLocale } from '#lib/app/i18n.ts';
	import { toneClass } from '#lib/app/labels.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { EVENT_LABEL, describe, newestFirst } from './events.ts';

	let events = $state.raw<AnyEvent[] | null>(null);
	let type = $state<'all' | AnyEvent['type']>('all');

	onMount(() => {
		void learning.call('allEvents', {}).then((e) => (events = newestFirst(e)));
	});

	const types = Object.keys(EVENT_LABEL) as AnyEvent['type'][];
	const filtered = $derived(
		events ? (type === 'all' ? events : events.filter((e) => e.type === type)) : []
	);
	const days = $derived.by(() => {
		const groups: { key: string; events: AnyEvent[] }[] = [];
		for (const e of filtered.slice(0, 1000)) {
			const key = e.occurredAt.slice(0, 10);
			const last = groups.at(-1);
			if (last && last.key === key) last.events.push(e);
			else groups.push({ key, events: [e] });
		}
		return groups;
	});
	const time = (iso: string) =>
		new Intl.DateTimeFormat(getLocale(), { timeStyle: 'short' }).format(new Date(iso));
</script>

<svelte:head><title>{m.history_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.nav_progress()} title={m.history_title()} subtitle={m.history_subtitle()} />

<div class="mb-6 flex flex-wrap items-end gap-4">
	<label class="w-full max-w-xs">
		<span class="mb-1 block text-sm font-medium text-ink-2">{m.history_filter_type()}</span>
		<select class="input" bind:value={type}>
			<option value="all">{m.history_filter_all()}</option>
			{#each types as t (t)}<option value={t}>{EVENT_LABEL[t]()}</option>{/each}
		</select>
	</label>
	{#if events}
		<p class="pb-3 text-sm text-ink-3" aria-live="polite">
			{m.history_count({ count: filtered.length })}
		</p>
	{/if}
</div>

{#if events === null}
	<p class="text-ink-2">{m.loading()}</p>
{:else if filtered.length === 0}
	<div class="card p-10 text-center text-ink-2">{m.history_empty()}</div>
{:else}
	<div class="space-y-8">
		{#each days as day (day.key)}
			<section aria-labelledby="day-{day.key}">
				<h2 id="day-{day.key}" class="eyebrow mb-3">
					{fmtDate(day.events[0].occurredAt, { dateStyle: 'full' })}
				</h2>
				<ol class="card divide-y divide-line overflow-hidden">
					{#each day.events as e (e.eventId)}
						{@const d = describe(e)}
						<li class="flex items-start gap-3 px-4 py-3 sm:px-5">
							<span
								class="grid size-8 shrink-0 place-items-center rounded-lg border {toneClass[
									d.tone
								]}"
							>
								<Icon name={d.icon} size={15} />
							</span>
							<div class="min-w-0 flex-1">
								<p class="text-sm">
									<span class="font-medium">{d.label}</span>
									{#if d.entity}<span class="text-ink-2"> · {d.entity}</span>{/if}
								</p>
								{#if d.detail}<p class="mt-0.5 text-xs text-ink-3">{d.detail}</p>{/if}
							</div>
							<time
								datetime={e.occurredAt}
								class="shrink-0 font-mono text-xs text-ink-3 tabular-nums"
							>
								{time(e.occurredAt)}
							</time>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</div>
{/if}
