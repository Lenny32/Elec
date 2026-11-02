<script lang="ts">
	import { RULES_VERSION, type Concept } from '#learning';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, fmtDate } from '#lib/app/i18n.ts';
	import { conceptStateLabel, conceptStateTone } from '#lib/app/labels.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import SymbolChips from '#lib/symbols/SymbolChips.svelte';
	import { conceptSymbols } from '#lib/symbols/usage.ts';

	let { concept, onselect }: { concept: Concept; onselect: (id: string) => void } = $props();

	const status = $derived(learning.views.concepts[concept.id]);
	const check = $derived(status.check);
	const criteria = $derived([
		{ ok: check.lessonCompleted, label: m.map_crit_lesson() },
		{ ok: check.evidenceCount >= 4, label: m.map_crit_evidence({ n: check.evidenceCount }) },
		{
			ok: check.distinctExercises >= 3,
			label: m.map_crit_distinct({ n: check.distinctExercises })
		},
		{
			ok: check.correctInWindow >= 3,
			label: m.map_crit_window({ n: check.correctInWindow, w: check.windowSize })
		},
		{ ok: check.appliedCorrect, label: m.map_crit_applied() }
	]);
	const lessonId = $derived(learning.ix.teachingLesson.get(concept.id));
	const chapter = $derived(learning.ix.chapters.get(concept.chapterId));
	const name = (id: string) => {
		const c = learning.ix.concepts.get(id);
		return c ? tx(c.name) : id;
	};
</script>

<article class="card p-6" aria-labelledby="concept-title">
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<Badge tone={conceptStateTone[status.state]}>{conceptStateLabel[status.state]()}</Badge>
		{#if chapter}
			<span class="text-xs text-ink-3"
				>{m.chapter_label({ number: chapter.number })} · {tx(chapter.title)}</span
			>
		{/if}
	</div>
	<h2 id="concept-title" class="text-xl font-semibold">{tx(concept.name)}</h2>
	<Rich text={concept.summary} class="mt-2 text-sm text-ink-2" />

	<section class="mt-6">
		<h3 class="eyebrow mb-3">{m.map_why_title()}</h3>
		<ul class="space-y-2">
			{#each criteria as c, i (i)}
				<li class="flex items-start gap-2.5 text-sm">
					<span
						class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full {c.ok
							? 'bg-success-soft text-success'
							: 'bg-surface-2 text-ink-3'}"
					>
						<Icon name={c.ok ? 'check' : 'minus'} size={13} stroke={2.5} />
					</span>
					<span class={c.ok ? '' : 'text-ink-2'}>{c.label}</span>
				</li>
			{/each}
		</ul>
		{#if status.masteredAt || status.dueAt}
			<div class="mt-4 space-y-1 border-t border-line pt-3 text-sm text-ink-2">
				{#if status.masteredAt}<p>{m.map_mastered_on({ date: fmtDate(status.masteredAt) })}</p>{/if}
				{#if status.dueAt}<p>{m.map_due_on({ date: fmtDate(status.dueAt) })}</p>{/if}
			</div>
		{/if}
	</section>

	<section class="mt-6">
		<h3 class="eyebrow mb-3">{m.map_prereqs()}</h3>
		{#if concept.prerequisites.length}
			<ul class="flex flex-wrap gap-2">
				{#each concept.prerequisites as p (p)}
					{@const missing = status.missingPrerequisites.includes(p)}
					<li>
						<button
							type="button"
							class="chip hover:border-line-strong {missing
								? '!border-danger/40 !text-danger'
								: ''}"
							onclick={() => onselect(p)}
						>
							{#if missing}<Icon name="lock" size={12} />{:else}<Icon name="check" size={12} />{/if}
							{name(p)}
						</button>
					</li>
				{/each}
			</ul>
			{#if status.missingPrerequisites.length}
				<p class="mt-2 text-xs text-danger">{m.map_prereqs_missing()}</p>
			{/if}
		{:else}
			<p class="text-sm text-ink-3">{m.map_no_prereqs()}</p>
		{/if}
	</section>

	<SymbolChips
		types={conceptSymbols(learning.ix, concept.id)}
		title={m.map_symbols()}
		class="mt-6"
		heading="h3"
	/>

	<div class="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
		{#if lessonId && learning.views.lessons[lessonId] !== 'locked'}
			<a href={resolve('/lesson/[lessonId]', { lessonId })} class="btn btn-ghost btn-sm">
				<Icon name="book" size={15} />{m.map_open_lesson()}
			</a>
		{/if}
		{#if status.state !== 'locked' && status.state !== 'ready'}
			<a
				href="{resolve('/practice')}?concepts={encodeURIComponent(concept.id)}"
				class="btn btn-accent btn-sm"
			>
				<Icon name="target" size={15} />{m.map_practise()}
			</a>
		{/if}
	</div>
	<p class="mt-4 font-mono text-[0.6875rem] text-ink-3">{m.map_policy({ rules: RULES_VERSION })}</p>
</article>
