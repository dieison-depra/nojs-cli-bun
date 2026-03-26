import { parseHTML } from "linkedom";

export default {
	name: "inject-speculation-rules",
	description:
		"Inject Speculation Rules API based on No.JS route definitions for near-instant navigation",

	async process(html, { _filePath, config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		if (head.querySelector('script[type="speculationrules"]')) return html;

		const routeTemplates = doc.querySelectorAll("template[route]");
		const routes = [];
		const excludePatterns = config.excludePatterns || [];

		for (const tpl of routeTemplates) {
			const route = tpl.getAttribute("route");
			if (!route || route === "*" || route.includes(":")) continue;
			if (excludePatterns.some((p) => route.includes(p))) continue;
			routes.push(route);
		}

		if (routes.length === 0) return html;

		const action = config.action || "prerender";
		const eagerness = config.eagerness || "moderate";

		const rules = { [action]: [{ urls: routes, eagerness }] };

		const script = doc.createElement("script");
		script.setAttribute("type", "speculationrules");
		script.textContent = JSON.stringify(rules, null, 2);
		head.appendChild(script);

		return doc.toString();
	},
};
