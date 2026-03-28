import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { parseHTML } from "linkedom";

export default {
	name: "inject-modulepreload",
	description:
		"Inject modulepreload hints for module scripts and their transitive imports to reduce load latency.",

	async process(html, { filePath } = {}) {
		const { document: doc } = parseHTML(html);
		if (!doc.head) return html;

		const existing = new Set(
			[...doc.querySelectorAll('link[rel="modulepreload"]')].map((el) =>
				el.getAttribute("href"),
			),
		);

		const scripts = doc.querySelectorAll('script[type="module"][src]');
		let changed = false;

		for (const script of scripts) {
			const src = script.getAttribute("src");
			if (!src || isInterpolated(src) || isCrossOrigin(src)) continue;

			if (!existing.has(src)) {
				appendModulepreload(doc, src);
				existing.add(src);
				changed = true;
			}

			if (!filePath) continue;

			const webRoot = await findWebRoot(dirname(filePath), src);
			if (!webRoot) continue;

			const entryPath = join(webRoot, src.startsWith("/") ? src.slice(1) : src);
			const imports = await collectImports(entryPath, webRoot, new Set([entryPath]));

			for (const webPath of imports) {
				if (existing.has(webPath)) continue;
				appendModulepreload(doc, webPath);
				existing.add(webPath);
				changed = true;
			}
		}

		return changed ? doc.toString() : html;
	},
};

function appendModulepreload(doc, href) {
	const link = doc.createElement("link");
	link.setAttribute("rel", "modulepreload");
	link.setAttribute("href", href);
	doc.head.appendChild(link);
}

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

const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g;

async function collectImports(filePath, webRoot, visited) {
	let src;
	try {
		src = await readFile(filePath, "utf8");
	} catch {
		return [];
	}

	const results = [];
	const fileDir = dirname(filePath);
	IMPORT_RE.lastIndex = 0;
	let m;

	while ((m = IMPORT_RE.exec(src)) !== null) {
		const specifier = m[1];
		if (!specifier.startsWith(".")) continue;

		const absPath = join(fileDir, specifier);
		if (visited.has(absPath)) continue;
		visited.add(absPath);

		results.push("/" + relative(webRoot, absPath));

		const nested = await collectImports(absPath, webRoot, visited);
		results.push(...nested);
	}

	return results;
}
