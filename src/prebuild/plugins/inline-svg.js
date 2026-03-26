import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export default {
	name: "inline-svg",
	description: "Inline small SVG files from img[src$=.svg] into the HTML.",

	async process(html, { filePath, config }) {
		const opts = config || {};
		const maxBytes = opts.maxBytes ?? 4096;
		const cwd =
			opts.cwd || (filePath ? filePath.replace(/\/[^/]+$/, "") : process.cwd());

		// Find all img tags with .svg src
		const IMG_RE = /<img\s([^>]*)>/gi;
		let result = html;
		const replacements = [];

		for (const match of html.matchAll(IMG_RE)) {
			const [fullMatch, attrs] = match;

			// Extract src
			const srcMatch = attrs.match(/src="([^"]+\.svg)"/i);
			if (!srcMatch) continue;
			const src = srcMatch[1];

			// Skip external
			if (
				src.startsWith("http://") ||
				src.startsWith("https://") ||
				src.startsWith("//")
			)
				continue;

			// Skip data-no-inline
			if (/data-no-inline/.test(attrs)) continue;

			const absPath = src.startsWith("/") ? join(cwd, src) : resolve(cwd, src);

			let fileSize;
			try {
				fileSize = (await stat(absPath)).size;
			} catch {
				continue;
			}
			if (fileSize > maxBytes) continue;

			let svgContent;
			try {
				svgContent = await readFile(absPath, "utf-8");
			} catch {
				continue;
			}

			// Clean
			svgContent = svgContent
				.replace(/<\?xml[^?]*\?>/i, "")
				.replace(/<!DOCTYPE[^>]*>/i, "")
				.trim();

			// Alt handling
			const altMatch = attrs.match(/alt="([^"]*)"/i);
			const alt = altMatch ? altMatch[1] : null;
			if (alt) {
				svgContent = svgContent.replace(
					"<svg",
					`<svg aria-label="${alt.replace(/"/g, "&quot;")}" role="img"`,
				);
			} else {
				svgContent = svgContent.replace("<svg", '<svg aria-hidden="true"');
			}

			// Strip width/height from root svg
			svgContent = svgContent.replace(/(<svg[^>]*)\s+width="[^"]*"/i, "$1");
			svgContent = svgContent.replace(/(<svg[^>]*)\s+height="[^"]*"/i, "$1");

			replacements.push({ original: fullMatch, replacement: svgContent });
		}

		for (const { original, replacement } of replacements) {
			result = result.replace(original, replacement);
		}

		return result;
	},
};
