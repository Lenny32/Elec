<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Rich from '#lib/ui/Rich.svelte';
	import LabView from '#lib/lab/LabView.svelte';

	const lab = $derived(learning.ix.labs.get(page.params.labId ?? ''));
	const chapter = $derived(
		lab ? learning.ix.pack.chapters.find((c) => c.labIds.includes(lab.id)) : undefined
	);
</script>

<svelte:head><title>{lab ? tx(lab.title) : m.not_found()} · CircuitPath</title></svelte:head>

<a
	href={resolve('/lab')}
	class="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
>
	<Icon name="arrow-left" size={16} />{m.lab_title()}
</a>

{#if lab}
	<header class="mb-8 max-w-3xl">
		{#if chapter}
			<p class="eyebrow mb-3 flex items-center gap-2">
				<span class="size-1.5 rounded-full bg-sage-ink"></span>{m.chapter_label({
					number: chapter.number
				})} · {tx(chapter.title)}
			</p>
		{/if}
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{tx(lab.title)}</h1>
		<Rich text={lab.intro} class="mt-3 text-ink-2" />
	</header>
	{#key lab.id}
		<LabView {lab} />
	{/key}
{:else}
	<div class="py-16 text-center">
		<h1 class="text-2xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/lab')} class="btn btn-primary mt-6">{m.lab_choose()}</a>
	</div>
{/if}
