<script lang="ts">
	import { resolve } from '$app/paths';
	import type { SelectedItem } from '#learning';
	import { m } from '#lib/paraglide/messages.js';
	import { learning, newId } from '#lib/app/learning.svelte.ts';
	import { tx, fmtRelative, fmtDate } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import Exercise, { type AnswerEvent } from '#lib/ui/Exercise.svelte';

	const due = $derived(learning.views.dueConceptIds);
	const nextDue = $derived.by(() => {
		let min: string | undefined;
		for (const c of Object.values(learning.projection.concepts))
			if (c.masteredAt && c.dueAt && (!min || c.dueAt < min)) min = c.dueAt;
		return min;
	});

	let items = $state<SelectedItem[] | null>(null);
	let index = $state(0);
	let firstTry = $state<Record<number, boolean>>({});
	let finished = $state(false);
	let busy = $state(false);
	let error = $state('');
	let sessionId = $state(newId());

	async function start() {
		busy = true;
		error = '';
		sessionId = newId();
		try {
			const sel = await learning.call('selectReview', { max: 10, sessionId });
			items = sel.items;
			index = 0;
			firstTry = {};
			finished = false;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	function answered(i: number, e: AnswerEvent) {
		if (e.firstTry) firstTry[i] = e.grade.correct;
	}

	function exit() {
		items = null;
		finished = false;
	}

	const correctCount = $derived(Object.values(firstTry).filter(Boolean).length);
	const item = $derived(items?.[index]);
	const exercise = $derived(item ? learning.ix.exercises.get(item.exerciseId) : undefined);
	const concept = $derived(item ? learning.ix.concepts.get(item.conceptId) : undefined);
</script>

<svelte:head><title>{m.review_title()} · CircuitPath</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<PageHeader eyebrow={m.nav_review()} title={m.review_title()} subtitle={m.review_intro()} />

	{#if error}
		<p class="mb-4 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger" role="alert">{error}</p>
	{/if}

	{#if items === null}
		{#if due.length === 0}
			<div class="card p-8 text-center">
				<span
					class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-success-soft text-success"
					><Icon name="check-circle" size={26} /></span
				>
				<h2 class="text-2xl font-semibold">{m.review_empty_title()}</h2>
				<p class="mx-auto mt-3 max-w-md text-ink-2">{m.today_review_none()}</p>
				{#if nextDue}
					<p
						class="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-2"
						title={fmtDate(nextDue)}
					>
						<Icon name="clock" size={14} />{m.review_next_due({ when: fmtRelative(nextDue) })}
					</p>
				{/if}
				<div class="mt-6">
					<a href={resolve('/course')} class="btn btn-ghost">{m.today_view_course()}</a>
				</div>
			</div>
		{:else}
			<div class="card overflow-hidden">
				<div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
					<span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-peach text-peach-ink"
						><Icon name="refresh" size={26} /></span
					>
					<div class="flex-1">
						<p class="eyebrow mb-1">{m.today_review_due()}</p>
						<h2 class="text-2xl font-semibold">{m.today_review_count({ count: due.length })}</h2>
					</div>
					<button type="button" class="btn btn-accent" onclick={start} disabled={busy}>
						<Icon name="play" size={16} />{m.review_start()}
					</button>
				</div>
				<ul class="flex flex-wrap gap-2 border-t border-line bg-surface-2/50 px-6 py-4 sm:px-8">
					{#each due as id (id)}
						{@const c = learning.ix.concepts.get(id)}
						{@const st = learning.views.concepts[id]?.state}
						<li>
							<Badge tone={st === 'needs_work' ? 'danger' : 'warning'}>{c ? tx(c.name) : id}</Badge>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{:else if items.length === 0 || finished}
		<div class="card overflow-hidden">
			<div class="dot-grid bg-brand px-6 py-10 text-center text-brand-ink">
				<span
					class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink"
					><Icon name="check" size={28} stroke={2.5} /></span
				>
				<h2 class="text-3xl font-semibold">{m.review_done()}</h2>
				{#if items.length}
					<p class="mt-3 font-mono text-lg text-brand-ink-2 tabular-nums">
						{m.practice_score({ correct: correctCount, total: items.length })}
					</p>
				{/if}
				{#if nextDue}
					<p class="mt-2 text-sm text-brand-ink-2">
						{m.review_next_due({ when: fmtRelative(nextDue) })}
					</p>
				{/if}
			</div>
			<div class="flex justify-center gap-3 p-6">
				<button type="button" class="btn btn-ghost" onclick={exit}>{m.done()}</button>
				<a href={resolve('/')} class="btn btn-primary">{m.go_home()}</a>
			</div>
		</div>
	{:else if item && exercise}
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<span class="font-mono text-sm text-ink-2 tabular-nums"
				>{m.practice_question_of({ index: index + 1, total: items.length })}</span
			>
			{#if concept}<Badge tone="warning">{tx(concept.name)}</Badge>{/if}
			{#if item.repeated}<Badge>{m.practice_repeat_label()}</Badge>{/if}
		</div>
		<ProgressBar
			class="mb-5"
			value={index / items.length}
			label={m.practice_question_of({ index: index + 1, total: items.length })}
		/>
		<article class="card p-5 sm:p-8">
			{#key `${sessionId}-${index}`}
				<Exercise
					{exercise}
					context={{ kind: 'review', refId: 'review', sessionId, reviewConceptId: item.conceptId }}
					onanswered={(e) => answered(index, e)}
				/>
			{/key}
		</article>
		<div class="mt-6 flex justify-end">
			{#if index < items.length - 1}
				<button type="button" class="btn btn-primary" onclick={() => (index += 1)}>
					{m.practice_next()}<Icon name="arrow-right" size={16} />
				</button>
			{:else}
				<button type="button" class="btn btn-accent" onclick={() => (finished = true)}>
					{m.practice_finish()}<Icon name="arrow-right" size={16} />
				</button>
			{/if}
		</div>
	{/if}
</div>
