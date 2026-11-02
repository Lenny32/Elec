<script lang="ts" module>
	import type { ContextKind, Grade } from '#learning';
	export interface ExerciseContext {
		kind: ContextKind;
		refId: string;
		sessionId: string;
		reviewConceptId?: string;
	}
	export interface AnswerEvent {
		grade: Grade;
		/** First submission of this presentation. */
		firstTry: boolean;
		/** First try without hints: counts as evidence. */
		independent: boolean;
	}
</script>

<script lang="ts">
	import type { Exercise, Response } from '#learning';
	import { unitSymbol, type UnitId } from '#learning/domain/units.ts';
	import { toleranceDescription } from '#learning/engine/scoring.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { learning, newId } from '#lib/app/learning.svelte.ts';
	import { tx, fmtNumber } from '#lib/app/i18n.ts';
	import Rich from './Rich.svelte';
	import Icon from './Icon.svelte';
	import Badge from './Badge.svelte';
	import DiagramView from '#lib/diagrams/Diagram.svelte';

	let {
		exercise,
		context,
		mode = 'learn',
		saved,
		onanswered
	}: {
		exercise: Exercise;
		context: ExerciseContext;
		/** learn: feedback, retries, hints. exam: one final answer, no feedback, no hints. */
		mode?: 'learn' | 'exam';
		/** Exam: an already-saved response (read-only). */
		saved?: Response;
		onanswered?: (e: AnswerEvent) => void;
	} = $props();

	const uid = $props.id();
	const presentationId = newId();

	const isNumeric = $derived(exercise.type === 'numeric' || exercise.type === 'unit_conversion');
	const isChoice = $derived(
		exercise.type === 'multiple_choice' ||
			exercise.type === 'diagnose' ||
			exercise.type === 'prediction'
	);

	// ───── input state (initialised once per presentation) ─────
	function initialUnit(): UnitId | '' {
		if (saved?.type === 'numeric') return saved.unit;
		return 'answer' in exercise ? exercise.answer.acceptedUnits[0] : '';
	}
	function initialOrder(): string[] {
		if (saved?.type === 'ordering') return [...saved.order];
		return exercise.type === 'ordering' ? [...exercise.displayOrder] : [];
	}
	const initialRaw = () => (saved?.type === 'numeric' ? saved.raw : '');
	const initialOption = () => (saved?.type === 'choice' ? saved.optionId : '');
	// Inputs start from the saved answer once per presentation (parents key this component).
	let raw = $state(initialRaw());
	let unit = $state<UnitId | ''>(initialUnit());
	let optionId = $state(initialOption());
	let order = $state<string[]>(initialOrder());

	let submissionIndex = $state(0);
	let hintsShown = $state(0);
	let grade = $state<Grade | null>(null);
	let everCorrect = $state(false);
	let solutionShown = $state(false);
	let busy = $state(false);
	let error = $state('');
	let savedNow = $state(false);

	const examLocked = $derived(mode === 'exam' && (!!saved || savedNow));
	const locked = $derived(examLocked || (mode === 'learn' && grade !== null));
	const canSubmit = $derived(
		!busy &&
			!locked &&
			(isNumeric ? raw.trim() !== '' && unit !== '' : isChoice ? optionId !== '' : true)
	);

	const diagram = $derived(
		exercise.diagramId ? learning.ix.diagrams.get(exercise.diagramId) : undefined
	);
	const tolerance = $derived('answer' in exercise ? toleranceDescription(exercise.answer) : null);

	function response(): Response {
		if (isNumeric) return { type: 'numeric', raw, unit: unit as UnitId };
		if (isChoice) return { type: 'choice', optionId };
		return { type: 'ordering', order: [...order] };
	}

	async function submit(e?: SubmitEvent) {
		e?.preventDefault();
		if (!canSubmit) return;
		busy = true;
		error = '';
		try {
			const g = await learning.call('submit', {
				exerciseId: exercise.id,
				response: response(),
				context: {
					kind: context.kind,
					refId: context.refId,
					sessionId: context.sessionId,
					presentationId,
					submissionIndex,
					hintsUsed: mode === 'exam' ? 0 : hintsShown,
					...(context.reviewConceptId ? { reviewConceptId: context.reviewConceptId } : {})
				}
			});
			const firstTry = submissionIndex === 0;
			const independent = firstTry && hintsShown === 0;
			submissionIndex += 1;
			if (mode === 'exam') savedNow = true;
			else {
				grade = g;
				if (g.correct) everCorrect = true;
			}
			onanswered?.({ grade: g, firstTry, independent });
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}

	function retry() {
		grade = null;
	}

	async function showHint() {
		const index = hintsShown;
		hintsShown += 1;
		try {
			await learning.call('useHint', {
				exerciseId: exercise.id,
				presentationId,
				hintIndex: index,
				sessionId: context.sessionId
			});
		} catch {
			/* hint display does not depend on logging */
		}
	}

	async function showSolution() {
		solutionShown = true;
		try {
			await learning.call('revealSolution', {
				exerciseId: exercise.id,
				presentationId,
				sessionId: context.sessionId
			});
		} catch {
			/* best effort */
		}
	}

	function move(i: number, delta: number) {
		const j = i + delta;
		if (j < 0 || j >= order.length) return;
		const next = [...order];
		[next[i], next[j]] = [next[j], next[i]];
		order = next;
	}

	const feedbackText: Record<Grade['feedback'], () => string> = {
		correct: m.correct,
		incorrect: m.incorrect,
		unparseable: m.feedback_unparseable,
		wrong_unit_dimension: m.feedback_wrong_dimension,
		unit_not_accepted: m.feedback_unit_not_accepted,
		right_value_wrong_unit: m.feedback_right_value_wrong_unit
	};

	const independentNow = $derived(submissionIndex === 0 && hintsShown === 0);
	const choiceOptions = $derived(
		exercise.type === 'multiple_choice' ||
			exercise.type === 'diagnose' ||
			exercise.type === 'prediction'
			? exercise.options
			: []
	);
	const correctOptionId = $derived('correctOptionId' in exercise ? exercise.correctOptionId : '');
	const orderingItems = $derived(
		exercise.type === 'ordering' ? new Map(exercise.items.map((i) => [i.id, i])) : new Map()
	);
	const typeLabels: Record<Exercise['type'], () => string> = {
		numeric: m.ex_type_numeric,
		unit_conversion: m.ex_type_unit_conversion,
		multiple_choice: m.ex_type_multiple_choice,
		diagnose: m.ex_type_diagnose,
		prediction: m.ex_type_prediction,
		ordering: m.ex_type_ordering
	};
	const typeLabel = $derived(typeLabels[exercise.type]());
</script>

<form class="space-y-5" onsubmit={submit} aria-labelledby="{uid}-prompt">
	<div class="flex flex-wrap items-center gap-2">
		<span class="eyebrow">{typeLabel}</span>
		<span class="text-ink-3" aria-hidden="true">·</span>
		<span class="flex gap-0.5" aria-label={m.ex_difficulty({ n: exercise.difficulty })}>
			{#each [1, 2, 3] as d (d)}
				<span
					class="size-1.5 rounded-full {d <= exercise.difficulty ? 'bg-ink-2' : 'bg-line-strong'}"
				></span>
			{/each}
		</span>
		{#if mode === 'learn'}
			<span class="ml-auto">
				{#if independentNow}
					<Badge tone="success"><Icon name="check" size={12} />{m.independent_badge()}</Badge>
				{:else}
					<Badge tone="neutral">{m.not_independent_badge()}</Badge>
				{/if}
			</span>
		{/if}
	</div>

	<div id="{uid}-prompt" class="text-[1.0625rem] leading-relaxed">
		<Rich text={exercise.prompt} />
	</div>

	{#if diagram}
		<div class="rounded-xl border border-line bg-surface-2/50 p-3">
			<DiagramView {diagram} />
		</div>
	{/if}

	{#if exercise.assumptions}
		<p class="flex gap-2 rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
			<Icon name="info" size={16} class="mt-0.5" />
			<span
				><strong class="font-semibold">{m.assumptions()}:</strong>
				<Rich inline text={exercise.assumptions} /></span
			>
		</p>
	{/if}

	<!-- ───── Inputs ───── -->
	{#if isNumeric && 'answer' in exercise}
		<div class="flex flex-wrap items-end gap-3">
			<label class="min-w-40 flex-1">
				<span class="mb-1 block text-sm font-medium text-ink-2">{m.answer_value()}</span>
				<input
					class="input font-mono tabular-nums"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					spellcheck="false"
					bind:value={raw}
					disabled={locked}
					placeholder="0"
				/>
			</label>
			<label class="w-32">
				<span class="mb-1 block text-sm font-medium text-ink-2">{m.answer_unit()}</span>
				<select class="input" bind:value={unit} disabled={locked}>
					{#each exercise.answer.acceptedUnits as u (u)}
						<option value={u}>{unitSymbol(u) || '—'}</option>
					{/each}
				</select>
			</label>
		</div>
		{#if tolerance && mode === 'learn'}
			<p class="text-xs text-ink-3">
				{m.tolerance({
					rel: fmtNumber(tolerance.relativePercent),
					abs: fmtNumber(tolerance.absolute),
					unit: unitSymbol(tolerance.unit)
				})}
			</p>
		{/if}
	{:else if isChoice}
		<fieldset class="space-y-2">
			<legend class="sr-only">{m.answer_value()}</legend>
			{#each choiceOptions as o (o.id)}
				{@const selected = optionId === o.id}
				{@const reveal = mode === 'learn' && grade !== null}
				{@const good = reveal && grade?.correct && o.id === correctOptionId}
				{@const bad = reveal && selected && !grade?.correct}
				<label
					class="flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors
					{good
						? 'border-success bg-success-soft'
						: bad
							? 'border-danger bg-danger-soft'
							: selected
								? 'border-brand bg-sage'
								: 'border-line bg-surface hover:border-line-strong'}
					{locked ? 'cursor-default' : ''}"
				>
					<input
						type="radio"
						name="{uid}-choice"
						value={o.id}
						bind:group={optionId}
						disabled={locked}
						class="mt-1 accent-[var(--brand)]"
					/>
					<span class="min-w-0 flex-1">
						<Rich text={o.text} />
						{#if reveal && selected}
							<span class="mt-2 block text-sm text-ink-2"><Rich inline text={o.rationale} /></span>
						{/if}
					</span>
				</label>
			{/each}
		</fieldset>
	{:else if exercise.type === 'ordering'}
		<p class="text-sm text-ink-2">{m.ordering_hint()}</p>
		<ol class="space-y-2">
			{#each order as id, i (id)}
				<li class="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
					<span
						class="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-xs text-ink-2"
						>{i + 1}</span
					>
					<span class="min-w-0 flex-1"><Rich inline text={orderingItems.get(id)?.text} /></span>
					<span class="flex gap-1">
						<button
							type="button"
							class="btn btn-ghost btn-sm !min-h-8 !px-2"
							onclick={() => move(i, -1)}
							disabled={locked || i === 0}
							aria-label="{m.move_up()}: {tx(orderingItems.get(id)?.text)}"
						>
							<Icon name="arrow-up" size={16} />
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-sm !min-h-8 !px-2"
							onclick={() => move(i, 1)}
							disabled={locked || i === order.length - 1}
							aria-label="{m.move_down()}: {tx(orderingItems.get(id)?.text)}"
						>
							<Icon name="arrow-down" size={16} />
						</button>
					</span>
				</li>
			{/each}
		</ol>
	{/if}

	<!-- ───── Feedback ───── -->
	<div aria-live="polite">
		{#if mode === 'learn' && grade}
			<div
				class="flex items-start gap-3 rounded-xl px-4 py-3 {grade.correct
					? 'bg-success-soft text-success'
					: 'bg-danger-soft text-danger'}"
			>
				<Icon name={grade.correct ? 'check-circle' : 'x-circle'} size={22} />
				<div>
					<p class="font-semibold">{grade.correct ? m.correct() : m.incorrect()}</p>
					{#if !grade.correct && grade.feedback !== 'incorrect'}
						<p class="text-sm">{feedbackText[grade.feedback]()}</p>
					{/if}
				</div>
			</div>
		{/if}
		{#if mode === 'exam' && examLocked}
			<p class="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
				<Icon name="save" size={16} />{m.exam_your_answer()} ✓
			</p>
		{/if}
		{#if error}
			<p class="mt-2 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>
		{/if}
	</div>

	<!-- ───── Hints & solution ───── -->
	{#if mode === 'learn' && hintsShown > 0}
		<div class="space-y-2">
			{#each exercise.hints.slice(0, hintsShown) as hint, i (i)}
				<div
					class="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm"
				>
					<Icon name="bulb" size={18} class="text-warning" />
					<div>
						<p class="mb-1 font-semibold text-warning">{m.hint_n({ n: i + 1 })}</p>
						<Rich text={hint} />
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{#if mode === 'learn' && solutionShown}
		<div class="rounded-xl border border-line bg-surface-2 px-4 py-3">
			<p class="eyebrow mb-2">{m.show_solution()}</p>
			<ol class="space-y-2">
				{#each exercise.solution as step, i (i)}
					<li class="flex gap-3 text-sm">
						<span class="font-mono text-xs text-ink-3">{i + 1}.</span>
						<Rich text={step} class="min-w-0 flex-1" />
					</li>
				{/each}
			</ol>
		</div>
	{/if}

	<!-- ───── Actions ───── -->
	<div class="flex flex-wrap items-center gap-2">
		{#if mode === 'exam'}
			{#if !examLocked}
				<button type="submit" class="btn btn-primary" disabled={!canSubmit}>
					<Icon name="save" size={16} />{m.exam_submit_answer()}
				</button>
			{/if}
		{:else if grade === null}
			<button type="submit" class="btn btn-primary" disabled={!canSubmit}>
				{m.check_answer()}
			</button>
		{:else if !grade.correct}
			<button type="button" class="btn btn-primary" onclick={retry}>
				<Icon name="reset" size={16} />{m.try_again()}
			</button>
		{/if}

		{#if mode === 'learn'}
			{#if hintsShown < exercise.hints.length && !everCorrect}
				<button type="button" class="btn btn-ghost" onclick={showHint}>
					<Icon name="bulb" size={16} />{m.show_hint()}
					{#if exercise.hints.length > 1}
						<span class="text-xs text-ink-3">{hintsShown + 1}/{exercise.hints.length}</span>
					{/if}
				</button>
			{/if}
			{#if !solutionShown && submissionIndex > 0}
				<button type="button" class="btn btn-ghost" onclick={showSolution}>
					<Icon name="eye" size={16} />{m.show_solution()}
				</button>
			{/if}
		{/if}
	</div>
	{#if mode === 'learn' && hintsShown === 0 && exercise.hints.length > 0 && !everCorrect}
		<p class="text-xs text-ink-3">{m.hint_note()}</p>
	{/if}
</form>
