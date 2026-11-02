<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, fmtDateTime } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import {
		examLabel,
		scopeLabel,
		itemCount,
		percentOf,
		formLabel,
		formLetter,
		detailLabel
	} from '../exam-utils.ts';

	const examId = $derived(page.params.examId ?? '');
	const exam = $derived(learning.ix.exams.get(examId));
	const av = $derived(learning.views.exams[examId]);
	const passed = $derived(learning.views.passedExams[examId] ?? false);
	const attempts = $derived([...(learning.views.attempts[examId] ?? [])].reverse());
	const completedCount = $derived(attempts.filter((a) => a.completedAt).length);
	const chapter = $derived(
		exam?.scope === 'chapter' ? learning.ix.chapters.get(exam.scopeId) : undefined
	);

	let starting = $state(false);
	let error = $state('');

	async function start() {
		if (!exam) return;
		starting = true;
		error = '';
		try {
			const attemptId = await learning.call('startExam', { examId: exam.id });
			if (attemptId) await goto(resolve('/exams/attempt/[attemptId]', { attemptId }));
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			starting = false;
		}
	}

	const lockedText = {
		lessons_incomplete: m.exam_locked_lessons,
		chapters_not_passed: m.exam_locked_chapters,
		chapter_locked: m.exam_locked_chapter,
		not_authored: m.final_exam_unavailable
	} as const;
</script>

<svelte:head
	><title>{exam ? examLabel(learning.ix, exam) : m.not_found()} · CircuitPath</title></svelte:head
>

{#if !exam}
	<div class="mx-auto max-w-md py-20 text-center">
		<h1 class="text-3xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/exams')} class="btn btn-primary mt-8">{m.exams_title()}</a>
	</div>
{:else}
	<a
		href={resolve('/exams')}
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
	>
		<Icon name="arrow-left" size={16} />{m.exams_title()}
	</a>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
		<section class="overflow-hidden rounded-2xl bg-brand text-brand-ink">
			<div class="dot-grid p-6 sm:p-8">
				<p class="eyebrow mb-4 flex items-center gap-2 !text-brand-ink-2">
					<span class="size-1.5 rounded-full bg-accent"></span>{scopeLabel(exam)}
				</p>
				<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					{tx(exam.title)}
				</h1>
				{#if chapter}
					<p class="mt-2 text-brand-ink-2">{tx(chapter.summary)}</p>
				{/if}
				<ul class="mt-6 space-y-2 text-sm">
					<li class="flex items-center gap-2">
						<Icon name="target" size={16} class="text-accent" />
						{m.exam_pass_mark({ percent: exam.passPercent, count: itemCount(exam) })}
					</li>
					<li class="flex items-center gap-2">
						<Icon name="clock" size={16} class="text-accent" />{m.exam_no_hints()}
					</li>
				</ul>

				<div class="mt-8 flex flex-wrap items-center gap-3">
					{#if passed}
						<Badge tone="success"><Icon name="check" size={12} />{m.exam_passed()}</Badge>
					{/if}
					{#if av?.kind === 'available'}
						<button type="button" class="btn btn-accent" onclick={start} disabled={starting}>
							<Icon name="play" size={16} />
							{completedCount === 0
								? m.exam_start()
								: m.exam_retake({ form: formLetter(av.formIndex) })}
						</button>
					{:else if av?.kind === 'in_progress'}
						<a
							href={resolve('/exams/attempt/[attemptId]', { attemptId: av.attemptId })}
							class="btn btn-accent"
						>
							<Icon name="play" size={16} />{m.exam_resume()}
						</a>
					{/if}
				</div>
				{#if error}<p class="mt-3 text-sm text-accent" role="alert">{error}</p>{/if}
			</div>
		</section>

		<div class="space-y-4">
			{#if av?.kind === 'needs_drill'}
				<section class="card border-warning/40 p-5" aria-labelledby="drill-title">
					<span
						class="mb-4 grid size-11 place-items-center rounded-xl bg-warning-soft text-warning"
					>
						<Icon name="refresh" size={20} />
					</span>
					<h2 id="drill-title" class="text-lg font-semibold">{m.exam_needs_drill()}</h2>
					<p class="mt-2 text-sm text-ink-2">{m.exam_needs_drill_body()}</p>
					<a
						href={resolve('/exams/drill/[attemptId]', { attemptId: av.attemptId })}
						class="btn btn-primary mt-5 w-full"
					>
						{av.drillStarted ? m.exam_continue_drill() : m.exam_consolidate_cta()}
						<Icon name="arrow-right" size={16} />
					</a>
				</section>
			{:else if av?.kind === 'locked'}
				<section class="card p-5" aria-labelledby="locked-title">
					<span class="mb-4 grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
						<Icon name="lock" size={20} />
					</span>
					<h2 id="locked-title" class="text-lg font-semibold">{m.exam_unavailable()}</h2>
					<p class="mt-2 text-sm text-ink-2">{lockedText[av.reason]()}</p>
					{#if av.detail.length}
						<ul class="mt-4 space-y-1.5 text-sm">
							{#each av.detail as id (id)}
								{@const lesson = learning.ix.lessons.get(id)}
								<li class="flex items-center gap-2">
									<span class="size-1.5 shrink-0 rounded-full bg-ink-3"></span>
									{#if lesson}
										<a
											href={resolve('/lesson/[lessonId]', { lessonId: id })}
											class="hover:underline"
										>
											{detailLabel(learning.ix, id)}
										</a>
									{:else}
										{detailLabel(learning.ix, id)}
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}

			<section class="card p-5" aria-labelledby="history-title">
				<h2 id="history-title" class="eyebrow mb-4">{m.exams_history()}</h2>
				{#if attempts.length}
					<ul class="divide-y divide-line">
						{#each attempts as a (a.attemptId)}
							<li>
								<a
									href={resolve('/exams/attempt/[attemptId]', { attemptId: a.attemptId })}
									class="flex items-center gap-3 py-3 text-sm hover:text-ink"
								>
									<span
										class="grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold {a.passed
											? 'bg-success-soft text-success'
											: a.completedAt
												? 'bg-danger-soft text-danger'
												: 'bg-violet text-violet-ink'}"
									>
										{formLabel(exam, a.formId)}
									</span>
									<span class="min-w-0 flex-1">
										<span class="block font-medium">
											{#if a.completedAt}
												{a.passed ? m.exam_passed() : m.exam_failed()}
											{:else}
												{m.state_in_progress()}
											{/if}
										</span>
										<span class="block text-xs text-ink-2"
											>{m.exam_attempt_on({ date: fmtDateTime(a.startedAt) })}</span
										>
									</span>
									{#if a.completedAt}
										<span class="font-mono tabular-nums">{percentOf(a)}%</span>
									{/if}
									<Icon name="chevron-right" size={16} class="text-ink-3" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-ink-2">{m.exam_no_attempts()}</p>
				{/if}
			</section>
		</div>
	</div>
{/if}
