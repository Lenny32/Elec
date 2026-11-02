<script lang="ts">
	import type { LocalizedText } from '#learning';
	import { tx } from '#lib/app/i18n.ts';
	import { renderRich } from './rich.ts';

	let {
		text,
		inline = false,
		class: className = ''
	}: { text: LocalizedText | string | undefined; inline?: boolean; class?: string } = $props();

	const html = $derived(renderRich(typeof text === 'string' ? text : tx(text), inline));
</script>

{#if inline}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by renderRich -->
	<span class={className}>{@html html}</span>
{:else}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by renderRich -->
	<div class="prose-cp {className}">{@html html}</div>
{/if}
