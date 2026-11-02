<script lang="ts">
	import './layout.css';
	import { onMount, type Snippet } from 'svelte';
	import { page, updated } from '$app/state';
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/app/i18n.ts';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { prefs } from '#lib/app/prefs.svelte.ts';
	import { device } from '#lib/app/device.svelte.ts';
	import {
		NAV_WORKSPACE,
		NAV_EXPLORE,
		NAV_SETTINGS,
		isActive,
		activeItem,
		type NavItem
	} from '#lib/app/nav.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import CommandPalette from '#lib/ui/CommandPalette.svelte';

	let { children }: { children: Snippet } = $props();

	let drawerOpen = $state(false);
	let paletteOpen = $state(false);
	let drawer: HTMLDialogElement | undefined = $state();

	onMount(() => {
		document.documentElement.lang = getLocale();
		prefs.load();
		device.start();
		void learning.start();
	});

	afterNavigate(() => {
		drawerOpen = false;
	});

	$effect(() => {
		if (!drawer) return;
		if (drawerOpen && !drawer.open) drawer.showModal();
		else if (!drawerOpen && drawer.open) drawer.close();
	});

	function onkeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		}
	}

	const current = $derived(activeItem(page.route.id));
	const badge = (item: NavItem): number => {
		if (learning.status !== 'ready') return 0;
		if (item.route === '/review') return learning.views.dueConceptIds.length;
		if (item.route === '/exams') return learning.views.examsToConsolidate.length;
		return 0;
	};
</script>

<svelte:window {onkeydown} />

