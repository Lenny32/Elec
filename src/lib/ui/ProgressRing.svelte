<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		value,
		size = 140,
		stroke = 10,
		color = 'var(--sage-ink)',
		track = 'var(--surface-2)',
		label,
		children
	}: {
		/** 0..1 */
		value: number;
		size?: number;
		stroke?: number;
		color?: string;
		track?: string;
		label: string;
		children?: Snippet;
	} = $props();

	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
	const clamped = $derived(Math.max(0, Math.min(1, value)));
</script>

<div
	class="relative inline-grid place-items-center"
	style:width="{size}px"
	style:height="{size}px"
	role="progressbar"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={Math.round(clamped * 100)}
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle cx={size / 2} cy={size / 2} {r} fill="none" stroke={track} stroke-width={stroke} />
		<circle
			cx={size / 2}
			cy={size / 2}
			{r}
			fill="none"
			stroke={color}
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={c * (1 - clamped)}
			class="transition-[stroke-dashoffset] duration-700"
		/>
	</svg>
	{#if children}
		<div class="absolute inset-0 grid place-items-center text-center">{@render children()}</div>
	{/if}
</div>
