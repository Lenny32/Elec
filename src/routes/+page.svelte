<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx, getLocale } from '#lib/app/i18n.ts';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import ProgressRing from '#lib/ui/ProgressRing.svelte';
	import HeroCircuit from './HeroCircuit.svelte';

	const ix = $derived(learning.ix);
	const views = $derived(learning.views);
	const projection = $derived(learning.projection);

	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? m.greeting_morning() : hour < 18 ? m.greeting_afternoon() : m.greeting_evening();
	const today = new Intl.DateTimeFormat(getLocale(), {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(new Date());

	const nextLesson = $derived(views.nextLessonId ? ix.lessons.get(views.nextLessonId) : undefined);
	const nextChapter = $derived(nextLesson ? ix.chapters.get(nextLesson.chapterId) : undefined);
	const nextStarted = $derived(nextLesson ? views.lessons[nextLesson.id] === 'in_progress' : false);

	const totalLessons = $derived(ix.pack.lessons.length);
	const doneLessons = $derived(
		ix.pack.lessons.filter((l) => views.lessons[l.id] === 'completed').length
	);
	const totalConcepts = $derived(ix.pack.concepts.length);
	const activeDays = $derived(projection.activeDays.length);
	const dueCount = $derived(views.dueConceptIds.length);
	const journey = $derived(totalLessons ? doneLessons / totalLessons : 0);

	// Learning path preview: authored chapters plus the first outline chapter.
	const pathChapters = $derived.by(() => {
		const authored = ix.pack.chapters.filter((c) => c.status === 'authored');
		const firstOutline = ix.pack.chapters.find((c) => c.status === 'outline');
		return firstOutline ? [...authored, firstOutline] : authored;
	});

	const firstLab = $derived(ix.pack.labs[0]);
	const needsBackup = $derived(!learning.snapshot.lastExportAt && projection.eventCount > 40);

	const stats = $derived<
		{
			icon: IconName;
			tint: string;
			value: number;
			of?: number;
			unit?: string;
			label: string;
			sub: string;
		}[]
	>([
		{
			icon: 'book',
			tint: 'bg-sage text-sage-ink',
			value: doneLessons,
			of: totalLessons,
			label: m.today_lessons_completed(),
			sub: m.today_every_step()
		},
		{
			icon: 'sparkle',
			tint: 'bg-violet text-violet-ink',
			value: views.masteredCount,
			of: totalConcepts,
			label: m.today_concepts_mastered(),
			sub: m.today_knowledge_sticks()
		},
		{
			icon: 'bolt',
			tint: 'bg-peach text-peach-ink',
			value: activeDays,
			unit: m.today_days(),
			label: m.today_days_of_discovery(),
			sub: m.today_your_pace()
		}
	]);
</script>

<svelte:head><title>{m.nav_today()} · CircuitPath</title></svelte:head>

<header class="mb-8 flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow mb-3 flex items-center gap-2">
			<span class="size-1.5 rounded-full bg-sage-ink"></span>{m.today_eyebrow()}
		</p>
		<h1 class="flex items-center gap-4 text-4xl font-semibold tracking-tight sm:text-5xl">
			{greeting}
			<Icon name="asterisk" size={34} stroke={1.5} class="text-sage-ink" />
		</h1>
		<p class="mt-3 text-ink-2">{m.today_tagline()}</p>
	</div>
	<p class="chip !rounded-lg !px-3 !py-1.5 capitalize">{today}</p>
</header>

<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
	<div class="min-w-0 space-y-5">
		<!-- Hero -->
		<section
			class="overflow-hidden rounded-2xl bg-brand text-brand-ink"
			aria-labelledby="hero-title"
		>
			<div
				class="dot-grid grid items-center gap-6 px-6 pt-8 pb-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
			>
				<div>
					<p
						class="mb-6 flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.14em] text-brand-ink-2 uppercase"
					>
						<span class="size-1.5 rounded-full bg-accent"></span>{m.today_hero_eyebrow()}
					</p>
					<h2
						id="hero-title"
						class="text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl"
					>
						{m.today_hero_title_1()}<br />{m.today_hero_title_2()}
					</h2>
					<p class="mt-5 max-w-xs text-sm leading-relaxed text-brand-ink/85">
						{m.today_hero_body()}
					</p>
					{#if nextLesson}
						<a
							href={resolve('/lesson/[lessonId]', { lessonId: nextLesson.id })}
							class="btn btn-accent mt-7 !px-5"
						>
							<Icon name="play" size={15} />
							{nextStarted ? m.today_continue() : m.today_start()}
							<Icon name="arrow-up-right" size={16} class="ml-3" />
						</a>
					{:else}
						<p class="mt-6 max-w-sm rounded-xl bg-white/10 px-4 py-3 text-sm">
							{m.today_all_done()}
						</p>
					{/if}
				</div>
				<div class="mx-auto w-full max-w-sm md:max-w-none">
					<HeroCircuit />
				</div>
			</div>
			{#if nextLesson && nextChapter}
				<a
					href={resolve('/lesson/[lessonId]', { lessonId: nextLesson.id })}
					class="flex items-center gap-4 border-t border-white/10 px-6 py-4 transition-colors hover:bg-white/5 sm:px-8"
				>
					<span class="grid size-10 place-items-center rounded-xl bg-white/10"
						><Icon name="book" size={18} /></span
					>
					<span class="min-w-0 flex-1">
						<span class="block font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
							{m.today_up_next({ number: nextChapter.number })}
						</span>
						<span class="block truncate text-sm font-semibold"
							>{nextLesson.number} · {tx(nextLesson.title)}</span
						>
					</span>
					<span class="flex items-center gap-1.5 text-xs text-brand-ink-2">
						<Icon name="clock" size={15} />{m.lesson_minutes({
							minutes: nextLesson.estimatedMinutes
						})}
					</span>
				</a>
			{/if}
		</section>

		{#if views.examsToConsolidate.length}
			<a
				href={resolve('/exams')}
				class="card flex items-center gap-4 !border-warning/40 !bg-warning-soft p-4 text-warning hover:brightness-[0.98]"
			>
				<Icon name="flag" size={22} />
				<span class="flex-1">
					<span class="block font-semibold">{m.today_failed_title()}</span>
					<span class="block text-sm"
						>{m.today_failed_body({ count: views.examsToConsolidate.length })}</span
					>
				</span>
				<Icon name="chevron-right" size={18} />
			</a>
		{/if}

		<!-- Stats -->
		<section class="grid grid-cols-3 gap-3 sm:gap-5" aria-label={m.today_knowledge()}>
			{#each stats as s (s.label)}
				<div class="card p-3 sm:p-5">
					<span class="mb-4 grid size-8 place-items-center rounded-lg sm:size-9 {s.tint}"
						><Icon name={s.icon} size={17} /></span
					>
					<p class="text-3xl font-light tabular-nums sm:text-4xl">
						{s.value}<span class="ml-1 text-xs text-ink-2 sm:text-sm"
							>{s.of !== undefined ? `/ ${s.of}` : s.unit}</span
						>
					</p>
					<p class="mt-2 text-xs font-semibold sm:text-sm">{s.label}</p>
					<p class="mt-1 hidden text-xs text-ink-2 sm:block">{s.sub}</p>
				</div>
			{/each}
		</section>

		<!-- Learning path -->
		<section aria-labelledby="path-title">
			<div class="mb-4 flex items-end justify-between gap-3">
				<div>
					<h2 id="path-title" class="text-xl font-semibold">{m.today_path_title()}</h2>
					<p class="mt-1 text-sm text-ink-2">{m.today_path_subtitle()}</p>
				</div>
				<a
					href={resolve('/course')}
					class="flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap hover:underline"
				>
					{m.today_view_course()}<Icon name="arrow-up-right" size={15} />
				</a>
			</div>
			<ul class="card divide-y divide-line overflow-hidden">
				{#each pathChapters as ch (ch.id)}
					{@const p = views.chapters[ch.id]}
					{@const open = p.unlocked && ch.status === 'authored'}
					<li>
						<a
							href={resolve('/course/[chapterId]', { chapterId: ch.id })}
							class="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5"
						>
							<span
								class="grid size-11 shrink-0 place-items-center rounded-xl font-mono text-sm {open
									? 'bg-sage text-sage-ink'
									: 'bg-surface-2 text-ink-2'}">{ch.number}</span
							>
							<span class="min-w-0 flex-1">
								<span class="block truncate font-medium">{tx(ch.title)}</span>
								<span class="mt-0.5 block text-xs text-ink-2">
									{#if ch.status === 'outline'}
										{m.chapter_outline()}
									{:else}
										{m.today_lessons_n({ n: ch.lessonIds.length })} · {m.today_labs_n({
											n: ch.labIds.length
										})}
									{/if}
									{#if open && p.lessonCount}
										· {m.chapter_lessons_done({ done: p.lessonsCompleted, total: p.lessonCount })}
									{/if}
								</span>
							</span>
							{#if p.complete}
								<span class="chip !border-transparent !bg-success-soft !text-success"
									>{m.chapter_complete()}</span
								>
							{:else if open}
								<span class="chip hidden sm:inline-flex">{m.today_ready()}</span>
							{:else}
								<span class="chip hidden sm:inline-flex">{m.today_up_ahead()}</span>
							{/if}
							<Icon name={open ? 'chevron-right' : 'lock'} size={18} class="text-ink-2" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<!-- Aside -->
	<aside class="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
		<section class="card p-5 sm:col-span-2 xl:col-span-1" aria-labelledby="big-title">
			<div class="mb-4 flex items-center justify-between">
				<h2 id="big-title" class="font-semibold">{m.today_big_picture()}</h2>
				<Icon name="map" size={18} class="text-ink-2" />
			</div>
			<div class="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
				<ProgressRing value={journey} size={150} stroke={9} label={m.today_big_picture()}>
					<div>
						<p class="text-4xl font-light tabular-nums">
							{Math.round(journey * 100)}<span class="text-lg">%</span>
						</p>
						<p class="text-xs text-ink-2">{m.today_of_journey()}</p>
					</div>
				</ProgressRing>
				<div class="w-full min-w-0 flex-1 text-center sm:text-left xl:text-center">
					<p class="text-sm font-semibold">
						{doneLessons === 0 ? m.today_expert() : m.today_keep_going()}
					</p>
					<div class="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
						<span class="flex items-center gap-2 text-ink-2"
							><span class="size-1.5 rounded-full bg-success"></span>{m.today_completed()}</span
						>
						<span class="font-semibold tabular-nums"
							>{m.today_lessons_of({ done: doneLessons, total: totalLessons })}</span
						>
					</div>
				</div>
			</div>
		</section>

		<section class="card flex flex-col p-5" aria-labelledby="review-title">
			<div class="mb-4 flex items-start justify-between">
				<span class="grid size-9 place-items-center rounded-lg bg-peach text-peach-ink"
					><Icon name="refresh" size={18} /></span
				>
				<span class="eyebrow">{m.today_make_it_stick()}</span>
			</div>
			{#if dueCount > 0}
				<h2 id="review-title" class="text-lg font-semibold">{m.today_review_ready_title()}</h2>
				<p class="mt-2 text-sm text-ink-2">{m.today_review_count({ count: dueCount })}</p>
			{:else}
				<h2 id="review-title" class="text-lg font-semibold">{m.today_fresh_start()}</h2>
				<p class="mt-2 text-sm text-ink-2">
					{views.masteredCount ? m.today_review_none() : m.today_fresh_body()}
				</p>
			{/if}
			<a
				href={resolve('/review')}
				class="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm font-semibold hover:underline"
			>
				<span class="mt-2">{dueCount ? m.today_review_cta() : m.today_go_review()}</span>
				<Icon name="arrow-right" size={16} class="mt-2" />
			</a>
		</section>

		{#if firstLab}
			<section
				class="flex flex-col rounded-2xl border border-line bg-surface-2 p-5"
				aria-labelledby="lab-title"
			>
				<p class="eyebrow mb-6">{m.today_learn_by_doing()}</p>
				<div class="mb-5 flex items-center justify-center gap-5 text-sage-ink">
					<Icon name="flask" size={40} stroke={1.5} />
					<span class="flex flex-col items-center text-lg leading-none text-ink-3"
						><span>+</span><span>−</span></span
					>
					<Icon name="bolt" size={32} stroke={1.5} />
				</div>
				<h2 id="lab-title" class="text-lg font-semibold">{m.today_tried_title()}</h2>
				<p class="mt-2 text-sm text-ink-2">{m.today_tried_body()}</p>
				<a
					href={resolve('/lab/[labId]', { labId: firstLab.id })}
					class="mt-5 flex items-center justify-between text-sm font-semibold hover:underline"
				>
					{m.today_open_lab()}<Icon name="arrow-up-right" size={15} />
				</a>
			</section>
		{/if}

		{#if needsBackup}
			<section class="card p-5 sm:col-span-2 xl:col-span-1" aria-labelledby="backup-title">
				<h2 id="backup-title" class="flex items-center gap-2 font-semibold">
					<Icon name="database" size={17} />{m.today_backup_title()}
				</h2>
				<p class="mt-2 text-sm text-ink-2">{m.today_backup_body()}</p>
				<p class="mt-2 text-xs text-ink-3">{m.settings_never_exported()}</p>
				<a href={resolve('/settings')} class="btn btn-ghost btn-sm mt-4">{m.today_backup_cta()}</a>
			</section>
		{/if}
	</aside>
</div>
