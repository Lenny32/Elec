<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { SelectedItem } from '#learning';
	import { m } from '#lib/paraglide/messages.js';
	import { learning, newId } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import Exercise, { type AnswerEvent } from '#lib/ui/Exercise.svelte';

	const scope = $derived.by(() => {
		const q = page.url.searchParams;
		const chapterId = q.get('chapter') ?? undefined;
		const chapter = chapterId ? learning.ix.chapters.get(chapterId) : undefined;
		const formula = q.get('formula') ? learning.ix.formulas.get(q.get('formula')!) : undefined;
		let conceptIds = (q.get('concepts') ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter((id) => learning.ix.concepts.has(id));
		if (formula) conceptIds = [...new Set([...conceptIds, ...formula.conceptIds])];
		const title = chapter
			? m.exam_chapter_link({ number: chapter.number, title: tx(chapter.title) })
			: formula
				? tx(formula.name)
				: conceptIds.map((id) => tx(learning.ix.concepts.get(id)!.name)).join(' · ');
		return { chapter, conceptIds, title };
	});

	let items = $state<SelectedItem[] | null>(null);
	let index = $state(0);
	let firstTry = $state<Record<number, boolean>>({});
	let finished = $state(false);
	let error = $state('');
	let sessionId = $state(newId());

	async function load() {
		const s = untrack(() => scope);
		items = null;
		index = 0;
		firstTry = {};
		finished = false;
		error = '';
		sessionId = newId();
		if (!s.chapter && s.conceptIds.length === 0) {
			items = [];
			return;
		}
		try {
			const sel = await learning.call('selectPractice', {
				conceptIds: s.conceptIds,
				...(s.chapter ? { chapterId: s.chapter.id } : {}),
				perConcept: 2,
				sessionId
			});
			items = sel.items;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			items = [];
		}
	}

	const scopeKey = $derived(page.url.search);
	$effect(() => {
		void scopeKey;
		void load();
	});

	function answered(i: number, e: AnswerEvent) {
		if (e.firstTry) firstTry[i] = e.grade.correct;
	}

	const correctCount = $derived(Object.values(firstTry).filter(Boolean).length);
	const item = $derived(items?.[index]);
	const exercise = $derived(item ? learning.ix.exercises.get(item.exerciseId) : undefined);
	const concept = $derived(item ? learning.ix.concepts.get(item.conceptId) : undefined);
</script>

<svelte:head><title>{m.practice_title()} · CircuitPath</title></svelte:head>

<div class="mx-auto max-w-3xl">
	{#if scope.chapter}
		<nav class="mb-5" aria-label={m.breadcrumb()}>
			<a
				href={resolve('/course/[chapterId]', { chapterId: scope.chapter.id })}
				class="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
			>
				<Icon name="arrow-left" size={15} />{m.lesson_back_to_chapter()}
			</a>
		</nav>
	{/if}

	<PageHeader eyebrow={m.practice_title()} title={scope.title || m.practice_title()} />

	{#if error}
		<p class="mb-4 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger" role="alert">{error}</p>
	{/if}

	{#if items === null}
		<div
			class="h-64 animate-pulse rounded-2xl bg-surface-2"
			aria-busy="true"
			aria-label={m.loading()}
		></div>
	{:else if items.length === 0}
		<div class="card p-8 text-center">
			<span class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-2"
				><Icon name="target" size={22} /></span
			>
			<p class="text-ink-2">{m.practice_empty()}</p>
			<a href={resolve('/course')} class="btn btn-ghost mt-6">{m.course_title()}</a>
		</div>
	{:else if finished}
		<div class="card overflow-hidden">
			<div class="dot-grid bg-brand px-6 py-10 text-center text-brand-ink">
				<span
					class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink"
					><Icon name="check" size={28} stroke={2.5} /></span
				>
				<h2 class="text-3xl font-semibold">{m.practice_done()}</h2>
				<p class="mt-3 font-mono text-lg text-brand-ink-2 tabular-nums">
					{m.practice_score({ correct: correctCount, total: items.length })}
				</p>
			</div>
			<div class="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
				<button type="button" class="btn btn-accent" onclick={load}
					><Icon name="reset" size={16} />{m.practice_again()}</button
				>
				{#if scope.chapter}
					<a
						href={resolve('/course/[chapterId]', { chapterId: scope.chapter.id })}
						class="btn btn-ghost">{m.lesson_back_to_chapter()}</a
					>
				{:else}
					<a href={resolve('/')} class="btn btn-ghost">{m.go_home()}</a>
				{/if}
			</div>
		</div>
	{:else if item && exercise}
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<span class="font-mono text-sm text-ink-2 tabular-nums"
				>{m.practice_question_of({ index: index + 1, total: items.length })}</span
			>
			{#if concept}<Badge tone="brand">{tx(concept.name)}</Badge>{/if}
			{#if item.repeated}<Badge tone="warning">{m.practice_repeat_label()}</Badge>{/if}
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
					context={{ kind: 'practice', refId: scope.chapter?.id ?? 'practice', sessionId }}
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
