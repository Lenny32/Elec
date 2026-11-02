<script lang="ts">
	import type { Card } from '#learning';
	import { unitSymbol } from '#learning/domain/units.ts';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Rich from '#lib/ui/Rich.svelte';
	import Tex from '#lib/ui/Tex.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Exercise from '#lib/ui/Exercise.svelte';
	import DiagramView from '#lib/diagrams/Diagram.svelte';
	import LabView from '#lib/lab/LabView.svelte';
	import SymbolChips from '#lib/symbols/SymbolChips.svelte';
	import { diagramSymbols } from '#lib/symbols/usage.ts';

	let { card, lessonId, sessionId }: { card: Card; lessonId: string; sessionId: string } = $props();
</script>

{#if card.type === 'explain'}
	{#if card.title}<h2 class="mb-4 text-2xl font-semibold tracking-tight">{tx(card.title)}</h2>{/if}
	<Rich text={card.text} class="text-[1.0625rem]" />
{:else if card.type === 'diagram'}
	{@const diagram = learning.ix.diagrams.get(card.diagramId)}
	{#if diagram}
		<h2 class="mb-4 text-xl font-semibold">{tx(diagram.title)}</h2>
		<div class="rounded-2xl border border-line bg-surface-2/40 p-3 sm:p-5">
			<DiagramView {diagram} explain />
		</div>
		<div class="mt-4 text-ink-2"><Rich text={card.caption} /></div>
		<SymbolChips
			types={diagramSymbols(learning.ix, diagram.id)}
			title={m.symbols_in_diagram()}
			hint={m.symbols_diagram_hint()}
			class="mt-5 border-t border-line pt-4"
		/>
	{/if}
{:else if card.type === 'formula'}
	{@const f = learning.ix.formulas.get(card.formulaId)}
	{#if f}
		<p class="eyebrow mb-2">{m.lesson_formula_card()}</p>
		<h2 class="text-2xl font-semibold tracking-tight">{tx(f.name)}</h2>
		<div
			class="my-6 rounded-2xl bg-brand px-4 py-8 text-center text-2xl text-brand-ink sm:text-3xl"
		>
			<Tex src={f.latex} display />
		</div>
		<h3 class="eyebrow mb-3">{m.formula_variables()}</h3>
		<dl class="grid gap-2 sm:grid-cols-2">
			{#each [f.output, ...f.inputs] as v (v.symbol)}
				<div class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
					<dt class="w-10 font-semibold"><Tex src={v.symbol} /></dt>
					<dd class="flex-1">
						{tx(v.name)} <span class="text-ink-3">({unitSymbol(v.unit) || '—'})</span>
					</dd>
				</div>
			{/each}
		</dl>
		<div class="mt-4 text-sm text-ink-2"><Rich text={f.explanation} /></div>
		<a
			href="{resolve('/formulas')}?f={encodeURIComponent(f.id)}"
			class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
		>
			{m.formulas_title()}<Icon name="arrow-up-right" size={15} />
		</a>
	{/if}
{:else if card.type === 'worked_example'}
	<p class="eyebrow mb-2">{m.lesson_worked_example()}</p>
	<h2 class="mb-5 text-2xl font-semibold tracking-tight">{tx(card.title)}</h2>
	<ol class="space-y-3">
		{#each card.steps as step, i (i)}
			<li class="flex gap-4 rounded-xl border border-line bg-surface px-4 py-3">
				<span
					class="grid size-7 shrink-0 place-items-center rounded-lg bg-sage font-mono text-xs font-semibold text-sage-ink"
					>{i + 1}</span
				>
				<Rich text={step} class="min-w-0 flex-1" />
			</li>
		{/each}
	</ol>
{:else if card.type === 'parameter_lab'}
	{@const lab = learning.ix.labs.get(card.labId)}
	{#if lab}
		<p class="eyebrow mb-2">{m.lesson_try_lab()}</p>
		<h2 class="mb-2 text-2xl font-semibold tracking-tight">{tx(lab.title)}</h2>
		<div class="mb-5 text-ink-2"><Rich text={lab.intro} /></div>
		<LabView {lab} compact />
	{/if}
{:else if card.type === 'exercise'}
	{@const ex = learning.ix.exercises.get(card.exerciseId)}
	{#if ex}
		<p class="eyebrow mb-4">{m.lesson_exercise_card()}</p>
		{#key card.id}
			<Exercise exercise={ex} context={{ kind: 'lesson', refId: lessonId, sessionId }} />
		{/key}
		<p class="mt-5 text-xs text-ink-3">{m.lesson_skip_note()}</p>
	{/if}
{:else if card.type === 'safety'}
	<div class="flex gap-4 rounded-2xl border border-warning/30 bg-warning-soft p-5 text-warning">
		<Icon name="shield" size={26} />
		<div>
			<h2 class="mb-2 text-lg font-semibold">{m.safety_title()}</h2>
			<Rich text={card.text} class="!text-warning" />
		</div>
	</div>
{:else if card.type === 'summary'}
	<h2 class="mb-5 text-2xl font-semibold tracking-tight">{m.lesson_takeaways()}</h2>
	<ul class="space-y-3">
		{#each card.points as point, i (i)}
			<li class="flex gap-3">
				<span
					class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success"
					><Icon name="check" size={14} stroke={2.5} /></span
				>
				<Rich text={point} class="min-w-0 flex-1" />
			</li>
		{/each}
	</ul>
{/if}
