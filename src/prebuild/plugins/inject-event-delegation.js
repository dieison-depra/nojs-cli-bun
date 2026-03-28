import { parseHTML } from "linkedom";

/**
 * Event Delegation Injection Plugin
 *
 * Transforms individual event listeners (on:click, on-input, etc.) into
 * data attributes that can be handled by a single root listener.
 */
export default {
	name: "inject-event-delegation",
	description:
		"Transform individual event listeners into root-delegated events for better performance",

	async process(html, { config = {} } = {}) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const eventsToDelegate = config.events || [
			"click",
			"input",
			"change",
			"submit",
		];
		let hasDelegated = false;

		const allElements = doc.querySelectorAll("*");
		// Also process elements inside <template> tags
		for (const el of allElements) {
			if (el.tagName === "TEMPLATE" && el.content) {
				const templateElements = el.content.querySelectorAll("*");
				// Process them
				for (const tel of templateElements) {
					processElement(tel);
				}
				// CRITICAL: Update the template's innerHTML so doc.toString() picks it up
				// We join the string representation of children to avoid "#document-fragment"
				el.innerHTML = Array.from(el.content.childNodes).map(n => n.toString()).join("");
			}
		}

		for (const el of allElements) {
			processElement(el);
		}

		function processElement(el) {
			const attrs = el.getAttributeNames();
			const delegatedForThisEl = [];

			for (const attr of attrs) {
				let eventName = null;
				if (attr.startsWith("on:")) {
					eventName = attr.slice(3);
				} else if (attr.startsWith("on-")) {
					eventName = attr.slice(3);
				}

				if (eventName && eventsToDelegate.includes(eventName)) {
					const value = el.getAttribute(attr);
					el.removeAttribute(attr);
					el.setAttribute(`data-nojs-on-${eventName}`, value);
					delegatedForThisEl.push(eventName);
					hasDelegated = true;
				}
			}

			if (delegatedForThisEl.length > 0) {
				const existing = el.getAttribute("data-nojs-event") || "";
				const combined = [
					...new Set([
						...existing.split(",").filter(Boolean),
						...delegatedForThisEl,
					]),
				].join(",");
				el.setAttribute("data-nojs-event", combined);
			}
		}

		if (hasDelegated && !doc.querySelector("script[data-nojs-delegation]")) {
			const script = doc.createElement("script");
			script.setAttribute("data-nojs-delegation", "");
			script.textContent = generateDelegationScript(eventsToDelegate);
			head.appendChild(script);
		}

		return doc.toString();
	},
};

function generateDelegationScript(events) {
	return `
(function() {
  const h = (e) => {
    const t = e.target.closest('[data-nojs-event*="' + e.type + '"]');
    if (t && window.nojs && typeof window.nojs.run === 'function') {
      const expr = t.getAttribute('data-nojs-on-' + e.type);
      if (expr) window.nojs.run(expr, t, e);
    }
  };
  ${JSON.stringify(events)}.forEach(ev => document.addEventListener(ev, h, true));
})();`.trim();
}
