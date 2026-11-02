<script lang="ts">
	import type { ConceptState } from '#learning';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import { conceptStateLabel, conceptStateTone, toneVar } from '#lib/app/labels.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import ConceptPanel from './ConceptPanel.svelte';

	let view = $state<'graph' | 'list'>('graph');

	const selectedId = $derived(page.url.searchParams.get('c'));
	const selected = $derived(selectedId ? learning.ix.concepts.get(selectedId) : undefined);

	function select(id: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path built with resolve()
		void goto(`${resolve('/map')}?c=${encodeURIComponent(id)}`, { replace: true, reset: false });
	}

	const columns = $derived(
		learning.ix.pack.chapters
			.map((chapter) => ({
				chapter,
				concepts: learning.ix.pack.concepts.filter((c) => c.chapterId === chapter.id)
			}))
			.filter((c) => c.concepts.length > 0)
	);

	// ───── Graph layout ─────
	const NODE_W = 168;
	const NODE_H = 42;
	const COL_GAP = 64;
	const ROW_GAP = 14;
	const TOP = 44;
	const layout = $derived.by(() => {
		const pos: Record<string, { x: number; y: number }> = {};
		let maxRows = 0;
		columns.forEach((col, ci) => {
			maxRows = Math.max(maxRows, col.concepts.length);
			col.concepts.forEach((c, ri) => {
				pos[c.id] = { x: 12 + ci * (NODE_W + COL_GAP), y: TOP + ri * (NODE_H + ROW_GAP) };
			});
		});
		return {
			pos,
			width: 24 + columns.length * NODE_W + Math.max(0, columns.length - 1) * COL_GAP,
			height: TOP + maxRows * (NODE_H + ROW_GAP) + 8
		};
	});
	const edges = $derived(
		learning.ix.pack.concepts.flatMap((c) =>
			c.prerequisites.flatMap((p) => {
				const a = layout.pos[p];
				const b = layout.pos[c.id];
				if (!a || !b) return [];
				const x1 = a.x + NODE_W;
				const y1 = a.y + NODE_H / 2;
				const x2 = b.x;
				const y2 = b.y + NODE_H / 2;
				const dx = Math.max(30, (x2 - x1) / 2);
				return [
					{
						id: `${p}>${c.id}`,
						d: `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`,
						active: selectedId === p || selectedId === c.id
					}
				];
			})
		)
	);

	const stateOf = (id: string): ConceptState => learning.views.concepts[id]?.state ?? 'locked';
	const legend: ConceptState[] = [
		'locked',
		'ready',
		'learning',
		'practicing',
		'mastered',
		'review_due',
		'needs_work'
	];
	const truncate = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

	function nodeKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select(id);
		}
	}
</script>

