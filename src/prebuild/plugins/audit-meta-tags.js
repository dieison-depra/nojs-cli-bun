import { parseHTML } from "linkedom";

export default {
	name: "audit-meta-tags",
	description:
		"Check and inject required meta tags (charset, viewport, title, description, lang).",

	async process(html, { filePath, config }) {
		const opts = config || {};
		const shouldInject = opts.inject !== false;
		const failOnError = opts.failOnError === true;

		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const issues = [];
		let changed = false;

		// 1. charset
		if (!head.querySelector("meta[charset]")) {
			if (shouldInject) {
				const meta = doc.createElement("meta");
				meta.setAttribute("charset", "UTF-8");
				head.insertBefore(meta, head.firstChild);
				changed = true;
			} else {
				issues.push("missing <meta charset>");
			}
		}

		// 2. viewport
		if (!head.querySelector('meta[name="viewport"]')) {
			if (shouldInject) {
				const meta = doc.createElement("meta");
				meta.setAttribute("name", "viewport");
				meta.setAttribute("content", "width=device-width, initial-scale=1");
				head.appendChild(meta);
				changed = true;
			} else {
				issues.push('missing <meta name="viewport">');
			}
		}

		// 3. title — warn only
		if (!head.querySelector("title")) {
			issues.push(`missing <title> in ${filePath || "unknown"}`);
		}

		// 4. description — warn only
		if (!head.querySelector('meta[name="description"]')) {
			issues.push(
				`missing <meta name="description"> in ${filePath || "unknown"}`,
			);
		}

		// 5. lang on <html>
		const htmlEl = doc.documentElement || doc.querySelector("html");
		if (htmlEl && !htmlEl.getAttribute("lang")) {
			issues.push(
				`missing lang attribute on <html> in ${filePath || "unknown"}`,
			);
		}

		if (issues.length > 0 && failOnError) {
			throw new Error(`audit-meta-tags: ${issues.join("; ")}`);
		}

		// Print warnings to stderr for warn-only issues (only if process is available)
		if (issues.length > 0 && typeof process !== "undefined") {
			for (const issue of issues) {
				process.stderr.write(`[audit-meta-tags] warn: ${issue}\n`);
			}
		}

		return changed ? doc.toString() : html;
	},
};
