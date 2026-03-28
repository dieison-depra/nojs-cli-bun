import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "compile-templates-to-js",
	description: "Compile HTML templates to JS functions and split by route",

	_templates: new Map(), // Map<route, { html, js }>

	async process(html) {
		const { document: doc } = parseHTML(html);
		const templates = doc.querySelectorAll("template[route]");

		for (const tpl of templates) {
			const route = tpl.getAttribute("route");
			const content = tpl.innerHTML;

			// Simple "compiler" that generates a function to clone and return the element
			// In a real implementation, this would also pre-parse directives.
			const jsCode = `
export default function render() {
  const tpl = document.createElement('template');
  tpl.innerHTML = \`${content.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\`;
  return tpl.content.cloneNode(true);
}
`.trim();

			this._templates.set(route, { html: content, js: jsCode });

			// Replace template content with a marker to be filled by the router in JS
			tpl.innerHTML = "";
			tpl.setAttribute("data-nojs-compiled", route);
		}

		return doc.toString();
	},

	async finalize({ outputDir }) {
		if (this._templates.size === 0) return;

		const routesManifest = {};

		for (const [route, data] of this._templates) {
			// B21: Route Splitting - save each template as a separate JS chunk
			const fileName = `tpl-${route.replace(/[/*:]/g, "_")}.js`;
			const filePath = join(outputDir, fileName);
			await writeFile(filePath, data.js, "utf-8");

			routesManifest[route] = `./${fileName}`;
		}

		// Save manifest
		const manifestPath = join(outputDir, "routes-manifest.js");
		const manifestContent = `export default ${JSON.stringify(routesManifest, null, 2)};`;
		await writeFile(manifestPath, manifestContent, "utf-8");

		console.log(
			`[compile-templates-to-js] Compiled ${this._templates.size} templates and generated manifest.`,
		);
		this._templates.clear();
	},
};
