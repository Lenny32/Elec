<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Badge from '#lib/ui/Badge.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';

	const modules = $derived(
		learning.pack.modules
			.slice()
			.sort((a, b) => a.number - b.number)
			.map((mod) => ({
				mod,
				chapters: mod.chapterIds
					.map((id) => learning.ix.chapters.get(id))
					.filter((c) => c !== undefined)
			}))
	);
</script>

<svelte:head><title>{m.course_title()} · CircuitPath</title></svelte:head>

<PageHeader
	eyebrow={m.course_subtitle()}
	title={m.course_title()}
	subtitle={tx(learning.pack.manifest.description)}
>
	{#snippet actions()}
		<a href={resolve('/exams')} class="btn btn-ghost"
			><Icon name="exam" size={17} />{m.course_tab_exams()}</a
		>
		<a href={resolve('/map')} class="btn btn-ghost"
			><Icon name="map" size={17} />{m.course_tab_map()}</a
		>
	{/snippet}
</PageHeader>

<div class="space-y-10">
	{#each modules as { mod, chapters } (mod.id)}
		<section aria-labelledby="mod-{mod.id}">
			<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
				<div>
					<p class="eyebrow mb-1.5">
						{m.module_label({ number: mod.number })} · {m.course_chapters_n({ n: chapters.length })}
					</p>
					<h2 id="mod-{mod.id}" class="text-xl font-semibold">{tx(mod.title)}</h2>
					<p class="mt-1 text-sm text-ink-2">{tx(mod.summary)}</p>
				</div>
				{#if mod.examId}
					<a
						href={resolve('/exams/[examId]', { examId: mod.examId })}
						class="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
					>
						{m.module_exam()}<Icon name="arrow-up-right" size={15} />
					</a>
				{/if}
			</div>
			<ul class="card divide-y divide-line overflow-hidden">
				{#each chapters as ch (ch.id)}
					{@const prog = learning.views.chapters[ch.id]}
					{@const outline = ch.status === 'outline'}
					{@const locked = !outline && !prog.unlocked}
					<li>
						<a
							href={resolve('/course/[chapterId]', { chapterId: ch.id })}
							class="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5"
						>
							<span
								class="grid size-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold
								{prog.complete
									? 'bg-success-soft text-success'
									: locked || outline
										? 'bg-surface-2 text-ink-3'
										: 'bg-sage text-sage-ink'}"
							>
								{ch.number}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block font-medium {outline ? 'text-ink-2' : ''}">{tx(ch.title)}</span>
								<span class="mt-0.5 block truncate text-sm text-ink-2">{tx(ch.summary)}</span>
								{#if !outline}
									<span class="mt-2 flex items-center gap-3 text-xs text-ink-2">
										<span>{m.today_lessons_n({ n: ch.lessonIds.length })}</span>
										<span aria-hidden="true">·</span>
										<span>{m.today_labs_n({ n: ch.labIds.length })}</span>
										{#if prog.unlocked && prog.lessonCount}
											<ProgressBar
												class="ml-1 max-w-32"
												value={prog.lessonsCompleted / prog.lessonCount}
												label={m.chapter_lessons_done({
													done: prog.lessonsCompleted,
													total: prog.lessonCount
												})}
											/>
										{/if}
									</span>
								{/if}
							</span>
							<span class="hidden sm:block">
								{#if prog.complete}
									<Badge tone="success"><Icon name="check" size={12} />{m.chapter_complete()}</Badge
									>
								{:else if outline}
									<Badge>{m.today_up_ahead()}</Badge>
								{:else if locked}
									<Badge>{m.state_locked()}</Badge>
								{:else if prog.lessonsCompleted > 0}
									<Badge tone="violet">{m.state_in_progress()}</Badge>
								{:else}
									<Badge tone="brand">{m.today_ready()}</Badge>
								{/if}
							</span>
							<Icon
								name={locked ? 'lock' : 'chevron-right'}
								size={18}
								class="text-ink-3"
								label={locked ? m.state_locked() : undefined}
							/>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
