import { parseHTML } from "linkedom";

const INTERACTIVE_ATTRS = [
	"state", "store", "bind", "model", "if", "for", "foreach", "on:", "on-",
	"t", "bind-t", "ref", "validate", "animate", "transition", "get", "post"
];

/** @type {import("../runner.js").Plugin} */
export default {
	name: "identify-islands",
	description: "Identify interactive 'islands' in HTML to reduce initial JS processing scope",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const body = doc.body;
		if (!body) return html;

		const islands = [];
		const allElements = body.querySelectorAll("*");

		for (const el of allElements) {
			const hasDirective = el.getAttributeNames().some(attr => 
				INTERACTIVE_ATTRS.some(prefix => attr.startsWith(prefix))
			);

			if (hasDirective) {
				// Find if any ancestor is already an island
				let ancestor = el.parentElement;
				let isInsideIsland = false;
				while (ancestor && ancestor !== body) {
					if (ancestor.hasAttribute("data-nojs-island")) {
						isInsideIsland = true;
						break;
					}
					ancestor = ancestor.parentElement;
				}

				if (!isInsideIsland && !el.hasAttribute("data-nojs-island")) {
					const id = `island-${Math.random().toString(36).slice(2, 9)}`;
					el.setAttribute("data-nojs-island", id);
					islands.push(id);
				}
			}
		}

		if (islands.length > 0) {
			const script = doc.createElement("script");
			script.setAttribute("data-nojs", "islands-init");
			script.textContent = `
window.NoJS_Config = window.NoJS_Config || {};
window.NoJS_Config.islands = ${JSON.stringify(islands)};
window.NoJS_Config.autoStart = false; 
document.addEventListener('DOMContentLoaded', () => {
  if (window.NoJS && NoJS.processIsland) {
    window.NoJS_Config.islands.forEach(id => {
      const el = document.querySelector('[data-nojs-island="' + id + '"]');
      if (el) NoJS.processIsland(el);
    });
  }
});
`.trim();
			body.appendChild(script);
		}

		return doc.toString();
	},
};
