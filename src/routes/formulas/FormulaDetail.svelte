<script lang="ts">
	import type { AnyEvent, Formula } from '#learning';
	import { dimensionOf, formatQuantity, toSI, unitSymbol } from '#learning/domain/units.ts';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { getLocale, tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import Tex from '#lib/ui/Tex.svelte';
	import FormulaTry from './FormulaTry.svelte';

	let {
		formula,
		locked,
		events
	}: { formula: Formula; locked: boolean; events: AnyEvent[] | null } = $props();

	const variables = $derived([formula.output, ...formula.inputs]);
	const lessons = $derived(
		(learning.ix.lessonsByFormula.get(formula.id) ?? []).flatMap((id) => {
			const l = learning.ix.lessons.get(id);
			return l ? [l] : [];
		})
	);
	const mistakes = $derived.by(() => {
		if (!events) return null;
		const ids = new Set(learning.ix.exercisesByFormula.get(formula.id) ?? []);
		return events.filter(
			(e) =>
				(e.type === 'ANSWER_SUBMITTED' || e.type === 'REVIEW_SUBMITTED') &&
				!e.payload.correct &&
				ids.has(e.payload.exerciseId)
		).length;
	});
	const fmt = (value: number, unit: Parameters<typeof toSI>[1]) =>
		formatQuantity(toSI(value, unit), dimensionOf(unit), { locale: getLocale(), sig: 4 });
	const hasPractice = $derived((learning.ix.exercisesByFormula.get(formula.id) ?? []).length > 0);
</script>

{#snippet section(title: string)}
	<h3 class="eyebrow mb-3">{title}</h3>
{/snippet}

<article class="card overflow-hidden" aria-labelledby="formula-title">
	<header class="border-b border-line bg-surface-2/50 p-6">
		<h2 id="formula-title" class="text-xl font-semibold">{tx(formula.name)}</h2>
		<div class="mt-5 overflow-x-auto rounded-xl bg-surface py-5 text-center text-2xl">
			<Tex src={formula.latex} display />
		</div>
		{#if locked}
			<p class="mt-4 flex items-center gap-2 rounded-xl bg-surface-3 px-3 py-2 text-sm text-ink-2">
				<Icon name="lock" size={15} />{m.formula_preview_locked()}
			</p>
		{/if}
	</header>

	<div class="space-y-8 p-6">
		<section>
			{@render section(m.formula_variables())}
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-line text-left text-ink-2">
						<th class="py-2 pr-3 font-medium">{m.formula_symbol()}</th>
						<th class="py-2 pr-3 font-medium">{m.formula_quantity()}</th>
						<th class="py-2 text-right font-medium">{m.formula_unit()}</th>
					</tr>
				</thead>
				<tbody>
					{#each variables as v, i (v.symbol + i)}
						<tr class="border-b border-line/60">
							<td class="py-2 pr-3"><Tex src={v.symbol} /></td>
							<td class="py-2 pr-3">
								{tx(v.name)}
								{#if i === 0}<span class="ml-1 text-xs text-ink-3">({m.formula_output()})</span
									>{/if}
							</td>
							<td class="py-2 text-right font-mono">{unitSymbol(v.unit) || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		{#if formula.rearrangements.length}
			<section>
				{@render section(m.formula_rearrangements())}
				<ul class="flex flex-wrap gap-2">
					{#each formula.rearrangements as r, i (i)}
						<li class="rounded-xl border border-line px-4 py-2"><Tex src={r} /></li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="grid gap-6 sm:grid-cols-2">
			<section>
				{@render section(m.formula_constraints())}
				<ul class="space-y-1.5 text-sm">
					{#each formula.constraints as c, i (i)}
						<li class="flex gap-2">
							<Icon name="check" size={15} class="mt-0.5 text-success" /><Rich inline text={c} />
						</li>
					{/each}
				</ul>
			</section>
			<section>
				{@render section(m.formula_assumptions())}
				<ul class="space-y-1.5 text-sm text-ink-2">
					{#each formula.assumptions as a, i (i)}
						<li class="flex gap-2">
							<span class="mt-2 size-1 shrink-0 rounded-full bg-ink-3"></span><Rich
								inline
								text={a}
							/>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<section>
			{@render section(m.formula_explanation())}
			<Rich text={formula.explanation} />
		</section>

		{#if formula.derivation}
			<section>
				{@render section(m.formula_derivation())}
				<Rich text={formula.derivation} />
			</section>
		{/if}

		<section class="rounded-2xl bg-surface-2 p-5">
			{@render section(m.formula_worked_example())}
			<ol class="space-y-2">
				{#each formula.workedExample.steps as step, i (i)}
					<li class="flex gap-3 text-sm">
						<span class="font-mono text-xs text-ink-3">{i + 1}.</span>
						<Rich text={step} class="min-w-0 flex-1" />
					</li>
				{/each}
			</ol>
			<p class="mt-3 border-t border-line pt-3 text-sm">
				<Tex src={formula.output.symbol} /> =
				<strong class="font-mono tabular-nums"
					>{fmt(formula.workedExample.result, formula.workedExample.unit)}</strong
				>
			</p>
		</section>

		<section>
			{@render section(m.formula_common_mistakes())}
			<ul class="space-y-2 text-sm">
				{#each formula.commonMistakes as cm, i (i)}
					<li class="flex gap-2 rounded-xl bg-warning-soft px-3 py-2">
						<Icon name="alert" size={15} class="mt-0.5 text-warning" /><Rich inline text={cm} />
					</li>
				{/each}
			</ul>
		</section>

		{#if formula.counterexample}
			<section>
				{@render section(m.formula_counterexample())}
				<Rich text={formula.counterexample} class="text-sm" />
			</section>
		{/if}

		<section class="rounded-2xl border border-line p-5">
			{@render section(m.formula_try())}
			{#key formula.id}
				<FormulaTry {formula} />
			{/key}
		</section>

		<div class="grid gap-6 sm:grid-cols-2">
			<section>
				{@render section(m.formula_linked_lessons())}
				{#if lessons.length}
					<ul class="space-y-1.5 text-sm">
						{#each lessons as l (l.id)}
							<li>
								<a
									href={resolve('/lesson/[lessonId]', { lessonId: l.id })}
									class="flex items-center gap-2 hover:underline"
								>
									<span class="font-mono text-xs text-ink-3">{l.number}</span>{tx(l.title)}
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-ink-3">—</p>
				{/if}
			</section>
			<section>
				{@render section(m.formula_your_mistakes())}
				<p class="text-sm text-ink-2">
					{#if mistakes === null}
						{m.loading()}
					{:else if mistakes === 0}
						{m.formula_no_mistakes()}
					{:else}
						{m.formula_mistakes_count({ count: mistakes })}
					{/if}
				</p>
			</section>
		</div>

		{#if hasPractice && !locked}
			<a
				href="{resolve('/practice')}?formula={encodeURIComponent(formula.id)}"
				class="btn btn-accent"
			>
				<Icon name="target" size={17} />{m.formula_practice()}
			</a>
		{/if}
	</div>
</article>
