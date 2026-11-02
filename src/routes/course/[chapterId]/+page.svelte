<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import {
		conceptStateLabel,
		conceptStateTone,
		lessonStateLabel,
		lessonStateTone
	} from '#lib/app/labels.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import ProgressRing from '#lib/ui/ProgressRing.svelte';

	const chapter = $derived(learning.ix.chapters.get(page.params.chapterId ?? ''));
	const prog = $derived(chapter ? learning.views.chapters[chapter.id] : undefined);
	const module = $derived(chapter ? learning.ix.modules.get(chapter.moduleId) : undefined);
	const lessons = $derived(
		chapter
			? chapter.lessonIds.map((id) => learning.ix.lessons.get(id)).filter((l) => l !== undefined)
			: []
	);
	const concepts = $derived(
		chapter ? learning.pack.concepts.filter((c) => c.chapterId === chapter.id) : []
	);
	const labs = $derived(
		chapter
			? chapter.labIds.map((id) => learning.ix.labs.get(id)).filter((l) => l !== undefined)
			: []
	);
	const missing = $derived(chapter ? (learning.views.missingPrerequisites[chapter.id] ?? []) : []);
	const exam = $derived(chapter?.examId ? learning.ix.exams.get(chapter.examId) : undefined);
	const examAv = $derived(exam ? learning.views.exams[exam.id] : undefined);
	const outline = $derived(chapter?.status === 'outline');
	const locked = $derived(!outline && !prog?.unlocked);
	const progressValue = $derived(
		prog && prog.lessonCount ? prog.lessonsCompleted / prog.lessonCount : 0
	);
</script>

<svelte:head><title>{chapter ? tx(chapter.title) : m.not_found()} · CircuitPath</title></svelte:head
>

