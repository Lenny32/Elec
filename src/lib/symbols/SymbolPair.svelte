<!-- The IEC and ANSI drawings of one symbol, side by side. -->
<script lang="ts">
	import type { ComponentType } from '#learning';
	import { m } from '#lib/paraglide/messages.js';
	import { prefs, type SymbolNorm } from '#lib/app/prefs.svelte.ts';
	import SymbolIcon from './SymbolIcon.svelte';
	import { symbolInfo } from './catalog.ts';

	let {
		type,
		size = 'md'
	}: {
		type: ComponentType;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const info = $derived(symbolInfo(type));
	const norms: { id: SymbolNorm; label: () => string; hint: () => string }[] = [
		{ id: 'iec', label: m.symbols_norm_iec, hint: m.symbols_norm_iec_hint },
		{ id: 'ansi', label: m.symbols_norm_ansi, hint: m.symbols_norm_ansi_hint }
	];
	const iconClass = { sm: 'h-9 w-12', md: 'h-16 w-22', lg: 'h-24 w-32' };
</script>

<div class="grid grid-cols-2 gap-2">
	{#each norms as n (n.id)}
		{@const active = prefs.symbolNorm === n.id}
		<figure
			class="flex flex-col items-center rounded-xl border px-2 py-2 {active
				? 'border-brand/50 bg-surface'
				: 'border-line bg-surface-2/60'}"
		>
			<SymbolIcon {type} norm={n.id} class={iconClass[size]} />
			<figcaption class="mt-1 text-center leading-tight">
				<span class="block text-xs font-semibold">{n.label()}</span>
				{#if size !== 'sm'}<span class="block text-[0.6875rem] text-ink-3">{n.hint()}</span>{/if}
			</figcaption>
		</figure>
	{/each}
</div>
{#if info.same && size !== 'sm'}
	<p class="mt-2 text-xs text-ink-3">{m.symbols_same_both()}</p>
{/if}
