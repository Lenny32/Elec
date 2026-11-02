# CircuitPath learning module

This folder contains the learning engine, application workflows, course definitions, and persistence interfaces. It has no dependency on the Svelte application in the root `src/` folder.

From the repository root:

```sh
pnpm check:module
pnpm build:module
pnpm test:module
```

Or copy this folder into another project and use its own package:

```sh
pnpm install
pnpm check
pnpm build
pnpm test
```

Import `dist/index.js` after building. Supply a `CourseSource` and a repository to `createLearningAPI`; neither a concrete course nor browser storage is initialized by importing the module. The optional IndexedDB adapter is exported as `@circuitpath/learning/browser-storage`.

The `src/` inside this folder belongs to the module. The root application's `src/` can be physically deleted without affecting these checks, build, or headless tests.

The included course assets are separate from the engine; the browser application's composition root selects their Vite loader. Other consumers can provide assembled course JSON directly. A transport adapter could be added in a future application; this module does not run a server.
