<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toneClass, type Tone } from '#lib/app/labels.ts';

	let {
		tone = 'neutral',
		class: className = '',
		children
	}: { tone?: Tone; class?: string; children: Snippet } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {toneClass[
		tone
	]} {className}"
>
	{@render children()}
</span>
