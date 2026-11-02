<script lang="ts">
	import type { Diagram, DiagramComponent, LocalizedText } from '#learning';
	import { formatQuantity, toSI, dimensionOf, type UnitId } from '#learning/domain/units.ts';
	import { tx, getLocale } from '#lib/app/i18n.ts';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from '#lib/ui/Icon.svelte';
	import SymbolPair from '#lib/symbols/SymbolPair.svelte';
	import { symbolInfo } from '#lib/symbols/catalog.ts';
	import Symbol from './Symbol.svelte';
	import { currentPaths } from './flow.ts';

	let {
		diagram,
		params = {},
		paramUnits = {},
		flowCurrent = 0,
		glow = 0,
		showTitle = false,
		explain = false,
		class: className = ''
	}: {
		diagram: Diagram;
		/** Live values for components bound to lab parameters. */
		params?: Record<string, number>;
		paramUnits?: Record<string, UnitId>;
		/** Loop current in A; > 0 animates conventional current along the conducting path. */
		flowCurrent?: number;
		glow?: number;
		showTitle?: boolean;
		/**
		 * Components can be selected to show what their symbol means. Keep it off where identifying
		 * a symbol is the exercise.
		 */
		explain?: boolean;
		class?: string;
	} = $props();

	// ───── Symbol explanations ─────
	let figure: HTMLElement | undefined = $state();
	let openId = $state<string | null>(null);
	let pop = $state({ x: 0, y: 0, below: true });
	const opened = $derived(diagram.components.find((c) => c.id === openId));

	function toggle(c: DiagramComponent, el: Element) {
		if (openId === c.id) return close();
		// Viewport coordinates: the popover is position:fixed so cards with overflow-hidden don't clip it.
		const r = el.getBoundingClientRect();
		const vw = document.documentElement.clientWidth;
		const below = r.top + r.height / 2 < window.innerHeight / 2;
		pop = {
			x: Math.min(Math.max(r.left + r.width / 2, 148), Math.max(vw - 148, 148)),
			y: below ? r.bottom + 6 : r.top - 6,
			below
		};
		openId = c.id;
	}
	function close() {
		openId = null;
	}
	function onkey(e: KeyboardEvent, c: DiagramComponent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle(c, e.currentTarget as Element);
		}
	}
	const componentName = (c: DiagramComponent) =>
		[c.label, tx(symbolInfo(c.type).name)].filter(Boolean).join(' · ');

	const [w, h] = $derived(diagram.viewBox);
	const uid = $props.id();

	function valueText(c: DiagramComponent): string | undefined {
		const v = c.value;
		if (!v) return undefined;
		if ('param' in v) {
			const val = params[v.param];
			const unit = paramUnits[v.param];
			if (val === undefined || !unit) return v.param;
			return formatQuantity(toSI(val, unit), dimensionOf(unit), { locale: getLocale(), sig: 3 });
		}
		return formatQuantity(toSI(v.value, v.unit), dimensionOf(v.unit), {
			locale: getLocale(),
			sig: 4
		});
	}

	type LabelPos = { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
	function labelPos(c: DiagramComponent): LabelPos {
		const vertical = c.rotation === 90 || c.rotation === 270;
		if (c.type === 'ground') return { x: c.x + 16, y: c.y + 16, anchor: 'start' };
		if (c.type === 'node') return { x: c.x + 8, y: c.y - 10, anchor: 'start' };
		if (vertical) {
			const left = c.x < w / 2;
			return { x: c.x + (left ? -24 : 24), y: c.y - 4, anchor: left ? 'end' : 'start' };
		}
		const above = c.y <= h / 2;
		return { x: c.x, y: c.y + (above ? -30 : 28), anchor: 'middle' };
	}

	const flow = $derived(flowCurrent > 0 ? currentPaths(diagram) : []);
	// Faster dashes for more current (log scale, 1 µA … 1 A).
	const flowSpeed = $derived(
		Math.max(0.35, Math.min(4, 0.6 + (Math.log10(Math.max(flowCurrent, 1e-6)) + 6) * 0.55))
	);

	const arrowPath: Record<string, string> = {
		right: 'M-9 0H7M2 -5L8 0L2 5',
		left: 'M9 0H-7M-2 -5L-8 0L-2 5',
		down: 'M0 -9V7M-5 2L0 8L5 2',
		up: 'M0 9V-7M-5 -2L0 -8L5 -2'
	};
	const arrowLabelOffset: Record<string, [number, number, 'start' | 'end' | 'middle']> = {
		right: [0, -12, 'middle'],
		left: [0, -12, 'middle'],
		down: [12, 4, 'start'],
		up: [12, 4, 'start']
	};
	const label = (t: LocalizedText | undefined) => (t ? tx(t) : '');
</script>

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && openId && close()}
	onscroll={() => openId && close()}
	onresize={() => openId && close()}
	onpointerdown={(e) => {
		if (openId && figure && !figure.contains(e.target as Node)) close();
	}}
/>

