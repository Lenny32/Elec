import { defineConfig } from 'vitest/config';

/** Independent runner: no SvelteKit, UI plugins, routes, or root application config. */
export default defineConfig({
	root: import.meta.dirname,
	test: {
		environment: 'node',
		expect: { requireAssertions: true },
		include: ['src/**/*.spec.ts']
	}
});
