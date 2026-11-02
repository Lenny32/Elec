<!-- A single schematic symbol as a standalone, decorative SVG. -->
<script lang="ts">
	import type { ComponentType } from '#learning';
	import { prefs, type SymbolNorm } from '#lib/app/prefs.svelte.ts';
	import SymbolShape from '#lib/diagrams/SymbolShape.svelte';

	let {
		type,
		norm,
		class: className = 'h-10 w-14'
	}: { type: ComponentType; norm?: SymbolNorm; class?: string } = $props();
</script>

<svg viewBox="-38 -34 76 68" class={className} aria-hidden="true" focusable="false">
	<SymbolShape {type} norm={norm ?? prefs.symbolNorm} />
</svg>
