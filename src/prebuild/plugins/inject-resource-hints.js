import { parseHTML } from "linkedom";

export default {
	name: "inject-resource-hints",
	description:
		"Inject preload, prefetch, and preconnect hints for No.JS fetch directives and route templates",

	async process(html, { _filePath, config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const existingHrefs = new Set(
			[
				...head.querySelectorAll(
					'link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]',
				),
			].map((el) => el.getAttribute("href")),
		);

		const fetchEls = doc.querySelectorAll("[get]");
		for (const el of fetchEls) {
			const url = el.getAttribute("get");
			if (!url || isInterpolated(url) || existingHrefs.has(url)) continue;

			appendLink(doc, head, "preload", url, "fetch");
			existingHrefs.add(url);

			if (isCrossOrigin(url)) {
				const origin = new URL(url).origin;
				if (!existingHrefs.has(origin)) {
					appendLink(doc, head, "preconnect", origin);
					existingHrefs.add(origin);
				}
			}
		}

		const routeTemplates = doc.querySelectorAll("template[route][src]");
		for (const tpl of routeTemplates) {
			const src = tpl.getAttribute("src");
			if (!src || isInterpolated(src) || existingHrefs.has(src)) continue;

			appendLink(doc, head, "prefetch", src, "fetch");
			existingHrefs.add(src);
		}

		// B4 — Base API DNS prefetch
		if (config.apiBase) {
			try {
				const origin = new URL(config.apiBase).origin;
				const existingDnsPrefetch = new Set(
					[...head.querySelectorAll('link[rel="dns-prefetch"]')].map((el) =>
						el.getAttribute("href"),
					),
				);
				if (!existingDnsPrefetch.has(origin)) {
					const link = doc.createElement("link");
					link.setAttribute("rel", "dns-prefetch");
					link.setAttribute("href", origin);
					head.appendChild(link);
				}
			} catch {
				// invalid URL, skip
			}
		}

		return doc.toString();
	},
};

function isInterpolated(url) {
	return /\{[^}]+\}/.test(url);
}

function isCrossOrigin(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

function appendLink(doc, head, rel, href, as) {
	const link = doc.createElement("link");
	link.setAttribute("rel", rel);
	link.setAttribute("href", href);
	if (as) link.setAttribute("as", as);
	if (rel === "preconnect" || as === "fetch") link.setAttribute("crossorigin", "anonymous");
	head.appendChild(link);
}
