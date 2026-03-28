import { parseHTML } from "linkedom";

export default {
	name: "audit-accessibility",
	description:
		"WCAG quick-check: alt text, link names, labels, heading order, lang.",

	async process(html, { filePath, config }) {
		const opts = config || {};
		const rules = opts.rules || {};
		const failOnError = opts.failOnError === true;
		const label = filePath || "unknown";
		const violations = [];

		const { document: doc } = parseHTML(html);

		// 1. img alt
		if (rules["img-alt"] !== false) {
			for (const _img of doc.querySelectorAll("img:not([alt])")) {
				violations.push(`[img-alt] <img> missing alt attribute in ${label}`);
			}
		}

		// 2. link name
		if (rules["link-name"] !== false) {
			for (const a of doc.querySelectorAll("a[href]")) {
				const text = (a.textContent || "").trim();
				if (
					!text &&
					!a.getAttribute("aria-label") &&
					!a.getAttribute("aria-labelledby")
				) {
					violations.push(`[link-name] <a> has no accessible name in ${label}`);
				}
			}
		}

		// 3. form labels
		if (rules.label !== false) {
			const labelledIds = new Set(
				[...doc.querySelectorAll("label[for]")].map((l) =>
					l.getAttribute("for"),
				),
			);
			for (const input of doc.querySelectorAll(
				'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
			)) {
				const id = input.getAttribute("id");
				const hasLabel =
					(id && labelledIds.has(id)) || !!input.closest("label");
				const hasAria =
					input.getAttribute("aria-label") ||
					input.getAttribute("aria-labelledby");
				if (!hasLabel && !hasAria) {
					violations.push(
						`[label] <input> has no associated label in ${label}`,
					);
				}
			}
		}

		// 4. heading order
		if (rules["heading-order"] !== false) {
			const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
				parseInt(h.tagName.slice(1), 10),
			);
			let prev = 0;
			for (const level of headings) {
				if (level > prev + 1 && prev !== 0) {
					violations.push(
						`[heading-order] heading level skipped (h${prev}→h${level}) in ${label}`,
					);
				}
				prev = level;
			}
		}

		// 5. html lang
		if (rules["html-lang"] !== false) {
			const htmlEl = doc.documentElement || doc.querySelector("html");
			if (htmlEl && !htmlEl.getAttribute("lang")) {
				violations.push(
					`[html-lang] <html> missing lang attribute in ${label}`,
				);
			}
		}

		// 6. landmark-main
		if (rules["landmark-main"] !== false) {
			const hasMain =
				doc.querySelector("main") ||
				doc.querySelector('[role="main"]');
			if (!hasMain) {
				violations.push(
					`[landmark-main] document has no <main> landmark in ${label}`,
				);
			}
		}

		// 7. list — <ul>/<ol> must contain only <li>, <script>, <template>
		if (rules.list !== false) {
			const ALLOWED = new Set(["li", "script", "template"]);
			for (const list of doc.querySelectorAll("ul, ol, menu")) {
				if (list.closest("template")) continue; // skip inert template content
				for (const child of list.children) {
					if (!ALLOWED.has(child.tagName.toLowerCase())) {
						violations.push(
							`[list] <${list.tagName.toLowerCase()}> contains <${child.tagName.toLowerCase()}> (not a list item) in ${label}`,
						);
						break;
					}
				}
			}
		}

		// 8. listitem — <li> must be inside <ul>, <ol>, or <menu>
		if (rules.listitem !== false) {
			const LIST_PARENTS = new Set(["ul", "ol", "menu"]);
			for (const li of doc.querySelectorAll("li")) {
				if (li.closest("template")) continue; // skip inert template content
				const parent = li.parentElement;
				if (!parent || !LIST_PARENTS.has(parent.tagName.toLowerCase())) {
					violations.push(
						`[listitem] <li> is not inside <ul>, <ol> or <menu> in ${label}`,
					);
				}
			}
		}

		if (violations.length > 0) {
			for (const v of violations) {
				process.stderr.write(`[audit-accessibility] ${v}\n`);
			}
			if (failOnError) {
				throw new Error(
					`audit-accessibility: ${violations.length} violation(s) found`,
				);
			}
		}

		return html; // never modifies HTML
	},
};
