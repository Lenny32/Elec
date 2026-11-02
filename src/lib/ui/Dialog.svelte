<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		children,
		actions,
		size = 'md'
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		actions?: Snippet;
		size?: 'md' | 'lg';
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onclick={(e) => {
		if (e.target === dialog) open = false;
	}}
	aria-labelledby="dialog-title"
	class="m-auto w-[calc(100%-2rem)] {size === 'lg'
		? 'max-w-2xl'
		: 'max-w-md'} rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
>
	{#if open}
		<div class="flex items-start justify-between gap-4 px-6 pt-5">
			<h2 id="dialog-title" class="text-lg font-semibold">{title}</h2>
			<button
				type="button"
				class="-mr-2 rounded-lg p-1.5 text-ink-2 hover:bg-surface-2"
				onclick={() => (open = false)}
				aria-label={m.close()}
			>
				<Icon name="x" size={18} />
			</button>
		</div>
		<div class="px-6 pt-2 pb-5 text-sm text-ink-2">{@render children()}</div>
		{#if actions}
			<div class="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/60 px-6 py-4">
				{@render actions()}
			</div>
		{/if}
	{/if}
</dialog>
