<!-- A row of symbol links (both conventions shown) to the symbol reference page. -->
<script lang="ts">
	import type { ComponentType } from '#learning';
	import { resolve } from '$app/paths';
	import { tx } from '#lib/app/i18n.ts';
	import SymbolIcon from './SymbolIcon.svelte';
	import { symbolInfo } from './catalog.ts';

	let {
		types,
		title,
		hint,
		heading = 'h3',
		class: className = ''
	}: {
		types: ComponentType[];
		title: string;
		hint?: string;
		heading?: 'h2' | 'h3';
		class?: string;
	} = $props();
</script>

{#if types.length}
	<section class={className}>
		<svelte:element this={heading} class="eyebrow mb-2">{title}</svelte:element>
		{#if hint}<p class="mb-3 text-xs text-ink-3">{hint}</p>{/if}
		<ul class="flex flex-wrap gap-2">
			{#each types as t (t)}
				{@const info = symbolInfo(t)}
				<li>
					<a
						href="{resolve('/symbols')}?s={encodeURIComponent(t)}"
						class="flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pr-3 pl-1.5 text-sm transition-colors hover:border-line-strong"
						title={tx(info.summary)}
					>
						<span class="flex text-ink">
							<SymbolIcon type={t} norm="iec" class="h-6 w-8" />
							{#if !info.same}<SymbolIcon type={t} norm="ansi" class="h-6 w-8" />{/if}
						</span>
						{tx(info.name)}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
