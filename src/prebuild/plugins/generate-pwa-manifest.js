import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";

export default {
	name: "generate-pwa-manifest",
	description: "Generate manifest.webmanifest and inject manifest link tag.",

	async process(html, { _config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		// Idempotence: skip if manifest link already present
		if (head.querySelector('link[rel="manifest"]')) return html;

		const link = doc.createElement("link");
		link.setAttribute("rel", "manifest");
		link.setAttribute("href", "/manifest.webmanifest");
		head.appendChild(link);

		return doc.toString();
	},

	async finalize({ outputDir, config }) {
		const opts = config || {};
		const manifest = {
			name: opts.name || "App",
			short_name: opts.shortName || opts.name || "App",
			description: opts.description || "",
			theme_color: opts.themeColor || "#ffffff",
			background_color: opts.backgroundColor || "#ffffff",
			display: opts.display || "standalone",
			start_url: opts.startUrl || "/",
			icons: opts.icons || [],
		};

		const dest = join(outputDir, "manifest.webmanifest");
		await writeFile(dest, JSON.stringify(manifest, null, 2), "utf-8");
	},
};
