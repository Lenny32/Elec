<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';

	const groups = $derived(
		learning.ix.pack.chapters
			.map((chapter) => ({
				chapter,
				unlocked: learning.views.chapters[chapter.id]?.unlocked ?? false,
				labs: chapter.labIds.flatMap((id) => {
					const lab = learning.ix.labs.get(id);
					return lab ? [lab] : [];
				})
			}))
			.filter((g) => g.labs.length > 0)
	);

	function excerpt(text: string, max = 150): string {
		const plain = text.replace(/\$[^$]*\$/g, '…').replace(/\*\*/g, '');
		return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
	}
</script>

<svelte:head><title>{m.lab_title()} · CircuitPath</title></svelte:head>

<PageHeader eyebrow={m.today_learn_by_doing()} title={m.lab_title()} subtitle={m.lab_subtitle()} />

<p class="mb-8 flex max-w-2xl items-start gap-2 text-sm text-ink-2">
	<Icon name="info" size={16} class="mt-0.5" />{m.lab_model_note()}
	{m.lab_no_mastery()}
</p>

<div class="space-y-10">
	{#each groups as g (g.chapter.id)}
		<section aria-labelledby="lab-ch-{g.chapter.number}">
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<span
					class="grid size-9 place-items-center rounded-lg bg-sage font-mono text-sm text-sage-ink"
					>{g.chapter.number}</span
				>
				<h2 id="lab-ch-{g.chapter.number}" class="text-lg font-semibold">{tx(g.chapter.title)}</h2>
				<span class="text-sm text-ink-3">{m.lab_count({ count: g.labs.length })}</span>
				{#if !g.unlocked}
					<Badge tone="neutral"><Icon name="lock" size={12} />{m.map_chapter_locked()}</Badge>
				{/if}
			</div>
			<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each g.labs as lab (lab.id)}
					<li>
						<a
							href={resolve('/lab/[labId]', { labId: lab.id })}
							class="card group flex h-full flex-col p-5 transition-colors hover:border-line-strong"
						>
							<span class="mb-4 grid size-11 place-items-center rounded-xl bg-peach text-peach-ink">
								<Icon name="flask" size={22} />
							</span>
							<h3 class="font-semibold">{tx(lab.title)}</h3>
							<p class="mt-2 flex-1 text-sm text-ink-2">{excerpt(tx(lab.intro))}</p>
							<div class="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
								<span class="font-mono text-xs text-ink-3">{lab.model}</span>
								<span class="flex items-center gap-1 font-semibold group-hover:underline">
									{m.lab_open()}<Icon name="arrow-up-right" size={15} />
								</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
