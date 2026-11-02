# CircuitPath

Learn electronics from first principles. Offline-first, installable PWA, with exact formulas, deterministic grading,
interactive circuit diagrams, exams with required consolidation, and a local, exportable learning history.

- Spec: [`SPEC.md`](SPEC.md) · Decisions: [`docs/decisions/`](docs/decisions/) · Plan: [`docs/PLAN.md`](docs/PLAN.md)
- Content authoring: [`docs/content-authoring.md`](docs/content-authoring.md)

Stack: Svelte 5 + SvelteKit 3 (SPA, `adapter-static`), TypeScript strict, Tailwind CSS 4.3, Dexie (IndexedDB),
Zod, KaTeX, Paraglide (EN/FR), Vitest, Playwright. Package manager: pnpm.

The learning engine, course providers, persistence, and UI communicate through a typed learning API.
The reusable code lives in `modules/learning`, outside the Svelte app. The app calls it in process.
See [Module boundary and independent usage](docs/decisions/0003-learning-api-boundaries.md).

## Setup

```sh
corepack enable pnpm   # once
pnpm install
pnpm exec playwright install chromium   # for browser/e2e tests
pnpm dev
```

## Scripts

| Command                                 | What it does                                            |
| --------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                              | Dev server (no service worker in dev)                   |
| `pnpm check`                            | Type-check Svelte + TS                                  |
| `pnpm lint` / `pnpm format`             | Prettier + ESLint                                       |
| `pnpm test:unit --run --project server` | Engine, data layer and **content pack validation**      |
| `pnpm test:e2e`                         | Builds, previews and runs Playwright (mobile + desktop) |
| `pnpm build` / `pnpm preview`           | Production build to `build/` and local preview          |

The module builds and tests independently: `pnpm check:module`, `pnpm build:module`, and `pnpm test:module`.

Validate one chapter while authoring: `CONTENT_FILTER=ch01 pnpm exec vitest run --project server modules/learning/src/content`.

## Layout

```text
modules/learning/                  standalone learning module (own package, build, and tests)
modules/learning/src/api/          public in-process interface and validation
modules/learning/src/application/ workflows, snapshots, backups, persistence ports
modules/learning/src/domain/      shared contracts, schemas, units, formulas, lab models
modules/learning/src/engine/      deterministic grading, mastery, selection, scheduling
modules/learning/src/content/     concrete course assets
modules/learning/src/data/        IndexedDB persistence adapter
src/lib/app/                      reactive UI adapter and application wiring
src/lib/diagrams/                 SVG rendering
src/lib/lab/                      lab presentation
src/lib/ui/                       presentation components
src/routes/                       application screens
src/service-worker/               offline cache
tests/e2e/                       Playwright user flows
```

## Offline testing

1. `pnpm build && pnpm preview`, open the app once (the service worker installs and precaches everything).
2. DevTools → Network → _Offline_, then reload and navigate: every route, lessons, labs, exams and export work.
   The e2e test `works offline after first visit` automates this.

## Deployment (GitHub Pages)

Push to `main` → `.github/workflows/deploy.yml` type-checks, runs unit tests + content validation, builds with
`BASE_PATH=/<repo>` and deploys. One-time: _Settings → Pages → Source: GitHub Actions_.

## Data, export and migration

- All progress is an append-only event journal in IndexedDB (`circuitpath_v1`); projections are rebuilt from it
  whenever the snapshot is missing, stale, or from another rules version.
- _Settings → Your data_: export a JSON backup (checksummed), import with preview (merge or replace, duplicates
  ignored by event id), download a CSV history, request persistent storage, erase everything.
- Nothing leaves the device. Clearing site data or private browsing can erase progress: export backups.
