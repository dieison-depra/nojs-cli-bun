/**
 * Plugin registry — searches CDN registry and npm for No.JS plugins.
 */

const CDN_REGISTRY_URL = "https://cdn.no-js.dev/plugins/registry.json";
const NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search";

/**
 * Search for plugins across CDN registry and npm.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array<{ name: string, description: string, source: 'cdn'|'npm' }>>}
 */
export async function searchRegistry(query) {
	const results = [];

	// Search CDN registry
	const cdnResults = await searchCdn(query);
	results.push(...cdnResults);

	// Search npm
	const npmResults = await searchNpm(query);
	results.push(...npmResults);

	return results;
}

async function searchCdn(query) {
	try {
		const res = await fetch(CDN_REGISTRY_URL);
		if (!res.ok) return [];

		const registry = await res.json();
		const q = query.toLowerCase();

		return (registry.plugins || [])
			.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.description?.toLowerCase().includes(q),
			)
			.map((p) => ({ ...p, source: "cdn" }));
	} catch {
		return [];
	}
}

async function searchNpm(query) {
	try {
		const url = `${NPM_SEARCH_URL}?text=nojs-plugin+${encodeURIComponent(query)}&size=10`;
		const res = await fetch(url);
		if (!res.ok) return [];

		const data = await res.json();
		return (data.objects || []).map((obj) => ({
			name: obj.package.name,
			description: obj.package.description,
			version: obj.package.version,
			source: "npm",
		}));
	} catch {
		return [];
	}
}
