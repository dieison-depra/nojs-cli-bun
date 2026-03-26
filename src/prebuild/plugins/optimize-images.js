import { parseHTML } from "linkedom";

export default {
	name: "optimize-images",
	description:
		"Add lazy loading, LCP preload, and fetchpriority hints to images",

	async process(html, { _filePath, config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const images = doc.querySelectorAll("img[src]");
		if (images.length === 0) return html;

		const skipLazy = config.skipLazy || null;
		const lcpImage = config.lcpSelector
			? doc.querySelector(config.lcpSelector)
			: images[0];

		for (const img of images) {
			if (img === lcpImage) {
				img.setAttribute("fetchpriority", "high");
				const src = img.getAttribute("src");
				if (src && !head.querySelector(`link[rel="preload"][href="${src}"]`)) {
					const link = doc.createElement("link");
					link.setAttribute("rel", "preload");
					link.setAttribute("as", "image");
					link.setAttribute("href", src);
					head.appendChild(link);
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
