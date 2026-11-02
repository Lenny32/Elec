<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<!-- Decorative illustration (hidden from assistive tech). -->
<svg viewBox="0 0 360 270" class="h-auto w-full" aria-hidden="true">
	<text x="180" y="16" text-anchor="middle" class="cap">{m.today_hero_art_top()}</text>
	<text x="180" y="52" text-anchor="middle" class="val">R = 100 Ω</text>

	<!-- loop -->
	<path
		d="M70 110 V78 Q70 70 78 70 H128 M200 70 H252 Q260 70 260 78 V108 M260 158 V200 Q260 208 252 208 H78 Q70 208 70 200 V166"
		class="wire"
	/>
	<!-- resistor -->
	<path d="M128 70 L136 58 L148 82 L160 58 L172 82 L184 58 L192 70 H200" class="wire" />
	<!-- battery -->
	<path d="M50 120 H90 M58 134 H82 M50 148 H90 M58 162 H82" class="wire" />
	<path d="M70 110 V120 M70 162 V166" class="wire" />
	<text x="34" y="146" text-anchor="end" class="val small">9 V</text>
	<!-- lamp -->
	<circle cx="260" cy="133" r="25" class="wire" />
	<path d="M243 116 L277 150 M277 116 L243 150" class="wire" />
	<path d="M232 94 l-7 -10 M260 92 v-12 M288 94 l7 -10" class="wire ray" />
	<!-- nodes -->
	<circle cx="98" cy="70" r="4" class="fill" />
	<circle cx="208" cy="208" r="4" class="fill" />
	<!-- formula -->
	<text x="165" y="146" text-anchor="middle" class="formula">V = IR</text>
	<text x="165" y="170" text-anchor="middle" class="cap">{m.today_hero_art_mid()}</text>
	<text x="180" y="258" text-anchor="middle" class="cap">● {m.today_hero_art_bottom()}</text>
</svg>

<style>
	.wire {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.ray {
		stroke-width: 2;
		animation: pulse 2.4s ease-in-out infinite;
	}
	.fill {
		fill: var(--accent);
	}
	.cap {
		fill: var(--brand-ink-2);
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.val {
		fill: var(--accent);
		font-family: var(--font-mono);
		font-size: 12px;
	}
	.formula {
		fill: var(--accent);
		font-family: 'Times New Roman', Georgia, serif;
		font-style: italic;
		font-size: 26px;
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
</style>
