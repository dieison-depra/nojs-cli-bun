import { createHash } from "node:crypto";
import { parseHTML } from "linkedom";

export default {
	name: "inject-sri-hashes",
	description:
		"Add integrity (SHA-384) and crossorigin to external scripts and stylesheets.",

	async process(html, { config }) {
		const opts = config || {};
		const timeout = opts.timeout ?? 5000;
		const skipHosts = new Set(opts.skip || []);

		const { document: doc } = parseHTML(html);
		let changed = false;

		const targets = [
			...doc.querySelectorAll("script[src]"),
			...doc.querySelectorAll('link[rel="stylesheet"][href]'),
		];

		for (const el of targets) {
			const url = el.getAttribute("src") || el.getAttribute("href") || "";
			if (!url.startsWith("https://")) continue;
			if (isInterpolated(url)) continue;
			if (el.hasAttribute("integrity")) continue;

			try {
				const host = new URL(url).hostname;
				if (skipHosts.has(host)) continue;
			} catch {
				continue;
			}

			const hash = await fetchAndHash(url, timeout);
			if (!hash) continue;

			el.setAttribute("integrity", `sha384-${hash}`);
			if (!el.hasAttribute("crossorigin")) {
				el.setAttribute("crossorigin", "anonymous");
			}
			changed = true;
		}

		return changed ? doc.toString() : html;
	},
};

function isInterpolated(url) {
	return /\{[^}]+\}/.test(url);
}

async function fetchAndHash(url, timeout) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return createHash("sha384").update(Buffer.from(buf)).digest("base64");
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
