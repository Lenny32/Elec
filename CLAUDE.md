# CircuitPath

Normative spec: `SPEC.md`. Visual direction: `UI-PROTOTYPE.html`. Agreed departures: `docs/decisions/`.
Stack: Svelte 5 + SvelteKit (TypeScript strict, adapter-static SPA), Tailwind CSS 4.3, pnpm. Hosted on GitHub Pages via GitHub Actions (base path from `BASE_PATH`).

## Svelte MCP

You have access to the Svelte MCP server (`svelte`). Use it:

1. **list-sections** — call first for any Svelte/SvelteKit question to discover relevant docs sections.
2. **get-documentation** — fetch ALL sections relevant to the task after listing.
3. **svelte-autofixer** — MUST run on any Svelte code you write; repeat until it reports no issues or suggestions.
4. **playground-link** — only if the user asks, and never for code written to project files.
