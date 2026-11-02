<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import { ALL_NAV } from '#lib/app/nav.ts';
	import { SYMBOLS } from '#lib/symbols/catalog.ts';
	import Icon, { type IconName } from './Icon.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	interface Entry {
		group: string;
		label: string;
		hint?: string;
		icon: IconName;
		href: string;
	}

	let query = $state('');
	let active = $state(0);
	let dialog: HTMLDialogElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();

	const entries = $derived.by((): Entry[] => {
		if (learning.status !== 'ready') return [];
		const ix = learning.ix;
		const out: Entry[] = ALL_NAV.map((n) => ({
			group: m.command_pages(),
			label: n.label(),
			icon: n.icon,
			href: resolve(n.route)
		}));
		for (const l of ix.pack.lessons)
			out.push({
				group: m.command_lessons(),
				label: `${l.number} · ${tx(l.title)}`,
				icon: 'book',
				href: resolve('/lesson/[lessonId]', { lessonId: l.id })
			});
		for (const f of ix.pack.formulas)
			out.push({
				group: m.command_formulas(),
				label: tx(f.name),
				hint: f.symbolic,
				icon: 'formula',
				href: `${resolve('/formulas')}?f=${encodeURIComponent(f.id)}`
			});
		for (const s of SYMBOLS)
			out.push({
				group: m.command_symbols(),
				label: tx(s.name),
				// Designator + the other-language name, so "R" or "résistance" also find the resistor.
				hint: `${s.letter} · ${s.name.en === tx(s.name) ? s.name.fr : s.name.en}`,
				icon: 'symbols',
				href: `${resolve('/symbols')}?s=${encodeURIComponent(s.type)}`
			});
		for (const lab of ix.pack.labs)
			out.push({
				group: m.command_labs(),
				label: tx(lab.title),
				icon: 'flask',
				href: resolve('/lab/[labId]', { labId: lab.id })
			});
		for (const c of ix.pack.concepts)
			out.push({
				group: m.command_concepts(),
				label: tx(c.name),
				icon: 'map',
				href: `${resolve('/map')}?c=${encodeURIComponent(c.id)}`
			});
		return out;
	});

	const normalize = (s: string) =>
		s
			.toLocaleLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');

	const results = $derived.by(() => {
		const q = normalize(query.trim());
		if (!q) return entries.filter((e) => e.group === m.command_pages());
		const words = q.split(/\s+/);
		return entries
			.filter((e) => {
				const hay = normalize(`${e.label} ${e.hint ?? ''}`);
				return words.every((w) => hay.includes(w));
			})
			.slice(0, 40);
	});

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			queueMicrotask(() => input?.focus());
		} else if (!open && dialog.open) dialog.close();
	});

	function choose(e: Entry | undefined) {
		if (!e) return;
		open = false;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- hrefs are built with resolve()
		void goto(e.href);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(results.length - 1, active + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(0, active - 1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(results[active]);
		}
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => {
		open = false;
		query = '';
		active = 0;
	}}
	onclick={(e) => {
		if (e.target === dialog) open = false;
	}}
	aria-label={m.command_palette()}
	class="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
>
	{#if open}
		<div class="flex items-center gap-3 border-b border-line px-4">
			<Icon name="search" size={18} class="text-ink-3" />
			<input
				bind:this={input}
				bind:value={query}
				oninput={() => (active = 0)}
				{onkeydown}
				class="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3"
				placeholder={m.command_palette_hint()}
				role="combobox"
				aria-expanded="true"
				aria-controls="palette-results"
				aria-activedescendant={results[active] ? `palette-${active}` : undefined}
				aria-autocomplete="list"
			/>
			<kbd class="rounded border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-3"
				>Esc</kbd
			>
		</div>
		<ul
			id="palette-results"
			role="listbox"
			class="max-h-[55vh] overflow-y-auto p-2"
			aria-label={m.command_palette()}
		>
			{#each results as r, i (r.href + r.group + i)}
				{#if i === 0 || results[i - 1].group !== r.group}
					<li role="presentation" class="eyebrow px-3 pt-3 pb-1.5">{r.group}</li>
				{/if}
				<li
					id="palette-{i}"
					role="option"
					aria-selected={i === active}
					class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm {i === active
						? 'bg-sage text-sage-ink'
						: 'text-ink'}"
					onclick={() => choose(r)}
					onkeydown={() => {}}
					onmousemove={() => (active = i)}
				>
					<Icon name={r.icon} size={17} class="text-ink-2" />
					<span class="min-w-0 flex-1 truncate">{r.label}</span>
					{#if r.hint}<span class="font-mono text-xs text-ink-3">{r.hint}</span>{/if}
				</li>
			{:else}
				<li class="px-3 py-8 text-center text-sm text-ink-3">{m.no_results()}</li>
			{/each}
		</ul>
	{/if}
</dialog>
