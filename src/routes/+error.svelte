<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from '#lib/ui/Icon.svelte';
</script>

<div class="mx-auto max-w-md py-20 text-center">
	<p class="eyebrow mb-4">{page.status}</p>
	<h1 class="text-3xl font-semibold">
		{page.status === 404 ? m.not_found() : m.error_unknown_title()}
	</h1>
	{#if page.status !== 404 && page.error?.message}
		<p class="mt-3 text-ink-2">{page.error.message}</p>
	{/if}
	<a href={resolve('/')} class="btn btn-primary mt-8"><Icon name="home" size={17} />{m.go_home()}</a
	>
</div>
