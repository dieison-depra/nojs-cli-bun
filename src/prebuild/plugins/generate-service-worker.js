import { writeFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "generate-service-worker",
	description: "Generate a Service Worker for precaching assets and offline support",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const body = doc.body;
		if (!body) return html;

		// Check if already injected
		if (doc.querySelector('script[data-nojs="sw-register"]')) return html;

		const script = doc.createElement("script");
		script.setAttribute("data-nojs", "sw-register");
		script.textContent = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('SW registration failed: ', err);
    });
  });
}
`.trim();

		body.appendChild(script);
		return doc.toString();
	},

	async finalize({ outputDir, config }) {
		const allFiles = await getFilesRecursively(outputDir);
		const swName = config.swName || "sw.js";
		const cacheName = config.cacheName || `nojs-cache-${Date.now()}`;

		const assetsToCache = allFiles
			.map((f) => "/" + relative(outputDir, f).replace(/\\/g, "/"))
			.filter((f) => {
				const skip = [swName, "_headers", "_redirects", "nojs-bundle-report.html"];
				return !skip.some((s) => f.endsWith(s));
			});

		// Add root
		if (!assetsToCache.includes("/")) assetsToCache.push("/");

		const swContent = `
const CACHE_NAME = '${cacheName}';
const ASSETS = ${JSON.stringify(assetsToCache, null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
`.trim();

		const dest = join(outputDir, swName);
		await writeFile(dest, swContent, "utf-8");
		console.log(`[generate-service-worker] ${dest}: Service Worker generated with ${assetsToCache.length} assets`);
	},
};

async function getFilesRecursively(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((res) => {
			const resPath = join(dir, res.name);
			return res.isDirectory() ? getFilesRecursively(resPath) : resPath;
		}),
	);
	return files.flat();
}
