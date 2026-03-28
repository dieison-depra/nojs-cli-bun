import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "generate-import-map",
	description: "Generate and inject an import map for bare specifiers (e.g., 'nojs')",

	async process(html, { config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		// Skip if importmap already exists
		if (doc.querySelector('script[type="importmap"]')) return html;

		const userImports = config.importMap?.imports || {};
		const imports = {
			nojs: "/nojs.bundle.js",
			...userImports,
		};

		const importMap = { imports };

		const script = doc.createElement("script");
		script.setAttribute("type", "importmap");
		script.textContent = `\n${JSON.stringify(importMap, null, 2)}\n`;

		// Inject before the first module script or at the end of head
		const firstModule = head.querySelector('script[type="module"]');
		if (firstModule) {
			head.insertBefore(script, firstModule);
		} else {
			head.appendChild(script);
		}

		return doc.toString();
	},
};
