<script lang="ts">
	import { tex } from './rich.ts';

	let {
		src,
		display = false,
		class: className = ''
	}: { src: string; display?: boolean; class?: string } = $props();

	const html = $derived(tex(src, display));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX output of authored formulas -->
<span class={className}>{@html html}</span>
