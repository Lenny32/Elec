<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import SymbolPair from '#lib/symbols/SymbolPair.svelte';
	import { categoryLabel, type SymbolInfo } from '#lib/symbols/catalog.ts';
	import { conceptSymbols, lessonSymbols } from '#lib/symbols/usage.ts';

	let { symbol }: { symbol: SymbolInfo } = $props();

	const concepts = $derived(
		learning.ix.pack.concepts.filter((c) => conceptSymbols(learning.ix, c.id).includes(symbol.type))
	);
	const lessons = $derived(
		learning.ix.pack.lessons.filter((l) => lessonSymbols(learning.ix, l.id).includes(symbol.type))
	);
</script>

<article class="card p-6" aria-labelledby="symbol-title">
	<p class="eyebrow mb-2">{categoryLabel[symbol.category]()}</p>
	<h2 id="symbol-title" class="text-2xl font-semibold tracking-tight">{tx(symbol.name)}</h2>
	<p class="mt-1 text-ink-2">{tx(symbol.summary)}</p>

	<div class="mt-5"><SymbolPair type={symbol.type} size="lg" /></div>

	<dl class="mt-5 grid gap-2 text-sm sm:grid-cols-2">
		<div class="rounded-xl bg-surface-2 px-3 py-2">
			<dt class="text-xs text-ink-3">{m.symbols_letter()}</dt>
			<dd class="font-mono font-semibold">{symbol.letter}</dd>
		</div>
		{#if symbol.pins}
			<div class="rounded-xl bg-surface-2 px-3 py-2">
				<dt class="text-xs text-ink-3">{m.symbols_pins()}</dt>
				<dd>{tx(symbol.pins)}</dd>
			</div>
		{/if}
	</dl>

	<Rich text={symbol.description} class="mt-5" />

	<section class="mt-6">
		<h3 class="eyebrow mb-2">{m.symbols_norms_title()}</h3>
		<Rich text={symbol.norms} class="text-sm text-ink-2" />
	</section>

	{#if concepts.length}
		<section class="mt-6">
			<h3 class="eyebrow mb-2">{m.symbols_concepts()}</h3>
			<ul class="flex flex-wrap gap-2">
				{#each concepts as c (c.id)}
					<li>
						<a
							href="{resolve('/map')}?c={encodeURIComponent(c.id)}"
							class="chip hover:border-line-strong"
						>
							<Icon name="map" size={12} />{tx(c.name)}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if lessons.length}
		<section class="mt-6">
			<h3 class="eyebrow mb-2">{m.symbols_lessons()}</h3>
			<ul class="flex flex-wrap gap-2">
				{#each lessons as l (l.id)}
					<li>
						{#if learning.views.lessons[l.id] !== 'locked'}
							<a
								href={resolve('/lesson/[lessonId]', { lessonId: l.id })}
								class="chip hover:border-line-strong"
							>
								<Icon name="book" size={12} />{l.number} · {tx(l.title)}
							</a>
						{:else}
							<span class="chip text-ink-3">
								<Icon name="lock" size={12} />{l.number} · {tx(l.title)}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</article>
