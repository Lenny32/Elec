<script lang="ts">
	import type { DiagramComponent } from '#learning';
	import { prefs, type SymbolNorm } from '#lib/app/prefs.svelte.ts';
	import SymbolShape from './SymbolShape.svelte';

	let {
		c,
		glow = 0,
		norm
	}: {
		c: DiagramComponent;
		/** 0..1 brightness for lamps/LEDs in the lab. */
		glow?: number;
		/** Defaults to the user's preferred convention. */
		norm?: SymbolNorm;
	} = $props();

	const shown = $derived(norm ?? prefs.symbolNorm);
</script>

<g transform="translate({c.x} {c.y}) rotate({c.rotation})" class="symbol">
	<SymbolShape type={c.type} norm={shown} rotation={c.rotation} closed={c.closed} {glow} />
</g>