{#if !chapter || !prog}
	<div class="mx-auto max-w-md py-16 text-center">
		<h1 class="text-2xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/course')} class="btn btn-primary mt-6"
			><Icon name="arrow-left" size={16} />{m.course_title()}</a
		>
	</div>
{:else}
	<nav class="mb-6" aria-label={m.breadcrumb()}>
		<a
			href={resolve('/course')}
			class="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
		>
			<Icon name="arrow-left" size={15} />{m.course_title()}
		</a>
	</nav>

	<header class="mb-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
		<div class="min-w-0">
			<p class="eyebrow mb-3 flex items-center gap-2">
				<span class="size-1.5 rounded-full bg-sage-ink"></span>
				{#if module}{m.module_label({ number: module.number })} ·
				{/if}{m.chapter_label({ number: chapter.number })}
			</p>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{tx(chapter.title)}</h1>
			<p class="mt-3 max-w-2xl text-ink-2">{tx(chapter.summary)}</p>
			<div class="mt-4 flex flex-wrap gap-2">
				{#if prog.complete}
					<Badge tone="success"><Icon name="check" size={12} />{m.chapter_complete()}</Badge>
				{:else if outline}
					<Badge>{m.chapter_outline()}</Badge>
				{:else if locked}
					<Badge><Icon name="lock" size={12} />{m.state_locked()}</Badge>
				{/if}
				{#if !outline}
					<Badge tone="brand"
						>{m.chapter_concepts_mastered({
							done: prog.conceptsMastered,
							total: prog.conceptCount
						})}</Badge
					>
				{/if}
			</div>
		</div>
		{#if !outline}
			<div class="flex items-center gap-5">
				<ProgressRing
					value={progressValue}
					size={104}
					stroke={9}
					label={m.chapter_lessons_done({ done: prog.lessonsCompleted, total: prog.lessonCount })}
				>
					<span class="font-mono text-xl font-semibold tabular-nums"
						>{Math.round(progressValue * 100)}%</span
					>
				</ProgressRing>
				{#if prog.unlocked}
					<a
						href="{resolve('/practice')}?chapter={encodeURIComponent(chapter.id)}"
						class="btn btn-accent"
					>
						<Icon name="target" size={17} />{m.chapter_practice_cta()}
					</a>
				{/if}
			</div>
		{/if}
	</header>

	{#if locked}
		<div
			class="mb-8 flex gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm"
			role="note"
		>
			<Icon name="lock" size={18} class="mt-0.5 text-ink-2" />
			<div>
				<p class="font-medium">{m.chapter_locked()}</p>
				{#if missing.length}
					<p class="mt-2 text-ink-2">{m.chapter_requires()}</p>
					<ul class="mt-2 flex flex-wrap gap-2">
						{#each missing as id (id)}
							{@const c = learning.ix.concepts.get(id)}
							<li>
								<a
									href="{resolve('/map')}?c={encodeURIComponent(id)}"
									class="chip hover:border-line-strong"
								>
									{c ? tx(c.name) : id}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
		<div class="min-w-0 space-y-6">
			{#if outline}
				<section class="card p-5" aria-labelledby="topics">
					<h2 id="topics" class="eyebrow mb-4">{m.chapter_topics()}</h2>
					<ul class="space-y-2">
						{#each chapter.topics as t, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3"></span><Rich
									inline
									text={t}
								/>
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<section aria-labelledby="lessons">
					<h2 id="lessons" class="mb-3 text-lg font-semibold">{m.chapter_lessons()}</h2>
					<ol class="card divide-y divide-line overflow-hidden">
						{#each lessons as lesson (lesson.id)}
							{@const state = learning.views.lessons[lesson.id] ?? 'locked'}
							{@const isLocked = state === 'locked'}
							<li>
								<a
									href={resolve('/lesson/[lessonId]', { lessonId: lesson.id })}
									class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5
									{isLocked ? 'text-ink-2' : ''}"
								>
									<span
										class="grid size-10 shrink-0 place-items-center rounded-xl font-mono text-xs font-semibold
										{state === 'completed'
											? 'bg-success-soft text-success'
											: isLocked
												? 'bg-surface-2 text-ink-3'
												: 'bg-sage text-sage-ink'}"
									>
										{#if state === 'completed'}<Icon
												name="check"
												size={18}
											/>{:else}{lesson.number.slice(3)}{/if}
									</span>
									<span class="min-w-0 flex-1">
										<span class="block font-medium">
											<span class="font-mono text-sm text-ink-2">{lesson.number}</span>
											<span class="mx-1 text-ink-3" aria-hidden="true">·</span>
											{tx(lesson.title)}
										</span>
										<span class="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
											<Icon name="clock" size={13} />{m.lesson_minutes({
												minutes: lesson.estimatedMinutes
											})}
										</span>
									</span>
									<Badge tone={lessonStateTone[state]}>
										{#if isLocked}<Icon name="lock" size={11} />{/if}{lessonStateLabel[state]()}
									</Badge>
								</a>
							</li>
						{/each}
					</ol>
				</section>

				<section aria-labelledby="concepts">
					<h2 id="concepts" class="mb-3 text-lg font-semibold">{m.chapter_concepts()}</h2>
					<ul class="grid gap-3 sm:grid-cols-2">
						{#each concepts as c (c.id)}
							{@const st = learning.views.concepts[c.id]?.state ?? 'locked'}
							<li>
								<a
									href="{resolve('/map')}?c={encodeURIComponent(c.id)}"
									class="card flex h-full flex-col gap-2 p-4 transition-colors hover:border-line-strong"
								>
									<span class="flex items-start justify-between gap-2">
										<span class="font-medium">{tx(c.name)}</span>
										<Badge tone={conceptStateTone[st]}>{conceptStateLabel[st]()}</Badge>
									</span>
									<span class="text-sm text-ink-2"><Rich inline text={c.summary} /></span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if chapter.miniProject}
				{@const mp = chapter.miniProject}
				<section class="card p-5" aria-labelledby="project">
					<p class="eyebrow mb-2">{m.chapter_project()}</p>
					<h2 id="project" class="text-lg font-semibold">{tx(mp.title)}</h2>
					<div class="mt-2 text-sm text-ink-2"><Rich text={mp.description} /></div>
					<ol class="mt-4 space-y-2">
						{#each mp.steps as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span
									class="grid size-6 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-xs text-ink-2"
									>{i + 1}</span
								>
								<Rich text={step} class="min-w-0 flex-1" />
							</li>
						{/each}
					</ol>
					<div class="mt-4 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
						<p class="font-semibold">{m.project_fallback()}</p>
						<Rich text={mp.simulationFallback} />
					</div>
				</section>
			{/if}
		</div>

		<aside class="min-w-0 space-y-6">
			{#if exam && examAv}
				<section class="card p-5" aria-labelledby="exam">
					<div class="mb-3 flex items-center gap-3">
						<span class="grid size-10 place-items-center rounded-xl bg-violet text-violet-ink"
							><Icon name="exam" size={19} /></span
						>
						<div>
							<p class="eyebrow">{m.chapter_exam()}</p>
							<h2 id="exam" class="font-semibold">{tx(exam.title)}</h2>
						</div>
					</div>
					<p class="text-sm text-ink-2">
						{m.exam_pass_mark({ percent: exam.passPercent, count: exam.forms[0].itemIds.length })}
					</p>
					<div class="mt-4">
						{#if prog.examPassed}
							<Badge tone="success"><Icon name="check" size={12} />{m.exam_passed()}</Badge>
						{:else if examAv.kind === 'locked'}
							<p class="flex items-center gap-2 text-sm text-ink-2">
								<Icon name="lock" size={15} />
								{examAv.reason === 'lessons_incomplete'
									? m.exam_locked_lessons()
									: examAv.reason === 'chapters_not_passed'
										? m.exam_locked_chapters()
										: examAv.reason === 'chapter_locked'
											? m.exam_locked_chapter()
											: m.exam_unavailable()}
							</p>
						{:else if examAv.kind === 'needs_drill'}
							<Badge tone="warning">{m.exam_needs_drill()}</Badge>
						{/if}
					</div>
					<a
						href={resolve('/exams/[examId]', { examId: exam.id })}
						class="btn btn-ghost mt-4 w-full"
					>
						{examAv.kind === 'in_progress' ? m.exam_resume() : m.chapter_exam()}<Icon
							name="arrow-right"
							size={16}
						/>
					</a>
				</section>
			{/if}

			{#if labs.length}
				<section class="card p-5" aria-labelledby="labs">
					<h2 id="labs" class="eyebrow mb-3">{m.chapter_labs()}</h2>
					<ul class="space-y-2">
						{#each labs as lab (lab.id)}
							<li>
								<a
									href={resolve('/lab/[labId]', { labId: lab.id })}
									class="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
								>
									<Icon name="flask" size={17} class="text-sage-ink" />
									<span class="flex-1 font-medium">{tx(lab.title)}</span>
									<Icon name="chevron-right" size={16} class="text-ink-3" />
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="card p-5" aria-labelledby="goals">
				<h2 id="goals" class="eyebrow mb-3">{m.chapter_goals()}</h2>
				<ul class="space-y-2">
					{#each chapter.goals as g, i (i)}
						<li class="flex gap-2.5 text-sm">
							<Icon name="check" size={16} class="mt-0.5 text-sage-ink" /><Rich inline text={g} />
						</li>
					{/each}
				</ul>
				<p class="mt-4 border-t border-line pt-3 text-sm text-ink-2">
					<Rich inline text={chapter.practicalOutcome} />
				</p>
			</section>

			{#if !outline}
				<section class="card p-5" aria-labelledby="topics2">
					<h2 id="topics2" class="eyebrow mb-3">{m.chapter_topics()}</h2>
					<ul class="flex flex-wrap gap-2">
						{#each chapter.topics as t, i (i)}<li class="chip"><Rich inline text={t} /></li>{/each}
					</ul>
				</section>
			{/if}

			{#if chapter.safetyNotes.length}
				<section
					class="rounded-2xl border border-warning/30 bg-warning-soft p-5"
					aria-labelledby="safety"
				>
					<h2 id="safety" class="eyebrow mb-3 flex items-center gap-1.5 !text-warning">
						<Icon name="shield" size={14} />{m.chapter_safety()}
					</h2>
					<ul class="space-y-2 text-sm text-warning">
						{#each chapter.safetyNotes as s, i (i)}<li><Rich inline text={s} /></li>{/each}
					</ul>
				</section>
			{/if}
		</aside>
	</div>
{/if}
