import { readFile, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "differential-serving",
	description: "Generate modern and legacy bundles and update HTML to use module/nomodule pattern",

	async finalize({ outputDir, processedFiles }) {
		// In a real-world scenario, we'd use a transpiler like SWC or Babel for ES5.
		// Bun.build currently only supports 'browser', 'node', and 'bun' targets.
		// For this implementation, we'll demonstrate the HTML transformation.
		
		for (const htmlPath of processedFiles) {
			let html = await readFile(htmlPath, "utf-8");
			const { document: doc } = parseHTML(html);
			const scripts = doc.querySelectorAll('script[src]');
			
			let changed = false;
			for (const script of scripts) {
				const src = script.getAttribute("src");
				if (!src || src.startsWith("http") || src.startsWith("//")) continue;
				if (script.getAttribute("type") === "module" || script.hasAttribute("nomodule")) continue;

				// Create legacy version (simulated here as a copy or slightly different build if we had a transpiler)
				const ext = extname(src);
				const base = src.slice(0, -ext.length);
				const legacySrc = `${base}.legacy${ext}`;
				
				// Actual build for legacy (still using Bun, so not true ES5, but demonstrates the pipeline)
				const inputPath = join(outputDir, src);
				const outputPath = join(outputDir, legacySrc);
				
				try {
					await Bun.build({
						entrypoints: [inputPath],
						outdir: outputDir,
						naming: "[dir]/[name].legacy.[ext]",
						minify: true,
						target: "browser", // In the future, this would be 'es5' if Bun supports it
					});

					// Update HTML
					script.setAttribute("type", "module");
					
					const nomoduleScript = doc.createElement("script");
					nomoduleScript.setAttribute("src", legacySrc);
					nomoduleScript.setAttribute("nomodule", "");
					nomoduleScript.setAttribute("defer", "");
					
					script.parentNode.insertBefore(nomoduleScript, script.nextSibling);
					changed = true;
				} catch (err) {
					console.error(`[differential-serving] Failed to build legacy bundle for ${src}:`, err);
				}
			}

			if (changed) {
				await writeFile(htmlPath, doc.toString(), "utf-8");
			}
		}
		
		console.log(`[differential-serving] Module/nomodule pattern applied to ${processedFiles.length} files`);
	},
};
