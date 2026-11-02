<script lang="ts">
	import type { Formula } from '#learning';
	import {
		dimensionOf,
		formatQuantity,
		parseNumberInput,
		toSI,
		unitSymbol,
		unitsOfDimension,
		type UnitId
	} from '#learning/domain/units.ts';
	import { runAlgorithm, DomainError } from '#learning/domain/formulas.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, tx } from '#lib/app/i18n.ts';
	import Tex from '#lib/ui/Tex.svelte';

	let { formula }: { formula: Formula } = $props();
	const uid = $props.id();

	function initial() {
		return formula.inputs.map((v) => {
			const ex = formula.workedExample.inputs[v.symbol];
			return {
				symbol: v.symbol,
				raw: ex ? String(ex.value) : '',
				unit: (ex?.unit ?? v.unit) as UnitId
			};
		});
	}
	let rows = $state(initial());

	const outcome = $derived.by(() => {
		const si: Record<string, number> = {};
		for (const r of rows) {
			const n = parseNumberInput(r.raw);
			if (!Number.isFinite(n)) return { kind: 'empty' as const };
			si[r.symbol] = toSI(n, r.unit);
		}
		try {
			const value = runAlgorithm(formula.algorithm, si);
			return {
				kind: 'ok' as const,
				text: formatQuantity(value, dimensionOf(formula.output.unit), {
					locale: getLocale(),
					sig: 4
				})
			};
		} catch (e) {
			return {
				kind: 'error' as const,
				text: e instanceof DomainError || e instanceof Error ? e.message : String(e)
			};
		}
	});
</script>

<div class="space-y-3">
	{#each rows as row, i (row.symbol)}
		{@const v = formula.inputs[i]}
		<div class="flex items-end gap-2">
			<label class="min-w-0 flex-1">
				<span class="mb-1 flex items-center gap-1.5 text-sm text-ink-2">
					<Tex src={v.symbol} />
					<span class="truncate">{tx(v.name)}</span>
				</span>
				<input
					class="input font-mono tabular-nums"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					bind:value={row.raw}
				/>
			</label>
			<label class="w-24">
				<span class="sr-only">{m.formula_unit()} {v.symbol}</span>
				<select class="input" bind:value={row.unit}>
					{#each unitsOfDimension(dimensionOf(v.unit)) as u (u)}
						<option value={u}>{unitSymbol(u) || '—'}</option>
					{/each}
				</select>
			</label>
		</div>
	{/each}
	<div
		id="{uid}-result"
		class="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-sage px-4 py-3"
		aria-live="polite"
	>
		<span class="text-sm text-sage-ink"><Tex src={formula.output.symbol} /> =</span>
		{#if outcome.kind === 'ok'}
			<span class="font-mono text-xl font-semibold text-sage-ink tabular-nums">{outcome.text}</span>
		{:else if outcome.kind === 'error'}
			<span class="text-sm text-danger">{m.formula_try_error({ reason: outcome.text })}</span>
		{:else}
			<span class="font-mono text-xl text-sage-ink/60">—</span>
		{/if}
	</div>
</div>
