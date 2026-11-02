<script lang="ts">
	import type { Exam } from '#learning';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, fmtDate } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import ExamStatus from './ExamStatus.svelte';
	import { examLabel, scopeLabel, itemCount, percentOf, formLabel } from './exam-utils.ts';

	const ix = $derived(learning.ix);
	const views = $derived(learning.views);

	const groups = $derived(
		ix.pack.modules.map((mod) => {
			const exams: Exam[] = [];
			for (const cid of mod.chapterIds) {
				const ch = ix.chapters.get(cid);
				const ex = ch?.examId ? ix.exams.get(ch.examId) : undefined;
				if (ex) exams.push(ex);
			}
			const modExam = mod.examId ? ix.exams.get(mod.examId) : undefined;
			if (modExam) exams.push(modExam);
			return { mod, exams };
		})
	);
	const finals = $derived(ix.pack.exams.filter((e) => e.scope === 'final'));

	function lastAttempt(examId: string) {
		return (views.attempts[examId] ?? []).filter((a) => a.completedAt).at(-1);
	}
	function bestPercent(examId: string): number | undefined {
		const done = (views.attempts[examId] ?? []).filter((a) => a.completedAt);
		if (!done.length) return undefined;
		return Math.max(...done.map(percentOf));
	}
</script>

<svelte:head><title>{m.exams_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.nav_exams()} title={m.exams_title()} subtitle={m.exams_subtitle()} />

<section class="mb-10" aria-labelledby="consolidate-title">
	<h2 id="consolidate-title" class="mb-4 text-lg font-semibold">{m.exams_failed()}</h2>
	{#if views.examsToConsolidate.length}
		<ul class="grid gap-3 md:grid-cols-2">
			{#each views.examsToConsolidate as a (a.attemptId)}
				{@const exam = ix.exams.get(a.examId)}
				{#if exam}
					<li>
						<a
							href={resolve('/exams/[examId]', { examId: exam.id })}
							class="card flex items-center gap-4 border-warning/40 p-4 transition-colors hover:border-warning"
						>
							<span
								class="grid size-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning"
							>
								<Icon name="refresh" size={20} />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block font-semibold">{examLabel(ix, exam)}</span>
								<span class="block text-sm text-ink-2">
									{m.exam_score({
										correct: a.correctCount ?? 0,
										total: a.total ?? 0,
										percent: percentOf(a)
									})} · {fmtDate(a.completedAt)}
								</span>
							</span>
							<Icon name="chevron-right" size={18} class="text-ink-3" />
						</a>
					</li>
				{/if}
			{/each}
		</ul>
	{:else}
		<p class="card flex items-center gap-3 p-4 text-sm text-ink-2">
			<Icon name="check-circle" size={18} class="text-success" />{m.exams_failed_empty()}
		</p>
	{/if}
</section>

{#snippet examRow(exam: Exam)}
	{@const last = lastAttempt(exam.id)}
	{@const best = bestPercent(exam.id)}
	<li>
		<a
			href={resolve('/exams/[examId]', { examId: exam.id })}
			class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5"
		>
			<span
				class="grid size-11 shrink-0 place-items-center rounded-xl {exam.scope === 'chapter'
					? 'bg-sage text-sage-ink'
					: 'bg-violet text-violet-ink'}"
			>
				<Icon name={exam.scope === 'chapter' ? 'exam' : 'star'} size={20} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block font-semibold">{examLabel(ix, exam)}</span>
				<span class="block text-sm text-ink-2">
					{scopeLabel(exam)} · {m.exam_pass_mark({
						percent: exam.passPercent,
						count: itemCount(exam)
					})}
				</span>
				{#if last}
					<span class="mt-0.5 block font-mono text-xs text-ink-3 tabular-nums">
						{m.exam_form({ form: formLabel(exam, last.formId) })} · {percentOf(last)}%
						{#if best !== undefined && best !== percentOf(last)}· {m.exam_best({
								percent: best
							})}{/if}
					</span>
				{/if}
			</span>
			<ExamStatus examId={exam.id} />
			<Icon name="chevron-right" size={18} class="text-ink-3" />
		</a>
	</li>
{/snippet}

<div class="space-y-8">
	{#each groups as { mod, exams } (mod.id)}
		{#if exams.length}
			<section aria-labelledby="mod-{mod.id}">
				<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
					<h2 id="mod-{mod.id}" class="text-lg font-semibold">
						<span class="eyebrow mr-2">{m.module_label({ number: mod.number })}</span>{tx(
							mod.title
						)}
					</h2>
				</div>
				<ul class="card divide-y divide-line overflow-hidden">
					{#each exams as exam (exam.id)}{@render examRow(exam)}{/each}
				</ul>
			</section>
		{/if}
	{/each}

	{#if finals.length}
		<section aria-labelledby="final-exams">
			<h2 id="final-exams" class="mb-3 text-lg font-semibold">{m.final_exam()}</h2>
			<ul class="card divide-y divide-line overflow-hidden">
				{#each finals as exam (exam.id)}{@render examRow(exam)}{/each}
			</ul>
		</section>
	{/if}
</div>
