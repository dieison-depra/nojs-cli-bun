import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseHTML } from "linkedom";

export default {
	name: "inline-css",
	description:
		"Inline local CSS stylesheets into <style> tags to eliminate render-blocking requests.",

	async process(html, { filePath, config } = {}) {
		const opts = config || {};
		const maxSize = opts.maxSize ?? 10240; // 10 KiB default

		const { document: doc } = parseHTML(html);
		if (!doc.head) return html;

		const links = [...doc.querySelectorAll('link[rel="stylesheet"][href]')];
		if (links.length === 0) return html;

		let changed = false;

		for (const link of links) {
			const href = link.getAttribute("href");
			if (!href || isCrossOrigin(href)) continue;

			const webRoot = filePath ? await findWebRoot(dirname(filePath), href) : null;
			if (!webRoot) continue;

			const cssPath = join(webRoot, href.startsWith("/") ? href.slice(1) : href);
			let css;
			try {
				css = await readFile(cssPath, "utf8");
			} catch {
				continue;
			}

			if (css.length > maxSize) continue;

			const style = doc.createElement("style");
			style.textContent = css;
			link.parentNode.replaceChild(style, link);
			changed = true;
		}

		return changed ? doc.toString() : html;
	},
};

function isCrossOrigin(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

async function findWebRoot(startDir, webPath) {
	if (!webPath.startsWith("/")) return startDir;
	const rel = webPath.slice(1);
	let dir = startDir;
	for (;;) {
		try {
			await readFile(join(dir, rel));
			return dir;
		} catch {
			const parent = dirname(dir);
			if (parent === dir) return null;
			dir = parent;
		}
	}
}
