import { parseHTML } from "linkedom";

const SLOT_ATTRS = ["loading", "skeleton", "error", "empty", "success"];
const SKELETON_CSS_ATTR = "data-nojs-skeleton-css";
const SKELETON_CSS =
	".skeleton{background:#e0e0e0;border-radius:4px;animation:skeleton-pulse 1.5s ease-in-out infinite}" +
	"@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:.4}}";

export default {
	name: "inject-template-hints",
	description:
		"Preload stylesheets referenced by loading/skeleton/error templates and inline skeleton animation CSS",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		// Collect template IDs referenced by slot attributes (values starting with "#")
		const templateIds = new Set();
		for (const attr of SLOT_ATTRS) {
			for (const el of doc.querySelectorAll(`[${attr}]`)) {
				const val = el.getAttribute(attr);
				if (val?.startsWith("#")) templateIds.add(val.slice(1));
			}
		}
		if (templateIds.size === 0) return html;

		// Collect CSS classes used by referenced templates and detect skeleton classes
		let hasSkeletonClass = false;
		for (const id of templateIds) {
			const tpl = doc.getElementById(id);
			if (!tpl) continue;
			const root = tpl?.content ?? tpl;
			for (const el of root?.querySelectorAll('[class]') ?? []) {
				for (const cls of el.classList) {
					if (/skeleton/i.test(cls)) hasSkeletonClass = true;
				}
			}
		}

		let modified = false;

		// Preload external stylesheets with static hrefs (not yet preloaded)
		const existingPreloads = new Set(
			[...head.querySelectorAll('link[rel="preload"][as="style"]')].map((l) =>
				l.getAttribute("href"),
			),
		);

		for (const link of head.querySelectorAll('link[rel="stylesheet"]')) {
			const href = link.getAttribute("href");
			if (!href || /\{[^}]+\}/.test(href) || existingPreloads.has(href))
				continue;

			const preload = doc.createElement("link");
			preload.setAttribute("rel", "preload");
			preload.setAttribute("as", "style");
			preload.setAttribute("href", href);
			head.appendChild(preload);
			existingPreloads.add(href);
			modified = true;
		}

		// Inject inline skeleton CSS if any skeleton class detected and not already present
		if (hasSkeletonClass && !head.querySelector(`[${SKELETON_CSS_ATTR}]`)) {
			const style = doc.createElement("style");
			style.setAttribute(SKELETON_CSS_ATTR, "");
			style.textContent = SKELETON_CSS;
			head.appendChild(style);
			modified = true;
		}

		return modified ? doc.toString() : html;
	},
};
