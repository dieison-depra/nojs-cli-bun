import { parseHTML } from "linkedom";

const FETCH_DIRECTIVES = ["get", "post", "put", "patch", "delete"];

/**
 * Validation rules for No.JS templates.
 * Each rule has: name, test(el) → issue[] or null.
 */
const RULES = [
	{
		name: "fetch-missing-as",
		severity: "error",
		test(el) {
			for (const dir of FETCH_DIRECTIVES) {
				if (el.hasAttribute(dir) && !el.hasAttribute("as")) {
					return `<${el.tagName.toLowerCase()} ${dir}="..."> is missing the "as" attribute. Data won't be accessible without it.`;
				}
			}
			return null;
		},
	},
	{
		name: "each-missing-in",
		severity: "error",
		test(el) {
			if (!el.hasAttribute("each")) return null;
			const value = el.getAttribute("each");
			if (!value.includes(" in ")) {
				return `each="${value}" — missing "in" keyword. Expected format: each="item in items".`;
			}
			return null;
		},
	},
	{
		name: "foreach-missing-from",
		severity: "error",
		test(el) {
			if (!el.hasAttribute("foreach")) return null;
			if (!el.hasAttribute("from")) {
				return `<${el.tagName.toLowerCase()} foreach="..."> is missing the "from" attribute.`;
			}
			return null;
		},
	},
	{
		name: "model-non-form-element",
		severity: "warning",
		test(el) {
			if (!el.hasAttribute("model")) return null;
			const formTags = ["INPUT", "SELECT", "TEXTAREA"];
			if (!formTags.includes(el.tagName)) {
				return `model="${el.getAttribute("model")}" on <${el.tagName.toLowerCase()}> — model should be used on form elements (input, select, textarea).`;
			}
			return null;
		},
	},
	{
		name: "bind-html-warning",
		severity: "warning",
		test(el) {
			if (!el.hasAttribute("bind-html")) return null;
			return `bind-html="${el.getAttribute("bind-html")}" — ensure the bound content is trusted. No.JS sanitizes by default, but be careful with user-generated content.`;
		},
	},
	{
		name: "route-without-route-view",
		severity: "warning",
		global: true,
		test(doc) {
			const hasRouteTemplate = doc.querySelector("template[route]");
			const hasRouteView = doc.querySelector("[route-view]");
			if (hasRouteTemplate && !hasRouteView) {
				return 'Route templates found but no element with "route-view" attribute. Routes won\'t render.';
			}
			return null;
		},
	},
	{
		name: "validate-outside-form",
		severity: "error",
		test(el) {
			if (!el.hasAttribute("validate") || el.tagName === "FORM") return null;
			const form = el.closest("form[validate]");
			if (!form) {
				return `validate="${el.getAttribute("validate")}" is outside a <form validate>. Validation requires a parent form with the validate attribute.`;
			}
			return null;
		},
	},
	{
		name: "event-empty-handler",
		severity: "error",
		test(el) {
			for (const attr of el.attributes || []) {
				if (attr.name.startsWith("on:") && !attr.value?.trim()) {
					return `${attr.name} has an empty handler. Provide an expression like on:click="count++".`;
				}
			}
			return null;
		},
	},
	{
		name: "loop-missing-key",
		severity: "warning",
		test(el) {
			if (!el.hasAttribute("each") && !el.hasAttribute("foreach")) return null;
			if (!el.hasAttribute("key")) {
				const dir = el.hasAttribute("each") ? "each" : "foreach";
				return `<${el.tagName.toLowerCase()} ${dir}="..."> without a "key" attribute. Adding key improves update performance.`;
			}
			return null;
		},
	},
	{
		name: "duplicate-store-name",
		severity: "warning",
		global: true,
		test(doc) {
			const stores = doc.querySelectorAll("[store]");
			const names = new Map();
			const issues = [];
			for (const el of stores) {
				const name = el.getAttribute("store");
				if (names.has(name)) {
					issues.push(
						`Duplicate store name "${name}". The second declaration may be ignored if the store was initialized via NoJS.config().`,
					);
				}
				names.set(name, el);
			}
			return issues.length > 0 ? issues : null;
		},
	},
];

/**
 * Validate an HTML string against No.JS rules.
 *
 * @param {string} html - HTML content
 * @param {string} filePath - File path for reporting
 * @returns {Array<{ rule: string, severity: string, message: string }>}
 */
export function validateFiles(html, _filePath) {
	const { document: doc } = parseHTML(html);
	const issues = [];

	// Run global rules (operate on the full document)
	for (const rule of RULES.filter((r) => r.global)) {
		const result = rule.test(doc);
		if (result) {
			const messages = Array.isArray(result) ? result : [result];
			for (const msg of messages) {
				issues.push({ rule: rule.name, severity: rule.severity, message: msg });
			}
		}
	}

	// Run element-level rules
	const allElements = doc.querySelectorAll("*");
	for (const el of allElements) {
		for (const rule of RULES.filter((r) => !r.global)) {
			const result = rule.test(el);
			if (result) {
				issues.push({
					rule: rule.name,
					severity: rule.severity,
					message: result,
				});
			}
		}
	}

	return issues;
}