<figure class="diagram relative {className}" bind:this={figure}>
	<svg
		viewBox="0 0 {w} {h}"
		role={explain ? 'group' : 'img'}
		aria-labelledby="{uid}-t {uid}-d"
		class="h-auto w-full"
		style:max-height="{Math.max(h * 1.6, 260)}px"
	>
		<title id="{uid}-t">{tx(diagram.title)}</title>
		<desc id="{uid}-d">{tx(diagram.alt)}</desc>

		{#each diagram.wires as wire, i (i)}
			<polyline points={wire.points.map((p) => p.join(',')).join(' ')} class="wire" />
		{/each}

		{#if flow.length}
			<g class="flow" style:--flow-speed="{2.4 / flowSpeed}s">
				{#each flow as s, i (i)}
					<line x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} />
				{/each}
			</g>
		{/if}

		{#each diagram.components as c (c.id)}
			{#if explain && c.type !== 'node'}
				<g
					role="button"
					tabindex="0"
					aria-label={componentName(c)}
					aria-expanded={openId === c.id}
					class={['explain', { active: openId === c.id }]}
					onclick={(e) => toggle(c, e.currentTarget)}
					onkeydown={(e) => onkey(e, c)}
				>
					<circle cx={c.x} cy={c.y} r="26" class="hit" />
					<Symbol {c} glow={c.type === 'lamp' || c.type === 'led' ? glow : 0} />
				</g>
			{:else}
				<Symbol {c} glow={c.type === 'lamp' || c.type === 'led' ? glow : 0} />
			{/if}
		{/each}

		{#each diagram.junctions as [x, y], i (i)}
			<circle cx={x} cy={y} r="4" class="junction" />
		{/each}

		{#each diagram.components as c (c.id)}
			{@const pos = labelPos(c)}
			{@const value = valueText(c)}
			{#if c.label || value}
				<text x={pos.x} y={pos.y} text-anchor={pos.anchor} class="label">
					{#if c.label}<tspan class="name">{c.label}</tspan>{/if}
					{#if value}
						<tspan
							x={pos.x}
							dy={c.label ? 15 : 0}
							class={['value', { param: c.value && 'param' in c.value }]}>{value}</tspan
						>
					{/if}
				</text>
			{/if}
		{/each}

		{#each diagram.annotations as a, i (i)}
			{#if a.kind === 'current_arrow'}
				{@const off = arrowLabelOffset[a.direction]}
				<g transform="translate({a.x} {a.y})" class="arrow">
					<path d={arrowPath[a.direction]} />
					{#if a.label}
						<text x={off[0]} y={off[1]} text-anchor={off[2]}>{label(a.label)}</text>
					{/if}
				</g>
			{:else if a.kind === 'text'}
				<text x={a.x} y={a.y} text-anchor="middle" class="note">{label(a.text)}</text>
			{:else if a.kind === 'voltage_marker'}
				{@const mx = (a.x1 + a.x2) / 2}
				{@const my = (a.y1 + a.y2) / 2}
				<g class="vmark">
					<line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
					<text x={a.x1} y={a.y1} dx="-9" dy="4" class="pm">+</text>
					<text x={a.x2} y={a.y2} dx="-9" dy="4" class="pm">−</text>
					<text x={mx} y={my} dx="10" dy="4" class="vlabel">{label(a.label)}</text>
				</g>
			{/if}
		{/each}
	</svg>
	{#if opened}
		{@const info = symbolInfo(opened.type)}
		<div
			role="dialog"
			aria-label={componentName(opened)}
			class="popover fixed z-50 w-[17rem] max-w-[calc(100%-0.5rem)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-3 text-left shadow-lg {pop.below
				? ''
				: '-translate-y-full'}"
			style:left="{pop.x}px"
			style:top="{pop.y}px"
		>
			<div class="mb-2 flex items-start gap-2">
				<p class="min-w-0 flex-1 text-sm leading-snug font-semibold">
					{componentName(opened)}
				</p>
				<button
					type="button"
					class="-m-1 rounded-lg p-1 text-ink-3 hover:text-ink"
					aria-label={m.close()}
					onclick={close}><Icon name="x" size={16} /></button
				>
			</div>
			<SymbolPair type={opened.type} size="sm" />
			<p class="mt-2 text-xs text-ink-2">{tx(info.summary)}</p>
			<a
				href="{resolve('/symbols')}?s={encodeURIComponent(opened.type)}"
				class="mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
				>{m.symbols_open()}<Icon name="arrow-up-right" size={13} /></a
			>
		</div>
	{/if}
	{#if showTitle}
		<figcaption class="mt-2 text-center text-sm text-ink-2">{tx(diagram.title)}</figcaption>
	{/if}
</figure>

<style>
	.explain {
		cursor: pointer;
		outline: none;
	}
	.hit {
		fill: transparent;
		stroke: none;
		transition: fill 0.15s;
	}
	.explain:hover .hit,
	.explain.active .hit {
		fill: color-mix(in oklab, var(--accent) 16%, transparent);
	}
	.explain:focus-visible .hit {
		fill: color-mix(in oklab, var(--accent) 16%, transparent);
		stroke: var(--focus);
		stroke-width: 2;
	}
	.wire {
		fill: none;
		stroke: var(--wire);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.junction {
		fill: var(--wire);
	}
	.flow line {
		stroke: var(--wire-flow);
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-dasharray: 2 12;
		animation: flow var(--flow-speed, 1.5s) linear infinite;
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -28;
		}
	}
	.label {
		font-size: 12.5px;
		fill: var(--ink);
	}
	.label .name {
		font-weight: 650;
	}
	.label .value {
		fill: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}
	.label .value.param {
		fill: var(--sage-ink);
		font-weight: 600;
	}
	.arrow path {
		fill: none;
		stroke: var(--danger);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.arrow text {
		fill: var(--danger);
		font-size: 13px;
		font-weight: 650;
		font-style: italic;
	}
	.note {
		font-size: 12px;
		fill: var(--ink-2);
	}
	.vmark line {
		stroke: var(--info);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}
	.vmark .pm,
	.vmark .vlabel {
		fill: var(--info);
		font-size: 12.5px;
		font-weight: 650;
	}
</style>
