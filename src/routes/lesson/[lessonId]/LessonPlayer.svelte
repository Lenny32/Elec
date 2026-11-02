<script lang="ts">
	import { onMount } from 'svelte';
	import type { Lesson, Chapter } from '#learning';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning, newId } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import CardView from './CardView.svelte';

	// Keyed by lesson id in +page.svelte: one instance per lesson visit.
	let { lesson, chapter }: { lesson: Lesson; chapter: Chapter } = $props();

	const lessonState = $derived(learning.views.lessons[lesson.id] ?? 'locked');
	const resumeAt = () =>
		Math.min(
			Math.max(0, learning.projection.lessons[lesson.id]?.lastCardIndex ?? 0),
			lesson.cards.length - 1
		);

	let index = $state(resumeAt());
	let done = $state(false);
	let busy = $state(false);
	let error = $state('');
	const sessionId = newId();

	const total = $derived(lesson.cards.length);
	const card = $derived(lesson.cards[index]);
	const isLast = $derived(index === total - 1);

	// Start the lesson and record the resumed card.
	onMount(() => {
		if (lessonState !== 'locked') void record(lesson.id, index);
	});

	async function record(lessonId: string, i: number) {
		const l = learning.ix.lessons.get(lessonId);
		if (!l) return;
		try {
			await learning.call('startLesson', { lessonId });
			await learning.call('viewCard', { lessonId, cardId: l.cards[i].id, cardIndex: i });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function go(i: number) {
		if (i < 0 || i >= total || i === index) return;
		index = i;
		void record(lesson.id, i);
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function complete() {
		busy = true;
		error = '';
		try {
			await learning.call('completeLesson', { lessonId: lesson.id });
			done = true;
			window.scrollTo({ top: 0 });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	// Next lesson: the chapter's following lesson when it's open, otherwise the course's next one.
	const nextLessonId = $derived.by(() => {
		const i = chapter.lessonIds.indexOf(lesson.id);
		const following = chapter.lessonIds[i + 1];
		if (following && learning.views.lessons[following] !== 'locked') return following;
		const n = learning.views.nextLessonId;
		return n && n !== lesson.id ? n : undefined;
	});
	const nextLesson = $derived(nextLessonId ? learning.ix.lessons.get(nextLessonId) : undefined);

	function onkeydown(e: KeyboardEvent) {
		if (done || lessonState === 'locked' || e.altKey || e.ctrlKey || e.metaKey) return;
		const t = e.target as HTMLElement | null;
		if (
			t &&
			(t.closest('input, select, textarea, [contenteditable="true"]') || t.closest('dialog'))
		)
			return;
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			go(index + 1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			go(index - 1);
		}
	}

	let touch: { x: number; y: number } | null = null;
	function ontouchstart(e: TouchEvent) {
		const t = e.target as HTMLElement | null;
		if (t?.closest('input, select, textarea, svg')) {
			touch = null;
			return;
		}
		touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
	}
	function ontouchend(e: TouchEvent) {
		if (!touch) return;
		const dx = e.changedTouches[0].clientX - touch.x;
		const dy = e.changedTouches[0].clientY - touch.y;
		touch = null;
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? index + 1 : index - 1);
	}
</script>

<svelte:window {onkeydown} />

<div class="mx-auto max-w-3xl">
	<nav class="mb-5" aria-label={m.breadcrumb()}>
		<a
			href={resolve('/course/[chapterId]', { chapterId: chapter.id })}
			class="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
		>
			<Icon name="arrow-left" size={15} />{m.chapter_label({ number: chapter.number })} · {tx(
				chapter.title
			)}
		</a>
	</nav>

	{#if lessonState === 'locked'}
		<div class="card p-8 text-center">
			<span class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-2"
				><Icon name="lock" size={22} /></span
			>
			<h1 class="text-2xl font-semibold">{lesson.number} · {tx(lesson.title)}</h1>
			<p class="mt-3 text-ink-2">{m.lesson_locked_body()}</p>
			<a
				href={resolve('/course/[chapterId]', { chapterId: chapter.id })}
				class="btn btn-primary mt-6">{m.lesson_back_to_chapter()}</a
			>
		</div>
	{:else if done}
		<div class="card overflow-hidden">
			<div class="dot-grid bg-brand px-6 py-10 text-center text-brand-ink sm:px-10">
				<span
					class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink"
					><Icon name="check" size={28} stroke={2.5} /></span
				>
				<p class="eyebrow mb-2 !text-brand-ink-2">{lesson.number} · {tx(lesson.title)}</p>
				<h1 class="text-3xl font-semibold tracking-tight">{m.lesson_completed()}</h1>
				<p class="mx-auto mt-3 max-w-md text-brand-ink-2">{m.lesson_completed_body()}</p>
			</div>
			<div class="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
				{#if nextLesson}
					<a
						href={resolve('/lesson/[lessonId]', { lessonId: nextLesson.id })}
						class="btn btn-accent"
					>
						{m.lesson_next_lesson()}: {nextLesson.number} · {tx(nextLesson.title)}<Icon
							name="arrow-right"
							size={16}
						/>
					</a>
				{/if}
				<a href={resolve('/course/[chapterId]', { chapterId: chapter.id })} class="btn btn-ghost"
					>{m.lesson_back_to_chapter()}</a
				>
			</div>
		</div>
	{:else}
		<header class="mb-6">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<p class="eyebrow">{lesson.number}</p>
				<span class="flex items-center gap-1 text-xs text-ink-2"
					><Icon name="clock" size={13} />{m.lesson_minutes({
						minutes: lesson.estimatedMinutes
					})}</span
				>
			</div>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tx(lesson.title)}</h1>
			{#if index === 0}
				<div class="mt-5 rounded-2xl border border-line bg-surface-2/60 p-4">
					<h2 class="eyebrow mb-2">{m.lesson_objectives()}</h2>
					<ul class="space-y-1.5 text-sm">
						{#each lesson.objectives as o, i (i)}
							<li class="flex gap-2">
								<Icon name="target" size={16} class="mt-0.5 text-sage-ink" /><Rich
									inline
									text={o}
								/>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			<div class="mt-5 flex items-center gap-3">
				<ol
					class="flex flex-1 gap-1"
					aria-label={m.lesson_card_progress({ index: index + 1, total })}
				>
					{#each lesson.cards as c, i (c.id)}
						<li class="flex-1">
							<button
								type="button"
								class="block h-1.5 w-full rounded-full transition-colors {i < index
									? 'bg-sage-ink'
									: i === index
										? 'bg-brand'
										: 'bg-surface-3'}"
								aria-label={m.lesson_card_progress({ index: i + 1, total })}
								aria-current={i === index ? 'step' : undefined}
								onclick={() => go(i)}
							></button>
						</li>
					{/each}
				</ol>
				<span class="font-mono text-xs text-ink-2 tabular-nums"
					>{m.lesson_card_of({ index: index + 1, total })}</span
				>
			</div>
		</header>

		<p class="sr-only" aria-live="polite">{m.lesson_card_progress({ index: index + 1, total })}</p>

		<article class="card min-h-[18rem] p-5 sm:p-8" {ontouchstart} {ontouchend}>
			{#if card}
				{#key card.id}
					<CardView {card} lessonId={lesson.id} {sessionId} />
				{/key}
			{/if}
		</article>

		{#if error}
			<p class="mt-4 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger" role="alert">
				{error}
			</p>
		{/if}

		<div
			class="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
		>
			<button
				type="button"
				class="btn btn-ghost"
				onclick={() => go(index - 1)}
				disabled={index === 0}
			>
				<Icon name="arrow-left" size={16} />{m.previous()}
			</button>
			<p class="hidden flex-1 text-center text-xs text-ink-3 md:block">{m.lesson_swipe_hint()}</p>
			<span class="flex-1 md:hidden"></span>
			{#if isLast}
				<button type="button" class="btn btn-accent" onclick={complete} disabled={busy}>
					<Icon name="check" size={16} />{m.lesson_complete_cta()}
				</button>
			{:else}
				<button type="button" class="btn btn-primary" onclick={() => go(index + 1)}>
					{m.next()}<Icon name="arrow-right" size={16} />
				</button>
			{/if}
		</div>
	{/if}
</div>