{#snippet navLink(item: NavItem)}
	{@const active = isActive(item, page.route.id)}
	{@const count = badge(item)}
	<a
		href={resolve(item.route)}
		aria-current={active ? 'page' : undefined}
		class="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem] transition-colors {active
			? 'bg-accent font-semibold text-accent-ink'
			: 'text-ink hover:bg-surface-2'}"
	>
		<Icon name={item.icon} size={19} class={active ? '' : 'text-ink-2 group-hover:text-ink'} />
		<span class="flex-1">{item.label()}</span>
		{#if count > 0}
			<span class="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning"
				>{count}</span
			>
		{:else if active}
			<span class="size-1.5 rounded-full bg-accent-ink"></span>
		{/if}
	</a>
{/snippet}

{#snippet navigation()}
	<nav aria-label={m.main_navigation()} class="flex flex-1 flex-col">
		<p class="eyebrow mb-3 px-3.5 !text-[0.625rem]">{m.nav_group_workspace()}</p>
		<ul class="space-y-1">
			{#each NAV_WORKSPACE as item (item.route)}<li>{@render navLink(item)}</li>{/each}
		</ul>
		<p class="eyebrow mt-8 mb-3 px-3.5 !text-[0.625rem]">{m.nav_group_explore()}</p>
		<ul class="space-y-1">
			{#each NAV_EXPLORE as item (item.route)}<li>{@render navLink(item)}</li>{/each}
		</ul>
		<div class="mt-auto pt-8">
			<div class="card mb-5 p-4">
				<Icon name="asterisk" size={22} class="mb-3 text-sage-ink" />
				<p class="text-sm font-semibold">{m.sidebar_card_title()}</p>
				<p class="mt-1.5 text-sm text-ink-2">{m.sidebar_card_body()}</p>
				<a
					href={resolve('/course')}
					class="mt-4 flex items-center justify-between text-sm font-semibold hover:underline"
				>
					{m.sidebar_card_cta()}<Icon name="arrow-up-right" size={15} />
				</a>
			</div>
			{@render navLink(NAV_SETTINGS)}
			<p class="mt-4 flex items-center gap-2 px-3.5 text-xs text-ink-2">
				<span class="size-1.5 rounded-full bg-success"></span>{m.private_note()}
			</p>
		</div>
	</nav>
{/snippet}

{#snippet brand()}
	<a href={resolve('/')} class="flex items-center gap-3" aria-label="CircuitPath — {m.nav_today()}">
		<span class="grid size-10 place-items-center rounded-xl bg-accent text-accent-ink">
			<Icon name="bolt" size={22} stroke={2} />
		</span>
		<span class="text-2xl font-bold tracking-tight"
			>CircuitPath<span class="text-sage-ink">.</span></span
		>
	</a>
{/snippet}

<a
	href="#main"
	class="sr-only z-50 rounded-lg bg-brand px-4 py-2 text-brand-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
	>{m.skip_to_content()}</a
>

<div class="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
	<!-- Desktop sidebar -->
	<aside
		class="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-bg px-5 pt-8 pb-6 lg:flex"
	>
		<div class="mb-4 px-2">{@render brand()}</div>
		<p class="eyebrow mb-10 px-2 !text-[0.625rem] leading-relaxed">{m.tagline()}</p>
		{@render navigation()}
	</aside>

	<div class="flex min-w-0 flex-col">
		<!-- Top bar -->
		<header
			class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:h-20 lg:px-10"
		>
			<button
				type="button"
				class="-ml-1 rounded-lg p-2 text-ink hover:bg-surface-2 lg:hidden"
				onclick={() => (drawerOpen = true)}
				aria-label={m.open_menu()}
			>
				<Icon name="menu" size={22} />
			</button>
			<nav aria-label={m.breadcrumb()} class="min-w-0 flex-1">
				<ol class="flex items-center gap-2 text-sm">
					<li class="hidden text-ink-2 sm:block">
						<a href={resolve('/')} class="hover:text-ink">CircuitPath</a>
					</li>
					<li class="hidden text-ink-3 sm:block" aria-hidden="true">/</li>
					<li class="truncate font-medium" aria-current="page">
						{current?.label() ?? 'CircuitPath'}
					</li>
				</ol>
			</nav>
			{#if !device.online}
				<span class="chip !border-warning/40 !bg-warning-soft !text-warning">
					<Icon name="wifi-off" size={14} />{m.offline_now()}
				</span>
			{/if}
			<button
				type="button"
				onclick={() => (paletteOpen = true)}
				class="flex items-center gap-2 rounded-xl p-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink sm:px-3"
				aria-label={m.search()}
			>
				<Icon name="search" size={19} />
				<span class="hidden sm:inline">{m.search_placeholder()}</span>
				<kbd
					class="ml-3 hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-3 md:inline"
					>Ctrl K</kbd
				>
			</button>
			<span class="hidden h-8 w-px bg-line sm:block" aria-hidden="true"></span>
			<a
				href={resolve('/profile')}
				class="grid size-10 place-items-center rounded-full border border-line bg-peach text-xs font-bold text-peach-ink ring-4 ring-surface"
				aria-label={m.nav_progress()}
			>
				CP
			</a>
		</header>

		{#if updated.current}
			<div
				class="flex items-center justify-center gap-3 bg-brand px-4 py-2 text-sm text-brand-ink"
				role="status"
			>
				{m.update_available()}
				<button type="button" class="btn btn-accent btn-sm" onclick={() => location.reload()}
					>{m.update_reload()}</button
				>
			</div>
		{/if}

		<main
			id="main"
			class="mx-auto w-full max-w-[90rem] flex-1 px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10"
		>
			{#if learning.status === 'ready'}
				{@render children()}
			{:else if learning.status === 'error' && learning.failure}
				<div class="mx-auto max-w-lg py-16 text-center" role="alert">
					<span
						class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger"
					>
						<Icon name={learning.failure.kind === 'storage' ? 'database' : 'alert'} size={26} />
					</span>
					{#if learning.failure.kind === 'storage'}
						<h1 class="text-2xl font-semibold">{m.error_storage_title()}</h1>
						<p class="mt-3 text-ink-2">{m.error_storage_body()}</p>
					{:else if learning.failure.kind === 'pack'}
						<h1 class="text-2xl font-semibold">{m.error_pack_title()}</h1>
						<ul
							class="mt-4 max-h-60 overflow-auto rounded-xl bg-surface-2 p-3 text-left font-mono text-xs"
						>
							{#each learning.failure.issues.slice(0, 50) as issue, i (i)}
								<li><strong>{issue.path}</strong>: {issue.message}</li>
							{/each}
						</ul>
					{:else}
						<h1 class="text-2xl font-semibold">{m.error_unknown_title()}</h1>
						<p class="mt-3 font-mono text-sm text-ink-2">{learning.failure.message}</p>
					{/if}
					<button type="button" class="btn btn-primary mt-6" onclick={() => learning.start()}>
						<Icon name="reset" size={16} />{m.error_retry()}
					</button>
				</div>
			{:else}
				<div class="space-y-6" aria-busy="true" aria-label={m.loading()}>
					<div class="h-4 w-40 animate-pulse rounded bg-surface-3"></div>
					<div class="h-10 w-72 animate-pulse rounded-lg bg-surface-3"></div>
					<div class="h-72 animate-pulse rounded-2xl bg-surface-2"></div>
					<div class="grid gap-4 sm:grid-cols-3">
						{#each [1, 2, 3] as i (i)}<div
								class="h-32 animate-pulse rounded-2xl bg-surface-2"
							></div>{/each}
					</div>
				</div>
			{/if}
		</main>

		<footer
			class="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 border-t border-line px-4 py-6 text-xs text-ink-2 sm:px-6 lg:px-10"
		>
			<p class="flex items-center gap-2"><Icon name="shield" size={15} />{m.footer_private()}</p>
			<p class="flex items-center gap-2">
				{m.footer_curious()}<Icon name="asterisk" size={15} class="text-sage-ink" />
			</p>
		</footer>
	</div>
</div>

<!-- Mobile drawer -->
<dialog
	bind:this={drawer}
	onclose={() => (drawerOpen = false)}
	onclick={(e) => {
		if (e.target === drawer) drawerOpen = false;
	}}
	aria-label={m.main_navigation()}
	class="m-0 h-dvh max-h-dvh w-[19rem] max-w-[85vw] border-r border-line bg-bg p-0 text-ink backdrop:bg-black/40"
>
	{#if drawerOpen}
		<div class="flex h-full flex-col overflow-y-auto px-5 pt-6 pb-6">
			<div class="mb-8 flex items-center justify-between">
				{@render brand()}
				<button
					type="button"
					class="rounded-lg p-2 hover:bg-surface-2"
					onclick={() => (drawerOpen = false)}
					aria-label={m.close()}
				>
					<Icon name="x" size={20} />
				</button>
			</div>
			{@render navigation()}
		</div>
	{/if}
</dialog>

<CommandPalette bind:open={paletteOpen} />
