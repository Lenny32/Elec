<script lang="ts">
	import type { AnyEvent, Formula } from '#learning';
	import { page } from '$app/state';
	import { goto, afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Tex from '#lib/ui/Tex.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import FormulaDetail from './FormulaDetail.svelte';

	type Filter = 'all' | 'unlocked' | 'mastered' | 'due';
	const filters: { id: Filter; label: () => string }[] = [
		{ id: 'all', label: m.formulas_filter_all },
		{ id: 'unlocked', label: m.formulas_filter_unlocked },
		{ id: 'mastered', label: m.formulas_filter_mastered },
		{ id: 'due', label: m.formulas_filter_due }
	];

	let query = $state('');
	let filter = $state<Filter>('all');
	let events = $state.raw<AnyEvent[] | null>(null);

	function unlocked(f: Formula): boolean {
		const ch = learning.ix.concepts.get(f.conceptIds[0])?.chapterId;
		return ch ? (learning.views.chapters[ch]?.unlocked ?? false) : false;
	}
	const mastered = (f: Formula) =>
		f.conceptIds.every((c) => learning.views.concepts[c]?.state === 'mastered');
	const due = (f: Formula) => f.conceptIds.some((c) => learning.views.dueConceptIds.includes(c));

	const normalize = (s: string) =>
		s
			.toLocaleLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');

	const list = $derived.by(() => {
		const q = normalize(query.trim());
		return learning.ix.pack.formulas.filter((f) => {
			if (filter === 'unlocked' && !unlocked(f)) return false;
			if (filter === 'mastered' && !mastered(f)) return false;
			if (filter === 'due' && !due(f)) return false;
			if (!q) return true;
			const hay = normalize(
				[
					tx(f.name),
					f.symbolic,
					f.output.symbol,
					tx(f.output.name),
					...f.inputs.flatMap((v) => [v.symbol, tx(v.name)])
				].join(' ')
			);
			return q.split(/\s+/).every((w) => hay.includes(w));
		});
	});

	const selectedId = $derived(page.url.searchParams.get('f'));
	const selected = $derived(selectedId ? learning.ix.formulas.get(selectedId) : undefined);

	function select(id: string) {
		ensureEvents();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path built with resolve()
		void goto(`${resolve('/formulas')}?f=${encodeURIComponent(id)}`, {
			replace: true,
			reset: false
		});
	}

	// Past mistakes need the event journal; load it once, when a formula is first opened.
	let loading = false;
	function ensureEvents() {
		if (events !== null || loading) return;
		loading = true;
		void learning.call('allEvents', {}).then((e) => (events = e));
	}
	// Also covers arriving with ?f= (e.g. from the command palette).
	afterNavigate(() => {
		if (page.url.searchParams.get('f')) ensureEvents();
	});
</script>

<svelte:head><title>{m.formulas_title()} · CircuitPath</title></svelte:head>

<PageHeader
	eyebrow={m.nav_formulas()}
	title={m.formulas_title()}
	subtitle={m.formulas_subtitle()}
/>

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
				placeholder={m.formulas_search_placeholder()}
				bind:value={query}
			/>
		</label>
		<div
			class="flex flex-wrap items-center gap-2"
			role="radiogroup"
			aria-label={m.formulas_title()}
		>
			{#each filters as f (f.id)}
				<label
					class="cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)] {filter ===
					f.id
						? 'border-transparent bg-brand text-brand-ink'
						: 'border-line bg-surface text-ink-2 hover:text-ink'}"
				>
					<input
						type="radio"
						class="sr-only"
						name="formula-filter"
						value={f.id}
						bind:group={filter}
					/>
					{f.label()}
				</label>
			{/each}
			<span class="ml-auto text-xs text-ink-3" aria-live="polite">
				{m.formulas_count({ count: list.length })}
			</span>
		</div>

		<ul class="card divide-y divide-line overflow-hidden" aria-label={m.formula_list_label()}>
			{#each list as f (f.id)}
				{@const isSel = f.id === selectedId}
				{@const open = unlocked(f)}
				<li>
					<button
						type="button"
						onclick={() => select(f.id)}
						aria-current={isSel ? 'true' : undefined}
						class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors {isSel
							? 'bg-sage'
							: 'hover:bg-surface-2'}"
					>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium {isSel ? 'text-sage-ink' : ''}"
								>{tx(f.name)}</span
							>
							<span class="mt-1 block truncate text-sm text-ink-2"><Tex src={f.latex} /></span>
						</span>
						{#if !open}
							<Icon name="lock" size={15} class="text-ink-3" label={m.locked()} />
						{:else if mastered(f)}
							<Badge tone="success">{m.state_mastered()}</Badge>
						{:else if due(f)}
							<Badge tone="warning">{m.state_review_due()}</Badge>
						{/if}
					</button>
				</li>
			{:else}
				<li class="px-4 py-10 text-center text-sm text-ink-3">{m.no_results()}</li>
			{/each}
		</ul>
	</div>

	<div class="min-w-0 lg:sticky lg:top-28 lg:self-start">
		{#if selected}
			<FormulaDetail formula={selected} locked={!unlocked(selected)} {events} />
		{:else}
			<div class="card grid min-h-64 place-items-center p-10 text-center text-ink-2">
				<div>
					<span
						class="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-violet text-violet-ink"
					>
						<Icon name="formula" size={24} />
					</span>
					<p>{m.formula_select()}</p>
				</div>
			</div>
		{/if}
	</div>
</div>
