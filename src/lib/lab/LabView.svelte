<script lang="ts">
	import type { Lab } from '#learning';
	import { runLabModel } from '#learning/domain/lab-models.ts';
	import { formatQuantity, unitSymbol, type UnitId } from '#learning/domain/units.ts';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, getLocale, fmtNumber } from '#lib/app/i18n.ts';
	import DiagramView from '#lib/diagrams/Diagram.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';

	let { lab, compact = false }: { lab: Lab; compact?: boolean } = $props();

	const uid = $props.id();

	function defaults(): Record<string, number> {
		return Object.fromEntries(lab.params.map((p) => [p.key, p.default]));
	}
	function initial(): Record<string, number> {
		const stored = learning.projection.labs[lab.id];
		const base = defaults();
		if (!stored) return base;
		for (const p of lab.params) {
			const v = stored[p.key];
			if (typeof v === 'number' && v >= p.min && v <= p.max) base[p.key] = v;
		}
		return base;
	}

	let values = $state<Record<string, number>>(initial());
	let showFlow = $state(true);
	let asTable = $state(false);

	const result = $derived(runLabModel(lab.model, { ...lab.constants, ...values }));
	const diagram = $derived(learning.ix.diagrams.get(lab.diagramId));
	const paramUnits = $derived(
		Object.fromEntries(lab.params.map((p) => [p.key, p.unit])) as Record<string, UnitId>
	);
	// Lamp/LED brightness: relative to a 20 mA reference, log-ish.
	const glow = $derived(
		result.valid ? Math.max(0, Math.min(1, Math.log10(1 + result.loopCurrentA * 1000) / 1.4)) : 0
	);

	// Persist exploration (debounced). Exploration never counts towards mastery.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function changed() {
		clearTimeout(timer);
		const snapshot = $state.snapshot(values);
		timer = setTimeout(() => {
			void learning.call('labChanged', { labId: lab.id, params: snapshot }).catch(() => {});
		}, 700);
	}
	$effect(() => () => clearTimeout(timer));

	function set(key: string, v: number) {
		const p = lab.params.find((x) => x.key === key)!;
		if (!Number.isFinite(v)) return;
		const clamped = Math.min(p.max, Math.max(p.min, v));
		values[key] = Math.round(clamped / p.step) * p.step;
		changed();
	}

	function reset() {
		values = defaults();
		changed();
	}

	const severityClass = {
		info: 'bg-info-soft text-info',
		warning: 'bg-warning-soft text-warning',
		danger: 'bg-danger-soft text-danger'
	} as const;
</script>

<section
	class="grid gap-5 {compact ? '' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'}"
	aria-labelledby="{uid}-title"
