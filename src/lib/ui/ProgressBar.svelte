<script lang="ts">
	let {
		value,
		label,
		color = 'var(--sage-ink)',
		class: className = ''
	}: { value: number; label: string; color?: string; class?: string } = $props();
	const pct = $derived(Math.round(Math.max(0, Math.min(1, value)) * 100));
</script>

<div
	class="h-1.5 w-full overflow-hidden rounded-full bg-surface-2 {className}"
	role="progressbar"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={pct}
>
	<div
		class="h-full rounded-full transition-[width] duration-500"
		style:width="{pct}%"
		style:background={color}
	></div>
</div>
