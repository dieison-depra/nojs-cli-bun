import { parseHTML } from "linkedom";

const NOJS_STYLE_ATTRS = [
	"data-nojs-animations",
	"data-nojs-pending-css",
	"data-nojs-skeleton-css",
	"data-nojs-view-transitions",
];

export default {
	name: "purge-unused-css",
	description: "Remove unused CSS rules from inline style tags.",

	async process(html) {
		const { document: doc } = parseHTML(html);
		let changed = false;

		for (const style of doc.querySelectorAll("style")) {
			// Skip NoJS internal styles
			if (NOJS_STYLE_ATTRS.some((attr) => style.hasAttribute(attr))) continue;

			const original = style.textContent || "";
			const purged = purgeCSS(original, doc);
			if (purged !== original) {
				style.textContent = purged;
				changed = true;
			}
		}

		return changed ? doc.toString() : html;
	},
};

function purgeCSS(css, doc) {
	// Split into blocks: keep at-rules as-is, process regular rules
	const result = [];
	let i = 0;

	while (i < css.length) {
		// Skip whitespace
		const wsMatch = css.slice(i).match(/^\s+/);
		if (wsMatch) {
			result.push(wsMatch[0]);
			i += wsMatch[0].length;
			continue;
		}

		// At-rule: keep as-is
		if (css[i] === "@") {
			const block = extractBlock(css, i);
			result.push(block.text);
			i += block.length;
			continue;
		}

		// Regular rule: selector { ... }
		const ruleMatch = css.slice(i).match(/^([^{]+)\{([^}]*)\}/s);
		if (!ruleMatch) {
			result.push(css.slice(i));
			break;
		}

		const selectorPart = ruleMatch[1].trim();

		if (selectorUsed(selectorPart, doc)) {
			result.push(ruleMatch[0]);
		}
		i += ruleMatch[0].length;
	}

	return result.join("");
}

function extractBlock(css, start) {
	// Find matching closing brace for at-rule
	let depth = 0;
	let i = start;
	let foundOpen = false;
	while (i < css.length) {
		if (css[i] === "{") {
			depth++;
			foundOpen = true;
		} else if (css[i] === "}") {
			depth--;
			if (foundOpen && depth === 0) {
				i++;
				break;
			}
		} else if (!foundOpen && css[i] === ";") {
			i++;
			break;
		} // single-line at-rule
		i++;
	}
	return { text: css.slice(start, i), length: i - start };
}

function selectorUsed(selectorGroup, doc) {
	// Multiple selectors separated by comma
	const selectors = selectorGroup.split(",").map((s) => s.trim());
	for (const sel of selectors) {
		// Strip pseudo-classes/elements to get the base selector
		const base = sel.replace(/::?[\w-]+(\([^)]*\))?/g, "").trim();
		if (!base) return true; // pure pseudo — keep
		try {
			if (doc.querySelector(base)) return true;
		} catch {
			return true; // invalid selector — keep conservatively
		}
	}
	return false;
}
