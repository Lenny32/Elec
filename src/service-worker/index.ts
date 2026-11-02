/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/**
 * Offline cache: precaches the app shell, every built chunk (course content is bundled into
 * them) and the static files. Navigations fall back to the SPA shell so deep links work offline.
 */
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets } from '$app/manifest';
import { asset, resolve } from '$app/paths';

const CACHE = `circuitpath-${version}`;
// adapter-static writes the SPA shell as 404.html (the `fallback`); it boots any route.
const BASE = resolve('/').replace(/\/$/, '');
const SHELL = `${BASE}/404.html`;

const ASSETS = [
	...immutable.map((a) => `${BASE}/${a.path}`),
	// Dotfiles such as .nojekyll are not served by every host.
	...assets.filter((a) => !/(^|\/)\./.test(a.path)).map((a) => asset(a.path))
];
const ASSET_SET = new Set([...ASSETS, SHELL]);

/** The fallback page may be served with a 404 status; store it as a normal 200 document. */
async function cacheShell(cache: Cache) {
	const res = await fetch(SHELL, { cache: 'reload' });
	const body = await res.blob();
	if (!body.size) throw new Error('Empty app shell');
	await cache.put(
		SHELL,
		new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
	);
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await Promise.all([cache.addAll(ASSETS), cacheShell(cache)]);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (ASSET_SET.has(url.pathname)) {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
			}
			try {
				const response = await fetch(request);
				if (response.ok && request.mode !== 'navigate') void cache.put(request, response.clone());
				return response;
			} catch (error) {
				const hit = await cache.match(request);
				if (hit) return hit;
				if (request.mode === 'navigate') {
					const shell = await cache.match(SHELL);
					if (shell) return shell;
				}
				throw error;
			}
		})()
	);
});
