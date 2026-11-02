<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, fmtDateTime } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import Dialog from '#lib/ui/Dialog.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import ProgressRing from '#lib/ui/ProgressRing.svelte';
	import Exercise from '#lib/ui/Exercise.svelte';
	import {
		examLabel,
		formLabel,
		percentOf,
		formatResponse,
		formatCorrect
	} from '../../exam-utils.ts';

	const attemptId = $derived(page.params.attemptId ?? '');
	const attempt = $derived(learning.projection.examAttempts[attemptId]);
	const exam = $derived(attempt ? learning.ix.exams.get(attempt.examId) : undefined);
	const items = $derived(attempt?.itemIds ?? []);
	const answeredCount = $derived(attempt ? Object.keys(attempt.answers).length : 0);
	const unanswered = $derived(items.length - answeredCount);

	let index = $state(0);
	let confirmOpen = $state(false);
	let finishing = $state(false);
	let error = $state('');

	const itemId = $derived(items[Math.min(index, Math.max(0, items.length - 1))]);
	const exercise = $derived(itemId ? learning.ix.exercises.get(itemId) : undefined);

	function afterAnswer() {
		if (!attempt) return;
		// Move on to the next unanswered question, if any.
		for (let step = 1; step <= items.length; step++) {
			const j = (index + step) % items.length;
			if (!attempt.answers[items[j]] && items[j] !== itemId) {
				index = j;
				return;
			}
		}
	}

	async function finish() {
		finishing = true;
		error = '';
		try {
			await learning.call('finishExam', { attemptId });
			confirmOpen = false;
			window.scrollTo({ top: 0 });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			finishing = false;
		}
	}

	const missed = $derived(attempt?.missedConceptIds ?? []);
	const needsDrill = $derived(
		attempt?.completedAt &&
			!attempt.passed &&
			learning.views.exams[attempt.examId]?.kind === 'needs_drill'
	);
</script>

<svelte:head>
	<title>{exam ? examLabel(learning.ix, exam) : m.exam_result_title()} · CircuitPath</title>
</svelte:head>

