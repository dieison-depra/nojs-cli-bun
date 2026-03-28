import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";

export default {
	name: "generate-sitemap",
	description:
		"Generate sitemap.xml from No.JS route definitions and canonical URLs",

	async process(html, { _filePath, _config }) {
		if (!this._routes) this._routes = new Set();

		const { document: doc } = parseHTML(html);

		const templates = doc.querySelectorAll("template[route]");
		for (const tpl of templates) {
			// 4.3 — skip guarded routes
			if (tpl.hasAttribute("guard")) continue;
			const route = tpl.getAttribute("route");
			if (!route) continue;
			if (!isIndexable(route)) continue;
			this._routes.add(route);
		}

		const canonical = doc.querySelector('link[rel="canonical"]');
		if (canonical) {
			const href = canonical.getAttribute("href");
			if (href) this._routes.add(href);
		}

		return html;
	},

	async finalize({ outputDir, config }) {
		if (!config.baseUrl) {
			console.warn("[generate-sitemap] Skipped: baseUrl is required in config");
			return;
		}

		const routes = this._routes || new Set();
		if (routes.size === 0) return;

		const excludePatterns = config.excludePatterns || [];
		const changefreq = config.changefreq || "weekly";
		const priority = config.priority ?? 0.8;
		const baseUrl = config.baseUrl.replace(/\/$/, "");

		// 4.5 — sort routes before building URLs
		const sortedRoutes = [...routes].sort();

		const urls = sortedRoutes
			.filter((r) => !excludePatterns.some((p) => r.includes(p)))
			.map((route) => {
				const loc = route.startsWith("http") ? route : `${baseUrl}${route}`;
				return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
			});

		const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

		const dest = join(outputDir, "sitemap.xml");
		await writeFile(dest, xml, "utf-8");
		console.log(`[generate-sitemap] Written ${routes.size} URL(s) to ${dest}`);

		// 4.4 — robots.txt generation
		const sitemapUrl = `${baseUrl}/sitemap.xml`;
		const robotsPath = join(outputDir, "robots.txt");
		if (existsSync(robotsPath)) {
			const existing = readFileSync(robotsPath, "utf-8");
			if (!existing.includes(`Sitemap: ${sitemapUrl}`)) {
				writeFileSync(
					robotsPath,
					`${existing.trimEnd()}\nSitemap: ${sitemapUrl}\n`,
					"utf-8",
				);
			}
		} else {
			writeFileSync(
				robotsPath,
				`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`,
				"utf-8",
			);
		}

		this._routes = null;
	},
};

function isIndexable(route) {
	if (route === "*") return false;
	// 4.1 — exclude {param} routes
	if (/\{[^}]+\}/.test(route)) return false;
	// 4.2 — exclude wildcard partials
	if (route.includes("*")) return false;
	// existing colon-param exclusion
	if (route.includes(":")) return false;
	return true;
}

function escapeXml(str) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
