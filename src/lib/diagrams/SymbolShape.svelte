<!--
	One schematic symbol drawn horizontally around (0,0), in IEC 60617 or ANSI/IEEE 315 style.
	Two-terminal parts have pins at x = ±30; multi-terminal pins are listed in
	modules/learning/src/domain/geometry.ts. `rotation` is only used to keep text upright.
-->
<script lang="ts">
	import type { ComponentType } from '#learning';
	import type { SymbolNorm } from '#lib/app/prefs.svelte.ts';

	let {
		type,
		norm,
		rotation = 0,
		closed = false,
		glow = 0
	}: {
		type: ComponentType;
		norm: SymbolNorm;
		rotation?: number;
		closed?: boolean;
		/** 0..1 brightness for lamps/LEDs in the lab. */
		glow?: number;
	} = $props();

	const iec = $derived(norm === 'iec');

	const zig = 'M-30 0H-18L-15 -7L-9 7L-3 -7L3 7L9 -7L15 7L18 0H30';
	const leads18 = 'M-30 0H-18M18 0H30';
	/** Diagonal "adjustable" arrow across a body. */
	const adjust = 'M-15 13L13 -13M6 -12.5L13 -13L12.5 -6';
	/** Two arrows pointing in (light received) / out (light emitted). */
	const lightIn =
		'M-12 -24L-4 -15M-8.5 -15.5L-4 -15L-4.5 -19.5M-2 -24L6 -15M1.5 -15.5L6 -15L5.5 -19.5';
	const lightOut = 'M0 -13L6 -21M4 -21H6V-19M6 -11L12 -19M10 -19H12V-17';
	/** Four 8-unit humps going down, bulging left (side 0) or right (1). */
	const humps = (side: 0 | 1) => `a4 4 0 0 ${side} 0 8`.repeat(4);
</script>

