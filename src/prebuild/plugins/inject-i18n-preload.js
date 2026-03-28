import { parseHTML } from "linkedom";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "inject-i18n-preload",
	description: "Inject <link rel='preload'> for the default language locale file",

	async process(html, { config }) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		const lang = doc.documentElement?.getAttribute("lang") || "";
		if (!lang || isEnglishLocale(lang) || !isValidLocaleCode(lang)) return html;

		const localesDir = config.localesDir || "/locales/";
		const localeHref = `${localesDir.endsWith("/") ? localesDir : localesDir + "/"}${lang}.json`;

		const existingPreload = head.querySelector(`link[rel="preload"][href="${localeHref}"]`);
		if (existingPreload) return html;

		const link = doc.createElement("link");
		link.setAttribute("rel", "preload");
		link.setAttribute("as", "fetch");
		link.setAttribute("href", localeHref);
		link.setAttribute("crossorigin", "anonymous");
		head.appendChild(link);

		return doc.toString();
	},
};

function isEnglishLocale(lang) {
	return lang === "en" || lang.startsWith("en-");
}

function isValidLocaleCode(lang) {
	return /^[a-z]{2}$/.test(lang) || /^[a-z]{2}-[A-Z]{2}$/.test(lang);
}
