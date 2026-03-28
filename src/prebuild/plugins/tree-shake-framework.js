import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseHTML } from "linkedom";

// Maps HTML attributes → side-effect module path (relative to no-js src/)
const ATTR_MODULE_MAP = {
	// state
	state: "directives/state.js",
	store: "directives/state.js",
	"persist-fields": "directives/state.js",
	// http
	get: "directives/http.js",
	post: "directives/http.js",
	put: "directives/http.js",
	patch: "directives/http.js",
	delete: "directives/http.js",
	// binding
	bind: "directives/binding.js",
	model: "directives/binding.js",
	// conditionals
	if: "directives/conditionals.js",
	"else-if": "directives/conditionals.js",
	else: "directives/conditionals.js",
	show: "directives/conditionals.js",
	hide: "directives/conditionals.js",
	switch: "directives/conditionals.js",
	// animate attrs imply conditionals (animateIn/Out live there)
	animate: "directives/conditionals.js",
	"animate-enter": "directives/conditionals.js",
	"animate-leave": "directives/conditionals.js",
	transition: "directives/conditionals.js",
	// loops
	for: "directives/loops.js",
	// styling
	"class-if": "directives/styling.js",
	"toggle-class": "directives/styling.js",
	"add-class": "directives/styling.js",
	"remove-class": "directives/styling.js",
	"style-if": "directives/styling.js",
	// events
	on: "directives/events.js",
	// refs
	ref: "directives/refs.js",
	// validation
	validate: "directives/validation.js",
	"form-validate": "directives/validation.js",
	required: "directives/validation.js",
	"min-length": "directives/validation.js",
	"max-length": "directives/validation.js",
	pattern: "directives/validation.js",
	// i18n
	t: "directives/i18n.js",
	"bind-t": "directives/i18n.js",
	lang: "directives/i18n.js",
	// dnd
	draggable: "directives/dnd.js",
	droppable: "directives/dnd.js",
	"drag-handle": "directives/dnd.js",
	// head
	"page-title": "directives/head.js",
	"page-description": "directives/head.js",
	"page-canonical": "directives/head.js",
	"page-jsonld": "directives/head.js",
};

// The side-effect imports in index.js that are candidates for removal
const SIDE_EFFECT_MODULES = new Set([
	"directives/state.js",
	"directives/http.js",
	"directives/binding.js",
	"directives/conditionals.js",
	"directives/loops.js",
	"directives/styling.js",
	"directives/events.js",
	"directives/refs.js",
	"directives/validation.js",
	"directives/i18n.js",
	"directives/dnd.js",
	"directives/head.js",
]);

// Matches a no-js framework script tag src
const NOJS_SCRIPT_RE = /(?:cdn\.no-js\.dev|[/@]no-js\b|\/nojs(?:\.min)?\.js)/i;

export default {
	name: "tree-shake-framework",
	description:
		"Build a minimal no-js bundle with only the directives used in your HTML",

	_usedModules: new Set(),
	_scriptSrc: null,

	async process(html) {
		const { document: doc } = parseHTML(html);

		for (const el of doc.querySelectorAll("*")) {
			for (const attr of el.getAttributeNames()) {
				const mod = ATTR_MODULE_MAP[attr];
				if (mod) this._usedModules.add(mod);
				if (attr.startsWith("on-"))
					this._usedModules.add("directives/events.js");
				if (attr.startsWith("bind-"))
					this._usedModules.add("directives/binding.js");
			}
		}

		if (!this._scriptSrc) {
			for (const script of doc.querySelectorAll("script[src]")) {
				const src = script.getAttribute("src");
				if (NOJS_SCRIPT_RE.test(src)) {
					this._scriptSrc = src;
					break;
				}
			}
		}

		return html;
	},

	async finalize({ outputDir, config, processedFiles }) {
		if (!this._scriptSrc) {
			console.warn(
				"[tree-shake-framework] no no-js script tag found — skipping",
			);
			return this._reset();
		}

		const frameworkSrc = await findFrameworkSrc(outputDir, config);
		if (!frameworkSrc) {
			console.warn(
				"[tree-shake-framework] @erickxavier/no-js source not found — skipping.\n" +
					"  Install the package or set config.frameworkSrc to the src/ directory.",
			);
			return this._reset();
		}

		const keep = new Set(this._usedModules);
		const removed = [...SIDE_EFFECT_MODULES].filter((m) => !keep.has(m));

		const indexContent = await readFile(
			join(frameworkSrc, "index.js"),
			"utf-8",
		);
		const entry = stripUnusedImports(indexContent, keep, frameworkSrc);

		const entryPath = join(outputDir, ".nojs-tree-entry.tmp.js");
		const bundleName = "nojs.bundle.js";

		await writeFile(entryPath, entry, "utf-8");

		try {
			const result = await Bun.build({
				entrypoints: [entryPath],
				outdir: outputDir,
				minify: true,
				treeshaking: true,
				target: "browser",
			});

			if (!result.success) {
				for (const log of result.logs)
					console.error("[tree-shake-framework]", log);
				return;
			}

			// Bun names the output after the entry file; rename to bundleName
			const builtPath = result.outputs[0]?.path;
			if (builtPath && builtPath !== join(outputDir, bundleName)) {
				await rename(builtPath, join(outputDir, bundleName));
			}

			// Replace the no-js script reference in all processed HTML files
			const srcEscaped = this._scriptSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const scriptRe = new RegExp(`(<script[^>]*\\ssrc=")${srcEscaped}"`, "g");
			for (const filePath of processedFiles) {
				const html = await readFile(filePath, "utf-8");
				const updated = html.replace(scriptRe, `$1${bundleName}"`);
				if (updated !== html) await writeFile(filePath, updated, "utf-8");
			}

			const keptNames = [...keep].map((m) =>
				m.replace("directives/", "").replace(".js", ""),
			);
			const removedNames = removed.map((m) =>
				m.replace("directives/", "").replace(".js", ""),
			);
			console.log(
				`[tree-shake-framework] ${join(outputDir, bundleName)}: built` +
					`\n  kept:    ${keptNames.join(", ") || "(core only)"}` +
					`\n  removed: ${removedNames.join(", ") || "none"}`,
			);
		} finally {
			await unlink(entryPath).catch(() => {});
			this._reset();
		}
	},

	_reset() {
		this._usedModules = new Set();
		this._scriptSrc = null;
	},
};

// Strip side-effect imports for unused directive modules and rewrite all
// relative imports to absolute paths so the entry file can live in outputDir.
function stripUnusedImports(src, keep, frameworkSrc) {
	return src
		.replace(/^import "\.\/([^"]+)";\n/gm, (_match, modPath) => {
			if (SIDE_EFFECT_MODULES.has(modPath) && !keep.has(modPath)) return "";
			return `import "${join(frameworkSrc, modPath)}";\n`;
		})
		.replace(
			/^(import\s+.*?from\s+)"\.\/([^"]+)"/gm,
			(_match, prefix, modPath) => {
				return `${prefix}"${join(frameworkSrc, modPath)}"`;
			},
		);
}

// Locate the no-js src/ directory
async function findFrameworkSrc(outputDir, config) {
	if (config.frameworkSrc) {
		const p = resolve(config.frameworkSrc);
		if (await pathExists(join(p, "index.js"))) return p;
	}

	let dir = outputDir;
	for (let i = 0; i < 8; i++) {
		const candidate = join(dir, "node_modules", "@erickxavier", "no-js", "src");
		if (await pathExists(join(candidate, "index.js"))) return candidate;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	return null;
}

async function pathExists(p) {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}
