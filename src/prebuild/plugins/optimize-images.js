import { parseHTML } from "linkedom";

const LCP_CLASS_RE = /\bhero\b|\bfeatured\b|\bbanner\b|\blcp\b/i;

export default {
	name: "optimize-images",
	description:
		"Add lazy loading, LCP preload, and fetchpriority hints to images",

	async process(html, { filePath, config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const images = [...doc.querySelectorAll("img")];
		if (images.length === 0) return html;

		// 3.7 — alt warning for ALL images (including inside templates)
		for (const img of images) {
			if (!img.hasAttribute("alt")) {
				const src =
					img.getAttribute("src") ||
					img.getAttribute("bind-src") ||
					"(unknown)";
				console.warn(
					`[optimize-images] missing alt on <img src="${src}"> in ${filePath}`,
				);
			}
		}

		const skipLazy = config.skipLazy || null;
		const lcpImage = detectLcpCandidate(
			images,
			config.lcpSelector || null,
			doc,
		);

		for (const img of images) {
			// 3.1 — skip images inside <template> for attribute changes and preload
			if (img.closest("template")) continue;

			if (img === lcpImage) {
				img.setAttribute("fetchpriority", "high");

				// 3.5 — remove lazy from LCP candidate
				if (img.getAttribute("loading") === "lazy") {
					img.removeAttribute("loading");
				}

				// 3.2 — bind-src guard for LCP preload
				if (img.hasAttribute("bind-src")) {
					console.warn(
						`[optimize-images] LCP candidate has dynamic bind-src in ${filePath} — preload skipped`,
					);
				} else {
					const src = img.getAttribute("src");
					// 3.3 — dynamic interpolation guard
					if (!src || src.includes("{")) continue;
					if (!head.querySelector(`link[rel="preload"][href="${src}"]`)) {
						const link = doc.createElement("link");
						link.setAttribute("rel", "preload");
						link.setAttribute("as", "image");
						link.setAttribute("href", src);
						// 3.6 — insert preload at start of <head>
						head.insertBefore(link, head.firstChild);
					}
				}
			} else {
				if (skipLazy && img.matches(skipLazy)) continue;
				if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
				if (!img.hasAttribute("decoding"))
					img.setAttribute("decoding", "async");
			}
		}

		return doc.toString();
	},
};

// 3.4 — class-based LCP promotion
function detectLcpCandidate(images, lcpSelector, doc) {
	if (lcpSelector) return doc.querySelector(lcpSelector);
	for (const img of images) {
		if (LCP_CLASS_RE.test(img.getAttribute("class") || "")) return img;
	}
	return images[0] ?? null;
}