{#snippet upright(x: number, y: number, text: string, cls: string)}
	<g transform="rotate({-rotation} {x} {y})"><text {x} {y} class={cls}>{text}</text></g>
{/snippet}

{#snippet diodeBody()}
	<path d="M-30 0H-10M10 0H30" class="stroke" />
	<path d="M-10 -10L10 0L-10 10Z" class="stroke fill-bg" />
{/snippet}

{#snippet circleLeads(r: number)}
	<path d="M-30 0H{-r}M{r} 0H30" class="stroke" />
	<circle {r} class="stroke fill-bg" />
{/snippet}

{#if type === 'resistor'}
	{#if iec}
		<path d={leads18} class="stroke" />
		<rect x="-18" y="-7" width="36" height="14" class="stroke fill-bg" />
	{:else}
		<path d={zig} class="stroke" />
	{/if}
{:else if type === 'variable_resistor' || type === 'potentiometer' || type === 'ldr'}
	{#if iec}
		<path d={leads18} class="stroke" />
		<rect x="-18" y="-7" width="36" height="14" class="stroke fill-bg" />
	{:else}
		<path d={zig} class="stroke" />
	{/if}
	{#if type === 'variable_resistor'}
		<path d={adjust} class="stroke thin" />
	{:else if type === 'potentiometer'}
		<path d="M0 -30V-9M-4.5 -14.5L0 -8.5L4.5 -14.5" class="stroke" />
	{:else}
		<path d={lightIn} class="stroke thin" />
	{/if}
{:else if type === 'battery'}
	<path d="M-30 0H-4M4 0H30" class="stroke" />
	<path d="M-4 -15V15" class="stroke" />
	<path d="M4 -8V8" class="stroke" stroke-width="4.5" />
	{@render upright(-12, -16, '+', 'sign')}
{:else if type === 'dc_source'}
	{@render circleLeads(16)}
	{#if iec}
		<path d="M-16 0H16" class="stroke" />
		{@render upright(-22, -14, '+', 'sign small')}
	{:else}
		{@render upright(-7, 0, '+', 'sign')}
		{@render upright(7, 0, '−', 'sign')}
	{/if}
{:else if type === 'current_source'}
	{@render circleLeads(16)}
	{#if iec}
		<path d="M0 -16V16" class="stroke" />
		<path d="M10 -22H-8M-3 -26L-8 -22L-3 -18" class="stroke thin" />
	{:else}
		<path d="M10 0H-9M-3 -6L-9 0L-3 6" class="stroke" />
	{/if}
{:else if type === 'ac_source'}
	{@render circleLeads(16)}
	<path d="M-10 0C-7 -10 -3 -10 0 0S7 10 10 0" class="stroke" />
{:else if type === 'ground'}
	<path d="M0 0V10M-12 10H12M-7 15H7M-2.5 20H2.5" class="stroke" />
{:else if type === 'chassis_ground'}
	<path d="M0 0V10M-12 10H12M-12 10L-17 19M0 10L-5 19M12 10L7 19" class="stroke" />
{:else if type === 'switch' || type === 'push_button'}
	{#if iec}
		<path d="M-30 0H-14M14 0H30" class="stroke" />
		<path d={closed ? 'M-14 0L14 0' : 'M-14 0L12 -12'} class="stroke" />
		{#if !closed}<path d="M14 0V-6" class="stroke thin" />{/if}
		{#if type === 'push_button'}
			{@const y = closed ? -1 : -6}
			<path d="M0 {y}V-22" class="stroke thin dashed" />
			<path d="M-6 -19V-23H6V-19" class="stroke thin" />
		{/if}
	{:else if type === 'switch'}
		<path d="M-30 0H-14M14 0H30" class="stroke" />
		<circle cx="-14" r="2.6" class="dot" />
		<circle cx="14" r="2.6" class="dot" />
		<path d={closed ? 'M-14 0L14 -1' : 'M-14 0L11 -13'} class="stroke" />
	{:else}
		{@const y = closed ? -4 : -11}
		<path d="M-30 0H-12M12 0H30" class="stroke" />
		<circle cx="-12" r="2.6" class="stroke fill-bg" />
		<circle cx="12" r="2.6" class="stroke fill-bg" />
		<path d="M-15 {y}H15M0 {y}V-22M-6 -22H6" class="stroke" />
	{/if}
{:else if type === 'fuse'}
	{#if iec}
		<path d="M-30 0H30" class="stroke" />
		<rect x="-14" y="-6" width="28" height="12" class="stroke" fill="none" />
	{:else}
		<path d="M-30 0H-14C-10 -13 -3 -13 0 0S10 13 14 0H30" class="stroke" />
	{/if}
{:else if type === 'relay_coil'}
	{#if iec}
		<path d="M-30 0H-10M10 0H30" class="stroke" />
		<rect x="-10" y="-12" width="20" height="24" class="stroke fill-bg" />
	{:else}
		{@render circleLeads(13)}
	{/if}
{:else if type === 'diode' || type === 'led' || type === 'photodiode'}
	{#if type === 'led' && glow > 0}
		<circle r="22" fill="var(--accent)" opacity={0.25 + 0.55 * glow} class="glow" />
	{/if}
	{@render diodeBody()}
	<path d="M10 -10V10" class="stroke" />
	{#if type === 'led'}
		<path d={lightOut} class="stroke thin" />
	{:else if type === 'photodiode'}
		<path d={lightIn} class="stroke thin" />
	{/if}
{:else if type === 'zener'}
	{@render diodeBody()}
	<path d={iec ? 'M10 10V-10H15' : 'M5 -13L10 -10V10L15 13'} class="stroke" />
{:else if type === 'capacitor'}
	<path d="M-30 0H-4M4 0H30M-4 -13V13M4 -13V13" class="stroke" />
{:else if type === 'polarized_capacitor'}
	<path d="M-30 0H-4M-4 -13V13" class="stroke" />
	{#if iec}
		<rect x="3" y="-13" width="5" height="26" class="solid" />
		<path d="M8 0H30" class="stroke" />
	{:else}
		<path d="M9 -13Q3 0 9 13M5 0H30" class="stroke" />
	{/if}
	{@render upright(-11, -14, '+', 'sign small')}
{:else if type === 'inductor'}
	<path
		d="M-30 0H-20A5 5 0 0 1 -10 0A5 5 0 0 1 0 0A5 5 0 0 1 10 0A5 5 0 0 1 20 0H30"
		class="stroke"
	/>
{:else if type === 'transformer'}
	{#if iec}
		<path d="M-30 -20H-14V-8.5M-30 20H-14V8.5M30 -20H14V-8.5M30 20H14V8.5" class="stroke" />
		<circle cx="-7" r="11" class="stroke" fill="none" />
		<circle cx="7" r="11" class="stroke" fill="none" />
	{:else}
		<path d="M-30 -20H-8V-16{humps(0)}V20H-30" class="stroke" />
		<path d="M30 -20H8V-16{humps(1)}V20H30" class="stroke" />
		<path d="M-2 -18V18M2 -18V18" class="stroke thin" />
	{/if}
{:else if type === 'npn' || type === 'pnp'}
	{#if !iec}<circle cx="3" r="19" class="stroke fill-bg" />{/if}
	<path d="M-30 0H-6M-6 -12V12M-6 -5L10 -17V-30M-6 5L10 17V30" class="stroke" />
	{#if type === 'npn'}
		<path d="M2.5 15.5L10 17L6.5 10" class="stroke" />
	{:else}
		<path d="M-3.5 12L-6 5L1 6" class="stroke" />
	{/if}
{:else if type === 'nmos' || type === 'pmos'}
	{#if !iec}<circle cx="1" r="19" class="stroke fill-bg" />{/if}
	<path d="M-30 0H-10M-10 -10V10" class="stroke" />
	<path d="M-4 -13V-5M-4 -4V4M-4 5V13" class="stroke" />
	<path d="M-4 -9H10V-30M-4 9H10V30M-4 0H10V9" class="stroke" />
	{#if type === 'nmos'}
		<path d="M1 -4L-4 0L1 4" class="stroke" />
	{:else}
		<path d="M3 -4L8 0L3 4" class="stroke" />
	{/if}
{:else if type === 'opamp'}
	<path d="M-30 -10H-18M-30 10H-18M18 0H30" class="stroke" />
	{#if iec}
		<rect x="-18" y="-20" width="36" height="40" class="stroke fill-bg" />
		{@render upright(-12, -10, '−', 'sign small')}
		{@render upright(-12, 10, '+', 'sign small')}
		{@render upright(5, -9, '▷∞', 'sign small')}
	{:else}
		<path d="M-18 -22V22L18 0Z" class="stroke fill-bg" />
		{@render upright(-11, -10, '−', 'sign small')}
		{@render upright(-11, 10, '+', 'sign small')}
	{/if}
{:else if type === 'lamp'}
	{#if glow > 0}
		<circle r="24" fill="var(--accent)" opacity={0.2 + 0.6 * glow} class="glow" />
	{/if}
	{@render circleLeads(14)}
	{#if iec}
		<path d="M-9.9 -9.9L9.9 9.9M-9.9 9.9L9.9 -9.9" class="stroke" />
	{:else}
		<path d="M-14 0H-6C-6 -12 6 -12 6 0H14" class="stroke thin" />
	{/if}
{:else if type === 'motor'}
	{@render circleLeads(15)}
	{@render upright(0, 0, 'M', 'meter')}
{:else if type === 'meter_v' || type === 'meter_a' || type === 'meter_ohm'}
	{@render circleLeads(15)}
	{@render upright(0, 0, type === 'meter_v' ? 'V' : type === 'meter_a' ? 'A' : 'Ω', 'meter')}
	{#if type !== 'meter_ohm'}{@render upright(-21, -9, '+', 'sign small')}{/if}
{:else if type === 'node'}
	<circle r="3.8" class="dot" />
{/if}

<style>
	.stroke {
		fill: none;
		stroke: var(--wire);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.thin {
		stroke-width: 1.5;
	}
	.dashed {
		stroke-dasharray: 3 3;
	}
	.fill-bg {
		fill: var(--surface);
	}
	.dot,
	.solid {
		fill: var(--wire);
	}
	.sign {
		fill: var(--ink);
		font-size: 13px;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.sign.small {
		font-size: 11px;
	}
	.meter {
		fill: var(--ink);
		font-size: 14px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.glow {
		filter: blur(4px);
		transition: opacity 0.3s;
	}
</style>
