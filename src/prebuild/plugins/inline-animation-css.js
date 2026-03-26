import { parseHTML } from "linkedom";

// All built-in keyframe definitions — matches src/animations.js in the No.JS core.
const KEYFRAMES = new Map([
	["fadeIn", "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }"],
	["fadeOut", "@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }"],
	[
		"fadeInUp",
		"@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }",
	],
	[
		"fadeInDown",
		"@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }",
	],
	[
		"fadeOutUp",
		"@keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }",
	],
	[
		"fadeOutDown",
		"@keyframes fadeOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }",
	],
	[
		"slideInLeft",
		"@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }",
	],
	[
		"slideInRight",
		"@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }",
	],
	[
		"slideOutLeft",
		"@keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }",
	],
	[
		"slideOutRight",
		"@keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }",
	],
	[
		"zoomIn",
		"@keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }",
	],
	[
		"zoomOut",
		"@keyframes zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.5); } }",
	],
	[
		"bounceIn",
		"@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }",
	],
	[
		"bounceOut",
		"@keyframes bounceOut { 0% { opacity: 1; transform: scale(1); } 20% { transform: scale(0.9); } 50%,55% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(0.3); } }",
	],
]);

const ANIM_ATTRS = ["animate", "animate-enter", "animate-leave"];

export default {
	name: "inline-animation-css",
	description:
		"Inline only the animation keyframes used in the document to prevent FOUC on first paint",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const head = doc.head;
		if (!head) return html;

		// Skip if already injected (runtime guard)
		if (head.querySelector("[data-nojs-animations]")) return html;

		const names = new Set();
		for (const attr of ANIM_ATTRS) {
			for (const el of doc.querySelectorAll(`[${attr}]`)) {
				const val = el.getAttribute(attr);
				if (val) names.add(val.trim());
			}
		}

		if (names.size === 0) return html;

		const rules = [];
		for (const name of names) {
			if (KEYFRAMES.has(name)) rules.push(KEYFRAMES.get(name));
		}
		if (rules.length === 0) return html;

		const style = doc.createElement("style");
		style.setAttribute("data-nojs-animations", "");
		style.textContent = rules.join("\n");
		head.appendChild(style);

		return doc.toString();
	},
};
