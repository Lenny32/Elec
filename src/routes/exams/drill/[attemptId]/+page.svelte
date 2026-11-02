<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import Exercise, { type AnswerEvent } from '#lib/ui/Exercise.svelte';
	import { examLabel } from '../../exam-utils.ts';

	const attemptId = $derived(page.params.attemptId ?? '');
	const attempt = $derived(learning.projection.examAttempts[attemptId]);
	const exam = $derived(attempt ? learning.ix.exams.get(attempt.examId) : undefined);
	const drill = $derived(attempt?.drill);

	// startDrill is idempotent: it returns the existing drill id when one was already started.
	let failure = $state<{ attemptId: string; message: string } | null>(null);
	async function request(id: string) {
		try {
			const drillId = await learning.call('startDrill', { attemptId: id });
			if (!drillId) failure = { attemptId: id, message: '' };
		} catch (e) {
			failure = { attemptId: id, message: e instanceof Error ? e.message : String(e) };
		}
	}
	$effect(() => {
		void request(attemptId);
	});
	const status = $derived(
		drill ? 'ready' : failure?.attemptId === attemptId ? 'unavailable' : 'loading'
	);
	const error = $derived(failure?.attemptId === attemptId ? failure.message : '');

	const total = $derived(drill?.itemIds.length ?? 0);
	const done = $derived(drill?.correctItemIds.length ?? 0);
	const unsolved = $derived(
		drill ? drill.itemIds.filter((id) => !drill.correctItemIds.includes(id)) : []
	);

	/** A solved item stays on screen until the learner moves on. */
	let pinned = $state<string | null>(null);
	const currentId = $derived(
		pinned && drill?.itemIds.includes(pinned) ? pinned : (unsolved[0] ?? null)
	);
	const solvedCurrent = $derived(!!currentId && !unsolved.includes(currentId));
	const exercise = $derived(currentId ? learning.ix.exercises.get(currentId) : undefined);

	function onanswered(e: AnswerEvent) {
		if (e.grade.correct) pinned = currentId;
	}
	function nextItem() {
		pinned = null;
	}

	const studyLessons = $derived([
		...new Set(
			(attempt?.missedConceptIds ?? [])
				.map((c) => learning.ix.teachingLesson.get(c))
				.filter((l): l is string => !!l)
		)
	]);
</script>

<svelte:head><title>{m.drill_title()} · CircuitPath</title></svelte:head>

{#if !attempt || !exam}
	<div class="mx-auto max-w-md py-20 text-center">
		<h1 class="text-3xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/exams')} class="btn btn-primary mt-8">{m.exams_title()}</a>
	</div>
{:else}
	<a
		href={resolve('/exams/[examId]', { examId: exam.id })}
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
	>
		<Icon name="arrow-left" size={16} />{examLabel(learning.ix, exam)}
	</a>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
		<div class="min-w-0">
			<header class="mb-6">
				<p class="eyebrow mb-3 flex items-center gap-2">
					<span class="size-1.5 rounded-full bg-warning"></span>{examLabel(learning.ix, exam)}
				</p>
				<h1 class="text-3xl font-semibold tracking-tight">{m.drill_title()}</h1>
				<p class="mt-2 max-w-2xl text-ink-2">{m.drill_intro()}</p>
			</header>

			{#if status === 'loading'}
				<div
					class="h-64 animate-pulse rounded-2xl bg-surface-2"
					aria-busy="true"
					aria-label={m.loading()}
				></div>
			{:else if status === 'unavailable' || !drill}
				<div class="card p-6" role="status">
					<p class="text-ink-2">{error || m.drill_unavailable()}</p>
					<a href={resolve('/exams/[examId]', { examId: exam.id })} class="btn btn-primary mt-5"
						>{m.drill_go_retake()}</a
					>
				</div>
			{:else if drill.completedAt}
				<section class="overflow-hidden rounded-2xl bg-brand text-brand-ink">
					<div class="dot-grid p-6 sm:p-8">
						<span class="mb-5 grid size-12 place-items-center rounded-xl bg-accent text-accent-ink">
							<Icon name="check" size={24} stroke={2.2} />
						</span>
						<h2 class="text-2xl font-semibold">{m.drill_complete()}</h2>
						<p class="mt-2 text-brand-ink-2">{m.drill_complete_body()}</p>
						<a href={resolve('/exams/[examId]', { examId: exam.id })} class="btn btn-accent mt-6">
							{m.drill_go_retake()}<Icon name="arrow-right" size={16} />
						</a>
					</div>
				</section>
			{:else}
				<div class="mb-5">
					<div class="mb-2 flex justify-between text-sm text-ink-2">
						<span>{m.drill_progress({ done, total })}</span>
					</div>
					<ProgressBar
						value={total ? done / total : 0}
						label={m.drill_progress({ done, total })}
						color="var(--warning)"
					/>
				</div>
				{#if exercise && currentId}
					<section class="card p-5 sm:p-7">
						{#key currentId}
							<Exercise
								{exercise}
								context={{ kind: 'drill', refId: drill.drillId, sessionId: drill.drillId }}
								{onanswered}
							/>
						{/key}
						{#if solvedCurrent && unsolved.some((id) => id !== currentId)}
							<div class="mt-5 flex justify-end border-t border-line pt-5">
								<button type="button" class="btn btn-primary" onclick={nextItem}>
									{m.practice_next()}<Icon name="arrow-right" size={16} />
								</button>
							</div>
						{/if}
					</section>
				{/if}
			{/if}
		</div>

		<aside class="space-y-4">
			{#if drill && total}
				<section class="card p-5">
					<h2 class="eyebrow mb-3">{m.drill_progress({ done, total })}</h2>
					<ol class="flex flex-wrap gap-2">
						{#each drill.itemIds as id, i (id)}
							{@const ok = drill.correctItemIds.includes(id)}
							<li
								class="grid size-9 place-items-center rounded-lg font-mono text-sm {ok
									? 'bg-success-soft text-success'
									: id === currentId
										? 'bg-brand text-brand-ink'
										: 'bg-surface-2 text-ink-2'}"
								aria-label="{i + 1}{ok ? ` — ${m.correct()}` : ''}"
							>
								{#if ok}<Icon name="check" size={15} />{:else}{i + 1}{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/if}
			{#if studyLessons.length}
				<section class="card p-5">
					<h2 class="eyebrow mb-3">{m.drill_study_links()}</h2>
					<ul class="space-y-1">
						{#each studyLessons as lessonId (lessonId)}
							{@const lesson = learning.ix.lessons.get(lessonId)}
							{#if lesson}
								<li>
									<a
										href={resolve('/lesson/[lessonId]', { lessonId })}
										class="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-surface-2"
									>
										<span class="font-mono text-xs text-ink-3">{lesson.number}</span>
										<span class="min-w-0 flex-1">{tx(lesson.title)}</span>
										<Icon name="chevron-right" size={15} class="text-ink-3" />
									</a>
								</li>
							{/if}
						{/each}
					</ul>
				</section>
			{/if}
		</aside>
	</div>
{/if}
