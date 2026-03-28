import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "generate-early-hints",
	description:
		"Generate server push/early hints configuration (e.g., _headers for Netlify/Cloudflare)",

	_hints: new Map(), // Map<inputFilePath, Set<link>>

	async process(html, { filePath }) {
		const { document: doc } = parseHTML(html);
		const hints = new Set();

		// Find scripts
		for (const script of doc.querySelectorAll("script[src]")) {
			const src = script.getAttribute("src");
			if (src && !src.startsWith("http") && !src.startsWith("//")) {
				hints.add(`Link: <${src}>; rel=preload; as=script`);
			}
		}

		// Find styles
		for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
			const href = link.getAttribute("href");
			if (href && !href.startsWith("http") && !href.startsWith("//")) {
				hints.add(`Link: <${href}>; rel=preload; as=style`);
			}
		}

		// Find existing preloads
		for (const link of doc.querySelectorAll('link[rel="preload"]')) {
			const href = link.getAttribute("href");
			const as = link.getAttribute("as");
			if (href && !href.startsWith("http") && !href.startsWith("//")) {
				hints.add(`Link: <${href}>; rel=preload${as ? `; as=${as}` : ""}`);
			}
		}

		if (hints.size > 0) {
			this._hints.set(filePath, hints);
		}

		return html;
	},

	async finalize({ outputDir, config, processedFiles }) {
		const target = config.target || "netlify";
		if (target !== "netlify" && target !== "cloudflare") {
			console.warn(`[generate-early-hints] Unsupported target: ${target}`);
			return;
		}

		let content = "";
		// processedFiles are the output paths. We need to match them with our hints.
		// Since processedFiles are in the same order as the input files processed by runner.js,
		// and we know the input file paths from process(), we can match them if we are careful.
		// However, runner.js doesn't explicitly guarantee order in a way we can rely on easily if it was parallel (but it's serial).

		// Let's use a more robust way: we store by the relative path from the base dir.
		// Wait, runner.js uses: for (const filePath of files) { ... } which is serial.
		// So we can just use the order of keys in our Map if we want, but it's better to calculate
		// the public path from the processedFiles themselves.

		for (const outputPath of processedFiles) {
			// We need to find which input file this outputPath corresponds to.
			// This is slightly annoying because runner.js doesn't pass the mapping to finalize.
			// But usually they have the same relative structure.

			const publicPath = getPublicPath(outputPath, outputDir);
			// We'll just collect all hints from all files for now if we can't match 1:1 easily,
			// or we can just re-parse the output files! (Slower but safer).
			// Re-parsing is safer.

			const hints = await extractHintsFromOutputFile(outputPath);
			if (hints.size > 0) {
				content += `${publicPath}\n`;
				for (const hint of hints) {
					content += `  ${hint}\n`;
				}
				content += "\n";
			}
		}

		if (content) {
			const dest = join(outputDir, "_headers");
			await writeFile(dest, content, "utf-8");
			console.log(
				`[generate-early-hints] ${dest}: Early hints written for ${target}`,
			);
		}

		this._hints.clear();
	},
};

function getPublicPath(outputPath, outputDir) {
	let rel = "/" + relative(outputDir, outputPath).replace(/\\/g, "/");
	if (rel === "/index.html") return "/";
	if (rel.endsWith("/index.html")) return rel.slice(0, -10);
	return rel;
}

async function extractHintsFromOutputFile(path) {
	const { readFile } = await import("node:fs/promises");
	const html = await readFile(path, "utf-8");
	const { document: doc } = parseHTML(html);
	const hints = new Set();

	for (const script of doc.querySelectorAll("script[src]")) {
		const src = script.getAttribute("src");
		if (src && !src.startsWith("http") && !src.startsWith("//")) {
			hints.add(`Link: <${src}>; rel=preload; as=script`);
		}
	}

	for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
		const href = link.getAttribute("href");
		if (href && !href.startsWith("http") && !href.startsWith("//")) {
			hints.add(`Link: <${href}>; rel=preload; as=style`);
		}
	}

	for (const link of doc.querySelectorAll('link[rel="preload"]')) {
		const href = link.getAttribute("href");
		const as = link.getAttribute("as");
		if (href && !href.startsWith("http") && !href.startsWith("//")) {
			hints.add(`Link: <${href}>; rel=preload${as ? `; as=${as}` : ""}`);
		}
	}

	return hints;
}