<svelte:head><title>{m.map_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.nav_map()} title={m.map_title()} subtitle={m.map_subtitle()}>
	{#snippet actions()}
		<div
			class="inline-flex rounded-xl border border-line bg-surface p-1"
			role="radiogroup"
			aria-label={m.map_title()}
		>
			{#each [{ id: 'graph', label: m.map_view_graph(), icon: 'graph' }, { id: 'list', label: m.map_view_list(), icon: 'list' }] as const as v (v.id)}
				<label
					class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-[var(--focus)] {view ===
					v.id
						? 'bg-brand text-brand-ink'
						: 'text-ink-2 hover:text-ink'}"
				>
					<input type="radio" class="sr-only" name="map-view" value={v.id} bind:group={view} />
					<Icon name={v.icon} size={16} />{v.label}
				</label>
			{/each}
		</div>
	{/snippet}
</PageHeader>

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
	<div class="min-w-0">
		{#if view === 'graph'}
			<div class="card overflow-hidden">
				<div class="overflow-x-auto p-4">
					<svg
						width={layout.width}
						height={layout.height}
						viewBox="0 0 {layout.width} {layout.height}"
						role="group"
						aria-label={m.map_graph_label()}
						class="block"
					>
						{#each columns as col, ci (col.chapter.id)}
							<text
								x={12 + ci * (NODE_W + COL_GAP)}
								y="18"
								class="fill-[var(--ink-2)] font-mono text-[11px] tracking-wider uppercase"
							>
								{col.chapter.number} · {truncate(tx(col.chapter.title), 18)}
							</text>
						{/each}
						<defs>
							<marker
								id="map-arrow"
								viewBox="0 0 8 8"
								refX="7"
								refY="4"
								markerWidth="7"
								markerHeight="7"
								orient="auto"
							>
								<path d="M0 0L8 4L0 8Z" fill="var(--line-strong)" />
							</marker>
							<marker
								id="map-arrow-on"
								viewBox="0 0 8 8"
								refX="7"
								refY="4"
								markerWidth="7"
								markerHeight="7"
								orient="auto"
							>
								<path d="M0 0L8 4L0 8Z" fill="var(--brand)" />
							</marker>
						</defs>
						{#each edges as e (e.id)}
							<path
								d={e.d}
								fill="none"
								stroke={e.active ? 'var(--brand)' : 'var(--line-strong)'}
								stroke-width={e.active ? 2 : 1.3}
								marker-end="url(#{e.active ? 'map-arrow-on' : 'map-arrow'})"
							/>
						{/each}
						{#each columns as col (col.chapter.id)}
							{#each col.concepts as c (c.id)}
								{@const p = layout.pos[c.id]}
								{@const st = stateOf(c.id)}
								{@const color = toneVar[conceptStateTone[st]]}
								{@const isSel = c.id === selectedId}
								<g
									transform="translate({p.x} {p.y})"
									role="button"
									tabindex="0"
									aria-pressed={isSel}
									aria-label="{tx(c.name)} — {conceptStateLabel[st]()}"
									class="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--focus)] [&:focus-visible>rect]:stroke-[3]"
									onclick={() => select(c.id)}
									onkeydown={(e) => nodeKey(e, c.id)}
								>
									<rect
										width={NODE_W}
										height={NODE_H}
										rx="10"
										fill={isSel ? 'var(--sage)' : 'var(--surface)'}
										stroke={isSel ? 'var(--brand)' : 'var(--line)'}
										stroke-width={isSel ? 2 : 1}
									/>
									<rect x="0" y="8" width="4" height={NODE_H - 16} rx="2" fill={color} />
									<circle
										cx={NODE_W - 14}
										cy={NODE_H / 2}
										r="5"
										fill={color}
										opacity={st === 'locked' ? 0.4 : 1}
									/>
									<text
										x="14"
										y={NODE_H / 2 + 4}
										class="fill-[var(--ink)] text-[12px] {st === 'locked' ? 'opacity-60' : ''}"
									>
										{truncate(tx(c.name))}
									</text>
								</g>
							{/each}
						{/each}
					</svg>
				</div>
				<div
					class="flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-xs text-ink-2"
					aria-label={m.map_legend()}
				>
					{#each legend as s (s)}
						<span class="inline-flex items-center gap-1.5">
							<span class="size-2.5 rounded-full" style:background={toneVar[conceptStateTone[s]]}
							></span>
							{conceptStateLabel[s]()}
						</span>
					{/each}
				</div>
			</div>
		{:else}
			<div class="space-y-6">
				{#each columns as col (col.chapter.id)}
					{@const unlocked = learning.views.chapters[col.chapter.id]?.unlocked}
					<section class="card overflow-hidden" aria-labelledby="map-list-{col.chapter.number}">
						<header class="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
							<span class="font-mono text-sm text-ink-3">{col.chapter.number}</span>
							<h2 id="map-list-{col.chapter.number}" class="font-semibold">
								{tx(col.chapter.title)}
							</h2>
							<span class="text-xs text-ink-3"
								>{m.map_concepts_count({ count: col.concepts.length })}</span
							>
							{#if !unlocked}<Badge tone="neutral"
									><Icon name="lock" size={12} />{m.map_chapter_locked()}</Badge
								>{/if}
						</header>
						<ul class="divide-y divide-line">
							{#each col.concepts as c (c.id)}
								{@const st = stateOf(c.id)}
								<li>
									<button
										type="button"
										onclick={() => select(c.id)}
										aria-current={c.id === selectedId ? 'true' : undefined}
										class="flex w-full items-center gap-3 px-5 py-3 text-left text-sm {c.id ===
										selectedId
											? 'bg-sage'
											: 'hover:bg-surface-2'}"
									>
										<span class="min-w-0 flex-1 truncate">{tx(c.name)}</span>
										<Badge tone={conceptStateTone[st]}>{conceptStateLabel[st]()}</Badge>
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{/if}
	</div>

	<aside class="min-w-0 xl:sticky xl:top-28 xl:self-start" aria-live="polite">
		{#if selected}
			<ConceptPanel concept={selected} onselect={select} />
		{:else}
			<div class="card p-8 text-center text-sm text-ink-2">
				<span class="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-sage text-sage-ink">
					<Icon name="map" size={24} />
				</span>
				{m.map_select()}
			</div>
		{/if}
	</aside>
</div>
