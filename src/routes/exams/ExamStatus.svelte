<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import Badge from '#lib/ui/Badge.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	let { examId }: { examId: string } = $props();

	const av = $derived(learning.views.exams[examId]);
	const passed = $derived(learning.views.passedExams[examId] ?? false);
</script>

{#if passed}
	<Badge tone="success"><Icon name="check" size={12} />{m.exam_passed()}</Badge>
{:else if av?.kind === 'in_progress'}
	<Badge tone="violet">{m.state_in_progress()}</Badge>
{:else if av?.kind === 'needs_drill'}
	<Badge tone="warning">{m.exams_failed()}</Badge>
{:else if av?.kind === 'available'}
	<Badge tone="brand">{m.state_available()}</Badge>
{:else}
	<Badge tone="neutral"><Icon name="lock" size={12} />{m.state_locked()}</Badge>
{/if}
