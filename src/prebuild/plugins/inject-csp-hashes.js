import { createHash } from "node:crypto";
import { parseHTML } from "linkedom";

export default {
	name: "inject-csp-hashes",
	description:
		"Compute SHA-384 hashes for inline scripts/styles and inject a CSP meta tag.",

	async process(html, { config }) {
		const opts = config || {};
		const baseScriptSrc = opts.scriptSrc || "'self'";
		const baseStyleSrc = opts.styleSrc || "'self'";

		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const scriptHashes = [];
		const styleHashes = [];

		// Inline scripts (no src, not speculationrules)
		for (const el of doc.querySelectorAll("script:not([src])")) {
			if (el.getAttribute("type") === "speculationrules") continue;
			const content = el.textContent || "";
			if (!content.trim()) continue;
			scriptHashes.push(sha384(content));
		}

		// Inline styles (no external link, just <style> tags)
		for (const el of doc.querySelectorAll("style")) {
			const content = el.textContent || "";
			if (!content.trim()) continue;
			styleHashes.push(sha384(content));
		}

		if (scriptHashes.length === 0 && styleHashes.length === 0) return html;

		const scriptSrcValue = [baseScriptSrc, ...scriptHashes].join(" ");
		const styleSrcValue = [baseStyleSrc, ...styleHashes].join(" ");
		const cspContent = `script-src ${scriptSrcValue}; style-src ${styleSrcValue}`;

		let cspMeta = head.querySelector(
			'meta[http-equiv="Content-Security-Policy"]',
		);
		if (cspMeta) {
			cspMeta.setAttribute("content", cspContent);
		} else {
			cspMeta = doc.createElement("meta");
			cspMeta.setAttribute("http-equiv", "Content-Security-Policy");
			cspMeta.setAttribute("content", cspContent);
			head.insertBefore(cspMeta, head.firstChild);
		}

		return doc.toString();
	},
};

function sha384(content) {
	const hash = createHash("sha384").update(content, "utf8").digest("base64");
	return `'sha384-${hash}'`;
}