>
	<h2 id="{uid}-title" class="sr-only">{tx(lab.title)}</h2>
	<div class="space-y-4">
		{#if diagram}
			<div class="card overflow-hidden p-4">
				<DiagramView
					{diagram}
					params={values}
					{paramUnits}
					flowCurrent={showFlow && result.valid ? result.loopCurrentA : 0}
					{glow}
					explain
				/>
				<div
					class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-sm"
				>
					<label class="inline-flex cursor-pointer items-center gap-2">
						<input type="checkbox" bind:checked={showFlow} class="size-4 accent-[var(--brand)]" />
						{m.lab_flow()}
					</label>
					<label class="inline-flex cursor-pointer items-center gap-2">
						<input type="checkbox" bind:checked={asTable} class="size-4 accent-[var(--brand)]" />
						{m.lab_table()}
					</label>
					<button
						type="button"
						class="ml-auto inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"
						onclick={reset}
					>
						<Icon name="reset" size={15} />{m.lab_reset()}
					</button>
				</div>
			</div>
		{/if}

		<div class="card p-5">
			<h3 class="eyebrow mb-4">{m.lab_parameters()}</h3>
			<div class="space-y-5">
				{#each lab.params as p (p.key)}
					<div>
						<div class="mb-2 flex items-center justify-between gap-3">
							<label for="{uid}-{p.key}" class="text-sm font-medium">{tx(p.label)}</label>
							<span class="flex items-center gap-1.5">
								<input
									type="number"
									class="input !min-h-9 w-24 !px-2 !py-1 text-right font-mono text-sm tabular-nums"
									min={p.min}
									max={p.max}
									step={p.step}
									value={values[p.key]}
									onchange={(e) => set(p.key, e.currentTarget.valueAsNumber)}
									aria-label="{tx(p.label)} ({unitSymbol(p.unit)})"
								/>
								<span class="w-8 text-sm text-ink-2">{unitSymbol(p.unit)}</span>
							</span>
						</div>
						<input
							id="{uid}-{p.key}"
							type="range"
							class="w-full accent-[var(--brand)]"
							min={p.min}
							max={p.max}
							step={p.step}
							value={values[p.key]}
							oninput={(e) => set(p.key, e.currentTarget.valueAsNumber)}
							aria-valuetext="{fmtNumber(values[p.key])} {unitSymbol(p.unit)}"
						/>
						<div class="mt-0.5 flex justify-between font-mono text-[0.6875rem] text-ink-3">
							<span>{fmtNumber(p.min)} {unitSymbol(p.unit)}</span>
							<span>{fmtNumber(p.max)} {unitSymbol(p.unit)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="space-y-4">
		<div class="card p-5" aria-live="polite">
			<h3 class="eyebrow mb-4">{m.lab_readings()}</h3>
			{#if !result.valid}
				<p class="text-sm text-ink-2">{m.lab_invalid()}</p>
			{:else if asTable}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-line text-left text-ink-2">
							<th class="py-2 font-medium">{m.lab_parameter()}</th>
							<th class="py-2 text-right font-medium">{m.lab_value()}</th>
						</tr>
					</thead>
					<tbody>
						{#each lab.params as p (p.key)}
							<tr class="border-b border-line/60">
								<td class="py-2">{tx(p.label)}</td>
								<td class="py-2 text-right font-mono tabular-nums"
									>{fmtNumber(values[p.key])} {unitSymbol(p.unit)}</td
								>
							</tr>
						{/each}
						{#each result.readings as r (r.key)}
							<tr class="border-b border-line/60 font-medium">
								<td class="py-2">{tx(r.label)}</td>
								<td class="py-2 text-right font-mono tabular-nums">
									{formatQuantity(r.valueSI, r.dimension, { locale: getLocale(), sig: 4 })}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<dl class="grid grid-cols-2 gap-3">
					{#each result.readings as r (r.key)}
						<div class="rounded-xl bg-surface-2 px-3 py-3">
							<dt class="text-xs text-ink-2">{tx(r.label)}</dt>
							<dd class="mt-1 font-mono text-lg font-semibold tabular-nums">
								{formatQuantity(r.valueSI, r.dimension, { locale: getLocale(), sig: 4 })}
							</dd>
						</div>
					{/each}
				</dl>
			{/if}
			{#if result.warnings.length}
				<ul class="mt-4 space-y-2">
					{#each result.warnings as w (w.code)}
						<li class="flex gap-2 rounded-xl px-3 py-2 text-sm {severityClass[w.severity]}">
							<Icon name={w.severity === 'info' ? 'info' : 'alert'} size={16} class="mt-0.5" />
							<span>{tx(w.message)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if !compact}
			<div class="card p-5 text-sm">
				<h3 class="eyebrow mb-3">{m.lab_assumptions()}</h3>
				<ul class="space-y-1.5 text-ink-2">
					{#each lab.assumptions as a, i (i)}
						<li class="flex gap-2">
							<span class="mt-2 size-1 shrink-0 rounded-full bg-ink-3"></span><Rich
								inline
								text={a}
							/>
						</li>
					{/each}
				</ul>
				{#if lab.safety.length}
					<h3 class="eyebrow mt-5 mb-3 flex items-center gap-1.5 !text-warning">
						<Icon name="shield" size={14} />{m.safety_title()}
					</h3>
					<ul class="space-y-1.5">
						{#each lab.safety as s, i (i)}
							<li class="rounded-lg bg-warning-soft px-3 py-2 text-warning">
								<Rich inline text={s} />
							</li>
						{/each}
					</ul>
				{/if}
				<p class="mt-5 border-t border-line pt-3 text-xs text-ink-3">
					{m.lab_model_note()}
					{m.lab_no_mastery()}
				</p>
			</div>
		{:else}
			<p class="text-xs text-ink-3">
				{m.lab_model_note()}
				<a
					class="font-medium text-ink-2 underline underline-offset-2"
					href={resolve('/lab/[labId]', { labId: lab.id })}>{m.lab_open_full()}</a
				>
			</p>
		{/if}
	</div>
</section>
