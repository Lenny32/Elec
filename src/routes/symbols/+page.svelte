<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { tx } from '#lib/app/i18n.ts';
	import { prefs } from '#lib/app/prefs.svelte.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SymbolIcon from '#lib/symbols/SymbolIcon.svelte';
	import {
		SYMBOLS,
		SYMBOL_CATEGORIES,
		categoryLabel,
		isSymbolType,
		symbolInfo,
		type SymbolCategory
	} from '#lib/symbols/catalog.ts';
	import SymbolDetail from './SymbolDetail.svelte';

	let query = $state('');
	let category = $state<SymbolCategory | 'all'>('all');

	const categories: { id: SymbolCategory | 'all'; label: () => string }[] = [
		{ id: 'all', label: m.symbols_cat_all },
		...SYMBOL_CATEGORIES.map((id) => ({ id, label: categoryLabel[id] }))
	];

	const normalize = (s: string) =>
		s
			.toLocaleLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');

	const list = $derived.by(() => {
		const q = normalize(query.trim());
		return SYMBOLS.filter((s) => {
			if (category !== 'all' && s.category !== category) return false;
			if (!q) return true;
			// Search both languages: learners often know the other name.
			const hay = normalize(
				[s.name.en, s.name.fr, s.letter, s.type.replace(/_/g, ' '), tx(s.summary)].join(' ')
			);
			return q.split(/\s+/).every((w) => hay.includes(w));
		});
	});

	const groups = $derived(
		SYMBOL_CATEGORIES.map((c) => ({ id: c, items: list.filter((s) => s.category === c) })).filter(
			(g) => g.items.length
		)
	);

	const selectedType = $derived(page.url.searchParams.get('s'));
	const selected = $derived(isSymbolType(selectedType) ? symbolInfo(selectedType) : undefined);

	function select(type: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path built with resolve()
		void goto(`${resolve('/symbols')}?s=${encodeURIComponent(type)}`, {
			replace: true,
			reset: false
		});
	}

	const normName = $derived(
		prefs.symbolNorm === 'iec' ? m.settings_symbols_iec() : m.settings_symbols_ansi()
	);
</script>

<svelte:head><title>{m.symbols_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.nav_symbols()} title={m.symbols_title()} subtitle={m.symbols_subtitle()} />

<div
	class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
>
	<div class="space-y-4">
		<label class="relative block">
			<span class="sr-only">{m.search()}</span>
			<Icon
				name="search"
				size={18}
				class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
			/>
			<input
				type="search"
				class="input !pl-10"
				placeholder={m.symbols_search_placeholder()}
				bind:value={query}
			/>
		</label>
		<div class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={m.symbols_title()}>
			{#each categories as c (c.id)}
				<label
					class="cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)] {category ===
					c.id
						? 'border-transparent bg-brand text-brand-ink'
						: 'border-line bg-surface text-ink-2 hover:text-ink'}"
				>
					<input
						type="radio"
						class="sr-only"
						name="symbol-category"
						value={c.id}
						bind:group={category}
					/>
					{c.label()}
				</label>
			{/each}
		</div>
		<p class="flex items-center justify-between gap-3 text-xs text-ink-3">
			<a href={resolve('/settings')} class="hover:underline"
				>{m.symbols_your_norm({ norm: normName })}</a
			>
			<span class="shrink-0" aria-live="polite">{m.symbols_count({ count: list.length })}</span>
		</p>

		<nav aria-label={m.symbols_list_label()} class="space-y-5">
			{#each groups as g (g.id)}
				<section>
					<h2 class="eyebrow mb-2">{categoryLabel[g.id]()}</h2>
					<ul class="card divide-y divide-line overflow-hidden">
						{#each g.items as s (s.type)}
							{@const isSel = s.type === selectedType}
							<li>
								<button
									type="button"
									onclick={() => select(s.type)}
									aria-current={isSel ? 'true' : undefined}
									class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors {isSel
										? 'bg-sage'
										: 'hover:bg-surface-2'}"
								>
									<span class="flex w-[5.75rem] shrink-0 gap-1">
										<SymbolIcon type={s.type} norm="iec" class="h-8 w-11" />
										{#if !s.same}<SymbolIcon type={s.type} norm="ansi" class="h-8 w-11" />{/if}
									</span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium {isSel ? 'text-sage-ink' : ''}"
											>{tx(s.name)}</span
										>
										<span class="block truncate text-xs text-ink-3">{tx(s.summary)}</span>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<p class="card px-4 py-10 text-center text-sm text-ink-3">{m.no_results()}</p>
			{/each}
		</nav>
	</div>

	<div class="min-w-0 lg:sticky lg:top-28 lg:self-start">
		{#if selected}
			<SymbolDetail symbol={selected} />
		{:else}
			<div class="card grid min-h-64 place-items-center p-10 text-center text-ink-2">
				<div>
					<span
						class="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-violet text-violet-ink"
					>
						<Icon name="symbols" size={24} />
					</span>
					<p>{m.symbols_select()}</p>
				</div>
			</div>
		{/if}
	</div>
</div>
