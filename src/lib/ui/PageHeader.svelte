<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		subtitle,
		actions
	}: { eyebrow?: string; title: string; subtitle?: string; actions?: Snippet } = $props();
</script>

<header class="mb-8 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		{#if eyebrow}
			<p class="eyebrow mb-3 flex items-center gap-2">
				<span class="size-1.5 rounded-full bg-sage-ink"></span>{eyebrow}
			</p>
		{/if}
		<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
		{#if subtitle}<p class="mt-2 text-ink-2">{subtitle}</p>{/if}
	</div>
	{#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
</header>
