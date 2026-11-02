<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { tx } from '#lib/app/i18n.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import LessonPlayer from './LessonPlayer.svelte';

	const lesson = $derived(learning.ix.lessons.get(page.params.lessonId ?? ''));
	const chapter = $derived(lesson ? learning.ix.chapters.get(lesson.chapterId) : undefined);
</script>

<svelte:head>
	<title>{lesson ? `${lesson.number} · ${tx(lesson.title)}` : m.not_found()} · CircuitPath</title>
</svelte:head>

{#if !lesson || !chapter}
	<div class="mx-auto max-w-md py-16 text-center">
		<h1 class="text-2xl font-semibold">{m.not_found()}</h1>
		<a href={resolve('/course')} class="btn btn-primary mt-6"
			><Icon name="arrow-left" size={16} />{m.course_title()}</a
		>
	</div>
{:else}
	{#key lesson.id}
		<LessonPlayer {lesson} {chapter} />
	{/key}
{/if}
