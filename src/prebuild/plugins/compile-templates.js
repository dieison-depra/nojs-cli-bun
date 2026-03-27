import { parseHTML } from "linkedom";
import { createHash } from "node:crypto";

/**
 * Template Cloning Plugin (Solid.js Style)
 *
 * Identifies repetitive fragments (inside for=), extracts them to a hidden <template>,
 * and marks the element so the runtime can use node.cloneNode(true).
 */
export default {
	name: "compile-templates",
	description: "Extract loop fragments into <template> for faster DOM cloning",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const body = doc.body;
		if (!body) return html;

		const loopElements = doc.querySelectorAll("[for]");
		if (loopElements.length === 0) return html;

		const templatesContainer = doc.createElement("div");
		templatesContainer.style.display = "none";
		templatesContainer.setAttribute("data-nojs-templates", "");
		const addedTemplates = new Set();

		let hasTemplates = false;

		for (const el of loopElements) {
			const innerHTML = el.innerHTML.trim();
			if (!innerHTML) continue;

			const hash = createHash("md5").update(innerHTML).digest("hex").slice(0, 8);
			const templateId = `nt-${hash}`;

			// Check if template already exists
			if (!addedTemplates.has(templateId)) {
				const template = doc.createElement("template");
				template.id = templateId;
				template.innerHTML = innerHTML;
				templatesContainer.appendChild(template);
				addedTemplates.add(templateId);
				hasTemplates = true;
			}

			el.setAttribute("data-nojs-template", templateId);
			el.innerHTML = "";
		}

		if (hasTemplates) {
			body.appendChild(templatesContainer);
		}

		return doc.toString();
	},
};
