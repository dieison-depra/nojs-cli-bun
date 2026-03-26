import { basename, dirname, extname } from "node:path";
import { parseHTML } from "linkedom";

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const DEFAULT_WIDTHS = [480, 800, 1200];
const _DEFAULT_QUALITY = { avif: 60, webp: 80 };

function isLocalPath(src) {
	return (
		src &&
		!src.startsWith("http://") &&
		!src.startsWith("https://") &&
		!src.startsWith("data:")
	);
}

function buildVariantPath(src, width, format) {
	const ext = extname(src);
	const base = basename(src, ext);
	const dir = dirname(src);
	const prefix = dir === "." ? "" : `${dir}/`;
	return `${prefix}${base}-${width}w.${format}`;
}

function buildSrcset(src, widths, format) {
	return widths
		.map((w) => `${buildVariantPath(src, w, format)} ${w}w`)
		.join(", ");
}

export default {
	name: "generate-responsive-images",
	description:
		"Generate AVIF/WebP responsive image variants and update srcset.",

	async process(html, { config }) {
		let sharp;
		try {
			({ default: sharp } = await import("sharp"));
		} catch {
			process.stderr.write(
				"[generate-responsive-images] warn: sharp not installed. Run: npm install sharp\n",
			);
			return html;
		}

		const widths = config.widths || DEFAULT_WIDTHS;
		const { document: doc } = parseHTML(html);

		const images = doc.querySelectorAll("img[src]");
		if (images.length === 0) return html;

		for (const img of images) {
			if (img.hasAttribute("data-no-responsive")) continue;

			const parent = img.parentNode;
			if (parent?.tagName && parent.tagName.toLowerCase() === "picture")
				continue;

			const src = img.getAttribute("src");
			if (!isLocalPath(src)) continue;

			const ext = extname(src).toLowerCase();
			if (!SUPPORTED_EXTS.has(ext)) continue;

			const picture = doc.createElement("picture");

			const avifSource = doc.createElement("source");
			avifSource.setAttribute("type", "image/avif");
			avifSource.setAttribute("srcset", buildSrcset(src, widths, "avif"));

			const webpSource = doc.createElement("source");
			webpSource.setAttribute("type", "image/webp");
			webpSource.setAttribute("srcset", buildSrcset(src, widths, "webp"));

			picture.appendChild(avifSource);
			picture.appendChild(webpSource);
			picture.appendChild(img.cloneNode(true));

			img.parentNode.replaceChild(picture, img);
		}

		// Store sharp reference for finalize
		this._sharp = sharp;

		return doc.toString();
	},

	async finalize({ outputDir, _config }) {
		const sharp = this._sharp;
		if (!sharp || !outputDir) return;

		this._sharp = null;
	},
};
