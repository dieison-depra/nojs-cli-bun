import { createHash } from "node:crypto";
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "fingerprint-assets",
	description:
		"Add content hashes to JS and CSS files for cache busting and update HTML references",

	async finalize({ outputDir, processedFiles }) {
		const allFiles = await getFilesRecursively(outputDir);
		const assets = allFiles.filter(
			(f) =>
				(f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".css")) &&
				!f.includes(".bundle-report.html"), // avoid fingerprinting the report itself if it was js/css
		);

		const map = new Map(); // oldName -> newName (just the filename part)

		for (const assetPath of assets) {
			const content = await readFile(assetPath);
			const hash = createHash("sha1").update(content).digest("hex").slice(0, 8);
			const ext = extname(assetPath);
			const base = basename(assetPath, ext);
			const dir = dirname(assetPath);

			// Avoid double fingerprinting if run multiple times
			if (base.match(/\.[a-f0-9]{8}$/)) continue;

			const newBase = `${base}.${hash}${ext}`;
			const newPath = join(dir, newBase);

			await rename(assetPath, newPath);

			const oldName = basename(assetPath);
			const newName = newBase;
			map.set(oldName, newName);
		}

		if (map.size === 0) return;

		// Update references in all processed HTML files
		for (const htmlPath of processedFiles) {
			let html = await readFile(htmlPath, "utf-8");
			let changed = false;

			for (const [oldName, newName] of map) {
				// Match oldName preceded by / or quote, and followed by quote, ?, or #
				const re = new RegExp(
					`(["'\\/])${escapeRegExp(oldName)}(?=["'\\?#])`,
					"g",
				);
				const updated = html.replace(re, `$1${newName}`);
				if (updated !== html) {
					html = updated;
					changed = true;
				}
			}

			if (changed) {
				await writeFile(htmlPath, html, "utf-8");
			}
		}

		// Also update _headers if it exists (B20)
		const headersPath = join(outputDir, "_headers");
		try {
			let headers = await readFile(headersPath, "utf-8");
			let changed = false;
			for (const [oldName, newName] of map) {
				const re = new RegExp(`(\\/|<)${escapeRegExp(oldName)}(?=[\\s>])`, "g");
				const updated = headers.replace(re, `$1${newName}`);
				if (updated !== headers) {
					headers = updated;
					changed = true;
				}
			}
			if (changed) {
				await writeFile(headersPath, headers, "utf-8");
			}
		} catch {
			// skip if _headers doesn't exist
		}

		console.log(`[fingerprint-assets] Fingerprinted ${map.size} assets`);
	},
};

async function getFilesRecursively(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((res) => {
			const resPath = join(dir, res.name);
			return res.isDirectory() ? getFilesRecursively(resPath) : resPath;
		}),
	);
	return files.flat();
}

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
