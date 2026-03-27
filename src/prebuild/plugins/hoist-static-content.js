import { parseHTML } from "linkedom";

const DYNAMIC_ATTRS = new Set([
	"state",
	"store",
	"persist-fields",
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"bind",
	"model",
	"if",
	"else-if",
	"else",
	"show",
	"hide",
	"switch",
	"animate",
	"animate-enter",
	"animate-leave",
	"transition",
	"for",
	"class-if",
	"toggle-class",
	"add-class",
	"remove-class",
	"style-if",
	"on",
	"ref",
	"validate",
	"form-validate",
	"required",
	"min-length",
	"max-length",
	"pattern",
	"t",
	"bind-t",
	"lang",
	"draggable",
	"droppable",
	"drag-handle",
	"page-title",
	"page-description",
	"page-canonical",
	"page-jsonld",
]);

// Simple but effective check for interpolation
const INTERPOLATION_RE = /\$\{/;

/**
 * Static Tree Hoisting Plugin
 *
 * Identifies sub-trees that are completely static (no directives, no interpolation)
 * and marks them with data-nojs-static so the runtime can skip them.
 */
export default {
	name: "hoist-static-content",
	description: "Mark static HTML sub-trees to be skipped by the runtime",

	async process(html) {
		const { document: doc } = parseHTML(html);
		const body = doc.body;
		if (!body) return html;

		const isNodeDynamic = new Map();

		function checkDynamic(node) {
			if (isNodeDynamic.has(node)) return isNodeDynamic.get(node);

			if (node.nodeType === 3) {
				// Text node
				const text = node.textContent || "";
				const dynamic = INTERPOLATION_RE.test(text);
				isNodeDynamic.set(node, dynamic);
				return dynamic;
			}

			if (node.nodeType !== 1) {
				isNodeDynamic.set(node, false);
				return false;
			}

			let selfIsDynamic = false;

			// Check attributes
			for (const attr of node.getAttributeNames()) {
				if (
					DYNAMIC_ATTRS.has(attr) ||
					attr.startsWith("on:") ||
					attr.startsWith("on-") ||
					attr.startsWith("bind-") ||
					INTERPOLATION_RE.test(node.getAttribute(attr) || "")
				) {
					selfIsDynamic = true;
					break;
				}
			}

			let childrenAreDynamic = false;
			for (const child of Array.from(node.childNodes)) {
				if (checkDynamic(child)) {
					childrenAreDynamic = true;
				}
			}

			const dynamic = selfIsDynamic || childrenAreDynamic;
			isNodeDynamic.set(node, dynamic);
			return dynamic;
		}

		checkDynamic(body);

		function markStaticRoots(node, parentIsDynamic) {
			if (node.nodeType !== 1) return;

			const dynamic = isNodeDynamic.get(node);

			if (!dynamic) {
				if (parentIsDynamic) {
					node.setAttribute("data-nojs-static", "");
					return; // Don't recurse into static sub-trees
				}
			} else {
				// Recurse into dynamic nodes to find static sub-roots
				for (const child of Array.from(node.childNodes)) {
					markStaticRoots(child, true);
				}
			}
		}

		// Process children of body, assuming body is the boundary
		const bodyIsDynamic = isNodeDynamic.get(body);
		if (bodyIsDynamic) {
			for (const child of Array.from(body.childNodes)) {
				markStaticRoots(child, true);
			}
		} else {
			// If body is static, mark all its element children
			for (const child of Array.from(body.childNodes)) {
				if (child.nodeType === 1) {
					child.setAttribute("data-nojs-static", "");
				}
			}
		}

		return doc.toString();
	},
};
