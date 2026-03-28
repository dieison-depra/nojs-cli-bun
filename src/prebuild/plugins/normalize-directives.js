import { parseHTML } from "linkedom";

const INTERPOLATION_RE = /\$\{([\s\S]*?)\}/g;
const STATE_PATH_RE = /\bstate\.([a-zA-Z0-9_.]+)\b/g;

/**
 * AOT Directive Normalization Plugin
 *
 * Transforms complex state paths into short indices for faster runtime evaluation.
 * Ex: state.user.profile.name -> s[0]
 */
export default {
	name: "normalize-directives",
	description: "Normalize complex state paths into short indices",

	_pathMap: new Map(),
	_nextIndex: 0,

	async process(html) {
		const { document: doc } = parseHTML(html);
		const allElements = doc.querySelectorAll("*");

		for (const el of allElements) {
			for (const attr of el.getAttributeNames()) {
				const value = el.getAttribute(attr);
				if (!value) continue;

				// Normalize attribute value
				const newValue = this._normalizeExpression(value);
				if (newValue !== value) {
					el.setAttribute(attr, newValue);
				}
			}
		}

		// Also handle text nodes
		const walker = doc.createTreeWalker(doc.body || doc, 4 /* SHOW_TEXT */);
		let node = walker.nextNode();
		while (node) {
			const text = node.textContent || "";
			if (INTERPOLATION_RE.test(text)) {
				node.textContent = this._normalizeExpression(text);
			}
			node = walker.nextNode();
		}

		return doc.toString();
	},

	async finalize() {
		if (this._pathMap.size === 0) return this._reset();

		console.log(
			`[normalize-directives] Normalized ${this._pathMap.size} state paths`,
		);

		// In a real implementation, we might want to write the map to a file
		// or inject a script that explains the mapping to the runtime.
		// For now, we'll just log and reset.
		this._reset();
	},

	_normalizeExpression(expr) {
		// First handle interpolations if any
		let result = expr.replace(INTERPOLATION_RE, (_match, inner) => {
			return `\${${this._normalizeStatePaths(inner)}}`;
		});

		// Then handle the whole expression (it might be a direct binding)
		result = this._normalizeStatePaths(result);

		return result;
	},

	_normalizeStatePaths(expr) {
		return expr.replace(STATE_PATH_RE, (_match, path) => {
			if (!this._pathMap.has(path)) {
				this._pathMap.set(path, this._nextIndex++);
			}
			const index = this._pathMap.get(path);
			return `s[${index}]`;
		});
	},

	_reset() {
		this._pathMap = new Map();
		this._nextIndex = 0;
	},
};
