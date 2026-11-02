<script lang="ts">
	import { RULES_VERSION, type ImportCheck } from '#learning';
	import { onMount, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { learning } from '#lib/app/learning.svelte.ts';
	import { prefs, type Theme, type TextSize, type SymbolNorm } from '#lib/app/prefs.svelte.ts';
	import SymbolIcon from '#lib/symbols/SymbolIcon.svelte';
	import { device, downloadText } from '#lib/app/device.svelte.ts';
	import { getLocale, setLocale, fmtDate, fmtDateTime, type AppLocale } from '#lib/app/i18n.ts';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import Dialog from '#lib/ui/Dialog.svelte';

	const themes: { id: Theme; label: () => string; icon: IconName }[] = [
		{ id: 'system', label: m.settings_theme_system, icon: 'monitor' },
		{ id: 'light', label: m.settings_theme_light, icon: 'sun' },
		{ id: 'dark', label: m.settings_theme_dark, icon: 'moon' }
	];
	const sizes: { id: TextSize; label: () => string }[] = [
		{ id: 'small', label: m.text_size_small },
		{ id: 'normal', label: m.text_size_normal },
		{ id: 'large', label: m.text_size_large },
		{ id: 'xlarge', label: m.text_size_xlarge }
	];
	const languages: { id: AppLocale; label: () => string }[] = [
		{ id: 'en', label: m.settings_language_en },
		{ id: 'fr', label: m.settings_language_fr }
	];

	const symbolNorms: { id: SymbolNorm; label: () => string }[] = [
		{ id: 'iec', label: m.settings_symbols_iec },
		{ id: 'ansi', label: m.settings_symbols_ansi }
	];

	let locale = $state<AppLocale>(getLocale());

	// ───── Data ─────
	let persisted = $state<boolean | null>(null);
	let busy = $state(false);
	let message = $state<{ tone: 'ok' | 'error'; text: string } | null>(null);
	let importText = $state('');
	let check = $state.raw<ImportCheck | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let eraseOpen = $state(false);
	let eraseConfirm = $state('');

	onMount(() => {
		void device.storagePersisted().then((p) => (persisted = p));
	});

	async function requestPersist() {
		persisted = await device.requestPersistence();
	}

	const today = () => new Date().toISOString().slice(0, 10);

	async function exportJSON() {
		busy = true;
		try {
			const file = await learning.call('exportData', {});
			downloadText(`circuitpath-backup-${today()}.json`, JSON.stringify(file, null, 2));
			await learning.call('markExported', {});
		} catch (e) {
			message = { tone: 'error', text: String(e) };
		} finally {
			busy = false;
		}
	}

	async function exportCSV() {
		busy = true;
		try {
			const csv = await learning.call('exportCSV', {});
			downloadText(`circuitpath-history-${today()}.csv`, csv, 'text/csv');
		} finally {
			busy = false;
		}
	}

	async function pickFile(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		message = null;
		check = null;
		if (!file) return;
		importText = await file.text();
		check = await learning.call('inspectImport', { text: importText });
	}

	async function doImport(mode: 'merge' | 'replace') {
		busy = true;
		try {
			const count = await learning.call('importData', { text: importText, mode });
			message = { tone: 'ok', text: m.settings_import_done({ count }) };
			check = null;
			importText = '';
			if (fileInput) fileInput.value = '';
		} catch (e) {
			message = {
				tone: 'error',
				text: m.settings_import_error({ reason: e instanceof Error ? e.message : String(e) })
			};
		} finally {
			busy = false;
		}
	}

	async function erase() {
		if (eraseConfirm !== 'ERASE') return;
		busy = true;
		await learning.call('eraseAll', {});
		location.reload();
	}

	const pack = $derived(learning.pack.manifest);
</script>

<svelte:head><title>{m.settings_title()} · CircuitPath</title></svelte:head>

{#snippet section(id: string, icon: IconName, title: string, body: Snippet)}
	<section class="card p-6 sm:p-7" aria-labelledby="set-{id}">
		<h2 id="set-{id}" class="mb-5 flex items-center gap-2.5 text-lg font-semibold">
			<span class="grid size-8 place-items-center rounded-lg bg-sage text-sage-ink"
				><Icon name={icon} size={17} /></span
			>
			{title}
		</h2>
		{@render body()}
	</section>
{/snippet}

{#snippet segmented<T extends string>(
	name: string,
	label: string,
	options: { id: T; label: () => string; icon?: IconName }[],
	value: T,
	onchange: (v: T) => void
)}
	<fieldset>
		<legend class="mb-2 text-sm font-medium">{label}</legend>
		<div class="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
			{#each options as o (o.id)}
				<label
					class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-[var(--focus)] {value ===
					o.id
						? 'bg-surface font-semibold text-ink shadow-sm'
						: 'text-ink-2 hover:text-ink'}"
				>
					<input
						type="radio"
						class="sr-only"
						{name}
						value={o.id}
						checked={value === o.id}
						onchange={() => onchange(o.id)}
					/>
					{#if o.icon}<Icon name={o.icon} size={15} />{/if}{o.label()}
				</label>
			{/each}
		</div>
	</fieldset>
{/snippet}

<PageHeader title={m.settings_title()} />

<div class="grid max-w-5xl gap-6 lg:grid-cols-2">
	{#snippet appearance()}
		<div class="space-y-6">
			{@render segmented('theme', m.settings_theme(), themes, prefs.theme, (v) =>
				prefs.setTheme(v)
			)}
			{@render segmented('text-size', m.settings_text_size(), sizes, prefs.textSize, (v) =>
				prefs.setTextSize(v)
			)}
			<label class="flex cursor-pointer items-start justify-between gap-4">
				<span>
					<span class="block text-sm font-medium">{m.settings_reduced_motion()}</span>
					<span class="block text-sm text-ink-2">{m.settings_reduced_motion_body()}</span>
				</span>
				<input
					type="checkbox"
					role="switch"
					class="mt-1 size-5 accent-[var(--brand)]"
					checked={prefs.reducedMotion}
					onchange={(e) => prefs.setReducedMotion(e.currentTarget.checked)}
				/>
			</label>
		</div>
	{/snippet}
	{@render section('appearance', 'sun', m.settings_appearance(), appearance)}

	{#snippet language()}
		<div class="space-y-6">
			{@render segmented('language', m.settings_language(), languages, locale, (v) => {
				locale = v;
				setLocale(v);
			})}
			<p class="text-sm text-ink-2">{m.settings_language_body()}</p>
			<div class="space-y-3 border-t border-line pt-5">
				{@render segmented(
					'symbol-norm',
					m.settings_symbols(),
					symbolNorms,
					prefs.symbolNorm,
					(v) => prefs.setSymbolNorm(v)
				)}
				<p class="text-sm text-ink-2">{m.settings_symbols_body()}</p>
				<div class="flex gap-1 text-ink" aria-hidden="true">
					{#each ['resistor', 'switch', 'lamp', 'fuse'] as const as t (t)}
						<SymbolIcon type={t} class="h-9 w-12 rounded-lg bg-surface-2" />
					{/each}
				</div>
			</div>
			<div class="border-t border-line pt-5">
				<p class="text-sm font-medium">{m.settings_units()}</p>
				<p class="mt-1 text-sm text-ink-2">{m.settings_units_body()}</p>
			</div>
		</div>
	{/snippet}
	{@render section('language', 'globe', m.settings_language(), language)}

	<div class="lg:col-span-2">
		{#snippet data()}
			<div class="grid gap-8 lg:grid-cols-2">
				<div class="space-y-5">
					<div>
						<p class="text-sm font-medium">{m.settings_storage()}</p>
						{#if persisted}
							<p class="mt-1 flex items-center gap-1.5 text-sm text-success">
								<Icon name="check-circle" size={16} />{m.settings_storage_persisted()}
							</p>
						{:else}
							<p class="mt-1 text-sm text-ink-2">{m.settings_storage_not_persisted()}</p>
							{#if persisted === false}
								<button type="button" class="btn btn-ghost btn-sm mt-3" onclick={requestPersist}>
									<Icon name="database" size={15} />{m.settings_storage_request()}
								</button>
							{/if}
						{/if}
					</div>
					<p class="flex gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning">
						<Icon name="alert" size={16} class="mt-0.5" />{m.settings_storage_warning()}
					</p>
					<div>
						<p class="mb-3 text-sm text-ink-2">
							{learning.snapshot.lastExportAt
								? m.settings_last_export({ date: fmtDateTime(learning.snapshot.lastExportAt) })
								: m.settings_never_exported()}
						</p>
						<div class="flex flex-wrap gap-2">
							<button type="button" class="btn btn-primary" onclick={exportJSON} disabled={busy}>
								<Icon name="download" size={17} />{m.settings_export_json()}
							</button>
							<button type="button" class="btn btn-ghost" onclick={exportCSV} disabled={busy}>
								<Icon name="download" size={17} />{m.settings_export_csv()}
							</button>
						</div>
					</div>
				</div>

				<div class="space-y-5">
					<div>
						<label for="import-file" class="text-sm font-medium">{m.settings_import()}</label>
						<p class="mb-2 text-sm text-ink-2">{m.settings_import_choose()}</p>
						<input
							id="import-file"
							bind:this={fileInput}
							type="file"
							accept="application/json,.json"
							onchange={pickFile}
							class="block w-full text-sm text-ink-2 file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
						/>
					</div>
					{#if check}
						{#if check.ok}
							{@const p = check.preview}
							<div class="rounded-xl border border-line bg-surface-2 p-4 text-sm">
								<p class="font-medium">
									{m.settings_import_preview({
										total: p.total,
										fresh: p.newEvents,
										dup: p.duplicates
									})}
								</p>
								{#if p.firstAt}
									<p class="mt-1 text-ink-2">
										{m.settings_import_range({ from: fmtDate(p.firstAt), to: fmtDate(p.lastAt) })}
									</p>
								{/if}
								<div class="mt-4 flex flex-wrap gap-2">
									<button
										type="button"
										class="btn btn-primary btn-sm"
										onclick={() => doImport('merge')}
										disabled={busy}
									>
										{m.settings_import_merge()}
									</button>
									<button
										type="button"
										class="btn btn-ghost btn-sm !text-danger"
										onclick={() => doImport('replace')}
										disabled={busy}
									>
										{m.settings_import_replace()}
									</button>
								</div>
							</div>
						{:else}
							<p class="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
								{m.settings_import_error({
									reason: check.detail ? `${check.error} — ${check.detail}` : check.error
								})}
							</p>
						{/if}
					{/if}
					{#if message}
						<p
							class="rounded-xl px-3 py-2.5 text-sm {message.tone === 'ok'
								? 'bg-success-soft text-success'
								: 'bg-danger-soft text-danger'}"
							role="status"
						>
							{message.text}
						</p>
					{/if}
					<div class="border-t border-line pt-5">
						<button
							type="button"
							class="btn btn-ghost !border-danger/40 !text-danger"
							onclick={() => (eraseOpen = true)}
						>
							<Icon name="trash" size={17} />{m.settings_erase()}
						</button>
					</div>
				</div>
			</div>
		{/snippet}
		{@render section('data', 'database', m.settings_data(), data)}
	</div>

	<div class="lg:col-span-2">
		{#snippet about()}
			<div class="space-y-3 text-sm">
				<p class="font-mono text-xs text-ink-2">
					{m.settings_pack({ id: pack.packId, version: pack.packVersion, rules: RULES_VERSION })}
				</p>
				<p class="flex items-center gap-2 text-ink-2">
					<Icon name={device.online ? 'wifi' : 'wifi-off'} size={16} />{m.settings_offline()}
				</p>
				{#if device.installed}
					<p class="flex items-center gap-2 text-success">
						<Icon name="check-circle" size={16} />{m.install_done()}
					</p>
				{:else if device.installable}
					<button type="button" class="btn btn-accent" onclick={() => device.install()}>
						<Icon name="download" size={17} />{m.settings_install()}
					</button>
				{/if}
			</div>
		{/snippet}
		{@render section('about', 'info', m.settings_about(), about)}
	</div>
</div>

<Dialog bind:open={eraseOpen} title={m.settings_erase()}>
	<p class="mb-4">{m.settings_erase_confirm()}</p>
	<label>
		<span class="mb-1 block text-xs font-medium">{m.settings_erase_label()}</span>
		<input
			class="input font-mono"
			bind:value={eraseConfirm}
			autocomplete="off"
			placeholder="ERASE"
		/>
	</label>
	{#snippet actions()}
		<button type="button" class="btn btn-ghost" onclick={() => (eraseOpen = false)}
			>{m.cancel()}</button
		>
		<button
			type="button"
			class="btn btn-danger"
			disabled={eraseConfirm !== 'ERASE' || busy}
			onclick={erase}
		>
			<Icon name="trash" size={16} />{m.settings_erase()}
		</button>
	{/snippet}
</Dialog>