{#if !attempt || !exam}
	<div class="mx-auto max-w-md py-20 text-center">
		<h1 class="text-3xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/exams')} class="btn btn-primary mt-8">{m.exams_title()}</a>
	</div>
{:else if !attempt.completedAt}
	<!-- ───────── Exam runner ───────── -->
	<div class="mx-auto max-w-3xl">
		<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="eyebrow mb-2">{m.exam_form({ form: formLabel(exam, attempt.formId) })}</p>
				<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{tx(exam.title)}</h1>
				<p class="mt-2 flex items-center gap-2 text-sm text-ink-2">
					<Icon name="info" size={15} />{m.exam_no_hints()}
				</p>
			</div>
			<button type="button" class="btn btn-ghost" onclick={() => (confirmOpen = true)}>
				<Icon name="flag" size={16} />{m.exam_finish()}
			</button>
		</div>

		<div class="mb-5">
			<div class="mb-2 flex justify-between text-sm text-ink-2">
				<span>{m.exam_question_of({ index: index + 1, total: items.length })}</span>
				<span class="font-mono tabular-nums"
					>{m.exam_answered_n({ answered: answeredCount, total: items.length })}</span
				>
			</div>
			<ProgressBar
				value={items.length ? answeredCount / items.length : 0}
				label={m.exam_answered_n({ answered: answeredCount, total: items.length })}
			/>
		</div>

		<nav aria-label={m.exam_question_of({ index: index + 1, total: items.length })} class="mb-6">
			<ol class="flex flex-wrap gap-2">
				{#each items as id, i (id)}
					{@const answered = !!attempt.answers[id]}
					<li>
						<button
							type="button"
							onclick={() => (index = i)}
							aria-current={i === index ? 'step' : undefined}
							aria-label="{m.exam_question_of({ index: i + 1, total: items.length })}{answered
								? ` — ${m.exam_answer_saved()}`
								: ''}"
							class="grid size-9 place-items-center rounded-lg border font-mono text-sm tabular-nums transition-colors {i ===
							index
								? 'border-brand bg-brand text-brand-ink'
								: answered
									? 'border-transparent bg-sage text-sage-ink'
									: 'border-line bg-surface text-ink-2 hover:border-line-strong'}"
						>
							{i + 1}
						</button>
					</li>
				{/each}
			</ol>
		</nav>

		<section class="card p-5 sm:p-7">
			{#if exercise}
				{#key itemId}
					<Exercise
						{exercise}
						mode="exam"
						context={{ kind: 'exam', refId: attemptId, sessionId: attemptId }}
						saved={attempt.answers[itemId]?.response}
						onanswered={afterAnswer}
					/>
				{/key}
			{/if}
		</section>

		<div class="mt-5 flex items-center justify-between gap-3">
			<button
				type="button"
				class="btn btn-ghost"
				onclick={() => (index = Math.max(0, index - 1))}
				disabled={index === 0}
			>
				<Icon name="arrow-left" size={16} />{m.previous()}
			</button>
			<button
				type="button"
				class="btn btn-ghost"
				onclick={() => (index = Math.min(items.length - 1, index + 1))}
				disabled={index >= items.length - 1}
			>
				{m.next()}<Icon name="arrow-right" size={16} />
			</button>
		</div>
	</div>

	<Dialog bind:open={confirmOpen} title={m.exam_finish()}>
		<p>{m.exam_finish_confirm({ unanswered })}</p>
		{#if error}<p class="mt-3 text-danger" role="alert">{error}</p>{/if}
		{#snippet actions()}
			<button type="button" class="btn btn-ghost" onclick={() => (confirmOpen = false)}
				>{m.cancel()}</button
			>
			<button type="button" class="btn btn-primary" onclick={finish} disabled={finishing}>
				<Icon name="flag" size={16} />{m.exam_finish()}
			</button>
		{/snippet}
	</Dialog>
{:else}
	<!-- ───────── Result ───────── -->
	{@const pct = percentOf(attempt)}
	<a
		href={resolve('/exams/[examId]', { examId: exam.id })}
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
	>
		<Icon name="arrow-left" size={16} />{examLabel(learning.ix, exam)}
	</a>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
		<section
			class="card flex flex-col items-center p-6 text-center sm:p-8"
			aria-labelledby="result-title"
		>
			<p class="eyebrow mb-5">
				{m.exam_result_title()} · {m.exam_form({ form: formLabel(exam, attempt.formId) })}
			</p>
			<ProgressRing
				value={pct / 100}
				size={160}
				label={m.exam_score({
					correct: attempt.correctCount ?? 0,
					total: attempt.total ?? 0,
					percent: pct
				})}
				color={attempt.passed ? 'var(--success)' : 'var(--warning)'}
			>
				<span>
					<span class="block text-4xl font-semibold tabular-nums"
						>{pct}<span class="text-xl">%</span></span
					>
					<span class="block text-xs text-ink-2"
						>{attempt.correctCount ?? 0} / {attempt.total ?? 0}</span
					>
				</span>
			</ProgressRing>
			<h1
				id="result-title"
				class="mt-6 text-3xl font-semibold tracking-tight {attempt.passed ? 'text-success' : ''}"
			>
				{attempt.passed ? m.exam_passed() : m.exam_failed()}
			</h1>
			<p class="mt-2 text-sm text-ink-2">
				{m.exam_score({
					correct: attempt.correctCount ?? 0,
					total: attempt.total ?? 0,
					percent: pct
				})}
			</p>
			<p class="mt-1 text-xs text-ink-3">
				{m.exam_pass_mark({
					percent: attempt.passPercent ?? exam.passPercent,
					count: attempt.total ?? items.length
				})}
			</p>
			<p class="mt-1 text-xs text-ink-3">
				{m.exam_attempt_on({ date: fmtDateTime(attempt.completedAt) })}
			</p>

			{#if !attempt.passed && missed.length}
				<div class="mt-8 w-full text-left">
					<h2 class="eyebrow mb-3">{m.exam_missed_concepts()}</h2>
					<ul class="space-y-2">
						{#each missed as cid (cid)}
							{@const concept = learning.ix.concepts.get(cid)}
							{@const lessonId = learning.ix.teachingLesson.get(cid)}
							<li class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
								<Icon name="target" size={16} class="text-warning" />
								<span class="min-w-0 flex-1 font-medium">{concept ? tx(concept.name) : cid}</span>
								{#if lessonId}
									<a
										href={resolve('/lesson/[lessonId]', { lessonId })}
										class="text-xs text-ink-2 hover:text-ink hover:underline"
									>
										{learning.ix.lessons.get(lessonId)?.number}
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if needsDrill}
				<a
					href={resolve('/exams/drill/[attemptId]', { attemptId })}
					class="btn btn-primary mt-6 w-full"
				>
					{attempt.drill ? m.exam_continue_drill() : m.exam_consolidate_cta()}<Icon
						name="arrow-right"
						size={16}
					/>
				</a>
			{/if}
		</section>

		<section aria-labelledby="review-title">
			<h2 id="review-title" class="mb-4 text-lg font-semibold">{m.exam_review_answers()}</h2>
			<ol class="space-y-3">
				{#each items as id, i (id)}
					{@const ex = learning.ix.exercises.get(id)}
					{@const ans = attempt.answers[id]}
					{@const ok = !!ans?.correct}
					{#if ex}
						<li class="card p-4 sm:p-5">
							<div class="flex gap-3">
								<span
									class="grid size-8 shrink-0 place-items-center rounded-lg {ok
										? 'bg-success-soft text-success'
										: 'bg-danger-soft text-danger'}"
								>
									<Icon
										name={ok ? 'check' : 'x'}
										size={16}
										label={ok ? m.correct() : m.incorrect()}
									/>
								</span>
								<div class="min-w-0 flex-1 space-y-3">
									<p class="eyebrow">{m.exam_question_of({ index: i + 1, total: items.length })}</p>
									<Rich text={ex.prompt} class="text-sm" />
									<dl class="grid gap-2 text-sm sm:grid-cols-2">
										<div class="rounded-lg px-3 py-2 {ok ? 'bg-success-soft' : 'bg-danger-soft'}">
											<dt class="text-xs text-ink-2">{m.exam_your_answer()}</dt>
											<dd class="mt-0.5 font-medium">
												{#if ans}
													{#each formatResponse(ex, ans.response) as line, k (k)}
														<span class="block"><Rich inline text={line} /></span>
													{/each}
												{:else}
													<span class="text-ink-2 italic">{m.exam_unanswered()}</span>
												{/if}
											</dd>
										</div>
										{#if !ok}
											<div class="rounded-lg bg-surface-2 px-3 py-2">
												<dt class="text-xs text-ink-2">{m.exam_correct_answer()}</dt>
												<dd class="mt-0.5 font-medium">
													{#each formatCorrect(ex) as line, k (k)}
														<span class="block"><Rich inline text={line} /></span>
													{/each}
												</dd>
											</div>
										{/if}
									</dl>
								</div>
							</div>
						</li>
					{/if}
				{/each}
			</ol>
		</section>
	</div>
{/if}
