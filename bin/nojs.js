// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
	return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
	var canCache = mod != null && typeof mod === "object";
	if (canCache) {
		var cache = isNodeMode
			? (__toESMCache_node ??= new WeakMap())
			: (__toESMCache_esm ??= new WeakMap());
		var cached = cache.get(mod);
		if (cached) return cached;
	}
	target = mod != null ? __create(__getProtoOf(mod)) : {};
	const to =
		isNodeMode || !mod || !mod.__esModule
			? __defProp(target, "default", { value: mod, enumerable: true })
			: target;
	for (const key of __getOwnPropNames(mod))
		if (!__hasOwnProp.call(to, key))
			__defProp(to, key, {
				get: __accessProp.bind(mod, key),
				enumerable: true,
			});
	if (canCache) cache.set(mod, to);
	return to;
};
var __commonJS = (cb, mod) => () => (
	mod || cb((mod = { exports: {} }).exports, mod), mod.exports
);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
	this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
	for (var name in all)
		__defProp(target, name, {
			get: all[name],
			enumerable: true,
			configurable: true,
			set: __exportSetter.bind(all, name),
		});
};
var __esm = (fn, res) => () => (fn && (res = fn((fn = 0))), res);
var __require = import.meta.require;

// src/init/generator.js
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function escapeHtml(str) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
async function generate(answers, cwd = process.cwd()) {
	const root = cwd;
	const files = [];
	await mkdir(root, { recursive: true });
	const indexHtml = buildIndex(answers);
	await writeFile(join(root, "index.html"), indexHtml, "utf-8");
	files.push("index.html");
	if (answers.routing) {
		await mkdir(join(root, "pages"), { recursive: true });
		await writeFile(
			join(root, "pages", "home.tpl"),
			buildPage("home", answers),
			"utf-8",
		);
		files.push("pages/home.tpl");
		await writeFile(
			join(root, "pages", "about.tpl"),
			buildPage("about", answers),
			"utf-8",
		);
		files.push("pages/about.tpl");
	}
	if (answers.i18n && answers.locales) {
		for (const locale of answers.locales) {
			if (!LOCALE_RE.test(locale)) {
				throw new Error(
					`Invalid locale: "${locale}". Expected format: "en" or "en-US".`,
				);
			}
		}
		await mkdir(join(root, "locales"), { recursive: true });
		for (const locale of answers.locales) {
			const content = buildLocaleFile(locale, answers);
			await writeFile(
				join(root, "locales", `${locale}.json`),
				content,
				"utf-8",
			);
			files.push(`locales/${locale}.json`);
		}
	}
	await mkdir(join(root, "assets"), { recursive: true });
	await writeFile(
		join(root, "assets", "style.css"),
		buildCss(answers),
		"utf-8",
	);
	files.push("assets/style.css");
	const config = {
		name: answers.name,
		version: "0.1.0",
		plugins: [],
	};
	await writeFile(
		join(root, "nojs.config.json"),
		`${JSON.stringify(config, null, 2)}
`,
		"utf-8",
	);
	files.push("nojs.config.json");
	return { files };
}
function buildIndex(answers) {
	const parts = [];
	parts.push("<!DOCTYPE html>");
	parts.push(`<html lang="${answers.defaultLocale || "en"}">`);
	parts.push("<head>");
	parts.push('  <meta charset="UTF-8">');
	parts.push(
		'  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
	);
	parts.push(`  <title>${escapeHtml(answers.name)}</title>`);
	parts.push('  <link rel="stylesheet" href="assets/style.css">');
	parts.push(`  <script src="${CDN_URL}"></script>`);
	parts.push("</head>");
	const bodyAttrs = [];
	if (answers.apiUrl) bodyAttrs.push(`base="${escapeHtml(answers.apiUrl)}"`);
	if (answers.i18n)
		bodyAttrs.push(
			`store="app" state="{ locale: '${answers.defaultLocale || "en"}' }"`,
		);
	parts.push(`<body${bodyAttrs.length ? ` ${bodyAttrs.join(" ")}` : ""}>`);
	if (answers.routing) {
		parts.push("");
		parts.push("  <nav>");
		if (answers.i18n) {
			parts.push('    <a route="/" t="nav.home">Home</a>');
			parts.push('    <a route="/about" t="nav.about">About</a>');
		} else {
			parts.push('    <a route="/">Home</a>');
			parts.push('    <a route="/about">About</a>');
		}
		if (answers.i18n) {
			parts.push("");
			parts.push(
				'    <select model="$store.app.locale" on:change="NoJS.locale = $store.app.locale">',
			);
			for (const locale of answers.locales) {
				parts.push(
					`      <option value="${locale}">${locale.toUpperCase()}</option>`,
				);
			}
			parts.push("    </select>");
		}
		parts.push("  </nav>");
	}
	parts.push("");
	if (answers.i18n) {
		parts.push(
			`  <div i18n-config loadPath="locales/{locale}.json" defaultLocale="${answers.defaultLocale}" persist></div>`,
		);
		parts.push("");
	}
	if (answers.routing) {
		parts.push('  <main route-view src="pages/" route-index="home"></main>');
	} else {
		parts.push("  <main>");
		if (answers.i18n) {
			parts.push('    <h1 t="greeting">Hello, No.JS!</h1>');
			parts.push(
				'    <p t="description">Build dynamic web apps with just HTML.</p>',
			);
		} else {
			parts.push("    <h1>Hello, No.JS!</h1>");
			parts.push(
				"    <p>Build dynamic web apps with just HTML attributes.</p>",
			);
		}
		parts.push("");
		parts.push('    <div state="{ count: 0 }">');
		parts.push('      <button on:click="count++">');
		parts.push('        Clicked: <span bind="count"></span> times');
		parts.push("      </button>");
		parts.push("    </div>");
		parts.push("  </main>");
	}
	parts.push("");
	parts.push("</body>");
	parts.push("</html>");
	return `${parts.join(`
`)}
`;
}
function buildPage(name, answers) {
	const parts = [];
	if (name === "home") {
		if (answers.i18n) {
			parts.push("<section>");
			parts.push('  <h1 t="greeting">Hello, No.JS!</h1>');
			parts.push(
				'  <p t="description">Build dynamic web apps with just HTML.</p>',
			);
			parts.push("");
			parts.push('  <div state="{ count: 0 }">');
			parts.push('    <button on:click="count++">');
			parts.push(
				'      <span t="counter">Clicked</span>: <span bind="count"></span>',
			);
			parts.push("    </button>");
			parts.push("  </div>");
			parts.push("</section>");
		} else {
			parts.push("<section>");
			parts.push("  <h1>Hello, No.JS!</h1>");
			parts.push("  <p>Build dynamic web apps with just HTML attributes.</p>");
			parts.push("");
			parts.push('  <div state="{ count: 0 }">');
			parts.push('    <button on:click="count++">');
			parts.push('      Clicked: <span bind="count"></span> times');
			parts.push("    </button>");
			parts.push("  </div>");
			parts.push("</section>");
		}
	} else if (name === "about") {
		if (answers.i18n) {
			parts.push("<section>");
			parts.push('  <h1 t="about.title">About</h1>');
			parts.push('  <p t="about.body">This project was built with No.JS.</p>');
			parts.push("</section>");
		} else {
			parts.push("<section>");
			parts.push("  <h1>About</h1>");
			parts.push(
				"  <p>This project was built with No.JS \u2014 the HTML-first reactive framework.</p>",
			);
			parts.push("</section>");
		}
	}
	return `${parts.join(`
`)}
`;
}
function buildLocaleFile(locale, _answers) {
	const translations = {
		en: {
			"nav.home": "Home",
			"nav.about": "About",
			greeting: "Hello, No.JS!",
			description: "Build dynamic web apps with just HTML.",
			counter: "Clicked",
			"about.title": "About",
			"about.body": "This project was built with No.JS.",
		},
		pt: {
			"nav.home": "In\xEDcio",
			"nav.about": "Sobre",
			greeting: "Ol\xE1, No.JS!",
			description: "Crie apps web din\xE2micos apenas com HTML.",
			counter: "Clicado",
			"about.title": "Sobre",
			"about.body": "Este projeto foi constru\xEDdo com No.JS.",
		},
	};
	const content = translations[locale] || translations.en;
	return `${JSON.stringify(content, null, 2)}
`;
}
function buildCss(_answers) {
	return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 2rem;
}

nav a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

nav a.active {
  color: #1a1a1a;
  font-weight: 700;
}

nav select {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

p {
  color: #6b7280;
  margin-bottom: 1rem;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
}

button:hover {
  background: #2563eb;
}

section {
  padding: 1rem 0;
}
`;
}
var CDN_URL = "https://cdn.no-js.dev/",
	LOCALE_RE;
var init_generator = __esm(() => {
	LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;
});

// src/commands/init.js
var exports_init = {};
__export(exports_init, {
	run: () => run,
});

import { basename, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

async function run(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(HELP.trim());
		return;
	}
	const flags = parseFlags(argv);
	const targetDir = flags.path
		? resolve(process.cwd(), flags.path)
		: process.cwd();
	const skipWizard = flags.yes || allAnswered(flags);
	const rl = skipWizard
		? null
		: createInterface({ input: stdin, output: stdout });
	try {
		const answers = {};
		const dirName = basename(targetDir);
		answers.name =
			flags.name ||
			(skipWizard ? dirName : await ask(rl, "Project name:", dirName));
		answers.routing =
			flags.routing ??
			(skipWizard ? true : await confirm(rl, "Use SPA routing?", true));
		answers.i18n =
			flags.i18n ??
			(skipWizard
				? false
				: await confirm(rl, "Use i18n (internationalization)?", false));
		if (answers.i18n) {
			const localesStr =
				flags.locales ||
				(skipWizard
					? "en, pt"
					: await ask(rl, "Locales (comma-separated):", "en, pt"));
			answers.locales = localesStr
				.split(",")
				.map((l) => l.trim())
				.filter(Boolean);
			answers.defaultLocale =
				flags.defaultLocale ||
				(skipWizard
					? answers.locales[0]
					: await ask(rl, "Default locale:", answers.locales[0]));
		}
		const apiUrl =
			flags.api ??
			(skipWizard
				? ""
				: await ask(rl, "Base API URL (leave empty for none):", ""));
		answers.apiUrl = apiUrl || null;
		console.log("");
		console.log(`Creating project "${answers.name}"...`);
		const result = await generate(answers, targetDir);
		console.log("");
		console.log(`Project created at ${flags.path || "."}`);
		console.log("");
		console.log("  Files:");
		for (const f of result.files) console.log(`    ${f}`);
		console.log("");
		console.log("  Next steps:");
		if (flags.path) console.log(`    cd ${flags.path}`);
		console.log("    nojs dev");
		console.log("");
	} finally {
		rl?.close();
	}
}
function parseFlags(argv) {
	const flags = {
		path: null,
		name: null,
		routing: null,
		i18n: null,
		locales: null,
		defaultLocale: null,
		api: null,
		yes: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--name":
				flags.name = argv[++i];
				break;
			case "--routing":
			case "-r":
				flags.routing = toBool(argv[++i]);
				break;
			case "--i18n":
				flags.i18n = toBool(argv[++i]);
				break;
			case "--locales":
				flags.locales = argv[++i];
				break;
			case "--default-locale":
				flags.defaultLocale = argv[++i];
				break;
			case "--api":
				flags.api = argv[++i];
				break;
			case "--yes":
			case "-y":
				flags.yes = true;
				break;
			default:
				if (!arg.startsWith("-") && !flags.path) flags.path = arg;
				break;
		}
	}
	return flags;
}
function toBool(value) {
	if (!value) return null;
	const v = value.toLowerCase();
	return (
		v === "y" ||
		v === "yes" ||
		v === "s" ||
		v === "sim" ||
		v === "true" ||
		v === "1"
	);
}
function allAnswered(flags) {
	return flags.routing !== null && flags.i18n !== null;
}
async function ask(rl, question, defaultValue) {
	const suffix = defaultValue ? ` (${defaultValue})` : "";
	const answer = await rl.question(`  ${question}${suffix} `);
	return answer.trim() || defaultValue || "";
}
async function confirm(rl, question, defaultValue) {
	const hint = defaultValue ? "(Y/n)" : "(y/N)";
	const answer = await rl.question(`  ${question} ${hint} `);
	const trimmed = answer.trim().toLowerCase();
	if (!trimmed) return defaultValue;
	return (
		trimmed === "y" || trimmed === "yes" || trimmed === "s" || trimmed === "sim"
	);
}
var HELP = `
nojs init (i) \u2014 Scaffold a new No.JS project

Usage:
  nojs init [path] [options]

Arguments:
  path                        Target directory (default: ".")

Options:
  --name <name>               Project name (default: directory name)
  --routing, -r               Enable SPA routing (y/n)
  --i18n                      Enable i18n (y/n)
  --locales <list>            Comma-separated locales (e.g., "en,pt")
  --default-locale <locale>   Default locale
  --api <url>                 Base API URL
  --yes, -y                   Accept all defaults (skip wizard)
  -h, --help                  Show this help

Examples:
  nojs init
  nojs i ./kanban
  nojs i --routing y --i18n y --locales en,pt --default-locale pt
  nojs i ./my-app -y
`;
var init_init = __esm(() => {
	init_generator();
});

// src/prebuild/config.js
import { existsSync } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { pathToFileURL } from "node:url";

async function loadConfig(configPath, cwd = process.cwd()) {
	let userConfig = {};
	const resolvedCwd = resolve2(cwd);
	if (configPath) {
		const abs = resolve2(cwd, configPath);
		if (!abs.startsWith(`${resolvedCwd}/`) && abs !== resolvedCwd) {
			throw new Error(
				`Config file must be within the project directory: ${configPath}`,
			);
		}
		userConfig = await importConfig(abs);
	} else {
		for (const name of CONFIG_FILES) {
			const abs = resolve2(cwd, name);
			if (existsSync(abs)) {
				userConfig = await importConfig(abs);
				break;
			}
		}
	}
	return { ...DEFAULTS, ...sanitizeConfig(userConfig) };
}
function sanitizeConfig(obj) {
	if (obj == null || typeof obj !== "object") return {};
	const clean = {};
	for (const key of Object.keys(obj)) {
		if (POISONED_KEYS.has(key)) continue;
		clean[key] = obj[key];
	}
	return clean;
}
async function importConfig(absPath) {
	const mod = await import(pathToFileURL(absPath).href);
	return mod.default ?? mod;
}
var CONFIG_FILES, DEFAULTS, POISONED_KEYS;
var init_config = __esm(() => {
	CONFIG_FILES = ["nojs-prebuild.config.js", "nojs-prebuild.config.mjs"];
	DEFAULTS = Object.freeze({
		input: "**/*.html",
		output: null,
		plugins: {},
	});
	POISONED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
});

// src/prebuild/html.js
import { glob } from "node:fs";
import {
	mkdir as mkdir2,
	readFile,
	writeFile as writeFile2,
} from "node:fs/promises";
import {
	dirname,
	join as join2,
	relative,
	resolve as resolve3,
} from "node:path";

function discoverFiles(pattern, cwd = process.cwd()) {
	return new Promise((res, rej) => {
		glob(pattern, { cwd, withFileTypes: false }, (err, matches) => {
			if (err) return rej(err);
			res(matches.map((m) => resolve3(cwd, m)));
		});
	});
}
async function readHtml(filePath) {
	return readFile(filePath, "utf-8");
}
async function writeHtml(filePath, html, { outputDir, cwd } = {}) {
	let dest = filePath;
	if (outputDir) {
		const rel = relative(cwd || process.cwd(), filePath);
		dest = join2(resolve3(outputDir), rel);
	}
	await mkdir2(dirname(dest), { recursive: true });
	await writeFile2(dest, html, "utf-8");
	return dest;
}
var init_html = () => {};

// node_modules/linkedom/esm/shared/symbols.js
var CHANGED,
	CLASS_LIST,
	CUSTOM_ELEMENTS,
	CONTENT,
	DATASET,
	DOCTYPE,
	DOM_PARSER,
	END,
	EVENT_TARGET,
	GLOBALS,
	IMAGE,
	MIME,
	MUTATION_OBSERVER,
	NEXT,
	OWNER_ELEMENT,
	PREV,
	PRIVATE,
	SHEET,
	START,
	STYLE,
	UPGRADE,
	VALUE;
var init_symbols = __esm(() => {
	CHANGED = Symbol("changed");
	CLASS_LIST = Symbol("classList");
	CUSTOM_ELEMENTS = Symbol("CustomElements");
	CONTENT = Symbol("content");
	DATASET = Symbol("dataset");
	DOCTYPE = Symbol("doctype");
	DOM_PARSER = Symbol("DOMParser");
	END = Symbol("end");
	EVENT_TARGET = Symbol("EventTarget");
	GLOBALS = Symbol("globals");
	IMAGE = Symbol("image");
	MIME = Symbol("mime");
	MUTATION_OBSERVER = Symbol("MutationObserver");
	NEXT = Symbol("next");
	OWNER_ELEMENT = Symbol("ownerElement");
	PREV = Symbol("prev");
	PRIVATE = Symbol("private");
	SHEET = Symbol("sheet");
	START = Symbol("start");
	STYLE = Symbol("style");
	UPGRADE = Symbol("upgrade");
	VALUE = Symbol("value");
});

// node_modules/entities/dist/esm/decode-codepoint.js
function replaceCodePoint(codePoint) {
	var _a2;
	if ((codePoint >= 55296 && codePoint <= 57343) || codePoint > 1114111) {
		return 65533;
	}
	return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== undefined
		? _a2
		: codePoint;
}
var _a, decodeMap, fromCodePoint;
var init_decode_codepoint = __esm(() => {
	decodeMap = new Map([
		[0, 65533],
		[128, 8364],
		[130, 8218],
		[131, 402],
		[132, 8222],
		[133, 8230],
		[134, 8224],
		[135, 8225],
		[136, 710],
		[137, 8240],
		[138, 352],
		[139, 8249],
		[140, 338],
		[142, 381],
		[145, 8216],
		[146, 8217],
		[147, 8220],
		[148, 8221],
		[149, 8226],
		[150, 8211],
		[151, 8212],
		[152, 732],
		[153, 8482],
		[154, 353],
		[155, 8250],
		[156, 339],
		[158, 382],
		[159, 376],
	]);
	fromCodePoint =
		(_a = String.fromCodePoint) !== null && _a !== undefined
			? _a
			: (codePoint) => {
					let output = "";
					if (codePoint > 65535) {
						codePoint -= 65536;
						output += String.fromCharCode(((codePoint >>> 10) & 1023) | 55296);
						codePoint = 56320 | (codePoint & 1023);
					}
					output += String.fromCharCode(codePoint);
					return output;
				};
});

// node_modules/entities/dist/esm/internal/decode-shared.js
function decodeBase64(input) {
	const binary =
		typeof atob === "function"
			? atob(input)
			: typeof Buffer.from === "function"
				? Buffer.from(input, "base64").toString("binary")
				: new Buffer(input, "base64").toString("binary");
	const evenLength = binary.length & ~1;
	const out = new Uint16Array(evenLength / 2);
	for (let index = 0, outIndex = 0; index < evenLength; index += 2) {
		const lo = binary.charCodeAt(index);
		const hi = binary.charCodeAt(index + 1);
		out[outIndex++] = lo | (hi << 8);
	}
	return out;
}

// node_modules/entities/dist/esm/generated/decode-data-html.js
var htmlDecodeTree;
var init_decode_data_html = __esm(() => {
	htmlDecodeTree = /* @__PURE__ */ decodeBase64(
		"QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IA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YwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWls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ZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg",
	);
});

// node_modules/entities/dist/esm/generated/decode-data-xml.js
var xmlDecodeTree;
var init_decode_data_xml = __esm(() => {
	xmlDecodeTree = /* @__PURE__ */ decodeBase64(
		"AAJhZ2xxBwARABMAFQBtAg0AAAAAAA8AcAAmYG8AcwAnYHQAPmB0ADxg9SFvdCJg",
	);
});

// node_modules/entities/dist/esm/internal/bin-trie-flags.js
var BinTrieFlags;
var init_bin_trie_flags = __esm(() => {
	((BinTrieFlags2) => {
		BinTrieFlags2[(BinTrieFlags2.VALUE_LENGTH = 49152)] = "VALUE_LENGTH";
		BinTrieFlags2[(BinTrieFlags2.FLAG13 = 8192)] = "FLAG13";
		BinTrieFlags2[(BinTrieFlags2.BRANCH_LENGTH = 8064)] = "BRANCH_LENGTH";
		BinTrieFlags2[(BinTrieFlags2.JUMP_TABLE = 127)] = "JUMP_TABLE";
	})(BinTrieFlags || (BinTrieFlags = {}));
});

// node_modules/entities/dist/esm/decode.js
function isNumber(code) {
	return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
	return (
		(code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F) ||
		(code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F)
	);
}
function isAsciiAlphaNumeric(code) {
	return (
		(code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z) ||
		(code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z) ||
		isNumber(code)
	);
}
function isEntityInAttributeInvalidEnd(code) {
	return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}

class EntityDecoder {
	constructor(decodeTree, emitCodePoint, errors) {
		this.decodeTree = decodeTree;
		this.emitCodePoint = emitCodePoint;
		this.errors = errors;
		this.state = EntityDecoderState.EntityStart;
		this.consumed = 1;
		this.result = 0;
		this.treeIndex = 0;
		this.excess = 1;
		this.decodeMode = DecodingMode.Strict;
		this.runConsumed = 0;
	}
	startEntity(decodeMode) {
		this.decodeMode = decodeMode;
		this.state = EntityDecoderState.EntityStart;
		this.result = 0;
		this.treeIndex = 0;
		this.excess = 1;
		this.consumed = 1;
		this.runConsumed = 0;
	}
	write(input, offset) {
		switch (this.state) {
			case EntityDecoderState.EntityStart: {
				if (input.charCodeAt(offset) === CharCodes.NUM) {
					this.state = EntityDecoderState.NumericStart;
					this.consumed += 1;
					return this.stateNumericStart(input, offset + 1);
				}
				this.state = EntityDecoderState.NamedEntity;
				return this.stateNamedEntity(input, offset);
			}
			case EntityDecoderState.NumericStart: {
				return this.stateNumericStart(input, offset);
			}
			case EntityDecoderState.NumericDecimal: {
				return this.stateNumericDecimal(input, offset);
			}
			case EntityDecoderState.NumericHex: {
				return this.stateNumericHex(input, offset);
			}
			case EntityDecoderState.NamedEntity: {
				return this.stateNamedEntity(input, offset);
			}
		}
	}
	stateNumericStart(input, offset) {
		if (offset >= input.length) {
			return -1;
		}
		if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
			this.state = EntityDecoderState.NumericHex;
			this.consumed += 1;
			return this.stateNumericHex(input, offset + 1);
		}
		this.state = EntityDecoderState.NumericDecimal;
		return this.stateNumericDecimal(input, offset);
	}
	stateNumericHex(input, offset) {
		while (offset < input.length) {
			const char = input.charCodeAt(offset);
			if (isNumber(char) || isHexadecimalCharacter(char)) {
				const digit =
					char <= CharCodes.NINE
						? char - CharCodes.ZERO
						: (char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10;
				this.result = this.result * 16 + digit;
				this.consumed++;
				offset++;
			} else {
				return this.emitNumericEntity(char, 3);
			}
		}
		return -1;
	}
	stateNumericDecimal(input, offset) {
		while (offset < input.length) {
			const char = input.charCodeAt(offset);
			if (isNumber(char)) {
				this.result = this.result * 10 + (char - CharCodes.ZERO);
				this.consumed++;
				offset++;
			} else {
				return this.emitNumericEntity(char, 2);
			}
		}
		return -1;
	}
	emitNumericEntity(lastCp, expectedLength) {
		var _a2;
		if (this.consumed <= expectedLength) {
			(_a2 = this.errors) === null ||
				_a2 === undefined ||
				_a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
			return 0;
		}
		if (lastCp === CharCodes.SEMI) {
			this.consumed += 1;
		} else if (this.decodeMode === DecodingMode.Strict) {
			return 0;
		}
		this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
		if (this.errors) {
			if (lastCp !== CharCodes.SEMI) {
				this.errors.missingSemicolonAfterCharacterReference();
			}
			this.errors.validateNumericCharacterReference(this.result);
		}
		return this.consumed;
	}
	stateNamedEntity(input, offset) {
		const { decodeTree } = this;
		let current = decodeTree[this.treeIndex];
		let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
		while (offset < input.length) {
			if (valueLength === 0 && (current & BinTrieFlags.FLAG13) !== 0) {
				const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
				if (this.runConsumed === 0) {
					const firstChar = current & BinTrieFlags.JUMP_TABLE;
					if (input.charCodeAt(offset) !== firstChar) {
						return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
					}
					offset++;
					this.excess++;
					this.runConsumed++;
				}
				while (this.runConsumed < runLength) {
					if (offset >= input.length) {
						return -1;
					}
					const charIndexInPacked = this.runConsumed - 1;
					const packedWord =
						decodeTree[this.treeIndex + 1 + (charIndexInPacked >> 1)];
					const expectedChar =
						charIndexInPacked % 2 === 0
							? packedWord & 255
							: (packedWord >> 8) & 255;
					if (input.charCodeAt(offset) !== expectedChar) {
						this.runConsumed = 0;
						return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
					}
					offset++;
					this.excess++;
					this.runConsumed++;
				}
				this.runConsumed = 0;
				this.treeIndex += 1 + (runLength >> 1);
				current = decodeTree[this.treeIndex];
				valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
			}
			if (offset >= input.length) break;
			const char = input.charCodeAt(offset);
			if (
				char === CharCodes.SEMI &&
				valueLength !== 0 &&
				(current & BinTrieFlags.FLAG13) !== 0
			) {
				return this.emitNamedEntityData(
					this.treeIndex,
					valueLength,
					this.consumed + this.excess,
				);
			}
			this.treeIndex = determineBranch(
				decodeTree,
				current,
				this.treeIndex + Math.max(1, valueLength),
				char,
			);
			if (this.treeIndex < 0) {
				return this.result === 0 ||
					(this.decodeMode === DecodingMode.Attribute &&
						(valueLength === 0 || isEntityInAttributeInvalidEnd(char)))
					? 0
					: this.emitNotTerminatedNamedEntity();
			}
			current = decodeTree[this.treeIndex];
			valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
			if (valueLength !== 0) {
				if (char === CharCodes.SEMI) {
					return this.emitNamedEntityData(
						this.treeIndex,
						valueLength,
						this.consumed + this.excess,
					);
				}
				if (
					this.decodeMode !== DecodingMode.Strict &&
					(current & BinTrieFlags.FLAG13) === 0
				) {
					this.result = this.treeIndex;
					this.consumed += this.excess;
					this.excess = 0;
				}
			}
			offset++;
			this.excess++;
		}
		return -1;
	}
	emitNotTerminatedNamedEntity() {
		var _a2;
		const { result, decodeTree } = this;
		const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
		this.emitNamedEntityData(result, valueLength, this.consumed);
		(_a2 = this.errors) === null ||
			_a2 === undefined ||
			_a2.missingSemicolonAfterCharacterReference();
		return this.consumed;
	}
	emitNamedEntityData(result, valueLength, consumed) {
		const { decodeTree } = this;
		this.emitCodePoint(
			valueLength === 1
				? decodeTree[result] &
						~(BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)
				: decodeTree[result + 1],
			consumed,
		);
		if (valueLength === 3) {
			this.emitCodePoint(decodeTree[result + 2], consumed);
		}
		return consumed;
	}
	end() {
		var _a2;
		switch (this.state) {
			case EntityDecoderState.NamedEntity: {
				return this.result !== 0 &&
					(this.decodeMode !== DecodingMode.Attribute ||
						this.result === this.treeIndex)
					? this.emitNotTerminatedNamedEntity()
					: 0;
			}
			case EntityDecoderState.NumericDecimal: {
				return this.emitNumericEntity(0, 2);
			}
			case EntityDecoderState.NumericHex: {
				return this.emitNumericEntity(0, 3);
			}
			case EntityDecoderState.NumericStart: {
				(_a2 = this.errors) === null ||
					_a2 === undefined ||
					_a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
				return 0;
			}
			case EntityDecoderState.EntityStart: {
				return 0;
			}
		}
	}
}
function determineBranch(decodeTree, current, nodeIndex, char) {
	const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
	const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
	if (branchCount === 0) {
		return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
	}
	if (jumpOffset) {
		const value = char - jumpOffset;
		return value < 0 || value >= branchCount
			? -1
			: decodeTree[nodeIndex + value] - 1;
	}
	const packedKeySlots = (branchCount + 1) >> 1;
	let lo = 0;
	let hi = branchCount - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		const slot = mid >> 1;
		const packed = decodeTree[nodeIndex + slot];
		const midKey = (packed >> ((mid & 1) * 8)) & 255;
		if (midKey < char) {
			lo = mid + 1;
		} else if (midKey > char) {
			hi = mid - 1;
		} else {
			return decodeTree[nodeIndex + packedKeySlots + mid];
		}
	}
	return -1;
}
var CharCodes,
	TO_LOWER_BIT = 32,
	EntityDecoderState,
	DecodingMode;
var init_decode = __esm(() => {
	init_decode_codepoint();
	init_bin_trie_flags();
	init_decode_codepoint();
	init_decode_data_html();
	init_decode_data_xml();
	((CharCodes2) => {
		CharCodes2[(CharCodes2.NUM = 35)] = "NUM";
		CharCodes2[(CharCodes2.SEMI = 59)] = "SEMI";
		CharCodes2[(CharCodes2.EQUALS = 61)] = "EQUALS";
		CharCodes2[(CharCodes2.ZERO = 48)] = "ZERO";
		CharCodes2[(CharCodes2.NINE = 57)] = "NINE";
		CharCodes2[(CharCodes2.LOWER_A = 97)] = "LOWER_A";
		CharCodes2[(CharCodes2.LOWER_F = 102)] = "LOWER_F";
		CharCodes2[(CharCodes2.LOWER_X = 120)] = "LOWER_X";
		CharCodes2[(CharCodes2.LOWER_Z = 122)] = "LOWER_Z";
		CharCodes2[(CharCodes2.UPPER_A = 65)] = "UPPER_A";
		CharCodes2[(CharCodes2.UPPER_F = 70)] = "UPPER_F";
		CharCodes2[(CharCodes2.UPPER_Z = 90)] = "UPPER_Z";
	})(CharCodes || (CharCodes = {}));
	((EntityDecoderState2) => {
		EntityDecoderState2[(EntityDecoderState2.EntityStart = 0)] = "EntityStart";
		EntityDecoderState2[(EntityDecoderState2.NumericStart = 1)] =
			"NumericStart";
		EntityDecoderState2[(EntityDecoderState2.NumericDecimal = 2)] =
			"NumericDecimal";
		EntityDecoderState2[(EntityDecoderState2.NumericHex = 3)] = "NumericHex";
		EntityDecoderState2[(EntityDecoderState2.NamedEntity = 4)] = "NamedEntity";
	})(EntityDecoderState || (EntityDecoderState = {}));
	((DecodingMode2) => {
		DecodingMode2[(DecodingMode2.Legacy = 0)] = "Legacy";
		DecodingMode2[(DecodingMode2.Strict = 1)] = "Strict";
		DecodingMode2[(DecodingMode2.Attribute = 2)] = "Attribute";
	})(DecodingMode || (DecodingMode = {}));
});

// node_modules/htmlparser2/dist/esm/Tokenizer.js
function isWhitespace(c) {
	return (
		c === CharCodes2.Space ||
		c === CharCodes2.NewLine ||
		c === CharCodes2.Tab ||
		c === CharCodes2.FormFeed ||
		c === CharCodes2.CarriageReturn
	);
}
function isEndOfTagSection(c) {
	return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
function isASCIIAlpha(c) {
	return (
		(c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ) ||
		(c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ)
	);
}

class Tokenizer {
	constructor({ xmlMode = false, decodeEntities = true }, cbs) {
		this.cbs = cbs;
		this.state = State.Text;
		this.buffer = "";
		this.sectionStart = 0;
		this.index = 0;
		this.entityStart = 0;
		this.baseState = State.Text;
		this.isSpecial = false;
		this.running = true;
		this.offset = 0;
		this.currentSequence = undefined;
		this.sequenceIndex = 0;
		this.xmlMode = xmlMode;
		this.decodeEntities = decodeEntities;
		this.entityDecoder = new EntityDecoder(
			xmlMode ? xmlDecodeTree : htmlDecodeTree,
			(cp, consumed) => this.emitCodePoint(cp, consumed),
		);
	}
	reset() {
		this.state = State.Text;
		this.buffer = "";
		this.sectionStart = 0;
		this.index = 0;
		this.baseState = State.Text;
		this.currentSequence = undefined;
		this.running = true;
		this.offset = 0;
	}
	write(chunk) {
		this.offset += this.buffer.length;
		this.buffer = chunk;
		this.parse();
	}
	end() {
		if (this.running) this.finish();
	}
	pause() {
		this.running = false;
	}
	resume() {
		this.running = true;
		if (this.index < this.buffer.length + this.offset) {
			this.parse();
		}
	}
	stateText(c) {
		if (
			c === CharCodes2.Lt ||
			(!this.decodeEntities && this.fastForwardTo(CharCodes2.Lt))
		) {
			if (this.index > this.sectionStart) {
				this.cbs.ontext(this.sectionStart, this.index);
			}
			this.state = State.BeforeTagName;
			this.sectionStart = this.index;
		} else if (this.decodeEntities && c === CharCodes2.Amp) {
			this.startEntity();
		}
	}
	stateSpecialStartSequence(c) {
		const isEnd = this.sequenceIndex === this.currentSequence.length;
		const isMatch = isEnd
			? isEndOfTagSection(c)
			: (c | 32) === this.currentSequence[this.sequenceIndex];
		if (!isMatch) {
			this.isSpecial = false;
		} else if (!isEnd) {
			this.sequenceIndex++;
			return;
		}
		this.sequenceIndex = 0;
		this.state = State.InTagName;
		this.stateInTagName(c);
	}
	stateInSpecialTag(c) {
		if (this.sequenceIndex === this.currentSequence.length) {
			if (c === CharCodes2.Gt || isWhitespace(c)) {
				const endOfText = this.index - this.currentSequence.length;
				if (this.sectionStart < endOfText) {
					const actualIndex = this.index;
					this.index = endOfText;
					this.cbs.ontext(this.sectionStart, endOfText);
					this.index = actualIndex;
				}
				this.isSpecial = false;
				this.sectionStart = endOfText + 2;
				this.stateInClosingTagName(c);
				return;
			}
			this.sequenceIndex = 0;
		}
		if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
			this.sequenceIndex += 1;
		} else if (this.sequenceIndex === 0) {
			if (this.currentSequence === Sequences.TitleEnd) {
				if (this.decodeEntities && c === CharCodes2.Amp) {
					this.startEntity();
				}
			} else if (this.fastForwardTo(CharCodes2.Lt)) {
				this.sequenceIndex = 1;
			}
		} else {
			this.sequenceIndex = Number(c === CharCodes2.Lt);
		}
	}
	stateCDATASequence(c) {
		if (c === Sequences.Cdata[this.sequenceIndex]) {
			if (++this.sequenceIndex === Sequences.Cdata.length) {
				this.state = State.InCommentLike;
				this.currentSequence = Sequences.CdataEnd;
				this.sequenceIndex = 0;
				this.sectionStart = this.index + 1;
			}
		} else {
			this.sequenceIndex = 0;
			this.state = State.InDeclaration;
			this.stateInDeclaration(c);
		}
	}
	fastForwardTo(c) {
		while (++this.index < this.buffer.length + this.offset) {
			if (this.buffer.charCodeAt(this.index - this.offset) === c) {
				return true;
			}
		}
		this.index = this.buffer.length + this.offset - 1;
		return false;
	}
	stateInCommentLike(c) {
		if (c === this.currentSequence[this.sequenceIndex]) {
			if (++this.sequenceIndex === this.currentSequence.length) {
				if (this.currentSequence === Sequences.CdataEnd) {
					this.cbs.oncdata(this.sectionStart, this.index, 2);
				} else {
					this.cbs.oncomment(this.sectionStart, this.index, 2);
				}
				this.sequenceIndex = 0;
				this.sectionStart = this.index + 1;
				this.state = State.Text;
			}
		} else if (this.sequenceIndex === 0) {
			if (this.fastForwardTo(this.currentSequence[0])) {
				this.sequenceIndex = 1;
			}
		} else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
			this.sequenceIndex = 0;
		}
	}
	isTagStartChar(c) {
		return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
	}
	startSpecial(sequence, offset) {
		this.isSpecial = true;
		this.currentSequence = sequence;
		this.sequenceIndex = offset;
		this.state = State.SpecialStartSequence;
	}
	stateBeforeTagName(c) {
		if (c === CharCodes2.ExclamationMark) {
			this.state = State.BeforeDeclaration;
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes2.Questionmark) {
			this.state = State.InProcessingInstruction;
			this.sectionStart = this.index + 1;
		} else if (this.isTagStartChar(c)) {
			const lower = c | 32;
			this.sectionStart = this.index;
			if (this.xmlMode) {
				this.state = State.InTagName;
			} else if (lower === Sequences.ScriptEnd[2]) {
				this.state = State.BeforeSpecialS;
			} else if (
				lower === Sequences.TitleEnd[2] ||
				lower === Sequences.XmpEnd[2]
			) {
				this.state = State.BeforeSpecialT;
			} else {
				this.state = State.InTagName;
			}
		} else if (c === CharCodes2.Slash) {
			this.state = State.BeforeClosingTagName;
		} else {
			this.state = State.Text;
			this.stateText(c);
		}
	}
	stateInTagName(c) {
		if (isEndOfTagSection(c)) {
			this.cbs.onopentagname(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		}
	}
	stateBeforeClosingTagName(c) {
		if (isWhitespace(c)) {
		} else if (c === CharCodes2.Gt) {
			this.state = State.Text;
		} else {
			this.state = this.isTagStartChar(c)
				? State.InClosingTagName
				: State.InSpecialComment;
			this.sectionStart = this.index;
		}
	}
	stateInClosingTagName(c) {
		if (c === CharCodes2.Gt || isWhitespace(c)) {
			this.cbs.onclosetag(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.state = State.AfterClosingTagName;
			this.stateAfterClosingTagName(c);
		}
	}
	stateAfterClosingTagName(c) {
		if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	stateBeforeAttributeName(c) {
		if (c === CharCodes2.Gt) {
			this.cbs.onopentagend(this.index);
			if (this.isSpecial) {
				this.state = State.InSpecialTag;
				this.sequenceIndex = 0;
			} else {
				this.state = State.Text;
			}
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes2.Slash) {
			this.state = State.InSelfClosingTag;
		} else if (!isWhitespace(c)) {
			this.state = State.InAttributeName;
			this.sectionStart = this.index;
		}
	}
	stateInSelfClosingTag(c) {
		if (c === CharCodes2.Gt) {
			this.cbs.onselfclosingtag(this.index);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
			this.isSpecial = false;
		} else if (!isWhitespace(c)) {
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		}
	}
	stateInAttributeName(c) {
		if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
			this.cbs.onattribname(this.sectionStart, this.index);
			this.sectionStart = this.index;
			this.state = State.AfterAttributeName;
			this.stateAfterAttributeName(c);
		}
	}
	stateAfterAttributeName(c) {
		if (c === CharCodes2.Eq) {
			this.state = State.BeforeAttributeValue;
		} else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
			this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
			this.sectionStart = -1;
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		} else if (!isWhitespace(c)) {
			this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
			this.state = State.InAttributeName;
			this.sectionStart = this.index;
		}
	}
	stateBeforeAttributeValue(c) {
		if (c === CharCodes2.DoubleQuote) {
			this.state = State.InAttributeValueDq;
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes2.SingleQuote) {
			this.state = State.InAttributeValueSq;
			this.sectionStart = this.index + 1;
		} else if (!isWhitespace(c)) {
			this.sectionStart = this.index;
			this.state = State.InAttributeValueNq;
			this.stateInAttributeValueNoQuotes(c);
		}
	}
	handleInAttributeValue(c, quote) {
		if (c === quote || (!this.decodeEntities && this.fastForwardTo(quote))) {
			this.cbs.onattribdata(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.cbs.onattribend(
				quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single,
				this.index + 1,
			);
			this.state = State.BeforeAttributeName;
		} else if (this.decodeEntities && c === CharCodes2.Amp) {
			this.startEntity();
		}
	}
	stateInAttributeValueDoubleQuotes(c) {
		this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
	}
	stateInAttributeValueSingleQuotes(c) {
		this.handleInAttributeValue(c, CharCodes2.SingleQuote);
	}
	stateInAttributeValueNoQuotes(c) {
		if (isWhitespace(c) || c === CharCodes2.Gt) {
			this.cbs.onattribdata(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.cbs.onattribend(QuoteType.Unquoted, this.index);
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		} else if (this.decodeEntities && c === CharCodes2.Amp) {
			this.startEntity();
		}
	}
	stateBeforeDeclaration(c) {
		if (c === CharCodes2.OpeningSquareBracket) {
			this.state = State.CDATASequence;
			this.sequenceIndex = 0;
		} else {
			this.state =
				c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
		}
	}
	stateInDeclaration(c) {
		if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
			this.cbs.ondeclaration(this.sectionStart, this.index);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	stateInProcessingInstruction(c) {
		if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
			this.cbs.onprocessinginstruction(this.sectionStart, this.index);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	stateBeforeComment(c) {
		if (c === CharCodes2.Dash) {
			this.state = State.InCommentLike;
			this.currentSequence = Sequences.CommentEnd;
			this.sequenceIndex = 2;
			this.sectionStart = this.index + 1;
		} else {
			this.state = State.InDeclaration;
		}
	}
	stateInSpecialComment(c) {
		if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
			this.cbs.oncomment(this.sectionStart, this.index, 0);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	stateBeforeSpecialS(c) {
		const lower = c | 32;
		if (lower === Sequences.ScriptEnd[3]) {
			this.startSpecial(Sequences.ScriptEnd, 4);
		} else if (lower === Sequences.StyleEnd[3]) {
			this.startSpecial(Sequences.StyleEnd, 4);
		} else {
			this.state = State.InTagName;
			this.stateInTagName(c);
		}
	}
	stateBeforeSpecialT(c) {
		const lower = c | 32;
		switch (lower) {
			case Sequences.TitleEnd[3]: {
				this.startSpecial(Sequences.TitleEnd, 4);
				break;
			}
			case Sequences.TextareaEnd[3]: {
				this.startSpecial(Sequences.TextareaEnd, 4);
				break;
			}
			case Sequences.XmpEnd[3]: {
				this.startSpecial(Sequences.XmpEnd, 4);
				break;
			}
			default: {
				this.state = State.InTagName;
				this.stateInTagName(c);
			}
		}
	}
	startEntity() {
		this.baseState = this.state;
		this.state = State.InEntity;
		this.entityStart = this.index;
		this.entityDecoder.startEntity(
			this.xmlMode
				? DecodingMode.Strict
				: this.baseState === State.Text || this.baseState === State.InSpecialTag
					? DecodingMode.Legacy
					: DecodingMode.Attribute,
		);
	}
	stateInEntity() {
		const indexInBuffer = this.index - this.offset;
		const length = this.entityDecoder.write(this.buffer, indexInBuffer);
		if (length >= 0) {
			this.state = this.baseState;
			if (length === 0) {
				this.index -= 1;
			}
		} else {
			if (
				indexInBuffer < this.buffer.length &&
				this.buffer.charCodeAt(indexInBuffer) === CharCodes2.Amp
			) {
				this.state = this.baseState;
				this.index -= 1;
				return;
			}
			this.index = this.offset + this.buffer.length - 1;
		}
	}
	cleanup() {
		if (this.running && this.sectionStart !== this.index) {
			if (
				this.state === State.Text ||
				(this.state === State.InSpecialTag && this.sequenceIndex === 0)
			) {
				this.cbs.ontext(this.sectionStart, this.index);
				this.sectionStart = this.index;
			} else if (
				this.state === State.InAttributeValueDq ||
				this.state === State.InAttributeValueSq ||
				this.state === State.InAttributeValueNq
			) {
				this.cbs.onattribdata(this.sectionStart, this.index);
				this.sectionStart = this.index;
			}
		}
	}
	shouldContinue() {
		return this.index < this.buffer.length + this.offset && this.running;
	}
	parse() {
		while (this.shouldContinue()) {
			const c = this.buffer.charCodeAt(this.index - this.offset);
			switch (this.state) {
				case State.Text: {
					this.stateText(c);
					break;
				}
				case State.SpecialStartSequence: {
					this.stateSpecialStartSequence(c);
					break;
				}
				case State.InSpecialTag: {
					this.stateInSpecialTag(c);
					break;
				}
				case State.CDATASequence: {
					this.stateCDATASequence(c);
					break;
				}
				case State.InAttributeValueDq: {
					this.stateInAttributeValueDoubleQuotes(c);
					break;
				}
				case State.InAttributeName: {
					this.stateInAttributeName(c);
					break;
				}
				case State.InCommentLike: {
					this.stateInCommentLike(c);
					break;
				}
				case State.InSpecialComment: {
					this.stateInSpecialComment(c);
					break;
				}
				case State.BeforeAttributeName: {
					this.stateBeforeAttributeName(c);
					break;
				}
				case State.InTagName: {
					this.stateInTagName(c);
					break;
				}
				case State.InClosingTagName: {
					this.stateInClosingTagName(c);
					break;
				}
				case State.BeforeTagName: {
					this.stateBeforeTagName(c);
					break;
				}
				case State.AfterAttributeName: {
					this.stateAfterAttributeName(c);
					break;
				}
				case State.InAttributeValueSq: {
					this.stateInAttributeValueSingleQuotes(c);
					break;
				}
				case State.BeforeAttributeValue: {
					this.stateBeforeAttributeValue(c);
					break;
				}
				case State.BeforeClosingTagName: {
					this.stateBeforeClosingTagName(c);
					break;
				}
				case State.AfterClosingTagName: {
					this.stateAfterClosingTagName(c);
					break;
				}
				case State.BeforeSpecialS: {
					this.stateBeforeSpecialS(c);
					break;
				}
				case State.BeforeSpecialT: {
					this.stateBeforeSpecialT(c);
					break;
				}
				case State.InAttributeValueNq: {
					this.stateInAttributeValueNoQuotes(c);
					break;
				}
				case State.InSelfClosingTag: {
					this.stateInSelfClosingTag(c);
					break;
				}
				case State.InDeclaration: {
					this.stateInDeclaration(c);
					break;
				}
				case State.BeforeDeclaration: {
					this.stateBeforeDeclaration(c);
					break;
				}
				case State.BeforeComment: {
					this.stateBeforeComment(c);
					break;
				}
				case State.InProcessingInstruction: {
					this.stateInProcessingInstruction(c);
					break;
				}
				case State.InEntity: {
					this.stateInEntity();
					break;
				}
			}
			this.index++;
		}
		this.cleanup();
	}
	finish() {
		if (this.state === State.InEntity) {
			this.entityDecoder.end();
			this.state = this.baseState;
		}
		this.handleTrailingData();
		this.cbs.onend();
	}
	handleTrailingData() {
		const endIndex = this.buffer.length + this.offset;
		if (this.sectionStart >= endIndex) {
			return;
		}
		if (this.state === State.InCommentLike) {
			if (this.currentSequence === Sequences.CdataEnd) {
				this.cbs.oncdata(this.sectionStart, endIndex, 0);
			} else {
				this.cbs.oncomment(this.sectionStart, endIndex, 0);
			}
		} else if (
			this.state === State.InTagName ||
			this.state === State.BeforeAttributeName ||
			this.state === State.BeforeAttributeValue ||
			this.state === State.AfterAttributeName ||
			this.state === State.InAttributeName ||
			this.state === State.InAttributeValueSq ||
			this.state === State.InAttributeValueDq ||
			this.state === State.InAttributeValueNq ||
			this.state === State.InClosingTagName
		) {
		} else {
			this.cbs.ontext(this.sectionStart, endIndex);
		}
	}
	emitCodePoint(cp, consumed) {
		if (
			this.baseState !== State.Text &&
			this.baseState !== State.InSpecialTag
		) {
			if (this.sectionStart < this.entityStart) {
				this.cbs.onattribdata(this.sectionStart, this.entityStart);
			}
			this.sectionStart = this.entityStart + consumed;
			this.index = this.sectionStart - 1;
			this.cbs.onattribentity(cp);
		} else {
			if (this.sectionStart < this.entityStart) {
				this.cbs.ontext(this.sectionStart, this.entityStart);
			}
			this.sectionStart = this.entityStart + consumed;
			this.index = this.sectionStart - 1;
			this.cbs.ontextentity(cp, this.sectionStart);
		}
	}
}
var CharCodes2, State, QuoteType, Sequences;
var init_Tokenizer = __esm(() => {
	init_decode();
	((CharCodes3) => {
		CharCodes3[(CharCodes3.Tab = 9)] = "Tab";
		CharCodes3[(CharCodes3.NewLine = 10)] = "NewLine";
		CharCodes3[(CharCodes3.FormFeed = 12)] = "FormFeed";
		CharCodes3[(CharCodes3.CarriageReturn = 13)] = "CarriageReturn";
		CharCodes3[(CharCodes3.Space = 32)] = "Space";
		CharCodes3[(CharCodes3.ExclamationMark = 33)] = "ExclamationMark";
		CharCodes3[(CharCodes3.Number = 35)] = "Number";
		CharCodes3[(CharCodes3.Amp = 38)] = "Amp";
		CharCodes3[(CharCodes3.SingleQuote = 39)] = "SingleQuote";
		CharCodes3[(CharCodes3.DoubleQuote = 34)] = "DoubleQuote";
		CharCodes3[(CharCodes3.Dash = 45)] = "Dash";
		CharCodes3[(CharCodes3.Slash = 47)] = "Slash";
		CharCodes3[(CharCodes3.Zero = 48)] = "Zero";
		CharCodes3[(CharCodes3.Nine = 57)] = "Nine";
		CharCodes3[(CharCodes3.Semi = 59)] = "Semi";
		CharCodes3[(CharCodes3.Lt = 60)] = "Lt";
		CharCodes3[(CharCodes3.Eq = 61)] = "Eq";
		CharCodes3[(CharCodes3.Gt = 62)] = "Gt";
		CharCodes3[(CharCodes3.Questionmark = 63)] = "Questionmark";
		CharCodes3[(CharCodes3.UpperA = 65)] = "UpperA";
		CharCodes3[(CharCodes3.LowerA = 97)] = "LowerA";
		CharCodes3[(CharCodes3.UpperF = 70)] = "UpperF";
		CharCodes3[(CharCodes3.LowerF = 102)] = "LowerF";
		CharCodes3[(CharCodes3.UpperZ = 90)] = "UpperZ";
		CharCodes3[(CharCodes3.LowerZ = 122)] = "LowerZ";
		CharCodes3[(CharCodes3.LowerX = 120)] = "LowerX";
		CharCodes3[(CharCodes3.OpeningSquareBracket = 91)] = "OpeningSquareBracket";
	})(CharCodes2 || (CharCodes2 = {}));
	((State2) => {
		State2[(State2.Text = 1)] = "Text";
		State2[(State2.BeforeTagName = 2)] = "BeforeTagName";
		State2[(State2.InTagName = 3)] = "InTagName";
		State2[(State2.InSelfClosingTag = 4)] = "InSelfClosingTag";
		State2[(State2.BeforeClosingTagName = 5)] = "BeforeClosingTagName";
		State2[(State2.InClosingTagName = 6)] = "InClosingTagName";
		State2[(State2.AfterClosingTagName = 7)] = "AfterClosingTagName";
		State2[(State2.BeforeAttributeName = 8)] = "BeforeAttributeName";
		State2[(State2.InAttributeName = 9)] = "InAttributeName";
		State2[(State2.AfterAttributeName = 10)] = "AfterAttributeName";
		State2[(State2.BeforeAttributeValue = 11)] = "BeforeAttributeValue";
		State2[(State2.InAttributeValueDq = 12)] = "InAttributeValueDq";
		State2[(State2.InAttributeValueSq = 13)] = "InAttributeValueSq";
		State2[(State2.InAttributeValueNq = 14)] = "InAttributeValueNq";
		State2[(State2.BeforeDeclaration = 15)] = "BeforeDeclaration";
		State2[(State2.InDeclaration = 16)] = "InDeclaration";
		State2[(State2.InProcessingInstruction = 17)] = "InProcessingInstruction";
		State2[(State2.BeforeComment = 18)] = "BeforeComment";
		State2[(State2.CDATASequence = 19)] = "CDATASequence";
		State2[(State2.InSpecialComment = 20)] = "InSpecialComment";
		State2[(State2.InCommentLike = 21)] = "InCommentLike";
		State2[(State2.BeforeSpecialS = 22)] = "BeforeSpecialS";
		State2[(State2.BeforeSpecialT = 23)] = "BeforeSpecialT";
		State2[(State2.SpecialStartSequence = 24)] = "SpecialStartSequence";
		State2[(State2.InSpecialTag = 25)] = "InSpecialTag";
		State2[(State2.InEntity = 26)] = "InEntity";
	})(State || (State = {}));
	((QuoteType2) => {
		QuoteType2[(QuoteType2.NoValue = 0)] = "NoValue";
		QuoteType2[(QuoteType2.Unquoted = 1)] = "Unquoted";
		QuoteType2[(QuoteType2.Single = 2)] = "Single";
		QuoteType2[(QuoteType2.Double = 3)] = "Double";
	})(QuoteType || (QuoteType = {}));
	Sequences = {
		Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
		CdataEnd: new Uint8Array([93, 93, 62]),
		CommentEnd: new Uint8Array([45, 45, 62]),
		ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
		StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
		TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101]),
		TextareaEnd: new Uint8Array([60, 47, 116, 101, 120, 116, 97, 114, 101, 97]),
		XmpEnd: new Uint8Array([60, 47, 120, 109, 112]),
	};
});

// node_modules/htmlparser2/dist/esm/Parser.js
class Parser {
	constructor(cbs, options = {}) {
		var _a2, _b, _c, _d, _e, _f;
		this.options = options;
		this.startIndex = 0;
		this.endIndex = 0;
		this.openTagStart = 0;
		this.tagname = "";
		this.attribname = "";
		this.attribvalue = "";
		this.attribs = null;
		this.stack = [];
		this.buffers = [];
		this.bufferOffset = 0;
		this.writeIndex = 0;
		this.ended = false;
		this.cbs = cbs !== null && cbs !== undefined ? cbs : {};
		this.htmlMode = !this.options.xmlMode;
		this.lowerCaseTagNames =
			(_a2 = options.lowerCaseTags) !== null && _a2 !== undefined
				? _a2
				: this.htmlMode;
		this.lowerCaseAttributeNames =
			(_b = options.lowerCaseAttributeNames) !== null && _b !== undefined
				? _b
				: this.htmlMode;
		this.recognizeSelfClosing =
			(_c = options.recognizeSelfClosing) !== null && _c !== undefined
				? _c
				: !this.htmlMode;
		this.tokenizer = new (
			(_d = options.Tokenizer) !== null && _d !== undefined ? _d : Tokenizer
		)(this.options, this);
		this.foreignContext = [!this.htmlMode];
		(_f = (_e = this.cbs).onparserinit) === null ||
			_f === undefined ||
			_f.call(_e, this);
	}
	ontext(start, endIndex) {
		var _a2, _b;
		const data = this.getSlice(start, endIndex);
		this.endIndex = endIndex - 1;
		(_b = (_a2 = this.cbs).ontext) === null ||
			_b === undefined ||
			_b.call(_a2, data);
		this.startIndex = endIndex;
	}
	ontextentity(cp, endIndex) {
		var _a2, _b;
		this.endIndex = endIndex - 1;
		(_b = (_a2 = this.cbs).ontext) === null ||
			_b === undefined ||
			_b.call(_a2, fromCodePoint(cp));
		this.startIndex = endIndex;
	}
	isVoidElement(name) {
		return this.htmlMode && voidElements.has(name);
	}
	onopentagname(start, endIndex) {
		this.endIndex = endIndex;
		let name = this.getSlice(start, endIndex);
		if (this.lowerCaseTagNames) {
			name = name.toLowerCase();
		}
		this.emitOpenTag(name);
	}
	emitOpenTag(name) {
		var _a2, _b, _c, _d;
		this.openTagStart = this.startIndex;
		this.tagname = name;
		const impliesClose = this.htmlMode && openImpliesClose.get(name);
		if (impliesClose) {
			while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
				const element = this.stack.shift();
				(_b = (_a2 = this.cbs).onclosetag) === null ||
					_b === undefined ||
					_b.call(_a2, element, true);
			}
		}
		if (!this.isVoidElement(name)) {
			this.stack.unshift(name);
			if (this.htmlMode) {
				if (foreignContextElements.has(name)) {
					this.foreignContext.unshift(true);
				} else if (htmlIntegrationElements.has(name)) {
					this.foreignContext.unshift(false);
				}
			}
		}
		(_d = (_c = this.cbs).onopentagname) === null ||
			_d === undefined ||
			_d.call(_c, name);
		if (this.cbs.onopentag) this.attribs = {};
	}
	endOpenTag(isImplied) {
		var _a2, _b;
		this.startIndex = this.openTagStart;
		if (this.attribs) {
			(_b = (_a2 = this.cbs).onopentag) === null ||
				_b === undefined ||
				_b.call(_a2, this.tagname, this.attribs, isImplied);
			this.attribs = null;
		}
		if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
			this.cbs.onclosetag(this.tagname, true);
		}
		this.tagname = "";
	}
	onopentagend(endIndex) {
		this.endIndex = endIndex;
		this.endOpenTag(false);
		this.startIndex = endIndex + 1;
	}
	onclosetag(start, endIndex) {
		var _a2, _b, _c, _d, _e, _f, _g, _h;
		this.endIndex = endIndex;
		let name = this.getSlice(start, endIndex);
		if (this.lowerCaseTagNames) {
			name = name.toLowerCase();
		}
		if (
			this.htmlMode &&
			(foreignContextElements.has(name) || htmlIntegrationElements.has(name))
		) {
			this.foreignContext.shift();
		}
		if (!this.isVoidElement(name)) {
			const pos = this.stack.indexOf(name);
			if (pos !== -1) {
				for (let index = 0; index <= pos; index++) {
					const element = this.stack.shift();
					(_b = (_a2 = this.cbs).onclosetag) === null ||
						_b === undefined ||
						_b.call(_a2, element, index !== pos);
				}
			} else if (this.htmlMode && name === "p") {
				this.emitOpenTag("p");
				this.closeCurrentTag(true);
			}
		} else if (this.htmlMode && name === "br") {
			(_d = (_c = this.cbs).onopentagname) === null ||
				_d === undefined ||
				_d.call(_c, "br");
			(_f = (_e = this.cbs).onopentag) === null ||
				_f === undefined ||
				_f.call(_e, "br", {}, true);
			(_h = (_g = this.cbs).onclosetag) === null ||
				_h === undefined ||
				_h.call(_g, "br", false);
		}
		this.startIndex = endIndex + 1;
	}
	onselfclosingtag(endIndex) {
		this.endIndex = endIndex;
		if (this.recognizeSelfClosing || this.foreignContext[0]) {
			this.closeCurrentTag(false);
			this.startIndex = endIndex + 1;
		} else {
			this.onopentagend(endIndex);
		}
	}
	closeCurrentTag(isOpenImplied) {
		var _a2, _b;
		const name = this.tagname;
		this.endOpenTag(isOpenImplied);
		if (this.stack[0] === name) {
			(_b = (_a2 = this.cbs).onclosetag) === null ||
				_b === undefined ||
				_b.call(_a2, name, !isOpenImplied);
			this.stack.shift();
		}
	}
	onattribname(start, endIndex) {
		this.startIndex = start;
		const name = this.getSlice(start, endIndex);
		this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
	}
	onattribdata(start, endIndex) {
		this.attribvalue += this.getSlice(start, endIndex);
	}
	onattribentity(cp) {
		this.attribvalue += fromCodePoint(cp);
	}
	onattribend(quote, endIndex) {
		var _a2, _b;
		this.endIndex = endIndex;
		(_b = (_a2 = this.cbs).onattribute) === null ||
			_b === undefined ||
			_b.call(
				_a2,
				this.attribname,
				this.attribvalue,
				quote === QuoteType.Double
					? '"'
					: quote === QuoteType.Single
						? "'"
						: quote === QuoteType.NoValue
							? undefined
							: null,
			);
		if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) {
			this.attribs[this.attribname] = this.attribvalue;
		}
		this.attribvalue = "";
	}
	getInstructionName(value) {
		const index = value.search(reNameEnd);
		let name = index < 0 ? value : value.substr(0, index);
		if (this.lowerCaseTagNames) {
			name = name.toLowerCase();
		}
		return name;
	}
	ondeclaration(start, endIndex) {
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex);
		if (this.cbs.onprocessinginstruction) {
			const name = this.getInstructionName(value);
			this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
		}
		this.startIndex = endIndex + 1;
	}
	onprocessinginstruction(start, endIndex) {
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex);
		if (this.cbs.onprocessinginstruction) {
			const name = this.getInstructionName(value);
			this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
		}
		this.startIndex = endIndex + 1;
	}
	oncomment(start, endIndex, offset) {
		var _a2, _b, _c, _d;
		this.endIndex = endIndex;
		(_b = (_a2 = this.cbs).oncomment) === null ||
			_b === undefined ||
			_b.call(_a2, this.getSlice(start, endIndex - offset));
		(_d = (_c = this.cbs).oncommentend) === null ||
			_d === undefined ||
			_d.call(_c);
		this.startIndex = endIndex + 1;
	}
	oncdata(start, endIndex, offset) {
		var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k;
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex - offset);
		if (!this.htmlMode || this.options.recognizeCDATA) {
			(_b = (_a2 = this.cbs).oncdatastart) === null ||
				_b === undefined ||
				_b.call(_a2);
			(_d = (_c = this.cbs).ontext) === null ||
				_d === undefined ||
				_d.call(_c, value);
			(_f = (_e = this.cbs).oncdataend) === null ||
				_f === undefined ||
				_f.call(_e);
		} else {
			(_h = (_g = this.cbs).oncomment) === null ||
				_h === undefined ||
				_h.call(_g, `[CDATA[${value}]]`);
			(_k = (_j = this.cbs).oncommentend) === null ||
				_k === undefined ||
				_k.call(_j);
		}
		this.startIndex = endIndex + 1;
	}
	onend() {
		var _a2, _b;
		if (this.cbs.onclosetag) {
			this.endIndex = this.startIndex;
			for (let index = 0; index < this.stack.length; index++) {
				this.cbs.onclosetag(this.stack[index], true);
			}
		}
		(_b = (_a2 = this.cbs).onend) === null || _b === undefined || _b.call(_a2);
	}
	reset() {
		var _a2, _b, _c, _d;
		(_b = (_a2 = this.cbs).onreset) === null ||
			_b === undefined ||
			_b.call(_a2);
		this.tokenizer.reset();
		this.tagname = "";
		this.attribname = "";
		this.attribs = null;
		this.stack.length = 0;
		this.startIndex = 0;
		this.endIndex = 0;
		(_d = (_c = this.cbs).onparserinit) === null ||
			_d === undefined ||
			_d.call(_c, this);
		this.buffers.length = 0;
		this.foreignContext.length = 0;
		this.foreignContext.unshift(!this.htmlMode);
		this.bufferOffset = 0;
		this.writeIndex = 0;
		this.ended = false;
	}
	parseComplete(data) {
		this.reset();
		this.end(data);
	}
	getSlice(start, end) {
		while (start - this.bufferOffset >= this.buffers[0].length) {
			this.shiftBuffer();
		}
		let slice = this.buffers[0].slice(
			start - this.bufferOffset,
			end - this.bufferOffset,
		);
		while (end - this.bufferOffset > this.buffers[0].length) {
			this.shiftBuffer();
			slice += this.buffers[0].slice(0, end - this.bufferOffset);
		}
		return slice;
	}
	shiftBuffer() {
		this.bufferOffset += this.buffers[0].length;
		this.writeIndex--;
		this.buffers.shift();
	}
	write(chunk) {
		var _a2, _b;
		if (this.ended) {
			(_b = (_a2 = this.cbs).onerror) === null ||
				_b === undefined ||
				_b.call(_a2, new Error(".write() after done!"));
			return;
		}
		this.buffers.push(chunk);
		if (this.tokenizer.running) {
			this.tokenizer.write(chunk);
			this.writeIndex++;
		}
	}
	end(chunk) {
		var _a2, _b;
		if (this.ended) {
			(_b = (_a2 = this.cbs).onerror) === null ||
				_b === undefined ||
				_b.call(_a2, new Error(".end() after done!"));
			return;
		}
		if (chunk) this.write(chunk);
		this.ended = true;
		this.tokenizer.end();
	}
	pause() {
		this.tokenizer.pause();
	}
	resume() {
		this.tokenizer.resume();
		while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
			this.tokenizer.write(this.buffers[this.writeIndex++]);
		}
		if (this.ended) this.tokenizer.end();
	}
	parseChunk(chunk) {
		this.write(chunk);
	}
	done(chunk) {
		this.end(chunk);
	}
}
var formTags,
	pTag,
	tableSectionTags,
	ddtTags,
	rtpTags,
	openImpliesClose,
	voidElements,
	foreignContextElements,
	htmlIntegrationElements,
	reNameEnd;
var init_Parser = __esm(() => {
	init_Tokenizer();
	init_decode();
	formTags = new Set([
		"input",
		"option",
		"optgroup",
		"select",
		"button",
		"datalist",
		"textarea",
	]);
	pTag = new Set(["p"]);
	tableSectionTags = new Set(["thead", "tbody"]);
	ddtTags = new Set(["dd", "dt"]);
	rtpTags = new Set(["rt", "rp"]);
	openImpliesClose = new Map([
		["tr", new Set(["tr", "th", "td"])],
		["th", new Set(["th"])],
		["td", new Set(["thead", "th", "td"])],
		["body", new Set(["head", "link", "script"])],
		["li", new Set(["li"])],
		["p", pTag],
		["h1", pTag],
		["h2", pTag],
		["h3", pTag],
		["h4", pTag],
		["h5", pTag],
		["h6", pTag],
		["select", formTags],
		["input", formTags],
		["output", formTags],
		["button", formTags],
		["datalist", formTags],
		["textarea", formTags],
		["option", new Set(["option"])],
		["optgroup", new Set(["optgroup", "option"])],
		["dd", ddtTags],
		["dt", ddtTags],
		["address", pTag],
		["article", pTag],
		["aside", pTag],
		["blockquote", pTag],
		["details", pTag],
		["div", pTag],
		["dl", pTag],
		["fieldset", pTag],
		["figcaption", pTag],
		["figure", pTag],
		["footer", pTag],
		["form", pTag],
		["header", pTag],
		["hr", pTag],
		["main", pTag],
		["nav", pTag],
		["ol", pTag],
		["pre", pTag],
		["section", pTag],
		["table", pTag],
		["ul", pTag],
		["rt", rtpTags],
		["rp", rtpTags],
		["tbody", tableSectionTags],
		["tfoot", tableSectionTags],
	]);
	voidElements = new Set([
		"area",
		"base",
		"basefont",
		"br",
		"col",
		"command",
		"embed",
		"frame",
		"hr",
		"img",
		"input",
		"isindex",
		"keygen",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	]);
	foreignContextElements = new Set(["math", "svg"]);
	htmlIntegrationElements = new Set([
		"mi",
		"mo",
		"mn",
		"ms",
		"mtext",
		"annotation-xml",
		"foreignobject",
		"desc",
		"title",
	]);
	reNameEnd = /\s|\//;
});

// node_modules/domelementtype/lib/esm/index.js
var exports_esm = {};
__export(exports_esm, {
	isTag: () => isTag,
	Text: () => Text,
	Tag: () => Tag,
	Style: () => Style,
	Script: () => Script,
	Root: () => Root,
	ElementType: () => ElementType,
	Doctype: () => Doctype,
	Directive: () => Directive,
	Comment: () => Comment,
	CDATA: () => CDATA,
});
function isTag(elem) {
	return (
		elem.type === ElementType.Tag ||
		elem.type === ElementType.Script ||
		elem.type === ElementType.Style
	);
}
var ElementType,
	Root,
	Text,
	Directive,
	Comment,
	Script,
	Style,
	Tag,
	CDATA,
	Doctype;
var init_esm = __esm(() => {
	((ElementType2) => {
		ElementType2.Root = "root";
		ElementType2.Text = "text";
		ElementType2.Directive = "directive";
		ElementType2.Comment = "comment";
		ElementType2.Script = "script";
		ElementType2.Style = "style";
		ElementType2.Tag = "tag";
		ElementType2.CDATA = "cdata";
		ElementType2.Doctype = "doctype";
	})(ElementType || (ElementType = {}));
	Root = ElementType.Root;
	Text = ElementType.Text;
	Directive = ElementType.Directive;
	Comment = ElementType.Comment;
	Script = ElementType.Script;
	Style = ElementType.Style;
	Tag = ElementType.Tag;
	CDATA = ElementType.CDATA;
	Doctype = ElementType.Doctype;
});

// node_modules/domhandler/lib/esm/node.js
class Node {
	constructor() {
		this.parent = null;
		this.prev = null;
		this.next = null;
		this.startIndex = null;
		this.endIndex = null;
	}
	get parentNode() {
		return this.parent;
	}
	set parentNode(parent) {
		this.parent = parent;
	}
	get previousSibling() {
		return this.prev;
	}
	set previousSibling(prev) {
		this.prev = prev;
	}
	get nextSibling() {
		return this.next;
	}
	set nextSibling(next) {
		this.next = next;
	}
	cloneNode(recursive = false) {
		return cloneNode(this, recursive);
	}
}
function isTag2(node) {
	return isTag(node);
}
function isCDATA(node) {
	return node.type === ElementType.CDATA;
}
function isText(node) {
	return node.type === ElementType.Text;
}
function isComment(node) {
	return node.type === ElementType.Comment;
}
function isDirective(node) {
	return node.type === ElementType.Directive;
}
function isDocument(node) {
	return node.type === ElementType.Root;
}
function hasChildren(node) {
	return Object.hasOwn(node, "children");
}
function cloneNode(node, recursive = false) {
	let result;
	if (isText(node)) {
		result = new Text2(node.data);
	} else if (isComment(node)) {
		result = new Comment2(node.data);
	} else if (isTag2(node)) {
		const children = recursive ? cloneChildren(node.children) : [];
		const clone = new Element(node.name, { ...node.attribs }, children);
		children.forEach((child) => (child.parent = clone));
		if (node.namespace != null) {
			clone.namespace = node.namespace;
		}
		if (node["x-attribsNamespace"]) {
			clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
		}
		if (node["x-attribsPrefix"]) {
			clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
		}
		result = clone;
	} else if (isCDATA(node)) {
		const children = recursive ? cloneChildren(node.children) : [];
		const clone = new CDATA2(children);
		children.forEach((child) => (child.parent = clone));
		result = clone;
	} else if (isDocument(node)) {
		const children = recursive ? cloneChildren(node.children) : [];
		const clone = new Document(children);
		children.forEach((child) => (child.parent = clone));
		if (node["x-mode"]) {
			clone["x-mode"] = node["x-mode"];
		}
		result = clone;
	} else if (isDirective(node)) {
		const instruction = new ProcessingInstruction(node.name, node.data);
		if (node["x-name"] != null) {
			instruction["x-name"] = node["x-name"];
			instruction["x-publicId"] = node["x-publicId"];
			instruction["x-systemId"] = node["x-systemId"];
		}
		result = instruction;
	} else {
		throw new Error(`Not implemented yet: ${node.type}`);
	}
	result.startIndex = node.startIndex;
	result.endIndex = node.endIndex;
	if (node.sourceCodeLocation != null) {
		result.sourceCodeLocation = node.sourceCodeLocation;
	}
	return result;
}
function cloneChildren(childs) {
	const children = childs.map((child) => cloneNode(child, true));
	for (let i = 1; i < children.length; i++) {
		children[i].prev = children[i - 1];
		children[i - 1].next = children[i];
	}
	return children;
}
var DataNode,
	Text2,
	Comment2,
	ProcessingInstruction,
	NodeWithChildren,
	CDATA2,
	Document,
	Element;
var init_node = __esm(() => {
	init_esm();
	DataNode = class DataNode extends Node {
		constructor(data) {
			super();
			this.data = data;
		}
		get nodeValue() {
			return this.data;
		}
		set nodeValue(data) {
			this.data = data;
		}
	};
	Text2 = class Text2 extends DataNode {
		constructor() {
			super(...arguments);
			this.type = ElementType.Text;
		}
		get nodeType() {
			return 3;
		}
	};
	Comment2 = class Comment2 extends DataNode {
		constructor() {
			super(...arguments);
			this.type = ElementType.Comment;
		}
		get nodeType() {
			return 8;
		}
	};
	ProcessingInstruction = class ProcessingInstruction extends DataNode {
		constructor(name, data) {
			super(data);
			this.name = name;
			this.type = ElementType.Directive;
		}
		get nodeType() {
			return 1;
		}
	};
	NodeWithChildren = class NodeWithChildren extends Node {
		constructor(children) {
			super();
			this.children = children;
		}
		get firstChild() {
			var _a2;
			return (_a2 = this.children[0]) !== null && _a2 !== undefined
				? _a2
				: null;
		}
		get lastChild() {
			return this.children.length > 0
				? this.children[this.children.length - 1]
				: null;
		}
		get childNodes() {
			return this.children;
		}
		set childNodes(children) {
			this.children = children;
		}
	};
	CDATA2 = class CDATA2 extends NodeWithChildren {
		constructor() {
			super(...arguments);
			this.type = ElementType.CDATA;
		}
		get nodeType() {
			return 4;
		}
	};
	Document = class Document extends NodeWithChildren {
		constructor() {
			super(...arguments);
			this.type = ElementType.Root;
		}
		get nodeType() {
			return 9;
		}
	};
	Element = class Element extends NodeWithChildren {
		constructor(
			name,
			attribs,
			children = [],
			type = name === "script"
				? ElementType.Script
				: name === "style"
					? ElementType.Style
					: ElementType.Tag,
		) {
			super(children);
			this.name = name;
			this.attribs = attribs;
			this.type = type;
		}
		get nodeType() {
			return 1;
		}
		get tagName() {
			return this.name;
		}
		set tagName(name) {
			this.name = name;
		}
		get attributes() {
			return Object.keys(this.attribs).map((name) => {
				var _a2, _b;
				return {
					name,
					value: this.attribs[name],
					namespace:
						(_a2 = this["x-attribsNamespace"]) === null || _a2 === undefined
							? undefined
							: _a2[name],
					prefix:
						(_b = this["x-attribsPrefix"]) === null || _b === undefined
							? undefined
							: _b[name],
				};
			});
		}
	};
});

// node_modules/domhandler/lib/esm/index.js
class DomHandler {
	constructor(callback, options, elementCB) {
		this.dom = [];
		this.root = new Document(this.dom);
		this.done = false;
		this.tagStack = [this.root];
		this.lastNode = null;
		this.parser = null;
		if (typeof options === "function") {
			elementCB = options;
			options = defaultOpts;
		}
		if (typeof callback === "object") {
			options = callback;
			callback = undefined;
		}
		this.callback =
			callback !== null && callback !== undefined ? callback : null;
		this.options =
			options !== null && options !== undefined ? options : defaultOpts;
		this.elementCB =
			elementCB !== null && elementCB !== undefined ? elementCB : null;
	}
	onparserinit(parser) {
		this.parser = parser;
	}
	onreset() {
		this.dom = [];
		this.root = new Document(this.dom);
		this.done = false;
		this.tagStack = [this.root];
		this.lastNode = null;
		this.parser = null;
	}
	onend() {
		if (this.done) return;
		this.done = true;
		this.parser = null;
		this.handleCallback(null);
	}
	onerror(error) {
		this.handleCallback(error);
	}
	onclosetag() {
		this.lastNode = null;
		const elem = this.tagStack.pop();
		if (this.options.withEndIndices) {
			elem.endIndex = this.parser.endIndex;
		}
		if (this.elementCB) this.elementCB(elem);
	}
	onopentag(name, attribs) {
		const type = this.options.xmlMode ? ElementType.Tag : undefined;
		const element = new Element(name, attribs, undefined, type);
		this.addNode(element);
		this.tagStack.push(element);
	}
	ontext(data) {
		const { lastNode } = this;
		if (lastNode && lastNode.type === ElementType.Text) {
			lastNode.data += data;
			if (this.options.withEndIndices) {
				lastNode.endIndex = this.parser.endIndex;
			}
		} else {
			const node2 = new Text2(data);
			this.addNode(node2);
			this.lastNode = node2;
		}
	}
	oncomment(data) {
		if (this.lastNode && this.lastNode.type === ElementType.Comment) {
			this.lastNode.data += data;
			return;
		}
		const node2 = new Comment2(data);
		this.addNode(node2);
		this.lastNode = node2;
	}
	oncommentend() {
		this.lastNode = null;
	}
	oncdatastart() {
		const text = new Text2("");
		const node2 = new CDATA2([text]);
		this.addNode(node2);
		text.parent = node2;
		this.lastNode = text;
	}
	oncdataend() {
		this.lastNode = null;
	}
	onprocessinginstruction(name, data) {
		const node2 = new ProcessingInstruction(name, data);
		this.addNode(node2);
	}
	handleCallback(error) {
		if (typeof this.callback === "function") {
			this.callback(error, this.dom);
		} else if (error) {
			throw error;
		}
	}
	addNode(node2) {
		const parent = this.tagStack[this.tagStack.length - 1];
		const previousSibling = parent.children[parent.children.length - 1];
		if (this.options.withStartIndices) {
			node2.startIndex = this.parser.startIndex;
		}
		if (this.options.withEndIndices) {
			node2.endIndex = this.parser.endIndex;
		}
		parent.children.push(node2);
		if (previousSibling) {
			node2.prev = previousSibling;
			previousSibling.next = node2;
		}
		node2.parent = parent;
		this.lastNode = null;
	}
}
var defaultOpts;
var init_esm2 = __esm(() => {
	init_esm();
	init_node();
	init_node();
	defaultOpts = {
		withStartIndices: false,
		withEndIndices: false,
		xmlMode: false,
	};
});

// node_modules/dom-serializer/node_modules/entities/lib/esm/escape.js
function encodeXML(str) {
	let ret = "";
	let lastIdx = 0;
	let match;
	while ((match = xmlReplacer.exec(str)) !== null) {
		const i = match.index;
		const char = str.charCodeAt(i);
		const next = xmlCodeMap.get(char);
		if (next !== undefined) {
			ret += str.substring(lastIdx, i) + next;
			lastIdx = i + 1;
		} else {
			ret += `${str.substring(lastIdx, i)}&#x${getCodePoint(str, i).toString(16)};`;
			lastIdx = xmlReplacer.lastIndex += Number((char & 64512) === 55296);
		}
	}
	return ret + str.substr(lastIdx);
}
function getEscaper(regex, map) {
	return function escape(data) {
		let match;
		let lastIdx = 0;
		let result = "";
		while ((match = regex.exec(data))) {
			if (lastIdx !== match.index) {
				result += data.substring(lastIdx, match.index);
			}
			result += map.get(match[0].charCodeAt(0));
			lastIdx = match.index + 1;
		}
		return result + data.substring(lastIdx);
	};
}
var xmlReplacer,
	xmlCodeMap,
	getCodePoint,
	_escapeUTF8,
	escapeAttribute,
	escapeText;
var init_escape = __esm(() => {
	xmlReplacer = /["&'<>$\x80-\uFFFF]/g;
	xmlCodeMap = new Map([
		[34, "&quot;"],
		[38, "&amp;"],
		[39, "&apos;"],
		[60, "&lt;"],
		[62, "&gt;"],
	]);
	getCodePoint =
		String.prototype.codePointAt != null
			? (str, index) => str.codePointAt(index)
			: (c, index) =>
					(c.charCodeAt(index) & 64512) === 55296
						? (c.charCodeAt(index) - 55296) * 1024 +
							c.charCodeAt(index + 1) -
							56320 +
							65536
						: c.charCodeAt(index);
	_escapeUTF8 = getEscaper(/[&<>'"]/g, xmlCodeMap);
	escapeAttribute = getEscaper(
		/["&\u00A0]/g,
		new Map([
			[34, "&quot;"],
			[38, "&amp;"],
			[160, "&nbsp;"],
		]),
	);
	escapeText = getEscaper(
		/[&<>\u00A0]/g,
		new Map([
			[38, "&amp;"],
			[60, "&lt;"],
			[62, "&gt;"],
			[160, "&nbsp;"],
		]),
	);
});

// node_modules/dom-serializer/node_modules/entities/lib/esm/index.js
var EntityLevel, EncodingMode;
var init_esm3 = __esm(() => {
	init_escape();
	((EntityLevel2) => {
		EntityLevel2[(EntityLevel2.XML = 0)] = "XML";
		EntityLevel2[(EntityLevel2.HTML = 1)] = "HTML";
	})(EntityLevel || (EntityLevel = {}));
	((EncodingMode2) => {
		EncodingMode2[(EncodingMode2.UTF8 = 0)] = "UTF8";
		EncodingMode2[(EncodingMode2.ASCII = 1)] = "ASCII";
		EncodingMode2[(EncodingMode2.Extensive = 2)] = "Extensive";
		EncodingMode2[(EncodingMode2.Attribute = 3)] = "Attribute";
		EncodingMode2[(EncodingMode2.Text = 4)] = "Text";
	})(EncodingMode || (EncodingMode = {}));
});

// node_modules/dom-serializer/lib/esm/foreignNames.js
var elementNames, attributeNames;
var init_foreignNames = __esm(() => {
	elementNames = new Map(
		[
			"altGlyph",
			"altGlyphDef",
			"altGlyphItem",
			"animateColor",
			"animateMotion",
			"animateTransform",
			"clipPath",
			"feBlend",
			"feColorMatrix",
			"feComponentTransfer",
			"feComposite",
			"feConvolveMatrix",
			"feDiffuseLighting",
			"feDisplacementMap",
			"feDistantLight",
			"feDropShadow",
			"feFlood",
			"feFuncA",
			"feFuncB",
			"feFuncG",
			"feFuncR",
			"feGaussianBlur",
			"feImage",
			"feMerge",
			"feMergeNode",
			"feMorphology",
			"feOffset",
			"fePointLight",
			"feSpecularLighting",
			"feSpotLight",
			"feTile",
			"feTurbulence",
			"foreignObject",
			"glyphRef",
			"linearGradient",
			"radialGradient",
			"textPath",
		].map((val) => [val.toLowerCase(), val]),
	);
	attributeNames = new Map(
		[
			"definitionURL",
			"attributeName",
			"attributeType",
			"baseFrequency",
			"baseProfile",
			"calcMode",
			"clipPathUnits",
			"diffuseConstant",
			"edgeMode",
			"filterUnits",
			"glyphRef",
			"gradientTransform",
			"gradientUnits",
			"kernelMatrix",
			"kernelUnitLength",
			"keyPoints",
			"keySplines",
			"keyTimes",
			"lengthAdjust",
			"limitingConeAngle",
			"markerHeight",
			"markerUnits",
			"markerWidth",
			"maskContentUnits",
			"maskUnits",
			"numOctaves",
			"pathLength",
			"patternContentUnits",
			"patternTransform",
			"patternUnits",
			"pointsAtX",
			"pointsAtY",
			"pointsAtZ",
			"preserveAlpha",
			"preserveAspectRatio",
			"primitiveUnits",
			"refX",
			"refY",
			"repeatCount",
			"repeatDur",
			"requiredExtensions",
			"requiredFeatures",
			"specularConstant",
			"specularExponent",
			"spreadMethod",
			"startOffset",
			"stdDeviation",
			"stitchTiles",
			"surfaceScale",
			"systemLanguage",
			"tableValues",
			"targetX",
			"targetY",
			"textLength",
			"viewBox",
			"viewTarget",
			"xChannelSelector",
			"yChannelSelector",
			"zoomAndPan",
		].map((val) => [val.toLowerCase(), val]),
	);
});

// node_modules/dom-serializer/lib/esm/index.js
function replaceQuotes(value) {
	return value.replace(/"/g, "&quot;");
}
function formatAttributes(attributes, opts) {
	var _a2;
	if (!attributes) return;
	const encode =
		((_a2 = opts.encodeEntities) !== null && _a2 !== undefined
			? _a2
			: opts.decodeEntities) === false
			? replaceQuotes
			: opts.xmlMode || opts.encodeEntities !== "utf8"
				? encodeXML
				: escapeAttribute;
	return Object.keys(attributes)
		.map((key) => {
			var _a3, _b;
			const value =
				(_a3 = attributes[key]) !== null && _a3 !== undefined ? _a3 : "";
			if (opts.xmlMode === "foreign") {
				key =
					(_b = attributeNames.get(key)) !== null && _b !== undefined
						? _b
						: key;
			}
			if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
				return key;
			}
			return `${key}="${encode(value)}"`;
		})
		.join(" ");
}
function render(node2, options = {}) {
	const nodes = "length" in node2 ? node2 : [node2];
	let output = "";
	for (let i = 0; i < nodes.length; i++) {
		output += renderNode(nodes[i], options);
	}
	return output;
}
function renderNode(node2, options) {
	switch (node2.type) {
		case Root:
			return render(node2.children, options);
		case Doctype:
		case Directive:
			return renderDirective(node2);
		case Comment:
			return renderComment(node2);
		case CDATA:
			return renderCdata(node2);
		case Script:
		case Style:
		case Tag:
			return renderTag(node2, options);
		case Text:
			return renderText(node2, options);
	}
}
function renderTag(elem, opts) {
	var _a2;
	if (opts.xmlMode === "foreign") {
		elem.name =
			(_a2 = elementNames.get(elem.name)) !== null && _a2 !== undefined
				? _a2
				: elem.name;
		if (elem.parent && foreignModeIntegrationPoints.has(elem.parent.name)) {
			opts = { ...opts, xmlMode: false };
		}
	}
	if (!opts.xmlMode && foreignElements.has(elem.name)) {
		opts = { ...opts, xmlMode: "foreign" };
	}
	let tag = `<${elem.name}`;
	const attribs = formatAttributes(elem.attribs, opts);
	if (attribs) {
		tag += ` ${attribs}`;
	}
	if (
		elem.children.length === 0 &&
		(opts.xmlMode
			? opts.selfClosingTags !== false
			: opts.selfClosingTags && singleTag.has(elem.name))
	) {
		if (!opts.xmlMode) tag += " ";
		tag += "/>";
	} else {
		tag += ">";
		if (elem.children.length > 0) {
			tag += render(elem.children, opts);
		}
		if (opts.xmlMode || !singleTag.has(elem.name)) {
			tag += `</${elem.name}>`;
		}
	}
	return tag;
}
function renderDirective(elem) {
	return `<${elem.data}>`;
}
function renderText(elem, opts) {
	var _a2;
	let data = elem.data || "";
	if (
		((_a2 = opts.encodeEntities) !== null && _a2 !== undefined
			? _a2
			: opts.decodeEntities) !== false &&
		!(!opts.xmlMode && elem.parent && unencodedElements.has(elem.parent.name))
	) {
		data =
			opts.xmlMode || opts.encodeEntities !== "utf8"
				? encodeXML(data)
				: escapeText(data);
	}
	return data;
}
function renderCdata(elem) {
	return `<![CDATA[${elem.children[0].data}]]>`;
}
function renderComment(elem) {
	return `<!--${elem.data}-->`;
}
var unencodedElements,
	singleTag,
	esm_default,
	foreignModeIntegrationPoints,
	foreignElements;
var init_esm4 = __esm(() => {
	init_esm();
	init_esm3();
	init_foreignNames();
	unencodedElements = new Set([
		"style",
		"script",
		"xmp",
		"iframe",
		"noembed",
		"noframes",
		"plaintext",
		"noscript",
	]);
	singleTag = new Set([
		"area",
		"base",
		"basefont",
		"br",
		"col",
		"command",
		"embed",
		"frame",
		"hr",
		"img",
		"input",
		"isindex",
		"keygen",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	]);
	esm_default = render;
	foreignModeIntegrationPoints = new Set([
		"mi",
		"mo",
		"mn",
		"ms",
		"mtext",
		"annotation-xml",
		"foreignObject",
		"desc",
		"title",
	]);
	foreignElements = new Set(["svg", "math"]);
});

// node_modules/domutils/lib/esm/stringify.js
function getOuterHTML(node2, options) {
	return esm_default(node2, options);
}
function getInnerHTML(node2, options) {
	return hasChildren(node2)
		? node2.children.map((node3) => getOuterHTML(node3, options)).join("")
		: "";
}
function getText(node2) {
	if (Array.isArray(node2)) return node2.map(getText).join("");
	if (isTag2(node2))
		return node2.name === "br"
			? `
`
			: getText(node2.children);
	if (isCDATA(node2)) return getText(node2.children);
	if (isText(node2)) return node2.data;
	return "";
}
function textContent(node2) {
	if (Array.isArray(node2)) return node2.map(textContent).join("");
	if (hasChildren(node2) && !isComment(node2)) {
		return textContent(node2.children);
	}
	if (isText(node2)) return node2.data;
	return "";
}
function innerText(node2) {
	if (Array.isArray(node2)) return node2.map(innerText).join("");
	if (
		hasChildren(node2) &&
		(node2.type === ElementType.Tag || isCDATA(node2))
	) {
		return innerText(node2.children);
	}
	if (isText(node2)) return node2.data;
	return "";
}
var init_stringify = __esm(() => {
	init_esm2();
	init_esm4();
	init_esm();
});

// node_modules/domutils/lib/esm/traversal.js
function getChildren(elem) {
	return hasChildren(elem) ? elem.children : [];
}
function getParent(elem) {
	return elem.parent || null;
}
function getSiblings(elem) {
	const parent = getParent(elem);
	if (parent != null) return getChildren(parent);
	const siblings = [elem];
	let { prev, next } = elem;
	while (prev != null) {
		siblings.unshift(prev);
		({ prev } = prev);
	}
	while (next != null) {
		siblings.push(next);
		({ next } = next);
	}
	return siblings;
}
function getAttributeValue(elem, name) {
	var _a2;
	return (_a2 = elem.attribs) === null || _a2 === undefined
		? undefined
		: _a2[name];
}
function hasAttrib(elem, name) {
	return (
		elem.attribs != null &&
		Object.hasOwn(elem.attribs, name) &&
		elem.attribs[name] != null
	);
}
function getName(elem) {
	return elem.name;
}
function nextElementSibling(elem) {
	let { next } = elem;
	while (next !== null && !isTag2(next)) ({ next } = next);
	return next;
}
function prevElementSibling(elem) {
	let { prev } = elem;
	while (prev !== null && !isTag2(prev)) ({ prev } = prev);
	return prev;
}
var init_traversal = __esm(() => {
	init_esm2();
});

// node_modules/domutils/lib/esm/manipulation.js
function removeElement(elem) {
	if (elem.prev) elem.prev.next = elem.next;
	if (elem.next) elem.next.prev = elem.prev;
	if (elem.parent) {
		const childs = elem.parent.children;
		const childsIndex = childs.lastIndexOf(elem);
		if (childsIndex >= 0) {
			childs.splice(childsIndex, 1);
		}
	}
	elem.next = null;
	elem.prev = null;
	elem.parent = null;
}
function replaceElement(elem, replacement) {
	const prev = (replacement.prev = elem.prev);
	if (prev) {
		prev.next = replacement;
	}
	const next = (replacement.next = elem.next);
	if (next) {
		next.prev = replacement;
	}
	const parent = (replacement.parent = elem.parent);
	if (parent) {
		const childs = parent.children;
		childs[childs.lastIndexOf(elem)] = replacement;
		elem.parent = null;
	}
}
function appendChild(parent, child) {
	removeElement(child);
	child.next = null;
	child.parent = parent;
	if (parent.children.push(child) > 1) {
		const sibling = parent.children[parent.children.length - 2];
		sibling.next = child;
		child.prev = sibling;
	} else {
		child.prev = null;
	}
}
function append(elem, next) {
	removeElement(next);
	const { parent } = elem;
	const currNext = elem.next;
	next.next = currNext;
	next.prev = elem;
	elem.next = next;
	next.parent = parent;
	if (currNext) {
		currNext.prev = next;
		if (parent) {
			const childs = parent.children;
			childs.splice(childs.lastIndexOf(currNext), 0, next);
		}
	} else if (parent) {
		parent.children.push(next);
	}
}
function prependChild(parent, child) {
	removeElement(child);
	child.parent = parent;
	child.prev = null;
	if (parent.children.unshift(child) !== 1) {
		const sibling = parent.children[1];
		sibling.prev = child;
		child.next = sibling;
	} else {
		child.next = null;
	}
}
function prepend(elem, prev) {
	removeElement(prev);
	const { parent } = elem;
	if (parent) {
		const childs = parent.children;
		childs.splice(childs.indexOf(elem), 0, prev);
	}
	if (elem.prev) {
		elem.prev.next = prev;
	}
	prev.parent = parent;
	prev.prev = elem.prev;
	prev.next = elem;
	elem.prev = prev;
}

// node_modules/domutils/lib/esm/querying.js
function filter(test, node2, recurse = true, limit = Infinity) {
	return find(test, Array.isArray(node2) ? node2 : [node2], recurse, limit);
}
function find(test, nodes, recurse, limit) {
	const result = [];
	const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
	const indexStack = [0];
	for (;;) {
		if (indexStack[0] >= nodeStack[0].length) {
			if (indexStack.length === 1) {
				return result;
			}
			nodeStack.shift();
			indexStack.shift();
			continue;
		}
		const elem = nodeStack[0][indexStack[0]++];
		if (test(elem)) {
			result.push(elem);
			if (--limit <= 0) return result;
		}
		if (recurse && hasChildren(elem) && elem.children.length > 0) {
			indexStack.unshift(0);
			nodeStack.unshift(elem.children);
		}
	}
}
function findOneChild(test, nodes) {
	return nodes.find(test);
}
function findOne(test, nodes, recurse = true) {
	const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
	for (let i = 0; i < searchedNodes.length; i++) {
		const node2 = searchedNodes[i];
		if (isTag2(node2) && test(node2)) {
			return node2;
		}
		if (recurse && hasChildren(node2) && node2.children.length > 0) {
			const found = findOne(test, node2.children, true);
			if (found) return found;
		}
	}
	return null;
}
function existsOne(test, nodes) {
	return (Array.isArray(nodes) ? nodes : [nodes]).some(
		(node2) =>
			(isTag2(node2) && test(node2)) ||
			(hasChildren(node2) && existsOne(test, node2.children)),
	);
}
function findAll(test, nodes) {
	const result = [];
	const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
	const indexStack = [0];
	for (;;) {
		if (indexStack[0] >= nodeStack[0].length) {
			if (nodeStack.length === 1) {
				return result;
			}
			nodeStack.shift();
			indexStack.shift();
			continue;
		}
		const elem = nodeStack[0][indexStack[0]++];
		if (isTag2(elem) && test(elem)) result.push(elem);
		if (hasChildren(elem) && elem.children.length > 0) {
			indexStack.unshift(0);
			nodeStack.unshift(elem.children);
		}
	}
}
var init_querying = __esm(() => {
	init_esm2();
});

// node_modules/domutils/lib/esm/legacy.js
function getAttribCheck(attrib, value) {
	if (typeof value === "function") {
		return (elem) => isTag2(elem) && value(elem.attribs[attrib]);
	}
	return (elem) => isTag2(elem) && elem.attribs[attrib] === value;
}
function combineFuncs(a, b) {
	return (elem) => a(elem) || b(elem);
}
function compileTest(options) {
	const funcs = Object.keys(options).map((key) => {
		const value = options[key];
		return Object.hasOwn(Checks, key)
			? Checks[key](value)
			: getAttribCheck(key, value);
	});
	return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
}
function testElement(options, node2) {
	const test = compileTest(options);
	return test ? test(node2) : true;
}
function getElements(options, nodes, recurse, limit = Infinity) {
	const test = compileTest(options);
	return test ? filter(test, nodes, recurse, limit) : [];
}
function getElementById(id, nodes, recurse = true) {
	if (!Array.isArray(nodes)) nodes = [nodes];
	return findOne(getAttribCheck("id", id), nodes, recurse);
}
function getElementsByTagName(
	tagName,
	nodes,
	recurse = true,
	limit = Infinity,
) {
	return filter(Checks.tag_name(tagName), nodes, recurse, limit);
}
function getElementsByClassName(
	className,
	nodes,
	recurse = true,
	limit = Infinity,
) {
	return filter(getAttribCheck("class", className), nodes, recurse, limit);
}
function getElementsByTagType(type, nodes, recurse = true, limit = Infinity) {
	return filter(Checks.tag_type(type), nodes, recurse, limit);
}
var Checks;
var init_legacy = __esm(() => {
	init_esm2();
	init_querying();
	Checks = {
		tag_name(name) {
			if (typeof name === "function") {
				return (elem) => isTag2(elem) && name(elem.name);
			} else if (name === "*") {
				return isTag2;
			}
			return (elem) => isTag2(elem) && elem.name === name;
		},
		tag_type(type) {
			if (typeof type === "function") {
				return (elem) => type(elem.type);
			}
			return (elem) => elem.type === type;
		},
		tag_contains(data) {
			if (typeof data === "function") {
				return (elem) => isText(elem) && data(elem.data);
			}
			return (elem) => isText(elem) && elem.data === data;
		},
	};
});

// node_modules/domutils/lib/esm/helpers.js
function removeSubsets(nodes) {
	let idx = nodes.length;
	while (--idx >= 0) {
		const node2 = nodes[idx];
		if (idx > 0 && nodes.lastIndexOf(node2, idx - 1) >= 0) {
			nodes.splice(idx, 1);
			continue;
		}
		for (let ancestor = node2.parent; ancestor; ancestor = ancestor.parent) {
			if (nodes.includes(ancestor)) {
				nodes.splice(idx, 1);
				break;
			}
		}
	}
	return nodes;
}
function compareDocumentPosition(nodeA, nodeB) {
	const aParents = [];
	const bParents = [];
	if (nodeA === nodeB) {
		return 0;
	}
	let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
	while (current) {
		aParents.unshift(current);
		current = current.parent;
	}
	current = hasChildren(nodeB) ? nodeB : nodeB.parent;
	while (current) {
		bParents.unshift(current);
		current = current.parent;
	}
	const maxIdx = Math.min(aParents.length, bParents.length);
	let idx = 0;
	while (idx < maxIdx && aParents[idx] === bParents[idx]) {
		idx++;
	}
	if (idx === 0) {
		return DocumentPosition.DISCONNECTED;
	}
	const sharedParent = aParents[idx - 1];
	const siblings = sharedParent.children;
	const aSibling = aParents[idx];
	const bSibling = bParents[idx];
	if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
		if (sharedParent === nodeB) {
			return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
		}
		return DocumentPosition.FOLLOWING;
	}
	if (sharedParent === nodeA) {
		return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
	}
	return DocumentPosition.PRECEDING;
}
function uniqueSort(nodes) {
	nodes = nodes.filter((node2, i, arr) => !arr.includes(node2, i + 1));
	nodes.sort((a, b) => {
		const relative2 = compareDocumentPosition(a, b);
		if (relative2 & DocumentPosition.PRECEDING) {
			return -1;
		} else if (relative2 & DocumentPosition.FOLLOWING) {
			return 1;
		}
		return 0;
	});
	return nodes;
}
var DocumentPosition;
var init_helpers = __esm(() => {
	init_esm2();
	((DocumentPosition2) => {
		DocumentPosition2[(DocumentPosition2.DISCONNECTED = 1)] = "DISCONNECTED";
		DocumentPosition2[(DocumentPosition2.PRECEDING = 2)] = "PRECEDING";
		DocumentPosition2[(DocumentPosition2.FOLLOWING = 4)] = "FOLLOWING";
		DocumentPosition2[(DocumentPosition2.CONTAINS = 8)] = "CONTAINS";
		DocumentPosition2[(DocumentPosition2.CONTAINED_BY = 16)] = "CONTAINED_BY";
	})(DocumentPosition || (DocumentPosition = {}));
});

// node_modules/domutils/lib/esm/feeds.js
function getFeed(doc) {
	const feedRoot = getOneElement(isValidFeed, doc);
	return !feedRoot
		? null
		: feedRoot.name === "feed"
			? getAtomFeed(feedRoot)
			: getRssFeed(feedRoot);
}
function getAtomFeed(feedRoot) {
	var _a2;
	const childs = feedRoot.children;
	const feed = {
		type: "atom",
		items: getElementsByTagName("entry", childs).map((item) => {
			var _a3;
			const { children } = item;
			const entry = { media: getMediaElements(children) };
			addConditionally(entry, "id", "id", children);
			addConditionally(entry, "title", "title", children);
			const href2 =
				(_a3 = getOneElement("link", children)) === null || _a3 === undefined
					? undefined
					: _a3.attribs.href;
			if (href2) {
				entry.link = href2;
			}
			const description =
				fetch2("summary", children) || fetch2("content", children);
			if (description) {
				entry.description = description;
			}
			const pubDate = fetch2("updated", children);
			if (pubDate) {
				entry.pubDate = new Date(pubDate);
			}
			return entry;
		}),
	};
	addConditionally(feed, "id", "id", childs);
	addConditionally(feed, "title", "title", childs);
	const href =
		(_a2 = getOneElement("link", childs)) === null || _a2 === undefined
			? undefined
			: _a2.attribs.href;
	if (href) {
		feed.link = href;
	}
	addConditionally(feed, "description", "subtitle", childs);
	const updated = fetch2("updated", childs);
	if (updated) {
		feed.updated = new Date(updated);
	}
	addConditionally(feed, "author", "email", childs, true);
	return feed;
}
function getRssFeed(feedRoot) {
	var _a2, _b;
	const childs =
		(_b =
			(_a2 = getOneElement("channel", feedRoot.children)) === null ||
			_a2 === undefined
				? undefined
				: _a2.children) !== null && _b !== undefined
			? _b
			: [];
	const feed = {
		type: feedRoot.name.substr(0, 3),
		id: "",
		items: getElementsByTagName("item", feedRoot.children).map((item) => {
			const { children } = item;
			const entry = { media: getMediaElements(children) };
			addConditionally(entry, "id", "guid", children);
			addConditionally(entry, "title", "title", children);
			addConditionally(entry, "link", "link", children);
			addConditionally(entry, "description", "description", children);
			const pubDate =
				fetch2("pubDate", children) || fetch2("dc:date", children);
			if (pubDate) entry.pubDate = new Date(pubDate);
			return entry;
		}),
	};
	addConditionally(feed, "title", "title", childs);
	addConditionally(feed, "link", "link", childs);
	addConditionally(feed, "description", "description", childs);
	const updated = fetch2("lastBuildDate", childs);
	if (updated) {
		feed.updated = new Date(updated);
	}
	addConditionally(feed, "author", "managingEditor", childs, true);
	return feed;
}
function getMediaElements(where) {
	return getElementsByTagName("media:content", where).map((elem) => {
		const { attribs } = elem;
		const media = {
			medium: attribs.medium,
			isDefault: !!attribs.isDefault,
		};
		for (const attrib of MEDIA_KEYS_STRING) {
			if (attribs[attrib]) {
				media[attrib] = attribs[attrib];
			}
		}
		for (const attrib of MEDIA_KEYS_INT) {
			if (attribs[attrib]) {
				media[attrib] = parseInt(attribs[attrib], 10);
			}
		}
		if (attribs.expression) {
			media.expression = attribs.expression;
		}
		return media;
	});
}
function getOneElement(tagName, node2) {
	return getElementsByTagName(tagName, node2, true, 1)[0];
}
function fetch2(tagName, where, recurse = false) {
	return textContent(getElementsByTagName(tagName, where, recurse, 1)).trim();
}
function addConditionally(obj, prop, tagName, where, recurse = false) {
	const val = fetch2(tagName, where, recurse);
	if (val) obj[prop] = val;
}
function isValidFeed(value) {
	return value === "rss" || value === "feed" || value === "rdf:RDF";
}
var MEDIA_KEYS_STRING, MEDIA_KEYS_INT;
var init_feeds = __esm(() => {
	init_stringify();
	init_legacy();
	MEDIA_KEYS_STRING = ["url", "type", "lang"];
	MEDIA_KEYS_INT = [
		"fileSize",
		"bitrate",
		"framerate",
		"samplingrate",
		"channels",
		"duration",
		"height",
		"width",
	];
});

// node_modules/domutils/lib/esm/index.js
var exports_esm2 = {};
__export(exports_esm2, {
	uniqueSort: () => uniqueSort,
	textContent: () => textContent,
	testElement: () => testElement,
	replaceElement: () => replaceElement,
	removeSubsets: () => removeSubsets,
	removeElement: () => removeElement,
	prevElementSibling: () => prevElementSibling,
	prependChild: () => prependChild,
	prepend: () => prepend,
	nextElementSibling: () => nextElementSibling,
	isText: () => isText,
	isTag: () => isTag2,
	isDocument: () => isDocument,
	isComment: () => isComment,
	isCDATA: () => isCDATA,
	innerText: () => innerText,
	hasChildren: () => hasChildren,
	hasAttrib: () => hasAttrib,
	getText: () => getText,
	getSiblings: () => getSiblings,
	getParent: () => getParent,
	getOuterHTML: () => getOuterHTML,
	getName: () => getName,
	getInnerHTML: () => getInnerHTML,
	getFeed: () => getFeed,
	getElementsByTagType: () => getElementsByTagType,
	getElementsByTagName: () => getElementsByTagName,
	getElementsByClassName: () => getElementsByClassName,
	getElements: () => getElements,
	getElementById: () => getElementById,
	getChildren: () => getChildren,
	getAttributeValue: () => getAttributeValue,
	findOneChild: () => findOneChild,
	findOne: () => findOne,
	findAll: () => findAll,
	find: () => find,
	filter: () => filter,
	existsOne: () => existsOne,
	compareDocumentPosition: () => compareDocumentPosition,
	appendChild: () => appendChild,
	append: () => append,
	DocumentPosition: () => DocumentPosition,
});
var init_esm5 = __esm(() => {
	init_esm2();
	init_stringify();
	init_traversal();
	init_querying();
	init_legacy();
	init_helpers();
	init_feeds();
});

// node_modules/htmlparser2/dist/esm/index.js
var exports_esm3 = {};
__export(exports_esm3, {
	parseFeed: () => parseFeed,
	parseDocument: () => parseDocument,
	parseDOM: () => parseDOM,
	getFeed: () => getFeed,
	createDomStream: () => createDomStream,
	createDocumentStream: () => createDocumentStream,
	Tokenizer: () => Tokenizer,
	QuoteType: () => QuoteType,
	Parser: () => Parser,
	ElementType: () => exports_esm,
	DomUtils: () => exports_esm2,
	DomHandler: () => DomHandler,
	DefaultHandler: () => DomHandler,
});
function parseDocument(data, options) {
	const handler = new DomHandler(undefined, options);
	new Parser(handler, options).end(data);
	return handler.root;
}
function parseDOM(data, options) {
	return parseDocument(data, options).children;
}
function createDocumentStream(callback, options, elementCallback) {
	const handler = new DomHandler(
		(error) => callback(error, handler.root),
		options,
		elementCallback,
	);
	return new Parser(handler, options);
}
function createDomStream(callback, options, elementCallback) {
	const handler = new DomHandler(callback, options, elementCallback);
	return new Parser(handler, options);
}
function parseFeed(feed, options = parseFeedDefaultOptions) {
	return getFeed(parseDOM(feed, options));
}
var parseFeedDefaultOptions;
var init_esm6 = __esm(() => {
	init_Parser();
	init_Parser();
	init_esm2();
	init_esm2();
	init_Tokenizer();
	init_esm();
	init_esm5();
	init_esm5();
	init_esm5();
	parseFeedDefaultOptions = { xmlMode: true };
});

// node_modules/linkedom/esm/shared/constants.js
var NODE_END = -1,
	ELEMENT_NODE = 1,
	ATTRIBUTE_NODE = 2,
	TEXT_NODE = 3,
	CDATA_SECTION_NODE = 4,
	COMMENT_NODE = 8,
	DOCUMENT_NODE = 9,
	DOCUMENT_TYPE_NODE = 10,
	DOCUMENT_FRAGMENT_NODE = 11,
	BLOCK_ELEMENTS,
	SHOW_ALL = -1,
	SHOW_ELEMENT = 1,
	SHOW_TEXT = 4,
	SHOW_CDATA_SECTION = 8,
	SHOW_COMMENT = 128,
	DOCUMENT_POSITION_DISCONNECTED = 1,
	DOCUMENT_POSITION_PRECEDING = 2,
	DOCUMENT_POSITION_FOLLOWING = 4,
	DOCUMENT_POSITION_CONTAINS = 8,
	DOCUMENT_POSITION_CONTAINED_BY = 16,
	DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32,
	SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var init_constants = __esm(() => {
	BLOCK_ELEMENTS = new Set([
		"ARTICLE",
		"ASIDE",
		"BLOCKQUOTE",
		"BODY",
		"BR",
		"BUTTON",
		"CANVAS",
		"CAPTION",
		"COL",
		"COLGROUP",
		"DD",
		"DIV",
		"DL",
		"DT",
		"EMBED",
		"FIELDSET",
		"FIGCAPTION",
		"FIGURE",
		"FOOTER",
		"FORM",
		"H1",
		"H2",
		"H3",
		"H4",
		"H5",
		"H6",
		"LI",
		"UL",
		"OL",
		"P",
	]);
});

// node_modules/linkedom/esm/shared/object.js
var assign,
	create,
	defineProperties,
	entries,
	_getOwnPropertyDescriptors,
	keys,
	setPrototypeOf;
var init_object = __esm(() => {
	({
		assign,
		create,
		defineProperties,
		entries,
		_getOwnPropertyDescriptors,
		keys,
		setPrototypeOf,
	} = Object);
});

// node_modules/linkedom/esm/shared/utils.js
var $String,
	getEnd = (node2) => (node2.nodeType === ELEMENT_NODE ? node2[END] : node2),
	ignoreCase = ({ ownerDocument }) => ownerDocument[MIME].ignoreCase,
	knownAdjacent = (prev, next) => {
		prev[NEXT] = next;
		next[PREV] = prev;
	},
	knownBoundaries = (prev, current, next) => {
		knownAdjacent(prev, current);
		knownAdjacent(getEnd(current), next);
	},
	knownSegment = (prev, start, end, next) => {
		knownAdjacent(prev, start);
		knownAdjacent(getEnd(end), next);
	},
	knownSiblings = (prev, current, next) => {
		knownAdjacent(prev, current);
		knownAdjacent(current, next);
	},
	localCase = ({ localName, ownerDocument }) => {
		return ownerDocument[MIME].ignoreCase ? localName.toUpperCase() : localName;
	},
	setAdjacent = (prev, next) => {
		if (prev) prev[NEXT] = next;
		if (next) next[PREV] = prev;
	},
	htmlToFragment = (ownerDocument, html) => {
		const fragment = ownerDocument.createDocumentFragment();
		const elem = ownerDocument.createElement("");
		elem.innerHTML = html;
		const { firstChild, lastChild } = elem;
		if (firstChild) {
			knownSegment(fragment, firstChild, lastChild, fragment[END]);
			let child = firstChild;
			do {
				child.parentNode = fragment;
			} while (child !== lastChild && (child = getEnd(child)[NEXT]));
		}
		return fragment;
	};
var init_utils = __esm(() => {
	init_constants();
	init_symbols();
	$String = String;
});

// node_modules/linkedom/esm/shared/shadow-roots.js
var shadowRoots;
var init_shadow_roots = __esm(() => {
	shadowRoots = new WeakMap();
});

// node_modules/linkedom/esm/interface/custom-element-registry.js
class CustomElementRegistry {
	constructor(ownerDocument) {
		this.ownerDocument = ownerDocument;
		this.registry = new Map();
		this.waiting = new Map();
		this.active = false;
	}
	define(localName, Class, options = {}) {
		const { ownerDocument, registry, waiting } = this;
		if (registry.has(localName))
			throw new Error(`unable to redefine ${localName}`);
		if (Classes.has(Class))
			throw new Error(`unable to redefine the same class: ${Class}`);
		this.active = reactive = true;
		const { extends: extend } = options;
		Classes.set(Class, {
			ownerDocument,
			options: { is: extend ? localName : "" },
			localName: extend || localName,
		});
		const check = extend
			? (element) => {
					return (
						element.localName === extend &&
						element.getAttribute("is") === localName
					);
				}
			: (element) => element.localName === localName;
		registry.set(localName, { Class, check });
		if (waiting.has(localName)) {
			for (const resolve4 of waiting.get(localName)) resolve4(Class);
			waiting.delete(localName);
		}
		ownerDocument
			.querySelectorAll(extend ? `${extend}[is="${localName}"]` : localName)
			.forEach(this.upgrade, this);
	}
	upgrade(element) {
		if (customElements.has(element)) return;
		const { ownerDocument, registry } = this;
		const ce = element.getAttribute("is") || element.localName;
		if (registry.has(ce)) {
			const { Class, check } = registry.get(ce);
			if (check(element)) {
				const { attributes, isConnected } = element;
				for (const attr of attributes) element.removeAttributeNode(attr);
				const values = entries(element);
				for (const [key] of values) delete element[key];
				setPrototypeOf(element, Class.prototype);
				ownerDocument[UPGRADE] = { element, values };
				new Class(ownerDocument, ce);
				customElements.set(element, { connected: isConnected });
				for (const attr of attributes) element.setAttributeNode(attr);
				if (isConnected && element.connectedCallback)
					element.connectedCallback();
			}
		}
	}
	whenDefined(localName) {
		const { registry, waiting } = this;
		return new Promise((resolve4) => {
			if (registry.has(localName)) resolve4(registry.get(localName).Class);
			else {
				if (!waiting.has(localName)) waiting.set(localName, []);
				waiting.get(localName).push(resolve4);
			}
		});
	}
	get(localName) {
		const info = this.registry.get(localName);
		return info?.Class;
	}
	getName(Class) {
		if (Classes.has(Class)) {
			const { localName } = Classes.get(Class);
			return localName;
		}
		return null;
	}
}
var reactive = false,
	Classes,
	customElements,
	attributeChangedCallback = (element, attributeName, oldValue, newValue) => {
		if (
			reactive &&
			customElements.has(element) &&
			element.attributeChangedCallback &&
			element.constructor.observedAttributes.includes(attributeName)
		) {
			element.attributeChangedCallback(attributeName, oldValue, newValue);
		}
	},
	createTrigger = (method, isConnected) => (element) => {
		if (customElements.has(element)) {
			const info = customElements.get(element);
			if (
				info.connected !== isConnected &&
				element.isConnected === isConnected
			) {
				info.connected = isConnected;
				if (method in element) element[method]();
			}
		}
	},
	triggerConnected,
	connectedCallback = (element) => {
		if (reactive) {
			triggerConnected(element);
			if (shadowRoots.has(element))
				element = shadowRoots.get(element).shadowRoot;
			let { [NEXT]: next, [END]: end } = element;
			while (next !== end) {
				if (next.nodeType === ELEMENT_NODE) triggerConnected(next);
				next = next[NEXT];
			}
		}
	},
	triggerDisconnected,
	disconnectedCallback = (element) => {
		if (reactive) {
			triggerDisconnected(element);
			if (shadowRoots.has(element))
				element = shadowRoots.get(element).shadowRoot;
			let { [NEXT]: next, [END]: end } = element;
			while (next !== end) {
				if (next.nodeType === ELEMENT_NODE) triggerDisconnected(next);
				next = next[NEXT];
			}
		}
	};
var init_custom_element_registry = __esm(() => {
	init_constants();
	init_symbols();
	init_object();
	init_shadow_roots();
	Classes = new WeakMap();
	customElements = new WeakMap();
	triggerConnected = createTrigger("connectedCallback", true);
	triggerDisconnected = createTrigger("disconnectedCallback", false);
});

// node_modules/linkedom/esm/shared/parse-from-string.js
var Parser2,
	_notParsing = true,
	append2 = (self, node2, active) => {
		const end = self[END];
		node2.parentNode = self;
		knownBoundaries(end[PREV], node2, end);
		if (active && node2.nodeType === ELEMENT_NODE) connectedCallback(node2);
		return node2;
	},
	attribute = (element, end, attribute2, value, active) => {
		attribute2[VALUE] = value;
		attribute2.ownerElement = element;
		knownSiblings(end[PREV], attribute2, end);
		if (attribute2.name === "class") element.className = value;
		if (active) attributeChangedCallback(element, attribute2.name, null, value);
	},
	parseFromString = (document, isHTML, markupLanguage) => {
		const { active, registry } = document[CUSTOM_ELEMENTS];
		let node2 = document;
		let ownerSVGElement = null;
		let parsingCData = false;
		_notParsing = false;
		const content = new Parser2(
			{
				onprocessinginstruction(name, data) {
					if (name.toLowerCase() === "!doctype")
						document.doctype = data.slice(name.length).trim();
				},
				onopentag(name, attributes) {
					let create2 = true;
					if (isHTML) {
						if (ownerSVGElement) {
							node2 = append2(
								node2,
								document.createElementNS(SVG_NAMESPACE, name),
								active,
							);
							node2.ownerSVGElement = ownerSVGElement;
							create2 = false;
						} else if (name === "svg" || name === "SVG") {
							ownerSVGElement = document.createElementNS(SVG_NAMESPACE, name);
							node2 = append2(node2, ownerSVGElement, active);
							create2 = false;
						} else if (active) {
							const ce = name.includes("-") ? name : attributes.is || "";
							if (ce && registry.has(ce)) {
								const { Class } = registry.get(ce);
								node2 = append2(node2, new Class(), active);
								delete attributes.is;
								create2 = false;
							}
						}
					}
					if (create2)
						node2 = append2(node2, document.createElement(name), false);
					const end = node2[END];
					for (const name2 of keys(attributes))
						attribute(
							node2,
							end,
							document.createAttribute(name2),
							attributes[name2],
							active,
						);
				},
				oncomment(data) {
					append2(node2, document.createComment(data), active);
				},
				ontext(text) {
					if (parsingCData) {
						append2(node2, document.createCDATASection(text), active);
					} else {
						append2(node2, document.createTextNode(text), active);
					}
				},
				oncdatastart() {
					parsingCData = true;
				},
				oncdataend() {
					parsingCData = false;
				},
				onclosetag() {
					if (isHTML && node2 === ownerSVGElement) ownerSVGElement = null;
					node2 = node2.parentNode;
				},
			},
			{
				lowerCaseAttributeNames: false,
				decodeEntities: true,
				xmlMode: !isHTML,
			},
		);
		content.write(markupLanguage);
		content.end();
		_notParsing = true;
		return document;
	};
var init_parse_from_string = __esm(() => {
	init_esm6();
	init_constants();
	init_symbols();
	init_object();
	init_utils();
	init_custom_element_registry();
	({ Parser: Parser2 } = exports_esm3);
});

// node_modules/linkedom/esm/shared/register-html-class.js
var htmlClasses,
	registerHTMLClass = (names, Class) => {
		for (const name of [].concat(names)) {
			htmlClasses.set(name, Class);
			htmlClasses.set(name.toUpperCase(), Class);
		}
	};
var init_register_html_class = __esm(() => {
	htmlClasses = new Map();
});

// node_modules/linkedom/esm/shared/jsdon.js
var loopSegment = ({ [NEXT]: next, [END]: end }, json) => {
		while (next !== end) {
			switch (next.nodeType) {
				case ATTRIBUTE_NODE:
					attrAsJSON(next, json);
					break;
				case TEXT_NODE:
				case COMMENT_NODE:
				case CDATA_SECTION_NODE:
					characterDataAsJSON(next, json);
					break;
				case ELEMENT_NODE:
					elementAsJSON(next, json);
					next = getEnd(next);
					break;
				case DOCUMENT_TYPE_NODE:
					documentTypeAsJSON(next, json);
					break;
			}
			next = next[NEXT];
		}
		const last = json.length - 1;
		const value = json[last];
		if (typeof value === "number" && value < 0) json[last] += NODE_END;
		else json.push(NODE_END);
	},
	attrAsJSON = (attr, json) => {
		json.push(ATTRIBUTE_NODE, attr.name);
		const value = attr[VALUE].trim();
		if (value) json.push(value);
	},
	characterDataAsJSON = (node2, json) => {
		const value = node2[VALUE];
		if (value.trim()) json.push(node2.nodeType, value);
	},
	nonElementAsJSON = (node2, json) => {
		json.push(node2.nodeType);
		loopSegment(node2, json);
	},
	documentTypeAsJSON = ({ name, publicId, systemId }, json) => {
		json.push(DOCUMENT_TYPE_NODE, name);
		if (publicId) json.push(publicId);
		if (systemId) json.push(systemId);
	},
	elementAsJSON = (element, json) => {
		json.push(ELEMENT_NODE, element.localName);
		loopSegment(element, json);
	};
var init_jsdon = __esm(() => {
	init_constants();
	init_symbols();
	init_utils();
});

// node_modules/linkedom/esm/interface/mutation-observer.js
class MutationObserverClass {
	constructor(ownerDocument) {
		const observers = new Set();
		this.observers = observers;
		this.active = false;
		this.class = class MutationObserver {
			constructor(callback) {
				this.callback = callback;
				this.nodes = new Map();
				this.records = [];
				this.scheduled = false;
			}
			disconnect() {
				this.records.splice(0);
				this.nodes.clear();
				observers.delete(this);
				ownerDocument[MUTATION_OBSERVER].active = !!observers.size;
			}
			observe(
				target,
				options = {
					subtree: false,
					childList: false,
					attributes: false,
					attributeFilter: null,
					attributeOldValue: false,
					characterData: false,
				},
			) {
				if ("attributeOldValue" in options || "attributeFilter" in options)
					options.attributes = true;
				options.childList = !!options.childList;
				options.subtree = !!options.subtree;
				this.nodes.set(target, options);
				observers.add(this);
				ownerDocument[MUTATION_OBSERVER].active = true;
			}
			takeRecords() {
				return this.records.splice(0);
			}
		};
	}
}
var createRecord = (
		type,
		target,
		element,
		addedNodes,
		removedNodes,
		attributeName,
		oldValue,
	) => ({
		type,
		target,
		addedNodes,
		removedNodes,
		attributeName,
		oldValue,
		previousSibling: element?.previousSibling || null,
		nextSibling: element?.nextSibling || null,
	}),
	queueAttribute = (
		observer,
		target,
		attributeName,
		attributeFilter,
		attributeOldValue,
		oldValue,
	) => {
		if (!attributeFilter || attributeFilter.includes(attributeName)) {
			const { callback, records, scheduled } = observer;
			records.push(
				createRecord(
					"attributes",
					target,
					null,
					[],
					[],
					attributeName,
					attributeOldValue ? oldValue : undefined,
				),
			);
			if (!scheduled) {
				observer.scheduled = true;
				Promise.resolve().then(() => {
					observer.scheduled = false;
					callback(records.splice(0), observer);
				});
			}
		}
	},
	attributeChangedCallback2 = (element, attributeName, oldValue) => {
		const { ownerDocument } = element;
		const { active, observers } = ownerDocument[MUTATION_OBSERVER];
		if (active) {
			for (const observer of observers) {
				for (const [
					target,
					{
						childList,
						subtree,
						attributes,
						attributeFilter,
						attributeOldValue,
					},
				] of observer.nodes) {
					if (childList) {
						if (
							(subtree &&
								(target === ownerDocument || target.contains(element))) ||
							(!subtree && target.children.includes(element))
						) {
							queueAttribute(
								observer,
								element,
								attributeName,
								attributeFilter,
								attributeOldValue,
								oldValue,
							);
							break;
						}
					} else if (attributes && target === element) {
						queueAttribute(
							observer,
							element,
							attributeName,
							attributeFilter,
							attributeOldValue,
							oldValue,
						);
						break;
					}
				}
			}
		}
	},
	moCallback = (element, parentNode) => {
		const { ownerDocument } = element;
		const { active, observers } = ownerDocument[MUTATION_OBSERVER];
		if (active) {
			for (const observer of observers) {
				for (const [
					target,
					{ subtree, childList, characterData },
				] of observer.nodes) {
					if (childList) {
						if (
							(parentNode &&
								(target === parentNode ||
									(subtree && target.contains(parentNode)))) ||
							(!parentNode &&
								((subtree &&
									(target === ownerDocument || target.contains(element))) ||
									(!subtree &&
										target[characterData ? "childNodes" : "children"].includes(
											element,
										))))
						) {
							const { callback, records, scheduled } = observer;
							records.push(
								createRecord(
									"childList",
									target,
									element,
									parentNode ? [] : [element],
									parentNode ? [element] : [],
								),
							);
							if (!scheduled) {
								observer.scheduled = true;
								Promise.resolve().then(() => {
									observer.scheduled = false;
									callback(records.splice(0), observer);
								});
							}
							break;
						}
					}
				}
			}
		}
	};
var init_mutation_observer = __esm(() => {
	init_symbols();
});

// node_modules/linkedom/esm/shared/attributes.js
var emptyAttributes,
	setAttribute = (element, attribute2) => {
		const { [VALUE]: value, name } = attribute2;
		attribute2.ownerElement = element;
		knownSiblings(element, attribute2, element[NEXT]);
		if (name === "class") element.className = value;
		attributeChangedCallback2(element, name, null);
		attributeChangedCallback(element, name, null, value);
	},
	removeAttribute = (element, attribute2) => {
		const { [VALUE]: value, name } = attribute2;
		knownAdjacent(attribute2[PREV], attribute2[NEXT]);
		attribute2.ownerElement = attribute2[PREV] = attribute2[NEXT] = null;
		if (name === "class") element[CLASS_LIST] = null;
		attributeChangedCallback2(element, name, value);
		attributeChangedCallback(element, name, value, null);
	},
	booleanAttribute,
	numericAttribute,
	stringAttribute;
var init_attributes = __esm(() => {
	init_symbols();
	init_utils();
	init_custom_element_registry();
	init_mutation_observer();
	emptyAttributes = new Set([
		"allowfullscreen",
		"allowpaymentrequest",
		"async",
		"autofocus",
		"autoplay",
		"checked",
		"class",
		"contenteditable",
		"controls",
		"default",
		"defer",
		"disabled",
		"draggable",
		"formnovalidate",
		"hidden",
		"id",
		"ismap",
		"itemscope",
		"loop",
		"multiple",
		"muted",
		"nomodule",
		"novalidate",
		"open",
		"playsinline",
		"readonly",
		"required",
		"reversed",
		"selected",
		"style",
		"truespeed",
	]);
	booleanAttribute = {
		get(element, name) {
			return element.hasAttribute(name);
		},
		set(element, name, value) {
			if (value) element.setAttribute(name, "");
			else element.removeAttribute(name);
		},
	};
	numericAttribute = {
		get(element, name) {
			return parseFloat(element.getAttribute(name) || 0);
		},
		set(element, name, value) {
			element.setAttribute(name, value);
		},
	};
	stringAttribute = {
		get(element, name) {
			return element.getAttribute(name) || "";
		},
		set(element, name, value) {
			element.setAttribute(name, value);
		},
	};
});

// node_modules/linkedom/esm/interface/event-target.js
function dispatch(event, listener) {
	if (typeof listener === "function") listener.call(event.target, event);
	else listener.handleEvent(event);
	return event._stopImmediatePropagationFlag;
}
function invokeListeners({ currentTarget, target }) {
	const map = wm.get(currentTarget);
	if (map?.has(this.type)) {
		const listeners = map.get(this.type);
		if (currentTarget === target) {
			this.eventPhase = this.AT_TARGET;
		} else {
			this.eventPhase = this.BUBBLING_PHASE;
		}
		this.currentTarget = currentTarget;
		this.target = target;
		for (const [listener, options] of listeners) {
			if (options?.once) listeners.delete(listener);
			if (dispatch(this, listener)) break;
		}
		delete this.currentTarget;
		delete this.target;
		return this.cancelBubble;
	}
}

class DOMEventTarget {
	constructor() {
		wm.set(this, new Map());
	}
	_getParent() {
		return null;
	}
	addEventListener(type, listener, options) {
		const map = wm.get(this);
		if (!map.has(type)) map.set(type, new Map());
		map.get(type).set(listener, options);
	}
	removeEventListener(type, listener) {
		const map = wm.get(this);
		if (map.has(type)) {
			const listeners = map.get(type);
			if (listeners.delete(listener) && !listeners.size) map.delete(type);
		}
	}
	dispatchEvent(event) {
		let node2 = this;
		event.eventPhase = event.CAPTURING_PHASE;
		while (node2) {
			if (node2.dispatchEvent)
				event._path.push({ currentTarget: node2, target: this });
			node2 = event.bubbles && node2._getParent?.();
		}
		event._path.some(invokeListeners, event);
		event._path = [];
		event.eventPhase = event.NONE;
		return !event.defaultPrevented;
	}
}
var wm;
var init_event_target = __esm(() => {
	wm = new WeakMap();
});

// node_modules/linkedom/esm/interface/node-list.js
var NodeList;
var init_node_list = __esm(() => {
	NodeList = class NodeList extends Array {
		item(i) {
			return i < this.length ? this[i] : null;
		}
	};
});

// node_modules/linkedom/esm/interface/node.js
var getParentNodeCount = ({ parentNode }) => {
		let count = 0;
		while (parentNode) {
			count++;
			parentNode = parentNode.parentNode;
		}
		return count;
	},
	Node2;
var init_node2 = __esm(() => {
	init_constants();
	init_symbols();
	init_event_target();
	init_node_list();
	Node2 = class Node2 extends DOMEventTarget {
		static get ELEMENT_NODE() {
			return ELEMENT_NODE;
		}
		static get ATTRIBUTE_NODE() {
			return ATTRIBUTE_NODE;
		}
		static get TEXT_NODE() {
			return TEXT_NODE;
		}
		static get CDATA_SECTION_NODE() {
			return CDATA_SECTION_NODE;
		}
		static get COMMENT_NODE() {
			return COMMENT_NODE;
		}
		static get DOCUMENT_NODE() {
			return DOCUMENT_NODE;
		}
		static get DOCUMENT_FRAGMENT_NODE() {
			return DOCUMENT_FRAGMENT_NODE;
		}
		static get DOCUMENT_TYPE_NODE() {
			return DOCUMENT_TYPE_NODE;
		}
		constructor(ownerDocument, localName, nodeType) {
			super();
			this.ownerDocument = ownerDocument;
			this.localName = localName;
			this.nodeType = nodeType;
			this.parentNode = null;
			this[NEXT] = null;
			this[PREV] = null;
		}
		get ELEMENT_NODE() {
			return ELEMENT_NODE;
		}
		get ATTRIBUTE_NODE() {
			return ATTRIBUTE_NODE;
		}
		get TEXT_NODE() {
			return TEXT_NODE;
		}
		get CDATA_SECTION_NODE() {
			return CDATA_SECTION_NODE;
		}
		get COMMENT_NODE() {
			return COMMENT_NODE;
		}
		get DOCUMENT_NODE() {
			return DOCUMENT_NODE;
		}
		get DOCUMENT_FRAGMENT_NODE() {
			return DOCUMENT_FRAGMENT_NODE;
		}
		get DOCUMENT_TYPE_NODE() {
			return DOCUMENT_TYPE_NODE;
		}
		get baseURI() {
			const ownerDocument =
				this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument;
			if (ownerDocument) {
				const base = ownerDocument.querySelector("base");
				if (base) return base.getAttribute("href");
				const { location } = ownerDocument.defaultView;
				if (location) return location.href;
			}
			return null;
		}
		get isConnected() {
			return false;
		}
		get nodeName() {
			return this.localName;
		}
		get parentElement() {
			return null;
		}
		get previousSibling() {
			return null;
		}
		get previousElementSibling() {
			return null;
		}
		get nextSibling() {
			return null;
		}
		get nextElementSibling() {
			return null;
		}
		get childNodes() {
			return new NodeList();
		}
		get firstChild() {
			return null;
		}
		get lastChild() {
			return null;
		}
		get nodeValue() {
			return null;
		}
		set nodeValue(_value) {}
		get textContent() {
			return null;
		}
		set textContent(_value) {}
		normalize() {}
		cloneNode() {
			return null;
		}
		contains() {
			return false;
		}
		insertBefore(newNode, _referenceNode) {
			return newNode;
		}
		appendChild(child) {
			return child;
		}
		replaceChild(_newChild, oldChild) {
			return oldChild;
		}
		removeChild(child) {
			return child;
		}
		toString() {
			return "";
		}
		hasChildNodes() {
			return !!this.lastChild;
		}
		isSameNode(node2) {
			return this === node2;
		}
		compareDocumentPosition(target) {
			let result = 0;
			if (this !== target) {
				const self = getParentNodeCount(this);
				const other = getParentNodeCount(target);
				if (self < other) {
					result += DOCUMENT_POSITION_FOLLOWING;
					if (this.contains(target)) result += DOCUMENT_POSITION_CONTAINED_BY;
				} else if (other < self) {
					result += DOCUMENT_POSITION_PRECEDING;
					if (target.contains(this)) result += DOCUMENT_POSITION_CONTAINS;
				} else if (self && other) {
					const { childNodes } = this.parentNode;
					if (childNodes.indexOf(this) < childNodes.indexOf(target))
						result += DOCUMENT_POSITION_FOLLOWING;
					else result += DOCUMENT_POSITION_PRECEDING;
				}
				if (!self || !other) {
					result += DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
					result += DOCUMENT_POSITION_DISCONNECTED;
				}
			}
			return result;
		}
		isEqualNode(node2) {
			if (this === node2) return true;
			if (this.nodeType === node2.nodeType) {
				switch (this.nodeType) {
					case DOCUMENT_NODE:
					case DOCUMENT_FRAGMENT_NODE: {
						const aNodes = this.childNodes;
						const bNodes = node2.childNodes;
						return (
							aNodes.length === bNodes.length &&
							aNodes.every((node3, i) => node3.isEqualNode(bNodes[i]))
						);
					}
				}
				return this.toString() === node2.toString();
			}
			return false;
		}
		_getParent() {
			return this.parentNode;
		}
		getRootNode() {
			let root = this;
			while (root.parentNode) root = root.parentNode;
			return root;
		}
	};
});

// node_modules/linkedom/esm/shared/text-escaper.js
var { replace } = "",
	ca,
	esca,
	pe = (m) => esca[m],
	escape2 = (es) => replace.call(es, ca, pe);
var init_text_escaper = __esm(() => {
	ca = /[<>&\xA0]/g;
	esca = {
		"\xA0": "&#160;",
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
	};
});

// node_modules/linkedom/esm/interface/attr.js
var QUOTE, Attr;
var init_attr = __esm(() => {
	init_constants();
	init_symbols();
	init_utils();
	init_jsdon();
	init_attributes();
	init_mutation_observer();
	init_custom_element_registry();
	init_node2();
	init_text_escaper();
	QUOTE = /"/g;
	Attr = class Attr extends Node2 {
		constructor(ownerDocument, name, value = "") {
			super(ownerDocument, name, ATTRIBUTE_NODE);
			this.ownerElement = null;
			this.name = $String(name);
			this[VALUE] = $String(value);
			this[CHANGED] = false;
		}
		get value() {
			return this[VALUE];
		}
		set value(newValue) {
			const { [VALUE]: oldValue, name, ownerElement } = this;
			this[VALUE] = $String(newValue);
			this[CHANGED] = true;
			if (ownerElement) {
				attributeChangedCallback2(ownerElement, name, oldValue);
				attributeChangedCallback(ownerElement, name, oldValue, this[VALUE]);
			}
		}
		cloneNode() {
			const { ownerDocument, name, [VALUE]: value } = this;
			return new Attr(ownerDocument, name, value);
		}
		toString() {
			const { name, [VALUE]: value } = this;
			if (emptyAttributes.has(name) && !value) {
				return ignoreCase(this) ? name : `${name}=""`;
			}
			const escapedValue = (ignoreCase(this) ? value : escape2(value)).replace(
				QUOTE,
				"&quot;",
			);
			return `${name}="${escapedValue}"`;
		}
		toJSON() {
			const json = [];
			attrAsJSON(this, json);
			return json;
		}
	};
});

// node_modules/linkedom/esm/shared/node.js
var isConnected = ({ ownerDocument, parentNode }) => {
		while (parentNode) {
			if (parentNode === ownerDocument) return true;
			parentNode = parentNode.parentNode || parentNode.host;
		}
		return false;
	},
	parentElement = ({ parentNode }) => {
		if (parentNode) {
			switch (parentNode.nodeType) {
				case DOCUMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					return null;
			}
		}
		return parentNode;
	},
	previousSibling = ({ [PREV]: prev }) => {
		switch (prev ? prev.nodeType : 0) {
			case NODE_END:
				return prev[START];
			case TEXT_NODE:
			case COMMENT_NODE:
			case CDATA_SECTION_NODE:
				return prev;
		}
		return null;
	},
	nextSibling = (node2) => {
		const next = getEnd(node2)[NEXT];
		return next && (next.nodeType === NODE_END ? null : next);
	};
var init_node3 = __esm(() => {
	init_constants();
	init_symbols();
	init_utils();
});

// node_modules/linkedom/esm/mixin/non-document-type-child-node.js
var nextElementSibling2 = (node2) => {
		let next = nextSibling(node2);
		while (next && next.nodeType !== ELEMENT_NODE) next = nextSibling(next);
		return next;
	},
	previousElementSibling = (node2) => {
		let prev = previousSibling(node2);
		while (prev && prev.nodeType !== ELEMENT_NODE) prev = previousSibling(prev);
		return prev;
	};
var init_non_document_type_child_node = __esm(() => {
	init_constants();
	init_node3();
});

// node_modules/linkedom/esm/mixin/child-node.js
var asFragment = (ownerDocument, nodes) => {
		const fragment = ownerDocument.createDocumentFragment();
		fragment.append(...nodes);
		return fragment;
	},
	before = (node2, nodes) => {
		const { ownerDocument, parentNode } = node2;
		if (parentNode)
			parentNode.insertBefore(asFragment(ownerDocument, nodes), node2);
	},
	after = (node2, nodes) => {
		const { ownerDocument, parentNode } = node2;
		if (parentNode)
			parentNode.insertBefore(
				asFragment(ownerDocument, nodes),
				getEnd(node2)[NEXT],
			);
	},
	replaceWith = (node2, nodes) => {
		const { ownerDocument, parentNode } = node2;
		if (parentNode) {
			if (nodes.includes(node2))
				replaceWith(node2, [(node2 = node2.cloneNode())]);
			parentNode.insertBefore(asFragment(ownerDocument, nodes), node2);
			node2.remove();
		}
	},
	remove = (prev, current, next) => {
		const { parentNode, nodeType } = current;
		if (prev || next) {
			setAdjacent(prev, next);
			current[PREV] = null;
			getEnd(current)[NEXT] = null;
		}
		if (parentNode) {
			current.parentNode = null;
			moCallback(current, parentNode);
			if (nodeType === ELEMENT_NODE) disconnectedCallback(current);
		}
	};
var init_child_node = __esm(() => {
	init_constants();
	init_symbols();
	init_utils();
	init_mutation_observer();
	init_custom_element_registry();
});

// node_modules/linkedom/esm/interface/character-data.js
var CharacterData;
var init_character_data = __esm(() => {
	init_symbols();
	init_utils();
	init_node3();
	init_jsdon();
	init_non_document_type_child_node();
	init_child_node();
	init_node2();
	init_mutation_observer();
	CharacterData = class CharacterData extends Node2 {
		constructor(ownerDocument, localName, nodeType, data) {
			super(ownerDocument, localName, nodeType);
			this[VALUE] = $String(data);
		}
		get isConnected() {
			return isConnected(this);
		}
		get parentElement() {
			return parentElement(this);
		}
		get previousSibling() {
			return previousSibling(this);
		}
		get nextSibling() {
			return nextSibling(this);
		}
		get previousElementSibling() {
			return previousElementSibling(this);
		}
		get nextElementSibling() {
			return nextElementSibling2(this);
		}
		before(...nodes) {
			before(this, nodes);
		}
		after(...nodes) {
			after(this, nodes);
		}
		replaceWith(...nodes) {
			replaceWith(this, nodes);
		}
		remove() {
			remove(this[PREV], this, this[NEXT]);
		}
		get data() {
			return this[VALUE];
		}
		set data(value) {
			this[VALUE] = $String(value);
			moCallback(this, this.parentNode);
		}
		get nodeValue() {
			return this.data;
		}
		set nodeValue(value) {
			this.data = value;
		}
		get textContent() {
			return this.data;
		}
		set textContent(value) {
			this.data = value;
		}
		get length() {
			return this.data.length;
		}
		substringData(offset, count) {
			return this.data.substr(offset, count);
		}
		appendData(data) {
			this.data += data;
		}
		insertData(offset, data) {
			const { data: t } = this;
			this.data = t.slice(0, offset) + data + t.slice(offset);
		}
		deleteData(offset, count) {
			const { data: t } = this;
			this.data = t.slice(0, offset) + t.slice(offset + count);
		}
		replaceData(offset, count, data) {
			const { data: t } = this;
			this.data = t.slice(0, offset) + data + t.slice(offset + count);
		}
		toJSON() {
			const json = [];
			characterDataAsJSON(this, json);
			return json;
		}
	};
});

// node_modules/linkedom/esm/interface/cdata-section.js
var CDATASection;
var init_cdata_section = __esm(() => {
	init_constants();
	init_symbols();
	init_character_data();
	CDATASection = class CDATASection extends CharacterData {
		constructor(ownerDocument, data = "") {
			super(ownerDocument, "#cdatasection", CDATA_SECTION_NODE, data);
		}
		cloneNode() {
			const { ownerDocument, [VALUE]: data } = this;
			return new CDATASection(ownerDocument, data);
		}
		toString() {
			return `<![CDATA[${this[VALUE]}]]>`;
		}
	};
});

// node_modules/linkedom/esm/interface/comment.js
var Comment3;
var init_comment = __esm(() => {
	init_constants();
	init_symbols();
	init_character_data();
	Comment3 = class Comment3 extends CharacterData {
		constructor(ownerDocument, data = "") {
			super(ownerDocument, "#comment", COMMENT_NODE, data);
		}
		cloneNode() {
			const { ownerDocument, [VALUE]: data } = this;
			return new Comment3(ownerDocument, data);
		}
		toString() {
			return `<!--${this[VALUE]}-->`;
		}
	};
});

// node_modules/boolbase/index.js
var require_boolbase = __commonJS((_exports, module) => {
	module.exports = {
		trueFunc: function trueFunc() {
			return true;
		},
		falseFunc: function falseFunc() {
			return false;
		},
	};
});

// node_modules/css-what/lib/es/types.js
var SelectorType, AttributeAction;
var init_types = __esm(() => {
	((SelectorType2) => {
		SelectorType2.Attribute = "attribute";
		SelectorType2.Pseudo = "pseudo";
		SelectorType2.PseudoElement = "pseudo-element";
		SelectorType2.Tag = "tag";
		SelectorType2.Universal = "universal";
		SelectorType2.Adjacent = "adjacent";
		SelectorType2.Child = "child";
		SelectorType2.Descendant = "descendant";
		SelectorType2.Parent = "parent";
		SelectorType2.Sibling = "sibling";
		SelectorType2.ColumnCombinator = "column-combinator";
	})(SelectorType || (SelectorType = {}));
	((AttributeAction2) => {
		AttributeAction2.Any = "any";
		AttributeAction2.Element = "element";
		AttributeAction2.End = "end";
		AttributeAction2.Equals = "equals";
		AttributeAction2.Exists = "exists";
		AttributeAction2.Hyphen = "hyphen";
		AttributeAction2.Not = "not";
		AttributeAction2.Start = "start";
	})(AttributeAction || (AttributeAction = {}));
});

// node_modules/css-what/lib/es/parse.js
function isTraversal(selector) {
	switch (selector.type) {
		case SelectorType.Adjacent:
		case SelectorType.Child:
		case SelectorType.Descendant:
		case SelectorType.Parent:
		case SelectorType.Sibling:
		case SelectorType.ColumnCombinator:
			return true;
		default:
			return false;
	}
}
function funescape(_, escaped, escapedWhitespace) {
	const high = parseInt(escaped, 16) - 65536;
	return high !== high || escapedWhitespace
		? escaped
		: high < 0
			? String.fromCharCode(high + 65536)
			: String.fromCharCode((high >> 10) | 55296, (high & 1023) | 56320);
}
function unescapeCSS(str) {
	return str.replace(reEscape, funescape);
}
function isQuote(c) {
	return c === 39 || c === 34;
}
function isWhitespace2(c) {
	return c === 32 || c === 9 || c === 10 || c === 12 || c === 13;
}
function parse(selector) {
	const subselects = [];
	const endIndex = parseSelector(subselects, `${selector}`, 0);
	if (endIndex < selector.length) {
		throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
	}
	return subselects;
}
function parseSelector(subselects, selector, selectorIndex) {
	let tokens = [];
	function getName2(offset) {
		const match = selector.slice(selectorIndex + offset).match(reName);
		if (!match) {
			throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
		}
		const [name] = match;
		selectorIndex += offset + name.length;
		return unescapeCSS(name);
	}
	function stripWhitespace(offset) {
		selectorIndex += offset;
		while (
			selectorIndex < selector.length &&
			isWhitespace2(selector.charCodeAt(selectorIndex))
		) {
			selectorIndex++;
		}
	}
	function readValueWithParenthesis() {
		selectorIndex += 1;
		const start = selectorIndex;
		let counter = 1;
		for (; counter > 0 && selectorIndex < selector.length; selectorIndex++) {
			if (
				selector.charCodeAt(selectorIndex) === 40 &&
				!isEscaped(selectorIndex)
			) {
				counter++;
			} else if (
				selector.charCodeAt(selectorIndex) === 41 &&
				!isEscaped(selectorIndex)
			) {
				counter--;
			}
		}
		if (counter) {
			throw new Error("Parenthesis not matched");
		}
		return unescapeCSS(selector.slice(start, selectorIndex - 1));
	}
	function isEscaped(pos) {
		let slashCount = 0;
		while (selector.charCodeAt(--pos) === 92) slashCount++;
		return (slashCount & 1) === 1;
	}
	function ensureNotTraversal() {
		if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
			throw new Error("Did not expect successive traversals.");
		}
	}
	function addTraversal(type) {
		if (
			tokens.length > 0 &&
			tokens[tokens.length - 1].type === SelectorType.Descendant
		) {
			tokens[tokens.length - 1].type = type;
			return;
		}
		ensureNotTraversal();
		tokens.push({ type });
	}
	function addSpecialAttribute(name, action) {
		tokens.push({
			type: SelectorType.Attribute,
			name,
			action,
			value: getName2(1),
			namespace: null,
			ignoreCase: "quirks",
		});
	}
	function finalizeSubselector() {
		if (
			tokens.length &&
			tokens[tokens.length - 1].type === SelectorType.Descendant
		) {
			tokens.pop();
		}
		if (tokens.length === 0) {
			throw new Error("Empty sub-selector");
		}
		subselects.push(tokens);
	}
	stripWhitespace(0);
	if (selector.length === selectorIndex) {
		return selectorIndex;
	}
	loop: while (selectorIndex < selector.length) {
		const firstChar = selector.charCodeAt(selectorIndex);
		switch (firstChar) {
			case 32:
			case 9:
			case 10:
			case 12:
			case 13: {
				if (tokens.length === 0 || tokens[0].type !== SelectorType.Descendant) {
					ensureNotTraversal();
					tokens.push({ type: SelectorType.Descendant });
				}
				stripWhitespace(1);
				break;
			}
			case 62: {
				addTraversal(SelectorType.Child);
				stripWhitespace(1);
				break;
			}
			case 60: {
				addTraversal(SelectorType.Parent);
				stripWhitespace(1);
				break;
			}
			case 126: {
				addTraversal(SelectorType.Sibling);
				stripWhitespace(1);
				break;
			}
			case 43: {
				addTraversal(SelectorType.Adjacent);
				stripWhitespace(1);
				break;
			}
			case 46: {
				addSpecialAttribute("class", AttributeAction.Element);
				break;
			}
			case 35: {
				addSpecialAttribute("id", AttributeAction.Equals);
				break;
			}
			case 91: {
				stripWhitespace(1);
				let name;
				let namespace = null;
				if (selector.charCodeAt(selectorIndex) === 124) {
					name = getName2(1);
				} else if (selector.startsWith("*|", selectorIndex)) {
					namespace = "*";
					name = getName2(2);
				} else {
					name = getName2(0);
					if (
						selector.charCodeAt(selectorIndex) === 124 &&
						selector.charCodeAt(selectorIndex + 1) !== 61
					) {
						namespace = name;
						name = getName2(1);
					}
				}
				stripWhitespace(0);
				let action = AttributeAction.Exists;
				const possibleAction = actionTypes.get(
					selector.charCodeAt(selectorIndex),
				);
				if (possibleAction) {
					action = possibleAction;
					if (selector.charCodeAt(selectorIndex + 1) !== 61) {
						throw new Error("Expected `=`");
					}
					stripWhitespace(2);
				} else if (selector.charCodeAt(selectorIndex) === 61) {
					action = AttributeAction.Equals;
					stripWhitespace(1);
				}
				let value = "";
				let ignoreCase2 = null;
				if (action !== "exists") {
					if (isQuote(selector.charCodeAt(selectorIndex))) {
						const quote = selector.charCodeAt(selectorIndex);
						let sectionEnd = selectorIndex + 1;
						while (
							sectionEnd < selector.length &&
							(selector.charCodeAt(sectionEnd) !== quote ||
								isEscaped(sectionEnd))
						) {
							sectionEnd += 1;
						}
						if (selector.charCodeAt(sectionEnd) !== quote) {
							throw new Error("Attribute value didn't end");
						}
						value = unescapeCSS(selector.slice(selectorIndex + 1, sectionEnd));
						selectorIndex = sectionEnd + 1;
					} else {
						const valueStart = selectorIndex;
						while (
							selectorIndex < selector.length &&
							((!isWhitespace2(selector.charCodeAt(selectorIndex)) &&
								selector.charCodeAt(selectorIndex) !== 93) ||
								isEscaped(selectorIndex))
						) {
							selectorIndex += 1;
						}
						value = unescapeCSS(selector.slice(valueStart, selectorIndex));
					}
					stripWhitespace(0);
					const forceIgnore = selector.charCodeAt(selectorIndex) | 32;
					if (forceIgnore === 115) {
						ignoreCase2 = false;
						stripWhitespace(1);
					} else if (forceIgnore === 105) {
						ignoreCase2 = true;
						stripWhitespace(1);
					}
				}
				if (selector.charCodeAt(selectorIndex) !== 93) {
					throw new Error("Attribute selector didn't terminate");
				}
				selectorIndex += 1;
				const attributeSelector = {
					type: SelectorType.Attribute,
					name,
					action,
					value,
					namespace,
					ignoreCase: ignoreCase2,
				};
				tokens.push(attributeSelector);
				break;
			}
			case 58: {
				if (selector.charCodeAt(selectorIndex + 1) === 58) {
					tokens.push({
						type: SelectorType.PseudoElement,
						name: getName2(2).toLowerCase(),
						data:
							selector.charCodeAt(selectorIndex) === 40
								? readValueWithParenthesis()
								: null,
					});
					continue;
				}
				const name = getName2(1).toLowerCase();
				let data = null;
				if (selector.charCodeAt(selectorIndex) === 40) {
					if (unpackPseudos.has(name)) {
						if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
							throw new Error(`Pseudo-selector ${name} cannot be quoted`);
						}
						data = [];
						selectorIndex = parseSelector(data, selector, selectorIndex + 1);
						if (selector.charCodeAt(selectorIndex) !== 41) {
							throw new Error(
								`Missing closing parenthesis in :${name} (${selector})`,
							);
						}
						selectorIndex += 1;
					} else {
						data = readValueWithParenthesis();
						if (stripQuotesFromPseudos.has(name)) {
							const quot = data.charCodeAt(0);
							if (quot === data.charCodeAt(data.length - 1) && isQuote(quot)) {
								data = data.slice(1, -1);
							}
						}
						data = unescapeCSS(data);
					}
				}
				tokens.push({ type: SelectorType.Pseudo, name, data });
				break;
			}
			case 44: {
				finalizeSubselector();
				tokens = [];
				stripWhitespace(1);
				break;
			}
			default: {
				if (selector.startsWith("/*", selectorIndex)) {
					const endIndex = selector.indexOf("*/", selectorIndex + 2);
					if (endIndex < 0) {
						throw new Error("Comment was not terminated");
					}
					selectorIndex = endIndex + 2;
					if (tokens.length === 0) {
						stripWhitespace(0);
					}
					break;
				}
				let namespace = null;
				let name;
				if (firstChar === 42) {
					selectorIndex += 1;
					name = "*";
				} else if (firstChar === 124) {
					name = "";
					if (selector.charCodeAt(selectorIndex + 1) === 124) {
						addTraversal(SelectorType.ColumnCombinator);
						stripWhitespace(2);
						break;
					}
				} else if (reName.test(selector.slice(selectorIndex))) {
					name = getName2(0);
				} else {
					break loop;
				}
				if (
					selector.charCodeAt(selectorIndex) === 124 &&
					selector.charCodeAt(selectorIndex + 1) !== 124
				) {
					namespace = name;
					if (selector.charCodeAt(selectorIndex + 1) === 42) {
						name = "*";
						selectorIndex += 2;
					} else {
						name = getName2(1);
					}
				}
				tokens.push(
					name === "*"
						? { type: SelectorType.Universal, namespace }
						: { type: SelectorType.Tag, name, namespace },
				);
			}
		}
	}
	finalizeSubselector();
	return selectorIndex;
}
var reName, reEscape, actionTypes, unpackPseudos, stripQuotesFromPseudos;
var init_parse = __esm(() => {
	init_types();
	reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
	reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
	actionTypes = new Map([
		[126, AttributeAction.Element],
		[94, AttributeAction.Start],
		[36, AttributeAction.End],
		[42, AttributeAction.Any],
		[33, AttributeAction.Not],
		[124, AttributeAction.Hyphen],
	]);
	unpackPseudos = new Set([
		"has",
		"not",
		"matches",
		"is",
		"where",
		"host",
		"host-context",
	]);
	stripQuotesFromPseudos = new Set(["contains", "icontains"]);
});

// node_modules/css-what/lib/es/index.js
var init_es = __esm(() => {
	init_parse();
	init_types();
});

// node_modules/css-select/lib/esm/sort.js
function isTraversal2(token) {
	return !procedure.has(token.type);
}
function sortByProcedure(arr) {
	const procs = arr.map(getProcedure);
	for (let i = 1; i < arr.length; i++) {
		const procNew = procs[i];
		if (procNew < 0) continue;
		for (let j = i - 1; j >= 0 && procNew < procs[j]; j--) {
			const token = arr[j + 1];
			arr[j + 1] = arr[j];
			arr[j] = token;
			procs[j + 1] = procs[j];
			procs[j] = procNew;
		}
	}
}
function getProcedure(token) {
	var _a2, _b;
	let proc =
		(_a2 = procedure.get(token.type)) !== null && _a2 !== undefined ? _a2 : -1;
	if (token.type === SelectorType.Attribute) {
		proc =
			(_b = attributes.get(token.action)) !== null && _b !== undefined ? _b : 4;
		if (token.action === AttributeAction.Equals && token.name === "id") {
			proc = 9;
		}
		if (token.ignoreCase) {
			proc >>= 1;
		}
	} else if (token.type === SelectorType.Pseudo) {
		if (!token.data) {
			proc = 3;
		} else if (token.name === "has" || token.name === "contains") {
			proc = 0;
		} else if (Array.isArray(token.data)) {
			proc = Math.min(
				...token.data.map((d) => Math.min(...d.map(getProcedure))),
			);
			if (proc < 0) {
				proc = 0;
			}
		} else {
			proc = 2;
		}
	}
	return proc;
}
var procedure, attributes;
var init_sort = __esm(() => {
	init_es();
	procedure = new Map([
		[SelectorType.Universal, 50],
		[SelectorType.Tag, 30],
		[SelectorType.Attribute, 1],
		[SelectorType.Pseudo, 0],
	]);
	attributes = new Map([
		[AttributeAction.Exists, 10],
		[AttributeAction.Equals, 8],
		[AttributeAction.Not, 7],
		[AttributeAction.Start, 6],
		[AttributeAction.End, 6],
		[AttributeAction.Any, 5],
	]);
});

// node_modules/css-select/lib/esm/attributes.js
function escapeRegex(value) {
	return value.replace(reChars, "\\$&");
}
function shouldIgnoreCase(selector, options) {
	return typeof selector.ignoreCase === "boolean"
		? selector.ignoreCase
		: selector.ignoreCase === "quirks"
			? !!options.quirksMode
			: !options.xmlMode && caseInsensitiveAttributes.has(selector.name);
}
var import_boolbase, reChars, caseInsensitiveAttributes, attributeRules;
var init_attributes2 = __esm(() => {
	import_boolbase = __toESM(require_boolbase(), 1);
	reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
	caseInsensitiveAttributes = new Set([
		"accept",
		"accept-charset",
		"align",
		"alink",
		"axis",
		"bgcolor",
		"charset",
		"checked",
		"clear",
		"codetype",
		"color",
		"compact",
		"declare",
		"defer",
		"dir",
		"direction",
		"disabled",
		"enctype",
		"face",
		"frame",
		"hreflang",
		"http-equiv",
		"lang",
		"language",
		"link",
		"media",
		"method",
		"multiple",
		"nohref",
		"noresize",
		"noshade",
		"nowrap",
		"readonly",
		"rel",
		"rev",
		"rules",
		"scope",
		"scrolling",
		"selected",
		"shape",
		"target",
		"text",
		"type",
		"valign",
		"valuetype",
		"vlink",
	]);
	attributeRules = {
		equals(next, data, options) {
			const { adapter } = options;
			const { name } = data;
			let { value } = data;
			if (shouldIgnoreCase(data, options)) {
				value = value.toLowerCase();
				return (elem) => {
					const attr = adapter.getAttributeValue(elem, name);
					return (
						attr != null &&
						attr.length === value.length &&
						attr.toLowerCase() === value &&
						next(elem)
					);
				};
			}
			return (elem) =>
				adapter.getAttributeValue(elem, name) === value && next(elem);
		},
		hyphen(next, data, options) {
			const { adapter } = options;
			const { name } = data;
			let { value } = data;
			const len = value.length;
			if (shouldIgnoreCase(data, options)) {
				value = value.toLowerCase();
				return function hyphenIC(elem) {
					const attr = adapter.getAttributeValue(elem, name);
					return (
						attr != null &&
						(attr.length === len || attr.charAt(len) === "-") &&
						attr.substr(0, len).toLowerCase() === value &&
						next(elem)
					);
				};
			}
			return function hyphen(elem) {
				const attr = adapter.getAttributeValue(elem, name);
				return (
					attr != null &&
					(attr.length === len || attr.charAt(len) === "-") &&
					attr.substr(0, len) === value &&
					next(elem)
				);
			};
		},
		element(next, data, options) {
			const { adapter } = options;
			const { name, value } = data;
			if (/\s/.test(value)) {
				return import_boolbase.default.falseFunc;
			}
			const regex = new RegExp(
				`(?:^|\\s)${escapeRegex(value)}(?:$|\\s)`,
				shouldIgnoreCase(data, options) ? "i" : "",
			);
			return function element(elem) {
				const attr = adapter.getAttributeValue(elem, name);
				return (
					attr != null &&
					attr.length >= value.length &&
					regex.test(attr) &&
					next(elem)
				);
			};
		},
		exists(next, { name }, { adapter }) {
			return (elem) => adapter.hasAttrib(elem, name) && next(elem);
		},
		start(next, data, options) {
			const { adapter } = options;
			const { name } = data;
			let { value } = data;
			const len = value.length;
			if (len === 0) {
				return import_boolbase.default.falseFunc;
			}
			if (shouldIgnoreCase(data, options)) {
				value = value.toLowerCase();
				return (elem) => {
					const attr = adapter.getAttributeValue(elem, name);
					return (
						attr != null &&
						attr.length >= len &&
						attr.substr(0, len).toLowerCase() === value &&
						next(elem)
					);
				};
			}
			return (elem) => {
				var _a2;
				return (
					!!((_a2 = adapter.getAttributeValue(elem, name)) === null ||
					_a2 === undefined
						? undefined
						: _a2.startsWith(value)) && next(elem)
				);
			};
		},
		end(next, data, options) {
			const { adapter } = options;
			const { name } = data;
			let { value } = data;
			const len = -value.length;
			if (len === 0) {
				return import_boolbase.default.falseFunc;
			}
			if (shouldIgnoreCase(data, options)) {
				value = value.toLowerCase();
				return (elem) => {
					var _a2;
					return (
						((_a2 = adapter.getAttributeValue(elem, name)) === null ||
						_a2 === undefined
							? undefined
							: _a2.substr(len).toLowerCase()) === value && next(elem)
					);
				};
			}
			return (elem) => {
				var _a2;
				return (
					!!((_a2 = adapter.getAttributeValue(elem, name)) === null ||
					_a2 === undefined
						? undefined
						: _a2.endsWith(value)) && next(elem)
				);
			};
		},
		any(next, data, options) {
			const { adapter } = options;
			const { name, value } = data;
			if (value === "") {
				return import_boolbase.default.falseFunc;
			}
			if (shouldIgnoreCase(data, options)) {
				const regex = new RegExp(escapeRegex(value), "i");
				return function anyIC(elem) {
					const attr = adapter.getAttributeValue(elem, name);
					return (
						attr != null &&
						attr.length >= value.length &&
						regex.test(attr) &&
						next(elem)
					);
				};
			}
			return (elem) => {
				var _a2;
				return (
					!!((_a2 = adapter.getAttributeValue(elem, name)) === null ||
					_a2 === undefined
						? undefined
						: _a2.includes(value)) && next(elem)
				);
			};
		},
		not(next, data, options) {
			const { adapter } = options;
			const { name } = data;
			let { value } = data;
			if (value === "") {
				return (elem) => !!adapter.getAttributeValue(elem, name) && next(elem);
			} else if (shouldIgnoreCase(data, options)) {
				value = value.toLowerCase();
				return (elem) => {
					const attr = adapter.getAttributeValue(elem, name);
					return (
						(attr == null ||
							attr.length !== value.length ||
							attr.toLowerCase() !== value) &&
						next(elem)
					);
				};
			}
			return (elem) =>
				adapter.getAttributeValue(elem, name) !== value && next(elem);
		},
	};
});

// node_modules/nth-check/lib/esm/parse.js
function parse2(formula) {
	formula = formula.trim().toLowerCase();
	if (formula === "even") {
		return [2, 0];
	} else if (formula === "odd") {
		return [2, 1];
	}
	let idx = 0;
	let a = 0;
	let sign = readSign();
	let number = readNumber();
	if (idx < formula.length && formula.charAt(idx) === "n") {
		idx++;
		a = sign * (number !== null && number !== undefined ? number : 1);
		skipWhitespace();
		if (idx < formula.length) {
			sign = readSign();
			skipWhitespace();
			number = readNumber();
		} else {
			sign = number = 0;
		}
	}
	if (number === null || idx < formula.length) {
		throw new Error(`n-th rule couldn't be parsed ('${formula}')`);
	}
	return [a, sign * number];
	function readSign() {
		if (formula.charAt(idx) === "-") {
			idx++;
			return -1;
		}
		if (formula.charAt(idx) === "+") {
			idx++;
		}
		return 1;
	}
	function readNumber() {
		const start = idx;
		let value = 0;
		while (
			idx < formula.length &&
			formula.charCodeAt(idx) >= ZERO &&
			formula.charCodeAt(idx) <= NINE
		) {
			value = value * 10 + (formula.charCodeAt(idx) - ZERO);
			idx++;
		}
		return idx === start ? null : value;
	}
	function skipWhitespace() {
		while (idx < formula.length && whitespace.has(formula.charCodeAt(idx))) {
			idx++;
		}
	}
}
var whitespace,
	ZERO = 48,
	NINE = 57;
var init_parse2 = __esm(() => {
	whitespace = new Set([9, 10, 12, 13, 32]);
});

// node_modules/nth-check/lib/esm/compile.js
function compile(parsed) {
	const a = parsed[0];
	const b = parsed[1] - 1;
	if (b < 0 && a <= 0) return import_boolbase2.default.falseFunc;
	if (a === -1) return (index) => index <= b;
	if (a === 0) return (index) => index === b;
	if (a === 1)
		return b < 0 ? import_boolbase2.default.trueFunc : (index) => index >= b;
	const absA = Math.abs(a);
	const bMod = ((b % absA) + absA) % absA;
	return a > 1
		? (index) => index >= b && index % absA === bMod
		: (index) => index <= b && index % absA === bMod;
}
var import_boolbase2;
var init_compile = __esm(() => {
	import_boolbase2 = __toESM(require_boolbase(), 1);
});

// node_modules/nth-check/lib/esm/index.js
function nthCheck(formula) {
	return compile(parse2(formula));
}
var init_esm7 = __esm(() => {
	init_parse2();
	init_compile();
});

// node_modules/css-select/lib/esm/pseudo-selectors/filters.js
function getChildFunc(next, adapter) {
	return (elem) => {
		const parent = adapter.getParent(elem);
		return parent != null && adapter.isTag(parent) && next(elem);
	};
}
function dynamicStatePseudo(name) {
	return function dynamicPseudo(next, _rule, { adapter }) {
		const func = adapter[name];
		if (typeof func !== "function") {
			return import_boolbase3.default.falseFunc;
		}
		return function active(elem) {
			return func(elem) && next(elem);
		};
	};
}
var import_boolbase3, filters;
var init_filters = __esm(() => {
	init_esm7();
	import_boolbase3 = __toESM(require_boolbase(), 1);
	filters = {
		contains(next, text, { adapter }) {
			return function contains(elem) {
				return next(elem) && adapter.getText(elem).includes(text);
			};
		},
		icontains(next, text, { adapter }) {
			const itext = text.toLowerCase();
			return function icontains(elem) {
				return (
					next(elem) && adapter.getText(elem).toLowerCase().includes(itext)
				);
			};
		},
		"nth-child"(next, rule, { adapter, equals }) {
			const func = nthCheck(rule);
			if (func === import_boolbase3.default.falseFunc)
				return import_boolbase3.default.falseFunc;
			if (func === import_boolbase3.default.trueFunc)
				return getChildFunc(next, adapter);
			return function nthChild(elem) {
				const siblings = adapter.getSiblings(elem);
				let pos = 0;
				for (let i = 0; i < siblings.length; i++) {
					if (equals(elem, siblings[i])) break;
					if (adapter.isTag(siblings[i])) {
						pos++;
					}
				}
				return func(pos) && next(elem);
			};
		},
		"nth-last-child"(next, rule, { adapter, equals }) {
			const func = nthCheck(rule);
			if (func === import_boolbase3.default.falseFunc)
				return import_boolbase3.default.falseFunc;
			if (func === import_boolbase3.default.trueFunc)
				return getChildFunc(next, adapter);
			return function nthLastChild(elem) {
				const siblings = adapter.getSiblings(elem);
				let pos = 0;
				for (let i = siblings.length - 1; i >= 0; i--) {
					if (equals(elem, siblings[i])) break;
					if (adapter.isTag(siblings[i])) {
						pos++;
					}
				}
				return func(pos) && next(elem);
			};
		},
		"nth-of-type"(next, rule, { adapter, equals }) {
			const func = nthCheck(rule);
			if (func === import_boolbase3.default.falseFunc)
				return import_boolbase3.default.falseFunc;
			if (func === import_boolbase3.default.trueFunc)
				return getChildFunc(next, adapter);
			return function nthOfType(elem) {
				const siblings = adapter.getSiblings(elem);
				let pos = 0;
				for (let i = 0; i < siblings.length; i++) {
					const currentSibling = siblings[i];
					if (equals(elem, currentSibling)) break;
					if (
						adapter.isTag(currentSibling) &&
						adapter.getName(currentSibling) === adapter.getName(elem)
					) {
						pos++;
					}
				}
				return func(pos) && next(elem);
			};
		},
		"nth-last-of-type"(next, rule, { adapter, equals }) {
			const func = nthCheck(rule);
			if (func === import_boolbase3.default.falseFunc)
				return import_boolbase3.default.falseFunc;
			if (func === import_boolbase3.default.trueFunc)
				return getChildFunc(next, adapter);
			return function nthLastOfType(elem) {
				const siblings = adapter.getSiblings(elem);
				let pos = 0;
				for (let i = siblings.length - 1; i >= 0; i--) {
					const currentSibling = siblings[i];
					if (equals(elem, currentSibling)) break;
					if (
						adapter.isTag(currentSibling) &&
						adapter.getName(currentSibling) === adapter.getName(elem)
					) {
						pos++;
					}
				}
				return func(pos) && next(elem);
			};
		},
		root(next, _rule, { adapter }) {
			return (elem) => {
				const parent = adapter.getParent(elem);
				return (parent == null || !adapter.isTag(parent)) && next(elem);
			};
		},
		scope(next, rule, options, context) {
			const { equals } = options;
			if (!context || context.length === 0) {
				return filters.root(next, rule, options);
			}
			if (context.length === 1) {
				return (elem) => equals(context[0], elem) && next(elem);
			}
			return (elem) => context.includes(elem) && next(elem);
		},
		hover: dynamicStatePseudo("isHovered"),
		visited: dynamicStatePseudo("isVisited"),
		active: dynamicStatePseudo("isActive"),
	};
});

// node_modules/css-select/lib/esm/pseudo-selectors/pseudos.js
function verifyPseudoArgs(func, name, subselect, argIndex) {
	if (subselect === null) {
		if (func.length > argIndex) {
			throw new Error(`Pseudo-class :${name} requires an argument`);
		}
	} else if (func.length === argIndex) {
		throw new Error(`Pseudo-class :${name} doesn't have any arguments`);
	}
}
var pseudos;
var init_pseudos = __esm(() => {
	pseudos = {
		empty(elem, { adapter }) {
			return !adapter
				.getChildren(elem)
				.some((elem2) => adapter.isTag(elem2) || adapter.getText(elem2) !== "");
		},
		"first-child"(elem, { adapter, equals }) {
			if (adapter.prevElementSibling) {
				return adapter.prevElementSibling(elem) == null;
			}
			const firstChild = adapter
				.getSiblings(elem)
				.find((elem2) => adapter.isTag(elem2));
			return firstChild != null && equals(elem, firstChild);
		},
		"last-child"(elem, { adapter, equals }) {
			const siblings = adapter.getSiblings(elem);
			for (let i = siblings.length - 1; i >= 0; i--) {
				if (equals(elem, siblings[i])) return true;
				if (adapter.isTag(siblings[i])) break;
			}
			return false;
		},
		"first-of-type"(elem, { adapter, equals }) {
			const siblings = adapter.getSiblings(elem);
			const elemName = adapter.getName(elem);
			for (let i = 0; i < siblings.length; i++) {
				const currentSibling = siblings[i];
				if (equals(elem, currentSibling)) return true;
				if (
					adapter.isTag(currentSibling) &&
					adapter.getName(currentSibling) === elemName
				) {
					break;
				}
			}
			return false;
		},
		"last-of-type"(elem, { adapter, equals }) {
			const siblings = adapter.getSiblings(elem);
			const elemName = adapter.getName(elem);
			for (let i = siblings.length - 1; i >= 0; i--) {
				const currentSibling = siblings[i];
				if (equals(elem, currentSibling)) return true;
				if (
					adapter.isTag(currentSibling) &&
					adapter.getName(currentSibling) === elemName
				) {
					break;
				}
			}
			return false;
		},
		"only-of-type"(elem, { adapter, equals }) {
			const elemName = adapter.getName(elem);
			return adapter
				.getSiblings(elem)
				.every(
					(sibling) =>
						equals(elem, sibling) ||
						!adapter.isTag(sibling) ||
						adapter.getName(sibling) !== elemName,
				);
		},
		"only-child"(elem, { adapter, equals }) {
			return adapter
				.getSiblings(elem)
				.every((sibling) => equals(elem, sibling) || !adapter.isTag(sibling));
		},
	};
});

// node_modules/css-select/lib/esm/pseudo-selectors/aliases.js
var aliases;
var init_aliases = __esm(() => {
	aliases = {
		"any-link": ":is(a, area, link)[href]",
		link: ":any-link:not(:visited)",
		disabled: `:is(
        :is(button, input, select, textarea, optgroup, option)[disabled],
        optgroup[disabled] > option,
        fieldset[disabled]:not(fieldset[disabled] legend:first-of-type *)
    )`,
		enabled: ":not(:disabled)",
		checked:
			":is(:is(input[type=radio], input[type=checkbox])[checked], option:selected)",
		required: ":is(input, select, textarea)[required]",
		optional: ":is(input, select, textarea):not([required])",
		selected:
			"option:is([selected], select:not([multiple]):not(:has(> option[selected])) > :first-of-type)",
		checkbox: "[type=checkbox]",
		file: "[type=file]",
		password: "[type=password]",
		radio: "[type=radio]",
		reset: "[type=reset]",
		image: "[type=image]",
		submit: "[type=submit]",
		parent: ":not(:empty)",
		header: ":is(h1, h2, h3, h4, h5, h6)",
		button: ":is(button, input[type=button])",
		input: ":is(input, textarea, select, button)",
		text: "input:is(:not([type!='']), [type=text])",
	};
});

// node_modules/css-select/lib/esm/pseudo-selectors/subselects.js
function ensureIsTag(next, adapter) {
	if (next === import_boolbase4.default.falseFunc)
		return import_boolbase4.default.falseFunc;
	return (elem) => adapter.isTag(elem) && next(elem);
}
function getNextSiblings(elem, adapter) {
	const siblings = adapter.getSiblings(elem);
	if (siblings.length <= 1) return [];
	const elemIndex = siblings.indexOf(elem);
	if (elemIndex < 0 || elemIndex === siblings.length - 1) return [];
	return siblings.slice(elemIndex + 1).filter(adapter.isTag);
}
function copyOptions(options) {
	return {
		xmlMode: !!options.xmlMode,
		lowerCaseAttributeNames: !!options.lowerCaseAttributeNames,
		lowerCaseTags: !!options.lowerCaseTags,
		quirksMode: !!options.quirksMode,
		cacheResults: !!options.cacheResults,
		pseudos: options.pseudos,
		adapter: options.adapter,
		equals: options.equals,
	};
}
var import_boolbase4,
	PLACEHOLDER_ELEMENT,
	is = (next, token, options, context, compileToken) => {
		const func = compileToken(token, copyOptions(options), context);
		return func === import_boolbase4.default.trueFunc
			? next
			: func === import_boolbase4.default.falseFunc
				? import_boolbase4.default.falseFunc
				: (elem) => func(elem) && next(elem);
	},
	subselects;
var init_subselects = __esm(() => {
	init_sort();
	import_boolbase4 = __toESM(require_boolbase(), 1);
	PLACEHOLDER_ELEMENT = {};
	subselects = {
		is,
		matches: is,
		where: is,
		not(next, token, options, context, compileToken) {
			const func = compileToken(token, copyOptions(options), context);
			return func === import_boolbase4.default.falseFunc
				? next
				: func === import_boolbase4.default.trueFunc
					? import_boolbase4.default.falseFunc
					: (elem) => !func(elem) && next(elem);
		},
		has(next, subselect, options, _context, compileToken) {
			const { adapter } = options;
			const opts = copyOptions(options);
			opts.relativeSelector = true;
			const context = subselect.some((s) => s.some(isTraversal2))
				? [PLACEHOLDER_ELEMENT]
				: undefined;
			const compiled = compileToken(subselect, opts, context);
			if (compiled === import_boolbase4.default.falseFunc)
				return import_boolbase4.default.falseFunc;
			const hasElement = ensureIsTag(compiled, adapter);
			if (context && compiled !== import_boolbase4.default.trueFunc) {
				const { shouldTestNextSiblings = false } = compiled;
				return (elem) => {
					if (!next(elem)) return false;
					context[0] = elem;
					const childs = adapter.getChildren(elem);
					const nextElements = shouldTestNextSiblings
						? [...childs, ...getNextSiblings(elem, adapter)]
						: childs;
					return adapter.existsOne(hasElement, nextElements);
				};
			}
			return (elem) =>
				next(elem) && adapter.existsOne(hasElement, adapter.getChildren(elem));
		},
	};
});

// node_modules/css-select/lib/esm/pseudo-selectors/index.js
function compilePseudoSelector(next, selector, options, context, compileToken) {
	var _a2;
	const { name, data } = selector;
	if (Array.isArray(data)) {
		if (!(name in subselects)) {
			throw new Error(`Unknown pseudo-class :${name}(${data})`);
		}
		return subselects[name](next, data, options, context, compileToken);
	}
	const userPseudo =
		(_a2 = options.pseudos) === null || _a2 === undefined
			? undefined
			: _a2[name];
	const stringPseudo =
		typeof userPseudo === "string" ? userPseudo : aliases[name];
	if (typeof stringPseudo === "string") {
		if (data != null) {
			throw new Error(`Pseudo ${name} doesn't have any arguments`);
		}
		const alias = parse(stringPseudo);
		return subselects.is(next, alias, options, context, compileToken);
	}
	if (typeof userPseudo === "function") {
		verifyPseudoArgs(userPseudo, name, data, 1);
		return (elem) => userPseudo(elem, data) && next(elem);
	}
	if (name in filters) {
		return filters[name](next, data, options, context);
	}
	if (name in pseudos) {
		const pseudo = pseudos[name];
		verifyPseudoArgs(pseudo, name, data, 2);
		return (elem) => pseudo(elem, options, data) && next(elem);
	}
	throw new Error(`Unknown pseudo-class :${name}`);
}
var init_pseudo_selectors = __esm(() => {
	init_es();
	init_filters();
	init_pseudos();
	init_aliases();
	init_subselects();
});

// node_modules/css-select/lib/esm/general.js
function getElementParent(node2, adapter) {
	const parent = adapter.getParent(node2);
	if (parent && adapter.isTag(parent)) {
		return parent;
	}
	return null;
}
function compileGeneralSelector(
	next,
	selector,
	options,
	context,
	compileToken,
) {
	const { adapter, equals } = options;
	switch (selector.type) {
		case SelectorType.PseudoElement: {
			throw new Error("Pseudo-elements are not supported by css-select");
		}
		case SelectorType.ColumnCombinator: {
			throw new Error("Column combinators are not yet supported by css-select");
		}
		case SelectorType.Attribute: {
			if (selector.namespace != null) {
				throw new Error(
					"Namespaced attributes are not yet supported by css-select",
				);
			}
			if (!options.xmlMode || options.lowerCaseAttributeNames) {
				selector.name = selector.name.toLowerCase();
			}
			return attributeRules[selector.action](next, selector, options);
		}
		case SelectorType.Pseudo: {
			return compilePseudoSelector(
				next,
				selector,
				options,
				context,
				compileToken,
			);
		}
		case SelectorType.Tag: {
			if (selector.namespace != null) {
				throw new Error(
					"Namespaced tag names are not yet supported by css-select",
				);
			}
			let { name } = selector;
			if (!options.xmlMode || options.lowerCaseTags) {
				name = name.toLowerCase();
			}
			return function tag(elem) {
				return adapter.getName(elem) === name && next(elem);
			};
		}
		case SelectorType.Descendant: {
			if (options.cacheResults === false || typeof WeakSet === "undefined") {
				return function descendant(elem) {
					let current = elem;
					while ((current = getElementParent(current, adapter))) {
						if (next(current)) {
							return true;
						}
					}
					return false;
				};
			}
			const isFalseCache = new WeakSet();
			return function cachedDescendant(elem) {
				let current = elem;
				while ((current = getElementParent(current, adapter))) {
					if (!isFalseCache.has(current)) {
						if (adapter.isTag(current) && next(current)) {
							return true;
						}
						isFalseCache.add(current);
					}
				}
				return false;
			};
		}
		case "_flexibleDescendant": {
			return function flexibleDescendant(elem) {
				let current = elem;
				do {
					if (next(current)) return true;
				} while ((current = getElementParent(current, adapter)));
				return false;
			};
		}
		case SelectorType.Parent: {
			return function parent(elem) {
				return adapter
					.getChildren(elem)
					.some((elem2) => adapter.isTag(elem2) && next(elem2));
			};
		}
		case SelectorType.Child: {
			return function child(elem) {
				const parent = adapter.getParent(elem);
				return parent != null && adapter.isTag(parent) && next(parent);
			};
		}
		case SelectorType.Sibling: {
			return function sibling(elem) {
				const siblings = adapter.getSiblings(elem);
				for (let i = 0; i < siblings.length; i++) {
					const currentSibling = siblings[i];
					if (equals(elem, currentSibling)) break;
					if (adapter.isTag(currentSibling) && next(currentSibling)) {
						return true;
					}
				}
				return false;
			};
		}
		case SelectorType.Adjacent: {
			if (adapter.prevElementSibling) {
				return function adjacent(elem) {
					const previous = adapter.prevElementSibling(elem);
					return previous != null && next(previous);
				};
			}
			return function adjacent(elem) {
				const siblings = adapter.getSiblings(elem);
				let lastElement;
				for (let i = 0; i < siblings.length; i++) {
					const currentSibling = siblings[i];
					if (equals(elem, currentSibling)) break;
					if (adapter.isTag(currentSibling)) {
						lastElement = currentSibling;
					}
				}
				return !!lastElement && next(lastElement);
			};
		}
		case SelectorType.Universal: {
			if (selector.namespace != null && selector.namespace !== "*") {
				throw new Error(
					"Namespaced universal selectors are not yet supported by css-select",
				);
			}
			return next;
		}
	}
}
var init_general = __esm(() => {
	init_attributes2();
	init_pseudo_selectors();
	init_es();
});

// node_modules/css-select/lib/esm/compile.js
function compile2(selector, options, context) {
	const next = compileUnsafe(selector, options, context);
	return ensureIsTag(next, options.adapter);
}
function compileUnsafe(selector, options, context) {
	const token = typeof selector === "string" ? parse(selector) : selector;
	return compileToken(token, options, context);
}
function includesScopePseudo(t) {
	return (
		t.type === SelectorType.Pseudo &&
		(t.name === "scope" ||
			(Array.isArray(t.data) &&
				t.data.some((data) => data.some(includesScopePseudo))))
	);
}
function absolutize(token, { adapter }, context) {
	const hasContext = !!(context === null || context === undefined
		? undefined
		: context.every((e) => {
				const parent = adapter.isTag(e) && adapter.getParent(e);
				return e === PLACEHOLDER_ELEMENT || (parent && adapter.isTag(parent));
			}));
	for (const t of token) {
		if (
			t.length > 0 &&
			isTraversal2(t[0]) &&
			t[0].type !== SelectorType.Descendant
		) {
		} else if (hasContext && !t.some(includesScopePseudo)) {
			t.unshift(DESCENDANT_TOKEN);
		} else {
			continue;
		}
		t.unshift(SCOPE_TOKEN);
	}
}
function compileToken(token, options, context) {
	var _a2;
	token.forEach(sortByProcedure);
	context =
		(_a2 = options.context) !== null && _a2 !== undefined ? _a2 : context;
	const isArrayContext = Array.isArray(context);
	const finalContext =
		context && (Array.isArray(context) ? context : [context]);
	if (options.relativeSelector !== false) {
		absolutize(token, options, finalContext);
	} else if (token.some((t) => t.length > 0 && isTraversal2(t[0]))) {
		throw new Error(
			"Relative selectors are not allowed when the `relativeSelector` option is disabled",
		);
	}
	let shouldTestNextSiblings = false;
	const query = token
		.map((rules) => {
			if (rules.length >= 2) {
				const [first, second] = rules;
				if (first.type !== SelectorType.Pseudo || first.name !== "scope") {
				} else if (isArrayContext && second.type === SelectorType.Descendant) {
					rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
				} else if (
					second.type === SelectorType.Adjacent ||
					second.type === SelectorType.Sibling
				) {
					shouldTestNextSiblings = true;
				}
			}
			return compileRules(rules, options, finalContext);
		})
		.reduce(reduceRules, import_boolbase5.default.falseFunc);
	query.shouldTestNextSiblings = shouldTestNextSiblings;
	return query;
}
function compileRules(rules, options, context) {
	var _a2;
	return rules.reduce(
		(previous, rule) =>
			previous === import_boolbase5.default.falseFunc
				? import_boolbase5.default.falseFunc
				: compileGeneralSelector(
						previous,
						rule,
						options,
						context,
						compileToken,
					),
		(_a2 = options.rootFunc) !== null && _a2 !== undefined
			? _a2
			: import_boolbase5.default.trueFunc,
	);
}
function reduceRules(a, b) {
	if (
		b === import_boolbase5.default.falseFunc ||
		a === import_boolbase5.default.trueFunc
	) {
		return a;
	}
	if (
		a === import_boolbase5.default.falseFunc ||
		b === import_boolbase5.default.trueFunc
	) {
		return b;
	}
	return function combine(elem) {
		return a(elem) || b(elem);
	};
}
var import_boolbase5, DESCENDANT_TOKEN, FLEXIBLE_DESCENDANT_TOKEN, SCOPE_TOKEN;
var init_compile2 = __esm(() => {
	init_es();
	init_sort();
	init_general();
	init_subselects();
	import_boolbase5 = __toESM(require_boolbase(), 1);
	DESCENDANT_TOKEN = { type: SelectorType.Descendant };
	FLEXIBLE_DESCENDANT_TOKEN = {
		type: "_flexibleDescendant",
	};
	SCOPE_TOKEN = {
		type: SelectorType.Pseudo,
		name: "scope",
		data: null,
	};
});

// node_modules/css-select/lib/esm/index.js
function convertOptionFormats(options) {
	var _a2, _b, _c, _d;
	const opts =
		options !== null && options !== undefined ? options : defaultOptions;
	((_a2 = opts.adapter) !== null && _a2 !== undefined) ||
		(opts.adapter = exports_esm2);
	((_b = opts.equals) !== null && _b !== undefined) ||
		(opts.equals =
			(_d =
				(_c = opts.adapter) === null || _c === undefined
					? undefined
					: _c.equals) !== null && _d !== undefined
				? _d
				: defaultEquals);
	return opts;
}
function wrapCompile(func) {
	return function addAdapter(selector, options, context) {
		const opts = convertOptionFormats(options);
		return func(selector, opts, context);
	};
}
function getSelectorFunc(searchFunc) {
	return function select(query, elements, options) {
		const opts = convertOptionFormats(options);
		if (typeof query !== "function") {
			query = compileUnsafe(query, opts, elements);
		}
		const filteredElements = prepareContext(
			elements,
			opts.adapter,
			query.shouldTestNextSiblings,
		);
		return searchFunc(query, filteredElements, opts);
	};
}
function prepareContext(elems, adapter, shouldTestNextSiblings = false) {
	if (shouldTestNextSiblings) {
		elems = appendNextSiblings(elems, adapter);
	}
	return Array.isArray(elems)
		? adapter.removeSubsets(elems)
		: adapter.getChildren(elems);
}
function appendNextSiblings(elem, adapter) {
	const elems = Array.isArray(elem) ? elem.slice(0) : [elem];
	const elemsLength = elems.length;
	for (let i = 0; i < elemsLength; i++) {
		const nextSiblings = getNextSiblings(elems[i], adapter);
		elems.push(...nextSiblings);
	}
	return elems;
}
function is2(elem, query, options) {
	const opts = convertOptionFormats(options);
	return (typeof query === "function" ? query : compile2(query, opts))(elem);
}
var import_boolbase6,
	defaultEquals = (a, b) => a === b,
	defaultOptions,
	compile3,
	_compileUnsafe,
	_compileToken,
	_selectAll,
	_selectOne;
var init_esm8 = __esm(() => {
	init_esm5();
	init_compile2();
	init_subselects();
	init_pseudo_selectors();
	import_boolbase6 = __toESM(require_boolbase(), 1);
	defaultOptions = {
		adapter: exports_esm2,
		equals: defaultEquals,
	};
	compile3 = wrapCompile(compile2);
	_compileUnsafe = wrapCompile(compileUnsafe);
	_compileToken = wrapCompile(compileToken);
	_selectAll = getSelectorFunc((query, elems, options) =>
		query === import_boolbase6.default.falseFunc || !elems || elems.length === 0
			? []
			: options.adapter.findAll(query, elems),
	);
	_selectOne = getSelectorFunc((query, elems, options) =>
		query === import_boolbase6.default.falseFunc || !elems || elems.length === 0
			? null
			: options.adapter.findOne(query, elems),
	);
});

// node_modules/linkedom/esm/shared/matches.js
var isArray,
	isTag3 = ({ nodeType }) => nodeType === ELEMENT_NODE,
	existsOne2 = (test, elements) =>
		elements.some(
			(element) =>
				isTag3(element) &&
				(test(element) || existsOne2(test, getChildren2(element))),
		),
	getAttributeValue2 = (element, name) =>
		name === "class" ? element.classList.value : element.getAttribute(name),
	getChildren2 = ({ childNodes }) => childNodes,
	getName2 = (element) => {
		const { localName } = element;
		return ignoreCase(element) ? localName.toLowerCase() : localName;
	},
	getParent2 = ({ parentNode }) => parentNode,
	getSiblings2 = (element) => {
		const { parentNode } = element;
		return parentNode ? getChildren2(parentNode) : element;
	},
	getText2 = (node2) => {
		if (isArray(node2)) return node2.map(getText2).join("");
		if (isTag3(node2)) return getText2(getChildren2(node2));
		if (node2.nodeType === TEXT_NODE) return node2.data;
		return "";
	},
	hasAttrib2 = (element, name) => element.hasAttribute(name),
	removeSubsets2 = (nodes) => {
		let { length } = nodes;
		while (length--) {
			const node2 = nodes[length];
			if (length && -1 < nodes.lastIndexOf(node2, length - 1)) {
				nodes.splice(length, 1);
				continue;
			}
			for (
				let { parentNode } = node2;
				parentNode;
				parentNode = parentNode.parentNode
			) {
				if (nodes.includes(parentNode)) {
					nodes.splice(length, 1);
					break;
				}
			}
		}
		return nodes;
	},
	findAll2 = (test, nodes) => {
		const matches = [];
		for (const node2 of nodes) {
			if (isTag3(node2)) {
				if (test(node2)) matches.push(node2);
				matches.push(...findAll2(test, getChildren2(node2)));
			}
		}
		return matches;
	},
	findOne2 = (test, nodes) => {
		for (let node2 of nodes)
			if (test(node2) || (node2 = findOne2(test, getChildren2(node2))))
				return node2;
		return null;
	},
	adapter,
	prepareMatch = (element, selectors) =>
		compile3(selectors, {
			context: selectors.includes(":scope") ? element : undefined,
			xmlMode: !ignoreCase(element),
			adapter,
		}),
	matches = (element, selectors) =>
		is2(element, selectors, {
			strict: true,
			context: selectors.includes(":scope") ? element : undefined,
			xmlMode: !ignoreCase(element),
			adapter,
		});
var init_matches = __esm(() => {
	init_esm8();
	init_constants();
	init_utils();
	({ isArray } = Array);
	adapter = {
		isTag: isTag3,
		existsOne: existsOne2,
		getAttributeValue: getAttributeValue2,
		getChildren: getChildren2,
		getName: getName2,
		getParent: getParent2,
		getSiblings: getSiblings2,
		getText: getText2,
		hasAttrib: hasAttrib2,
		removeSubsets: removeSubsets2,
		findAll: findAll2,
		findOne: findOne2,
	};
});

// node_modules/linkedom/esm/interface/text.js
var Text3;
var init_text = __esm(() => {
	init_constants();
	init_symbols();
	init_text_escaper();
	init_character_data();
	Text3 = class Text3 extends CharacterData {
		constructor(ownerDocument, data = "") {
			super(ownerDocument, "#text", TEXT_NODE, data);
		}
		get wholeText() {
			const text = [];
			let { previousSibling: previousSibling2, nextSibling: nextSibling2 } =
				this;
			while (previousSibling2) {
				if (previousSibling2.nodeType === TEXT_NODE)
					text.unshift(previousSibling2[VALUE]);
				else break;
				previousSibling2 = previousSibling2.previousSibling;
			}
			text.push(this[VALUE]);
			while (nextSibling2) {
				if (nextSibling2.nodeType === TEXT_NODE) text.push(nextSibling2[VALUE]);
				else break;
				nextSibling2 = nextSibling2.nextSibling;
			}
			return text.join("");
		}
		cloneNode() {
			const { ownerDocument, [VALUE]: data } = this;
			return new Text3(ownerDocument, data);
		}
		toString() {
			return escape2(this[VALUE]);
		}
	};
});

// node_modules/linkedom/esm/mixin/parent-node.js
var isNode = (node2) => node2 instanceof Node2,
	insert = (parentNode, child, nodes) => {
		const { ownerDocument } = parentNode;
		for (const node2 of nodes)
			parentNode.insertBefore(
				isNode(node2) ? node2 : new Text3(ownerDocument, node2),
				child,
			);
	},
	ParentNode;
var init_parent_node = __esm(() => {
	init_constants();
	init_symbols();
	init_matches();
	init_node3();
	init_utils();
	init_node2();
	init_text();
	init_node_list();
	init_mutation_observer();
	init_custom_element_registry();
	init_non_document_type_child_node();
	ParentNode = class ParentNode extends Node2 {
		constructor(ownerDocument, localName, nodeType) {
			super(ownerDocument, localName, nodeType);
			this[PRIVATE] = null;
			this[NEXT] = this[END] = {
				[NEXT]: null,
				[PREV]: this,
				[START]: this,
				nodeType: NODE_END,
				ownerDocument: this.ownerDocument,
				parentNode: null,
			};
		}
		get childNodes() {
			const childNodes = new NodeList();
			let { firstChild } = this;
			while (firstChild) {
				childNodes.push(firstChild);
				firstChild = nextSibling(firstChild);
			}
			return childNodes;
		}
		get children() {
			const children = new NodeList();
			let { firstElementChild } = this;
			while (firstElementChild) {
				children.push(firstElementChild);
				firstElementChild = nextElementSibling2(firstElementChild);
			}
			return children;
		}
		get firstChild() {
			let { [NEXT]: next, [END]: end } = this;
			while (next.nodeType === ATTRIBUTE_NODE) next = next[NEXT];
			return next === end ? null : next;
		}
		get firstElementChild() {
			let { firstChild } = this;
			while (firstChild) {
				if (firstChild.nodeType === ELEMENT_NODE) return firstChild;
				firstChild = nextSibling(firstChild);
			}
			return null;
		}
		get lastChild() {
			const prev = this[END][PREV];
			switch (prev.nodeType) {
				case NODE_END:
					return prev[START];
				case ATTRIBUTE_NODE:
					return null;
			}
			return prev === this ? null : prev;
		}
		get lastElementChild() {
			let { lastChild } = this;
			while (lastChild) {
				if (lastChild.nodeType === ELEMENT_NODE) return lastChild;
				lastChild = previousSibling(lastChild);
			}
			return null;
		}
		get childElementCount() {
			return this.children.length;
		}
		prepend(...nodes) {
			insert(this, this.firstChild, nodes);
		}
		append(...nodes) {
			insert(this, this[END], nodes);
		}
		replaceChildren(...nodes) {
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end && next.nodeType === ATTRIBUTE_NODE)
				next = next[NEXT];
			while (next !== end) {
				const after2 = getEnd(next)[NEXT];
				next.remove();
				next = after2;
			}
			if (nodes.length) insert(this, end, nodes);
		}
		getElementsByClassName(className) {
			const elements = new NodeList();
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (
					next.nodeType === ELEMENT_NODE &&
					next.hasAttribute("class") &&
					next.classList.has(className)
				)
					elements.push(next);
				next = next[NEXT];
			}
			return elements;
		}
		getElementsByTagName(tagName) {
			const elements = new NodeList();
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (
					next.nodeType === ELEMENT_NODE &&
					(next.localName === tagName || localCase(next) === tagName)
				)
					elements.push(next);
				next = next[NEXT];
			}
			return elements;
		}
		querySelector(selectors) {
			const matches2 = prepareMatch(this, selectors);
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (next.nodeType === ELEMENT_NODE && matches2(next)) return next;
				next =
					next.nodeType === ELEMENT_NODE && next.localName === "template"
						? next[END]
						: next[NEXT];
			}
			return null;
		}
		querySelectorAll(selectors) {
			const matches2 = prepareMatch(this, selectors);
			const elements = new NodeList();
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (next.nodeType === ELEMENT_NODE && matches2(next))
					elements.push(next);
				next =
					next.nodeType === ELEMENT_NODE && next.localName === "template"
						? next[END]
						: next[NEXT];
			}
			return elements;
		}
		appendChild(node2) {
			return this.insertBefore(node2, this[END]);
		}
		contains(node2) {
			let parentNode = node2;
			while (parentNode && parentNode !== this)
				parentNode = parentNode.parentNode;
			return parentNode === this;
		}
		insertBefore(node2, before2 = null) {
			if (node2 === before2) return node2;
			if (node2 === this) throw new Error("unable to append a node to itself");
			const next = before2 || this[END];
			switch (node2.nodeType) {
				case ELEMENT_NODE:
					node2.remove();
					node2.parentNode = this;
					knownBoundaries(next[PREV], node2, next);
					moCallback(node2, null);
					connectedCallback(node2);
					break;
				case DOCUMENT_FRAGMENT_NODE: {
					let { [PRIVATE]: parentNode, firstChild, lastChild } = node2;
					if (firstChild) {
						knownSegment(next[PREV], firstChild, lastChild, next);
						knownAdjacent(node2, node2[END]);
						if (parentNode) parentNode.replaceChildren();
						do {
							firstChild.parentNode = this;
							moCallback(firstChild, null);
							if (firstChild.nodeType === ELEMENT_NODE)
								connectedCallback(firstChild);
						} while (
							firstChild !== lastChild &&
							(firstChild = nextSibling(firstChild))
						);
					}
					break;
				}
				case TEXT_NODE:
				case COMMENT_NODE:
				case CDATA_SECTION_NODE:
					node2.remove();
				default:
					node2.parentNode = this;
					knownSiblings(next[PREV], node2, next);
					moCallback(node2, null);
					break;
			}
			return node2;
		}
		normalize() {
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				const { [NEXT]: $next, [PREV]: $prev, nodeType } = next;
				if (nodeType === TEXT_NODE) {
					if (!next[VALUE]) next.remove();
					else if ($prev && $prev.nodeType === TEXT_NODE) {
						$prev.textContent += next.textContent;
						next.remove();
					}
				}
				next = $next;
			}
		}
		removeChild(node2) {
			if (node2.parentNode !== this) throw new Error("node is not a child");
			node2.remove();
			return node2;
		}
		replaceChild(node2, replaced) {
			const next = getEnd(replaced)[NEXT];
			replaced.remove();
			this.insertBefore(node2, next);
			return replaced;
		}
	};
});

// node_modules/linkedom/esm/mixin/non-element-parent-node.js
var NonElementParentNode;
var init_non_element_parent_node = __esm(() => {
	init_constants();
	init_symbols();
	init_jsdon();
	init_parent_node();
	NonElementParentNode = class NonElementParentNode extends ParentNode {
		getElementById(id) {
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (next.nodeType === ELEMENT_NODE && next.id === id) return next;
				next = next[NEXT];
			}
			return null;
		}
		cloneNode(deep) {
			const { ownerDocument, constructor } = this;
			const nonEPN = new constructor(ownerDocument);
			if (deep) {
				const { [END]: end } = nonEPN;
				for (const node2 of this.childNodes)
					nonEPN.insertBefore(node2.cloneNode(deep), end);
			}
			return nonEPN;
		}
		toString() {
			const { childNodes, localName } = this;
			return `<${localName}>${childNodes.join("")}</${localName}>`;
		}
		toJSON() {
			const json = [];
			nonElementAsJSON(this, json);
			return json;
		}
	};
});

// node_modules/linkedom/esm/interface/document-fragment.js
var DocumentFragment;
var init_document_fragment = __esm(() => {
	init_constants();
	init_non_element_parent_node();
	DocumentFragment = class DocumentFragment extends NonElementParentNode {
		constructor(ownerDocument) {
			super(ownerDocument, "#document-fragment", DOCUMENT_FRAGMENT_NODE);
		}
	};
});

// node_modules/linkedom/esm/interface/document-type.js
var DocumentType;
var init_document_type = __esm(() => {
	init_constants();
	init_jsdon();
	init_node2();
	DocumentType = class DocumentType extends Node2 {
		constructor(ownerDocument, name, publicId = "", systemId = "") {
			super(ownerDocument, "#document-type", DOCUMENT_TYPE_NODE);
			this.name = name;
			this.publicId = publicId;
			this.systemId = systemId;
		}
		cloneNode() {
			const { ownerDocument, name, publicId, systemId } = this;
			return new DocumentType(ownerDocument, name, publicId, systemId);
		}
		toString() {
			const { name, publicId, systemId } = this;
			const hasPublic = 0 < publicId.length;
			const str = [name];
			if (hasPublic) str.push("PUBLIC", `"${publicId}"`);
			if (systemId.length) {
				if (!hasPublic) str.push("SYSTEM");
				str.push(`"${systemId}"`);
			}
			return `<!DOCTYPE ${str.join(" ")}>`;
		}
		toJSON() {
			const json = [];
			documentTypeAsJSON(this, json);
			return json;
		}
	};
});

// node_modules/linkedom/esm/mixin/inner-html.js
function setOwnerDocument(node2) {
	node2.ownerDocument = this;
	switch (node2.nodeType) {
		case ELEMENT_NODE:
		case DOCUMENT_FRAGMENT_NODE:
			node2.childNodes.forEach(setOwnerDocument, this);
			break;
	}
	return node2;
}
var getInnerHtml = (node2) => node2.childNodes.join(""),
	setInnerHtml = (node2, html) => {
		const { ownerDocument } = node2;
		const { constructor } = ownerDocument;
		const document = new constructor();
		document[CUSTOM_ELEMENTS] = ownerDocument[CUSTOM_ELEMENTS];
		const { childNodes } = parseFromString(document, ignoreCase(node2), html);
		node2.replaceChildren(...childNodes.map(setOwnerDocument, ownerDocument));
	};
var init_inner_html = __esm(() => {
	init_constants();
	init_symbols();
	init_parse_from_string();
	init_utils();
});

// node_modules/uhyphen/esm/index.js
var esm_default2 = (camel) =>
	camel
		.replace(/(([A-Z0-9])([A-Z0-9][a-z]))|(([a-z0-9]+)([A-Z]))/g, "$2$5-$3$6")
		.toLowerCase();

// node_modules/linkedom/esm/dom/string-map.js
class DOMStringMap {
	constructor(ref) {
		for (const { name, value } of ref.attributes) {
			if (/^data-/.test(name)) this[prop(name)] = value;
		}
		refs.set(this, ref);
		return new Proxy(this, handler);
	}
}
var refs,
	key = (name) => `data-${esm_default2(name)}`,
	prop = (name) =>
		name.slice(5).replace(/-([a-z])/g, (_, $1) => $1.toUpperCase()),
	handler;
var init_string_map = __esm(() => {
	init_object();
	refs = new WeakMap();
	handler = {
		get(dataset, name) {
			if (name in dataset) return refs.get(dataset).getAttribute(key(name));
		},
		set(dataset, name, value) {
			dataset[name] = value;
			refs.get(dataset).setAttribute(key(name), value);
			return true;
		},
		deleteProperty(dataset, name) {
			if (name in dataset) refs.get(dataset).removeAttribute(key(name));
			return delete dataset[name];
		},
	};
	setPrototypeOf(DOMStringMap.prototype, null);
});

// node_modules/linkedom/esm/dom/token-list.js
var add,
	addTokens = (self, tokens) => {
		for (const token of tokens) {
			if (token) add.call(self, token);
		}
	},
	update = ({ [OWNER_ELEMENT]: ownerElement, value }) => {
		const attribute2 = ownerElement.getAttributeNode("class");
		if (attribute2) attribute2.value = value;
		else
			setAttribute(
				ownerElement,
				new Attr(ownerElement.ownerDocument, "class", value),
			);
	},
	DOMTokenList;
var init_token_list = __esm(() => {
	init_symbols();
	init_attributes();
	init_attr();
	({ add } = Set.prototype);
	DOMTokenList = class DOMTokenList extends Set {
		constructor(ownerElement) {
			super();
			this[OWNER_ELEMENT] = ownerElement;
			const attribute2 = ownerElement.getAttributeNode("class");
			if (attribute2) addTokens(this, attribute2.value.split(/\s+/));
		}
		get length() {
			return this.size;
		}
		get value() {
			return [...this].join(" ");
		}
		add(...tokens) {
			addTokens(this, tokens);
			update(this);
		}
		contains(token) {
			return this.has(token);
		}
		remove(...tokens) {
			for (const token of tokens) this.delete(token);
			update(this);
		}
		toggle(token, force) {
			if (this.has(token)) {
				if (force) return true;
				this.delete(token);
				update(this);
			} else if (force || arguments.length === 1) {
				super.add(token);
				update(this);
				return true;
			}
			return false;
		}
		replace(token, newToken) {
			if (this.has(token)) {
				this.delete(token);
				super.add(newToken);
				update(this);
				return true;
			}
			return false;
		}
		supports() {
			return true;
		}
	};
});

// node_modules/linkedom/esm/interface/css-style-declaration.js
function push(value, key2) {
	if (key2 !== PRIVATE) this.push(`${key2}:${value}`);
}
var refs2,
	getKeys = (style) => [...style.keys()].filter((key2) => key2 !== PRIVATE),
	updateKeys = (style) => {
		const attr = refs2.get(style).getAttributeNode("style");
		if (!attr || attr[CHANGED] || style.get(PRIVATE) !== attr) {
			style.clear();
			if (attr) {
				style.set(PRIVATE, attr);
				for (const rule of attr[VALUE].split(/\s*;\s*/)) {
					let [key2, ...rest] = rule.split(":");
					if (rest.length > 0) {
						key2 = key2.trim();
						const value = rest.join(":").trim();
						if (key2 && value) style.set(key2, value);
					}
				}
			}
		}
		return attr;
	},
	handler2,
	CSSStyleDeclaration,
	prototype;
var init_css_style_declaration = __esm(() => {
	init_symbols();
	refs2 = new WeakMap();
	handler2 = {
		get(style, name) {
			if (name in prototype) return style[name];
			updateKeys(style);
			if (name === "length") return getKeys(style).length;
			if (/^\d+$/.test(name)) return getKeys(style)[name];
			return style.get(esm_default2(name));
		},
		set(style, name, value) {
			if (name === "cssText") style[name] = value;
			else {
				let attr = updateKeys(style);
				if (value == null) style.delete(esm_default2(name));
				else style.set(esm_default2(name), value);
				if (!attr) {
					const element = refs2.get(style);
					attr = element.ownerDocument.createAttribute("style");
					element.setAttributeNode(attr);
					style.set(PRIVATE, attr);
				}
				attr[CHANGED] = false;
				attr[VALUE] = style.toString();
			}
			return true;
		},
	};
	CSSStyleDeclaration = class CSSStyleDeclaration extends Map {
		constructor(element) {
			super();
			refs2.set(this, element);
			return new Proxy(this, handler2);
		}
		get cssText() {
			return this.toString();
		}
		set cssText(value) {
			refs2.get(this).setAttribute("style", value);
		}
		getPropertyValue(name) {
			const self = this[PRIVATE];
			return handler2.get(self, name);
		}
		setProperty(name, value) {
			const self = this[PRIVATE];
			handler2.set(self, name, value);
		}
		removeProperty(name) {
			const self = this[PRIVATE];
			handler2.set(self, name, null);
		}
		[Symbol.iterator]() {
			const self = this[PRIVATE];
			updateKeys(self);
			const keys2 = getKeys(self);
			const { length } = keys2;
			let i = 0;
			return {
				next() {
					const done = i === length;
					return { done, value: done ? null : keys2[i++] };
				},
			};
		}
		get [PRIVATE]() {
			return this;
		}
		toString() {
			const self = this[PRIVATE];
			updateKeys(self);
			const cssText = [];
			self.forEach(push, cssText);
			return cssText.join(";");
		}
	};
	({ prototype } = CSSStyleDeclaration);
});

// node_modules/linkedom/esm/interface/event.js
function getCurrentTarget(ev) {
	return ev.currentTarget;
}

class GlobalEvent {
	static get BUBBLING_PHASE() {
		return BUBBLING_PHASE;
	}
	static get AT_TARGET() {
		return AT_TARGET;
	}
	static get CAPTURING_PHASE() {
		return CAPTURING_PHASE;
	}
	static get NONE() {
		return NONE;
	}
	constructor(type, eventInitDict = {}) {
		this.type = type;
		this.bubbles = !!eventInitDict.bubbles;
		this.cancelBubble = false;
		this._stopImmediatePropagationFlag = false;
		this.cancelable = !!eventInitDict.cancelable;
		this.eventPhase = this.NONE;
		this.timeStamp = Date.now();
		this.defaultPrevented = false;
		this.originalTarget = null;
		this.returnValue = null;
		this.srcElement = null;
		this.target = null;
		this._path = [];
	}
	get BUBBLING_PHASE() {
		return BUBBLING_PHASE;
	}
	get AT_TARGET() {
		return AT_TARGET;
	}
	get CAPTURING_PHASE() {
		return CAPTURING_PHASE;
	}
	get NONE() {
		return NONE;
	}
	preventDefault() {
		this.defaultPrevented = true;
	}
	composedPath() {
		return this._path.map(getCurrentTarget);
	}
	stopPropagation() {
		this.cancelBubble = true;
	}
	stopImmediatePropagation() {
		this.stopPropagation();
		this._stopImmediatePropagationFlag = true;
	}
}
var BUBBLING_PHASE = 3,
	AT_TARGET = 2,
	CAPTURING_PHASE = 1,
	NONE = 0;
var init_event = () => {};

// node_modules/linkedom/esm/interface/named-node-map.js
var NamedNodeMap;
var init_named_node_map = __esm(() => {
	NamedNodeMap = class NamedNodeMap extends Array {
		constructor(ownerElement) {
			super();
			this.ownerElement = ownerElement;
		}
		getNamedItem(name) {
			return this.ownerElement.getAttributeNode(name);
		}
		setNamedItem(attr) {
			this.ownerElement.setAttributeNode(attr);
			this.unshift(attr);
		}
		removeNamedItem(name) {
			const item = this.getNamedItem(name);
			this.ownerElement.removeAttribute(name);
			this.splice(this.indexOf(item), 1);
		}
		item(index) {
			return index < this.length ? this[index] : null;
		}
		getNamedItemNS(_, name) {
			return this.getNamedItem(name);
		}
		setNamedItemNS(_, attr) {
			return this.setNamedItem(attr);
		}
		removeNamedItemNS(_, name) {
			return this.removeNamedItem(name);
		}
	};
});

// node_modules/linkedom/esm/interface/shadow-root.js
var ShadowRoot;
var init_shadow_root = __esm(() => {
	init_constants();
	init_inner_html();
	init_non_element_parent_node();
	ShadowRoot = class ShadowRoot extends NonElementParentNode {
		constructor(host) {
			super(host.ownerDocument, "#shadow-root", DOCUMENT_FRAGMENT_NODE);
			this.host = host;
		}
		get innerHTML() {
			return getInnerHtml(this);
		}
		set innerHTML(html) {
			setInnerHtml(this, html);
		}
	};
});

// node_modules/linkedom/esm/interface/element.js
var attributesHandler,
	create2 = (ownerDocument, element, localName) => {
		if ("ownerSVGElement" in element) {
			const svg = ownerDocument.createElementNS(SVG_NAMESPACE, localName);
			svg.ownerSVGElement = element.ownerSVGElement;
			return svg;
		}
		return ownerDocument.createElement(localName);
	},
	isVoid = ({ localName, ownerDocument }) => {
		return ownerDocument[MIME].voidElements.test(localName);
	},
	Element2;
var init_element = __esm(() => {
	init_constants();
	init_attributes();
	init_symbols();
	init_utils();
	init_jsdon();
	init_matches();
	init_shadow_roots();
	init_node3();
	init_non_document_type_child_node();
	init_child_node();
	init_inner_html();
	init_parent_node();
	init_string_map();
	init_token_list();
	init_css_style_declaration();
	init_event();
	init_named_node_map();
	init_shadow_root();
	init_node_list();
	init_attr();
	init_text();
	init_text_escaper();
	attributesHandler = {
		get(target, key2) {
			return key2 in target
				? target[key2]
				: target.find(({ name }) => name === key2);
		},
	};
	Element2 = class Element2 extends ParentNode {
		constructor(ownerDocument, localName) {
			super(ownerDocument, localName, ELEMENT_NODE);
			this[CLASS_LIST] = null;
			this[DATASET] = null;
			this[STYLE] = null;
		}
		get isConnected() {
			return isConnected(this);
		}
		get parentElement() {
			return parentElement(this);
		}
		get previousSibling() {
			return previousSibling(this);
		}
		get nextSibling() {
			return nextSibling(this);
		}
		get namespaceURI() {
			return "http://www.w3.org/1999/xhtml";
		}
		get previousElementSibling() {
			return previousElementSibling(this);
		}
		get nextElementSibling() {
			return nextElementSibling2(this);
		}
		before(...nodes) {
			before(this, nodes);
		}
		after(...nodes) {
			after(this, nodes);
		}
		replaceWith(...nodes) {
			replaceWith(this, nodes);
		}
		remove() {
			remove(this[PREV], this, this[END][NEXT]);
		}
		get id() {
			return stringAttribute.get(this, "id");
		}
		set id(value) {
			stringAttribute.set(this, "id", value);
		}
		get className() {
			return this.classList.value;
		}
		set className(value) {
			const { classList } = this;
			classList.clear();
			classList.add(...$String(value).split(/\s+/));
		}
		get nodeName() {
			return localCase(this);
		}
		get tagName() {
			return localCase(this);
		}
		get classList() {
			return this[CLASS_LIST] || (this[CLASS_LIST] = new DOMTokenList(this));
		}
		get dataset() {
			return this[DATASET] || (this[DATASET] = new DOMStringMap(this));
		}
		getBoundingClientRect() {
			return {
				x: 0,
				y: 0,
				bottom: 0,
				height: 0,
				left: 0,
				right: 0,
				top: 0,
				width: 0,
			};
		}
		get nonce() {
			return stringAttribute.get(this, "nonce");
		}
		set nonce(value) {
			stringAttribute.set(this, "nonce", value);
		}
		get style() {
			return this[STYLE] || (this[STYLE] = new CSSStyleDeclaration(this));
		}
		get tabIndex() {
			return numericAttribute.get(this, "tabindex") || -1;
		}
		set tabIndex(value) {
			numericAttribute.set(this, "tabindex", value);
		}
		get slot() {
			return stringAttribute.get(this, "slot");
		}
		set slot(value) {
			stringAttribute.set(this, "slot", value);
		}
		get innerText() {
			const text = [];
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				if (next.nodeType === TEXT_NODE) {
					text.push(next.textContent.replace(/\s+/g, " "));
				} else if (
					text.length &&
					next[NEXT] !== end &&
					BLOCK_ELEMENTS.has(next.tagName)
				) {
					text.push(`
`);
				}
				next = next[NEXT];
			}
			return text.join("");
		}
		get textContent() {
			const text = [];
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				const nodeType = next.nodeType;
				if (nodeType === TEXT_NODE || nodeType === CDATA_SECTION_NODE)
					text.push(next.textContent);
				next = next[NEXT];
			}
			return text.join("");
		}
		set textContent(text) {
			this.replaceChildren();
			if (text != null && text !== "")
				this.appendChild(new Text3(this.ownerDocument, text));
		}
		get innerHTML() {
			return getInnerHtml(this);
		}
		set innerHTML(html) {
			setInnerHtml(this, html);
		}
		get outerHTML() {
			return this.toString();
		}
		set outerHTML(html) {
			const template = this.ownerDocument.createElement("");
			template.innerHTML = html;
			this.replaceWith(...template.childNodes);
		}
		get attributes() {
			const attributes2 = new NamedNodeMap(this);
			let next = this[NEXT];
			while (next.nodeType === ATTRIBUTE_NODE) {
				attributes2.push(next);
				next = next[NEXT];
			}
			return new Proxy(attributes2, attributesHandler);
		}
		focus() {
			this.dispatchEvent(new GlobalEvent("focus"));
		}
		getAttribute(name) {
			if (name === "class") return this.className;
			const attribute2 = this.getAttributeNode(name);
			return (
				attribute2 &&
				(ignoreCase(this) ? attribute2.value : escape2(attribute2.value))
			);
		}
		getAttributeNode(name) {
			let next = this[NEXT];
			while (next.nodeType === ATTRIBUTE_NODE) {
				if (next.name === name) return next;
				next = next[NEXT];
			}
			return null;
		}
		getAttributeNames() {
			const attributes2 = new NodeList();
			let next = this[NEXT];
			while (next.nodeType === ATTRIBUTE_NODE) {
				attributes2.push(next.name);
				next = next[NEXT];
			}
			return attributes2;
		}
		hasAttribute(name) {
			return !!this.getAttributeNode(name);
		}
		hasAttributes() {
			return this[NEXT].nodeType === ATTRIBUTE_NODE;
		}
		removeAttribute(name) {
			if (name === "class" && this[CLASS_LIST]) this[CLASS_LIST].clear();
			let next = this[NEXT];
			while (next.nodeType === ATTRIBUTE_NODE) {
				if (next.name === name) {
					removeAttribute(this, next);
					return;
				}
				next = next[NEXT];
			}
		}
		removeAttributeNode(attribute2) {
			let next = this[NEXT];
			while (next.nodeType === ATTRIBUTE_NODE) {
				if (next === attribute2) {
					removeAttribute(this, next);
					return;
				}
				next = next[NEXT];
			}
		}
		setAttribute(name, value) {
			if (name === "class") this.className = value;
			else {
				const attribute2 = this.getAttributeNode(name);
				if (attribute2) attribute2.value = value;
				else setAttribute(this, new Attr(this.ownerDocument, name, value));
			}
		}
		setAttributeNode(attribute2) {
			const { name } = attribute2;
			const previously = this.getAttributeNode(name);
			if (previously !== attribute2) {
				if (previously) this.removeAttributeNode(previously);
				const { ownerElement } = attribute2;
				if (ownerElement) ownerElement.removeAttributeNode(attribute2);
				setAttribute(this, attribute2);
			}
			return previously;
		}
		toggleAttribute(name, force) {
			if (this.hasAttribute(name)) {
				if (!force) {
					this.removeAttribute(name);
					return false;
				}
				return true;
			} else if (force || arguments.length === 1) {
				this.setAttribute(name, "");
				return true;
			}
			return false;
		}
		get shadowRoot() {
			if (shadowRoots.has(this)) {
				const { mode, shadowRoot } = shadowRoots.get(this);
				if (mode === "open") return shadowRoot;
			}
			return null;
		}
		attachShadow(init) {
			if (shadowRoots.has(this)) throw new Error("operation not supported");
			const shadowRoot = new ShadowRoot(this);
			shadowRoots.set(this, {
				mode: init.mode,
				shadowRoot,
			});
			return shadowRoot;
		}
		matches(selectors) {
			return matches(this, selectors);
		}
		closest(selectors) {
			let parentElement2 = this;
			const matches2 = prepareMatch(parentElement2, selectors);
			while (parentElement2 && !matches2(parentElement2))
				parentElement2 = parentElement2.parentElement;
			return parentElement2;
		}
		insertAdjacentElement(position, element) {
			const { parentElement: parentElement2 } = this;
			switch (position) {
				case "beforebegin":
					if (parentElement2) {
						parentElement2.insertBefore(element, this);
						break;
					}
					return null;
				case "afterbegin":
					this.insertBefore(element, this.firstChild);
					break;
				case "beforeend":
					this.insertBefore(element, null);
					break;
				case "afterend":
					if (parentElement2) {
						parentElement2.insertBefore(element, this.nextSibling);
						break;
					}
					return null;
			}
			return element;
		}
		insertAdjacentHTML(position, html) {
			this.insertAdjacentElement(
				position,
				htmlToFragment(this.ownerDocument, html),
			);
		}
		insertAdjacentText(position, text) {
			const node2 = this.ownerDocument.createTextNode(text);
			this.insertAdjacentElement(position, node2);
		}
		cloneNode(deep = false) {
			const { ownerDocument, localName } = this;
			const addNext = (next2) => {
				next2.parentNode = parentNode;
				knownAdjacent($next, next2);
				$next = next2;
			};
			const clone = create2(ownerDocument, this, localName);
			let parentNode = clone,
				$next = clone;
			let { [NEXT]: next, [END]: prev } = this;
			while (next !== prev && (deep || next.nodeType === ATTRIBUTE_NODE)) {
				switch (next.nodeType) {
					case NODE_END:
						knownAdjacent($next, parentNode[END]);
						$next = parentNode[END];
						parentNode = parentNode.parentNode;
						break;
					case ELEMENT_NODE: {
						const node2 = create2(ownerDocument, next, next.localName);
						addNext(node2);
						parentNode = node2;
						break;
					}
					case ATTRIBUTE_NODE: {
						const attr = next.cloneNode(deep);
						attr.ownerElement = parentNode;
						addNext(attr);
						break;
					}
					case TEXT_NODE:
					case COMMENT_NODE:
					case CDATA_SECTION_NODE:
						addNext(next.cloneNode(deep));
						break;
				}
				next = next[NEXT];
			}
			knownAdjacent($next, clone[END]);
			return clone;
		}
		toString() {
			const out = [];
			const { [END]: end } = this;
			let next = { [NEXT]: this };
			let isOpened = false;
			do {
				next = next[NEXT];
				switch (next.nodeType) {
					case ATTRIBUTE_NODE: {
						const attr = ` ${next}`;
						switch (attr) {
							case " id":
							case " class":
							case " style":
								break;
							default:
								out.push(attr);
						}
						break;
					}
					case NODE_END: {
						const start = next[START];
						if (isOpened) {
							if ("ownerSVGElement" in start) out.push(" />");
							else if (isVoid(start)) out.push(ignoreCase(start) ? ">" : " />");
							else out.push(`></${start.localName}>`);
							isOpened = false;
						} else out.push(`</${start.localName}>`);
						break;
					}
					case ELEMENT_NODE:
						if (isOpened) out.push(">");
						if (next.toString !== this.toString) {
							out.push(next.toString());
							next = next[END];
							isOpened = false;
						} else {
							out.push(`<${next.localName}`);
							isOpened = true;
						}
						break;
					case TEXT_NODE:
					case COMMENT_NODE:
					case CDATA_SECTION_NODE:
						out.push((isOpened ? ">" : "") + next);
						isOpened = false;
						break;
				}
			} while (next !== end);
			return out.join("");
		}
		toJSON() {
			const json = [];
			elementAsJSON(this, json);
			return json;
		}
		getAttributeNS(_, name) {
			return this.getAttribute(name);
		}
		getElementsByTagNameNS(_, name) {
			return this.getElementsByTagName(name);
		}
		hasAttributeNS(_, name) {
			return this.hasAttribute(name);
		}
		removeAttributeNS(_, name) {
			this.removeAttribute(name);
		}
		setAttributeNS(_, name, value) {
			this.setAttribute(name, value);
		}
		setAttributeNodeNS(attr) {
			return this.setAttributeNode(attr);
		}
	};
});

// node_modules/linkedom/esm/svg/element.js
var classNames, handler3, SVGElement;
var init_element2 = __esm(() => {
	init_element();
	init_utils();
	classNames = new WeakMap();
	handler3 = {
		get(target, name) {
			return target[name];
		},
		set(target, name, value) {
			target[name] = value;
			return true;
		},
	};
	SVGElement = class SVGElement extends Element2 {
		constructor(ownerDocument, localName, ownerSVGElement = null) {
			super(ownerDocument, localName);
			this.ownerSVGElement = ownerSVGElement;
		}
		get className() {
			if (!classNames.has(this))
				classNames.set(this, new Proxy({ baseVal: "", animVal: "" }, handler3));
			return classNames.get(this);
		}
		set className(value) {
			const { classList } = this;
			classList.clear();
			classList.add(...$String(value).split(/\s+/));
		}
		get namespaceURI() {
			return "http://www.w3.org/2000/svg";
		}
		getAttribute(name) {
			return name === "class"
				? [...this.classList].join(" ")
				: super.getAttribute(name);
		}
		setAttribute(name, value) {
			if (name === "class") this.className = value;
			else if (name === "style") {
				const { className } = this;
				className.baseVal = className.animVal = value;
			}
			super.setAttribute(name, value);
		}
	};
});

// node_modules/linkedom/esm/shared/facades.js
function Attr2() {
	illegalConstructor();
}
function CDATASection2() {
	illegalConstructor();
}
function CharacterData2() {
	illegalConstructor();
}
function Comment4() {
	illegalConstructor();
}
function DocumentFragment2() {
	illegalConstructor();
}
function DocumentType2() {
	illegalConstructor();
}
function Element3() {
	illegalConstructor();
}
function Node3() {
	illegalConstructor();
}
function ShadowRoot2() {
	illegalConstructor();
}
function Text4() {
	illegalConstructor();
}
function SVGElement2() {
	illegalConstructor();
}
var illegalConstructor = () => {
		throw new TypeError("Illegal constructor");
	},
	Facades;
var init_facades = __esm(() => {
	init_attr();
	init_character_data();
	init_cdata_section();
	init_comment();
	init_document_fragment();
	init_document_type();
	init_element();
	init_node2();
	init_shadow_root();
	init_text();
	init_element2();
	init_object();
	setPrototypeOf(Attr2, Attr);
	Attr2.prototype = Attr.prototype;
	setPrototypeOf(CDATASection2, CDATASection);
	CDATASection2.prototype = CDATASection.prototype;
	setPrototypeOf(CharacterData2, CharacterData);
	CharacterData2.prototype = CharacterData.prototype;
	setPrototypeOf(Comment4, Comment3);
	Comment4.prototype = Comment3.prototype;
	setPrototypeOf(DocumentFragment2, DocumentFragment);
	DocumentFragment2.prototype = DocumentFragment.prototype;
	setPrototypeOf(DocumentType2, DocumentType);
	DocumentType2.prototype = DocumentType.prototype;
	setPrototypeOf(Element3, Element2);
	Element3.prototype = Element2.prototype;
	setPrototypeOf(Node3, Node2);
	Node3.prototype = Node2.prototype;
	setPrototypeOf(ShadowRoot2, ShadowRoot);
	ShadowRoot2.prototype = ShadowRoot.prototype;
	setPrototypeOf(Text4, Text3);
	Text4.prototype = Text3.prototype;
	setPrototypeOf(SVGElement2, SVGElement);
	SVGElement2.prototype = SVGElement.prototype;
	Facades = {
		Attr: Attr2,
		CDATASection: CDATASection2,
		CharacterData: CharacterData2,
		Comment: Comment4,
		DocumentFragment: DocumentFragment2,
		DocumentType: DocumentType2,
		Element: Element3,
		Node: Node3,
		ShadowRoot: ShadowRoot2,
		Text: Text4,
		SVGElement: SVGElement2,
	};
});

// node_modules/linkedom/esm/html/element.js
var Level0, level0, HTMLElement;
var init_element3 = __esm(() => {
	init_symbols();
	init_attributes();
	init_event();
	init_element();
	init_custom_element_registry();
	Level0 = new WeakMap();
	level0 = {
		get(element, name) {
			return (Level0.has(element) && Level0.get(element)[name]) || null;
		},
		set(element, name, value) {
			if (!Level0.has(element)) Level0.set(element, {});
			const handlers = Level0.get(element);
			const type = name.slice(2);
			if (handlers[name])
				element.removeEventListener(type, handlers[name], false);
			if ((handlers[name] = value))
				element.addEventListener(type, value, false);
		},
	};
	HTMLElement = class HTMLElement extends Element2 {
		static get observedAttributes() {
			return [];
		}
		constructor(ownerDocument = null, localName = "") {
			super(ownerDocument, localName);
			const ownerLess = !ownerDocument;
			let options;
			if (ownerLess) {
				const { constructor: Class } = this;
				if (!Classes.has(Class))
					throw new Error("unable to initialize this Custom Element");
				({ ownerDocument, localName, options } = Classes.get(Class));
			}
			if (ownerDocument[UPGRADE]) {
				const { element, values } = ownerDocument[UPGRADE];
				ownerDocument[UPGRADE] = null;
				for (const [key2, value] of values) element[key2] = value;
				return element;
			}
			if (ownerLess) {
				this.ownerDocument = this[END].ownerDocument = ownerDocument;
				this.localName = localName;
				customElements.set(this, { connected: false });
				if (options.is) this.setAttribute("is", options.is);
			}
		}
		blur() {
			this.dispatchEvent(new GlobalEvent("blur"));
		}
		click() {
			const clickEvent = new GlobalEvent("click", {
				bubbles: true,
				cancelable: true,
			});
			clickEvent.button = 0;
			this.dispatchEvent(clickEvent);
		}
		get accessKeyLabel() {
			const { accessKey } = this;
			return accessKey && `Alt+Shift+${accessKey}`;
		}
		get isContentEditable() {
			return this.hasAttribute("contenteditable");
		}
		get contentEditable() {
			return booleanAttribute.get(this, "contenteditable");
		}
		set contentEditable(value) {
			booleanAttribute.set(this, "contenteditable", value);
		}
		get draggable() {
			return booleanAttribute.get(this, "draggable");
		}
		set draggable(value) {
			booleanAttribute.set(this, "draggable", value);
		}
		get hidden() {
			return booleanAttribute.get(this, "hidden");
		}
		set hidden(value) {
			booleanAttribute.set(this, "hidden", value);
		}
		get spellcheck() {
			return booleanAttribute.get(this, "spellcheck");
		}
		set spellcheck(value) {
			booleanAttribute.set(this, "spellcheck", value);
		}
		get accessKey() {
			return stringAttribute.get(this, "accesskey");
		}
		set accessKey(value) {
			stringAttribute.set(this, "accesskey", value);
		}
		get dir() {
			return stringAttribute.get(this, "dir");
		}
		set dir(value) {
			stringAttribute.set(this, "dir", value);
		}
		get lang() {
			return stringAttribute.get(this, "lang");
		}
		set lang(value) {
			stringAttribute.set(this, "lang", value);
		}
		get title() {
			return stringAttribute.get(this, "title");
		}
		set title(value) {
			stringAttribute.set(this, "title", value);
		}
		get onabort() {
			return level0.get(this, "onabort");
		}
		set onabort(value) {
			level0.set(this, "onabort", value);
		}
		get onblur() {
			return level0.get(this, "onblur");
		}
		set onblur(value) {
			level0.set(this, "onblur", value);
		}
		get oncancel() {
			return level0.get(this, "oncancel");
		}
		set oncancel(value) {
			level0.set(this, "oncancel", value);
		}
		get oncanplay() {
			return level0.get(this, "oncanplay");
		}
		set oncanplay(value) {
			level0.set(this, "oncanplay", value);
		}
		get oncanplaythrough() {
			return level0.get(this, "oncanplaythrough");
		}
		set oncanplaythrough(value) {
			level0.set(this, "oncanplaythrough", value);
		}
		get onchange() {
			return level0.get(this, "onchange");
		}
		set onchange(value) {
			level0.set(this, "onchange", value);
		}
		get onclick() {
			return level0.get(this, "onclick");
		}
		set onclick(value) {
			level0.set(this, "onclick", value);
		}
		get onclose() {
			return level0.get(this, "onclose");
		}
		set onclose(value) {
			level0.set(this, "onclose", value);
		}
		get oncontextmenu() {
			return level0.get(this, "oncontextmenu");
		}
		set oncontextmenu(value) {
			level0.set(this, "oncontextmenu", value);
		}
		get oncuechange() {
			return level0.get(this, "oncuechange");
		}
		set oncuechange(value) {
			level0.set(this, "oncuechange", value);
		}
		get ondblclick() {
			return level0.get(this, "ondblclick");
		}
		set ondblclick(value) {
			level0.set(this, "ondblclick", value);
		}
		get ondrag() {
			return level0.get(this, "ondrag");
		}
		set ondrag(value) {
			level0.set(this, "ondrag", value);
		}
		get ondragend() {
			return level0.get(this, "ondragend");
		}
		set ondragend(value) {
			level0.set(this, "ondragend", value);
		}
		get ondragenter() {
			return level0.get(this, "ondragenter");
		}
		set ondragenter(value) {
			level0.set(this, "ondragenter", value);
		}
		get ondragleave() {
			return level0.get(this, "ondragleave");
		}
		set ondragleave(value) {
			level0.set(this, "ondragleave", value);
		}
		get ondragover() {
			return level0.get(this, "ondragover");
		}
		set ondragover(value) {
			level0.set(this, "ondragover", value);
		}
		get ondragstart() {
			return level0.get(this, "ondragstart");
		}
		set ondragstart(value) {
			level0.set(this, "ondragstart", value);
		}
		get ondrop() {
			return level0.get(this, "ondrop");
		}
		set ondrop(value) {
			level0.set(this, "ondrop", value);
		}
		get ondurationchange() {
			return level0.get(this, "ondurationchange");
		}
		set ondurationchange(value) {
			level0.set(this, "ondurationchange", value);
		}
		get onemptied() {
			return level0.get(this, "onemptied");
		}
		set onemptied(value) {
			level0.set(this, "onemptied", value);
		}
		get onended() {
			return level0.get(this, "onended");
		}
		set onended(value) {
			level0.set(this, "onended", value);
		}
		get onerror() {
			return level0.get(this, "onerror");
		}
		set onerror(value) {
			level0.set(this, "onerror", value);
		}
		get onfocus() {
			return level0.get(this, "onfocus");
		}
		set onfocus(value) {
			level0.set(this, "onfocus", value);
		}
		get oninput() {
			return level0.get(this, "oninput");
		}
		set oninput(value) {
			level0.set(this, "oninput", value);
		}
		get oninvalid() {
			return level0.get(this, "oninvalid");
		}
		set oninvalid(value) {
			level0.set(this, "oninvalid", value);
		}
		get onkeydown() {
			return level0.get(this, "onkeydown");
		}
		set onkeydown(value) {
			level0.set(this, "onkeydown", value);
		}
		get onkeypress() {
			return level0.get(this, "onkeypress");
		}
		set onkeypress(value) {
			level0.set(this, "onkeypress", value);
		}
		get onkeyup() {
			return level0.get(this, "onkeyup");
		}
		set onkeyup(value) {
			level0.set(this, "onkeyup", value);
		}
		get onload() {
			return level0.get(this, "onload");
		}
		set onload(value) {
			level0.set(this, "onload", value);
		}
		get onloadeddata() {
			return level0.get(this, "onloadeddata");
		}
		set onloadeddata(value) {
			level0.set(this, "onloadeddata", value);
		}
		get onloadedmetadata() {
			return level0.get(this, "onloadedmetadata");
		}
		set onloadedmetadata(value) {
			level0.set(this, "onloadedmetadata", value);
		}
		get onloadstart() {
			return level0.get(this, "onloadstart");
		}
		set onloadstart(value) {
			level0.set(this, "onloadstart", value);
		}
		get onmousedown() {
			return level0.get(this, "onmousedown");
		}
		set onmousedown(value) {
			level0.set(this, "onmousedown", value);
		}
		get onmouseenter() {
			return level0.get(this, "onmouseenter");
		}
		set onmouseenter(value) {
			level0.set(this, "onmouseenter", value);
		}
		get onmouseleave() {
			return level0.get(this, "onmouseleave");
		}
		set onmouseleave(value) {
			level0.set(this, "onmouseleave", value);
		}
		get onmousemove() {
			return level0.get(this, "onmousemove");
		}
		set onmousemove(value) {
			level0.set(this, "onmousemove", value);
		}
		get onmouseout() {
			return level0.get(this, "onmouseout");
		}
		set onmouseout(value) {
			level0.set(this, "onmouseout", value);
		}
		get onmouseover() {
			return level0.get(this, "onmouseover");
		}
		set onmouseover(value) {
			level0.set(this, "onmouseover", value);
		}
		get onmouseup() {
			return level0.get(this, "onmouseup");
		}
		set onmouseup(value) {
			level0.set(this, "onmouseup", value);
		}
		get onmousewheel() {
			return level0.get(this, "onmousewheel");
		}
		set onmousewheel(value) {
			level0.set(this, "onmousewheel", value);
		}
		get onpause() {
			return level0.get(this, "onpause");
		}
		set onpause(value) {
			level0.set(this, "onpause", value);
		}
		get onplay() {
			return level0.get(this, "onplay");
		}
		set onplay(value) {
			level0.set(this, "onplay", value);
		}
		get onplaying() {
			return level0.get(this, "onplaying");
		}
		set onplaying(value) {
			level0.set(this, "onplaying", value);
		}
		get onprogress() {
			return level0.get(this, "onprogress");
		}
		set onprogress(value) {
			level0.set(this, "onprogress", value);
		}
		get onratechange() {
			return level0.get(this, "onratechange");
		}
		set onratechange(value) {
			level0.set(this, "onratechange", value);
		}
		get onreset() {
			return level0.get(this, "onreset");
		}
		set onreset(value) {
			level0.set(this, "onreset", value);
		}
		get onresize() {
			return level0.get(this, "onresize");
		}
		set onresize(value) {
			level0.set(this, "onresize", value);
		}
		get onscroll() {
			return level0.get(this, "onscroll");
		}
		set onscroll(value) {
			level0.set(this, "onscroll", value);
		}
		get onseeked() {
			return level0.get(this, "onseeked");
		}
		set onseeked(value) {
			level0.set(this, "onseeked", value);
		}
		get onseeking() {
			return level0.get(this, "onseeking");
		}
		set onseeking(value) {
			level0.set(this, "onseeking", value);
		}
		get onselect() {
			return level0.get(this, "onselect");
		}
		set onselect(value) {
			level0.set(this, "onselect", value);
		}
		get onshow() {
			return level0.get(this, "onshow");
		}
		set onshow(value) {
			level0.set(this, "onshow", value);
		}
		get onstalled() {
			return level0.get(this, "onstalled");
		}
		set onstalled(value) {
			level0.set(this, "onstalled", value);
		}
		get onsubmit() {
			return level0.get(this, "onsubmit");
		}
		set onsubmit(value) {
			level0.set(this, "onsubmit", value);
		}
		get onsuspend() {
			return level0.get(this, "onsuspend");
		}
		set onsuspend(value) {
			level0.set(this, "onsuspend", value);
		}
		get ontimeupdate() {
			return level0.get(this, "ontimeupdate");
		}
		set ontimeupdate(value) {
			level0.set(this, "ontimeupdate", value);
		}
		get ontoggle() {
			return level0.get(this, "ontoggle");
		}
		set ontoggle(value) {
			level0.set(this, "ontoggle", value);
		}
		get onvolumechange() {
			return level0.get(this, "onvolumechange");
		}
		set onvolumechange(value) {
			level0.set(this, "onvolumechange", value);
		}
		get onwaiting() {
			return level0.get(this, "onwaiting");
		}
		set onwaiting(value) {
			level0.set(this, "onwaiting", value);
		}
		get onauxclick() {
			return level0.get(this, "onauxclick");
		}
		set onauxclick(value) {
			level0.set(this, "onauxclick", value);
		}
		get ongotpointercapture() {
			return level0.get(this, "ongotpointercapture");
		}
		set ongotpointercapture(value) {
			level0.set(this, "ongotpointercapture", value);
		}
		get onlostpointercapture() {
			return level0.get(this, "onlostpointercapture");
		}
		set onlostpointercapture(value) {
			level0.set(this, "onlostpointercapture", value);
		}
		get onpointercancel() {
			return level0.get(this, "onpointercancel");
		}
		set onpointercancel(value) {
			level0.set(this, "onpointercancel", value);
		}
		get onpointerdown() {
			return level0.get(this, "onpointerdown");
		}
		set onpointerdown(value) {
			level0.set(this, "onpointerdown", value);
		}
		get onpointerenter() {
			return level0.get(this, "onpointerenter");
		}
		set onpointerenter(value) {
			level0.set(this, "onpointerenter", value);
		}
		get onpointerleave() {
			return level0.get(this, "onpointerleave");
		}
		set onpointerleave(value) {
			level0.set(this, "onpointerleave", value);
		}
		get onpointermove() {
			return level0.get(this, "onpointermove");
		}
		set onpointermove(value) {
			level0.set(this, "onpointermove", value);
		}
		get onpointerout() {
			return level0.get(this, "onpointerout");
		}
		set onpointerout(value) {
			level0.set(this, "onpointerout", value);
		}
		get onpointerover() {
			return level0.get(this, "onpointerover");
		}
		set onpointerover(value) {
			level0.set(this, "onpointerover", value);
		}
		get onpointerup() {
			return level0.get(this, "onpointerup");
		}
		set onpointerup(value) {
			level0.set(this, "onpointerup", value);
		}
	};
});

// node_modules/linkedom/esm/html/template-element.js
var tagName = "template",
	HTMLTemplateElement;
var init_template_element = __esm(() => {
	init_symbols();
	init_register_html_class();
	init_element3();
	HTMLTemplateElement = class HTMLTemplateElement extends HTMLElement {
		constructor(ownerDocument) {
			super(ownerDocument, tagName);
			const content = this.ownerDocument.createDocumentFragment();
			(this[CONTENT] = content)[PRIVATE] = this;
		}
		get content() {
			if (this.hasChildNodes() && !this[CONTENT].hasChildNodes()) {
				for (const node2 of this.childNodes)
					this[CONTENT].appendChild(node2.cloneNode(true));
			}
			return this[CONTENT];
		}
	};
	registerHTMLClass(tagName, HTMLTemplateElement);
});

// node_modules/linkedom/esm/html/html-element.js
var HTMLHtmlElement;
var init_html_element = __esm(() => {
	init_element3();
	HTMLHtmlElement = class HTMLHtmlElement extends HTMLElement {
		constructor(ownerDocument, localName = "html") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/text-element.js
var toString, TextElement;
var init_text_element = __esm(() => {
	init_element3();
	({ toString } = HTMLElement.prototype);
	TextElement = class TextElement extends HTMLElement {
		get innerHTML() {
			return this.textContent;
		}
		set innerHTML(html) {
			this.textContent = html;
		}
		toString() {
			const outerHTML = toString.call(this.cloneNode());
			return outerHTML.replace("><", () => `>${this.textContent}<`);
		}
	};
});

// node_modules/linkedom/esm/html/script-element.js
var tagName2 = "script",
	HTMLScriptElement;
var init_script_element = __esm(() => {
	init_attributes();
	init_register_html_class();
	init_text_element();
	HTMLScriptElement = class HTMLScriptElement extends TextElement {
		constructor(ownerDocument, localName = tagName2) {
			super(ownerDocument, localName);
		}
		get type() {
			return stringAttribute.get(this, "type");
		}
		set type(value) {
			stringAttribute.set(this, "type", value);
		}
		get src() {
			return stringAttribute.get(this, "src");
		}
		set src(value) {
			stringAttribute.set(this, "src", value);
		}
		get defer() {
			return booleanAttribute.get(this, "defer");
		}
		set defer(value) {
			booleanAttribute.set(this, "defer", value);
		}
		get crossOrigin() {
			return stringAttribute.get(this, "crossorigin");
		}
		set crossOrigin(value) {
			stringAttribute.set(this, "crossorigin", value);
		}
		get nomodule() {
			return booleanAttribute.get(this, "nomodule");
		}
		set nomodule(value) {
			booleanAttribute.set(this, "nomodule", value);
		}
		get referrerPolicy() {
			return stringAttribute.get(this, "referrerpolicy");
		}
		set referrerPolicy(value) {
			stringAttribute.set(this, "referrerpolicy", value);
		}
		get nonce() {
			return stringAttribute.get(this, "nonce");
		}
		set nonce(value) {
			stringAttribute.set(this, "nonce", value);
		}
		get async() {
			return booleanAttribute.get(this, "async");
		}
		set async(value) {
			booleanAttribute.set(this, "async", value);
		}
		get text() {
			return this.textContent;
		}
		set text(content) {
			this.textContent = content;
		}
	};
	registerHTMLClass(tagName2, HTMLScriptElement);
});

// node_modules/linkedom/esm/html/frame-element.js
var HTMLFrameElement;
var init_frame_element = __esm(() => {
	init_element3();
	HTMLFrameElement = class HTMLFrameElement extends HTMLElement {
		constructor(ownerDocument, localName = "frame") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/i-frame-element.js
var tagName3 = "iframe",
	HTMLIFrameElement;
var init_i_frame_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLIFrameElement = class HTMLIFrameElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName3) {
			super(ownerDocument, localName);
		}
		get src() {
			return stringAttribute.get(this, "src");
		}
		set src(value) {
			stringAttribute.set(this, "src", value);
		}
		get srcdoc() {
			return stringAttribute.get(this, "srcdoc");
		}
		set srcdoc(value) {
			stringAttribute.set(this, "srcdoc", value);
		}
		get name() {
			return stringAttribute.get(this, "name");
		}
		set name(value) {
			stringAttribute.set(this, "name", value);
		}
		get allow() {
			return stringAttribute.get(this, "allow");
		}
		set allow(value) {
			stringAttribute.set(this, "allow", value);
		}
		get allowFullscreen() {
			return booleanAttribute.get(this, "allowfullscreen");
		}
		set allowFullscreen(value) {
			booleanAttribute.set(this, "allowfullscreen", value);
		}
		get referrerPolicy() {
			return stringAttribute.get(this, "referrerpolicy");
		}
		set referrerPolicy(value) {
			stringAttribute.set(this, "referrerpolicy", value);
		}
		get loading() {
			return stringAttribute.get(this, "loading");
		}
		set loading(value) {
			stringAttribute.set(this, "loading", value);
		}
	};
	registerHTMLClass(tagName3, HTMLIFrameElement);
});

// node_modules/linkedom/esm/html/object-element.js
var HTMLObjectElement;
var init_object_element = __esm(() => {
	init_element3();
	HTMLObjectElement = class HTMLObjectElement extends HTMLElement {
		constructor(ownerDocument, localName = "object") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/head-element.js
var HTMLHeadElement;
var init_head_element = __esm(() => {
	init_element3();
	HTMLHeadElement = class HTMLHeadElement extends HTMLElement {
		constructor(ownerDocument, localName = "head") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/body-element.js
var HTMLBodyElement;
var init_body_element = __esm(() => {
	init_element3();
	HTMLBodyElement = class HTMLBodyElement extends HTMLElement {
		constructor(ownerDocument, localName = "body") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/cssom/lib/StyleSheet.js
var require_StyleSheet = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.StyleSheet = function StyleSheet() {
		this.parentStyleSheet = null;
	};
	exports.StyleSheet = CSSOM.StyleSheet;
});

// node_modules/cssom/lib/CSSRule.js
var require_CSSRule = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.CSSRule = function CSSRule() {
		this.parentRule = null;
		this.parentStyleSheet = null;
	};
	CSSOM.CSSRule.UNKNOWN_RULE = 0;
	CSSOM.CSSRule.STYLE_RULE = 1;
	CSSOM.CSSRule.CHARSET_RULE = 2;
	CSSOM.CSSRule.IMPORT_RULE = 3;
	CSSOM.CSSRule.MEDIA_RULE = 4;
	CSSOM.CSSRule.FONT_FACE_RULE = 5;
	CSSOM.CSSRule.PAGE_RULE = 6;
	CSSOM.CSSRule.KEYFRAMES_RULE = 7;
	CSSOM.CSSRule.KEYFRAME_RULE = 8;
	CSSOM.CSSRule.MARGIN_RULE = 9;
	CSSOM.CSSRule.NAMESPACE_RULE = 10;
	CSSOM.CSSRule.COUNTER_STYLE_RULE = 11;
	CSSOM.CSSRule.SUPPORTS_RULE = 12;
	CSSOM.CSSRule.DOCUMENT_RULE = 13;
	CSSOM.CSSRule.FONT_FEATURE_VALUES_RULE = 14;
	CSSOM.CSSRule.VIEWPORT_RULE = 15;
	CSSOM.CSSRule.REGION_STYLE_RULE = 16;
	CSSOM.CSSRule.prototype = {
		constructor: CSSOM.CSSRule,
	};
	exports.CSSRule = CSSOM.CSSRule;
});

// node_modules/cssom/lib/CSSStyleRule.js
var require_CSSStyleRule = __commonJS((exports) => {
	var CSSOM = {
		CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
		CSSRule: require_CSSRule().CSSRule,
	};
	CSSOM.CSSStyleRule = function CSSStyleRule() {
		CSSOM.CSSRule.call(this);
		this.selectorText = "";
		this.style = new CSSOM.CSSStyleDeclaration();
		this.style.parentRule = this;
	};
	CSSOM.CSSStyleRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSStyleRule.prototype.constructor = CSSOM.CSSStyleRule;
	CSSOM.CSSStyleRule.prototype.type = 1;
	Object.defineProperty(CSSOM.CSSStyleRule.prototype, "cssText", {
		get: function () {
			var text;
			if (this.selectorText) {
				text = `${this.selectorText} {${this.style.cssText}}`;
			} else {
				text = "";
			}
			return text;
		},
		set: function (cssText) {
			var rule = CSSOM.CSSStyleRule.parse(cssText);
			this.style = rule.style;
			this.selectorText = rule.selectorText;
		},
	});
	CSSOM.CSSStyleRule.parse = (ruleText) => {
		var i = 0;
		var state = "selector";
		var index;
		var j = i;
		var buffer = "";
		var SIGNIFICANT_WHITESPACE = {
			selector: true,
			value: true,
		};
		var styleRule = new CSSOM.CSSStyleRule();
		var name,
			priority = "";
		for (var character; (character = ruleText.charAt(i)); i++) {
			switch (character) {
				case " ":
				case "\t":
				case "\r":
				case `
`:
				case "\f":
					if (SIGNIFICANT_WHITESPACE[state]) {
						switch (ruleText.charAt(i - 1)) {
							case " ":
							case "\t":
							case "\r":
							case `
`:
							case "\f":
								break;
							default:
								buffer += " ";
								break;
						}
					}
					break;
				case '"':
					j = i + 1;
					index = ruleText.indexOf('"', j) + 1;
					if (!index) {
						throw '" is missing';
					}
					buffer += ruleText.slice(i, index);
					i = index - 1;
					break;
				case "'":
					j = i + 1;
					index = ruleText.indexOf("'", j) + 1;
					if (!index) {
						throw "' is missing";
					}
					buffer += ruleText.slice(i, index);
					i = index - 1;
					break;
				case "/":
					if (ruleText.charAt(i + 1) === "*") {
						i += 2;
						index = ruleText.indexOf("*/", i);
						if (index === -1) {
							throw new SyntaxError("Missing */");
						} else {
							i = index + 1;
						}
					} else {
						buffer += character;
					}
					break;
				case "{":
					if (state === "selector") {
						styleRule.selectorText = buffer.trim();
						buffer = "";
						state = "name";
					}
					break;
				case ":":
					if (state === "name") {
						name = buffer.trim();
						buffer = "";
						state = "value";
					} else {
						buffer += character;
					}
					break;
				case "!":
					if (state === "value" && ruleText.indexOf("!important", i) === i) {
						priority = "important";
						i += "important".length;
					} else {
						buffer += character;
					}
					break;
				case ";":
					if (state === "value") {
						styleRule.style.setProperty(name, buffer.trim(), priority);
						priority = "";
						buffer = "";
						state = "name";
					} else {
						buffer += character;
					}
					break;
				case "}":
					if (state === "value") {
						styleRule.style.setProperty(name, buffer.trim(), priority);
						priority = "";
						buffer = "";
					} else if (state === "name") {
						break;
					} else {
						buffer += character;
					}
					state = "selector";
					break;
				default:
					buffer += character;
					break;
			}
		}
		return styleRule;
	};
	exports.CSSStyleRule = CSSOM.CSSStyleRule;
});

// node_modules/cssom/lib/CSSStyleSheet.js
var require_CSSStyleSheet = __commonJS((exports) => {
	var CSSOM = {
		StyleSheet: require_StyleSheet().StyleSheet,
		CSSStyleRule: require_CSSStyleRule().CSSStyleRule,
	};
	CSSOM.CSSStyleSheet = function CSSStyleSheet() {
		CSSOM.StyleSheet.call(this);
		this.cssRules = [];
	};
	CSSOM.CSSStyleSheet.prototype = new CSSOM.StyleSheet();
	CSSOM.CSSStyleSheet.prototype.constructor = CSSOM.CSSStyleSheet;
	CSSOM.CSSStyleSheet.prototype.insertRule = function (rule, index) {
		if (index < 0 || index > this.cssRules.length) {
			throw new RangeError("INDEX_SIZE_ERR");
		}
		var cssRule = CSSOM.parse(rule).cssRules[0];
		cssRule.parentStyleSheet = this;
		this.cssRules.splice(index, 0, cssRule);
		return index;
	};
	CSSOM.CSSStyleSheet.prototype.deleteRule = function (index) {
		if (index < 0 || index >= this.cssRules.length) {
			throw new RangeError("INDEX_SIZE_ERR");
		}
		this.cssRules.splice(index, 1);
	};
	CSSOM.CSSStyleSheet.prototype.toString = function () {
		var result = "";
		var rules = this.cssRules;
		for (var i = 0; i < rules.length; i++) {
			result +=
				rules[i].cssText +
				`
`;
		}
		return result;
	};
	exports.CSSStyleSheet = CSSOM.CSSStyleSheet;
	CSSOM.parse = require_parse().parse;
});

// node_modules/cssom/lib/MediaList.js
var require_MediaList = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.MediaList = function MediaList() {
		this.length = 0;
	};
	CSSOM.MediaList.prototype = {
		constructor: CSSOM.MediaList,
		get mediaText() {
			return Array.prototype.join.call(this, ", ");
		},
		set mediaText(value) {
			var values = value.split(",");
			var length = (this.length = values.length);
			for (var i = 0; i < length; i++) {
				this[i] = values[i].trim();
			}
		},
		appendMedium: function (medium) {
			if (Array.prototype.indexOf.call(this, medium) === -1) {
				this[this.length] = medium;
				this.length++;
			}
		},
		deleteMedium: function (medium) {
			var index = Array.prototype.indexOf.call(this, medium);
			if (index !== -1) {
				Array.prototype.splice.call(this, index, 1);
			}
		},
	};
	exports.MediaList = CSSOM.MediaList;
});

// node_modules/cssom/lib/CSSImportRule.js
var require_CSSImportRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		CSSStyleSheet: require_CSSStyleSheet().CSSStyleSheet,
		MediaList: require_MediaList().MediaList,
	};
	CSSOM.CSSImportRule = function CSSImportRule() {
		CSSOM.CSSRule.call(this);
		this.href = "";
		this.media = new CSSOM.MediaList();
		this.styleSheet = new CSSOM.CSSStyleSheet();
	};
	CSSOM.CSSImportRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSImportRule.prototype.constructor = CSSOM.CSSImportRule;
	CSSOM.CSSImportRule.prototype.type = 3;
	Object.defineProperty(CSSOM.CSSImportRule.prototype, "cssText", {
		get: function () {
			var mediaText = this.media.mediaText;
			return (
				"@import url(" +
				this.href +
				")" +
				(mediaText ? ` ${mediaText}` : "") +
				";"
			);
		},
		set: function (cssText) {
			var i = 0;
			var state = "";
			var buffer = "";
			var index;
			for (var character; (character = cssText.charAt(i)); i++) {
				switch (character) {
					case " ":
					case "\t":
					case "\r":
					case `
`:
					case "\f":
						if (state === "after-import") {
							state = "url";
						} else {
							buffer += character;
						}
						break;
					case "@":
						if (!state && cssText.indexOf("@import", i) === i) {
							state = "after-import";
							i += "import".length;
							buffer = "";
						}
						break;
					case "u":
						if (state === "url" && cssText.indexOf("url(", i) === i) {
							index = cssText.indexOf(")", i + 1);
							if (index === -1) {
								throw `${i}: ")" not found`;
							}
							i += "url(".length;
							var url = cssText.slice(i, index);
							if (url[0] === url[url.length - 1]) {
								if (url[0] === '"' || url[0] === "'") {
									url = url.slice(1, -1);
								}
							}
							this.href = url;
							i = index;
							state = "media";
						}
						break;
					case '"':
						if (state === "url") {
							index = cssText.indexOf('"', i + 1);
							if (!index) {
								throw `${i}: '"' not found`;
							}
							this.href = cssText.slice(i + 1, index);
							i = index;
							state = "media";
						}
						break;
					case "'":
						if (state === "url") {
							index = cssText.indexOf("'", i + 1);
							if (!index) {
								throw `${i}: "'" not found`;
							}
							this.href = cssText.slice(i + 1, index);
							i = index;
							state = "media";
						}
						break;
					case ";":
						if (state === "media") {
							if (buffer) {
								this.media.mediaText = buffer.trim();
							}
						}
						break;
					default:
						if (state === "media") {
							buffer += character;
						}
						break;
				}
			}
		},
	});
	exports.CSSImportRule = CSSOM.CSSImportRule;
});

// node_modules/cssom/lib/CSSGroupingRule.js
var require_CSSGroupingRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
	};
	CSSOM.CSSGroupingRule = function CSSGroupingRule() {
		CSSOM.CSSRule.call(this);
		this.cssRules = [];
	};
	CSSOM.CSSGroupingRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSGroupingRule.prototype.constructor = CSSOM.CSSGroupingRule;
	CSSOM.CSSGroupingRule.prototype.insertRule = function insertRule(
		rule,
		index,
	) {
		if (index < 0 || index > this.cssRules.length) {
			throw new RangeError("INDEX_SIZE_ERR");
		}
		var cssRule = CSSOM.parse(rule).cssRules[0];
		cssRule.parentRule = this;
		this.cssRules.splice(index, 0, cssRule);
		return index;
	};
	CSSOM.CSSGroupingRule.prototype.deleteRule = function deleteRule(index) {
		if (index < 0 || index >= this.cssRules.length) {
			throw new RangeError("INDEX_SIZE_ERR");
		}
		this.cssRules.splice(index, 1)[0].parentRule = null;
	};
	exports.CSSGroupingRule = CSSOM.CSSGroupingRule;
});

// node_modules/cssom/lib/CSSConditionRule.js
var require_CSSConditionRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
	};
	CSSOM.CSSConditionRule = function CSSConditionRule() {
		CSSOM.CSSGroupingRule.call(this);
		this.cssRules = [];
	};
	CSSOM.CSSConditionRule.prototype = new CSSOM.CSSGroupingRule();
	CSSOM.CSSConditionRule.prototype.constructor = CSSOM.CSSConditionRule;
	CSSOM.CSSConditionRule.prototype.conditionText = "";
	CSSOM.CSSConditionRule.prototype.cssText = "";
	exports.CSSConditionRule = CSSOM.CSSConditionRule;
});

// node_modules/cssom/lib/CSSMediaRule.js
var require_CSSMediaRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
		CSSConditionRule: require_CSSConditionRule().CSSConditionRule,
		MediaList: require_MediaList().MediaList,
	};
	CSSOM.CSSMediaRule = function CSSMediaRule() {
		CSSOM.CSSConditionRule.call(this);
		this.media = new CSSOM.MediaList();
	};
	CSSOM.CSSMediaRule.prototype = new CSSOM.CSSConditionRule();
	CSSOM.CSSMediaRule.prototype.constructor = CSSOM.CSSMediaRule;
	CSSOM.CSSMediaRule.prototype.type = 4;
	Object.defineProperties(CSSOM.CSSMediaRule.prototype, {
		conditionText: {
			get: function () {
				return this.media.mediaText;
			},
			set: function (value) {
				this.media.mediaText = value;
			},
			configurable: true,
			enumerable: true,
		},
		cssText: {
			get: function () {
				var cssTexts = [];
				for (var i = 0, length = this.cssRules.length; i < length; i++) {
					cssTexts.push(this.cssRules[i].cssText);
				}
				return `@media ${this.media.mediaText} {${cssTexts.join("")}}`;
			},
			configurable: true,
			enumerable: true,
		},
	});
	exports.CSSMediaRule = CSSOM.CSSMediaRule;
});

// node_modules/cssom/lib/CSSSupportsRule.js
var require_CSSSupportsRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
		CSSConditionRule: require_CSSConditionRule().CSSConditionRule,
	};
	CSSOM.CSSSupportsRule = function CSSSupportsRule() {
		CSSOM.CSSConditionRule.call(this);
	};
	CSSOM.CSSSupportsRule.prototype = new CSSOM.CSSConditionRule();
	CSSOM.CSSSupportsRule.prototype.constructor = CSSOM.CSSSupportsRule;
	CSSOM.CSSSupportsRule.prototype.type = 12;
	Object.defineProperty(CSSOM.CSSSupportsRule.prototype, "cssText", {
		get: function () {
			var cssTexts = [];
			for (var i = 0, length = this.cssRules.length; i < length; i++) {
				cssTexts.push(this.cssRules[i].cssText);
			}
			return `@supports ${this.conditionText} {${cssTexts.join("")}}`;
		},
	});
	exports.CSSSupportsRule = CSSOM.CSSSupportsRule;
});

// node_modules/cssom/lib/CSSFontFaceRule.js
var require_CSSFontFaceRule = __commonJS((exports) => {
	var CSSOM = {
		CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
		CSSRule: require_CSSRule().CSSRule,
	};
	CSSOM.CSSFontFaceRule = function CSSFontFaceRule() {
		CSSOM.CSSRule.call(this);
		this.style = new CSSOM.CSSStyleDeclaration();
		this.style.parentRule = this;
	};
	CSSOM.CSSFontFaceRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSFontFaceRule.prototype.constructor = CSSOM.CSSFontFaceRule;
	CSSOM.CSSFontFaceRule.prototype.type = 5;
	Object.defineProperty(CSSOM.CSSFontFaceRule.prototype, "cssText", {
		get: function () {
			return `@font-face {${this.style.cssText}}`;
		},
	});
	exports.CSSFontFaceRule = CSSOM.CSSFontFaceRule;
});

// node_modules/cssom/lib/CSSHostRule.js
var require_CSSHostRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
	};
	CSSOM.CSSHostRule = function CSSHostRule() {
		CSSOM.CSSRule.call(this);
		this.cssRules = [];
	};
	CSSOM.CSSHostRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSHostRule.prototype.constructor = CSSOM.CSSHostRule;
	CSSOM.CSSHostRule.prototype.type = 1001;
	Object.defineProperty(CSSOM.CSSHostRule.prototype, "cssText", {
		get: function () {
			var cssTexts = [];
			for (var i = 0, length = this.cssRules.length; i < length; i++) {
				cssTexts.push(this.cssRules[i].cssText);
			}
			return `@host {${cssTexts.join("")}}`;
		},
	});
	exports.CSSHostRule = CSSOM.CSSHostRule;
});

// node_modules/cssom/lib/CSSKeyframeRule.js
var require_CSSKeyframeRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
	};
	CSSOM.CSSKeyframeRule = function CSSKeyframeRule() {
		CSSOM.CSSRule.call(this);
		this.keyText = "";
		this.style = new CSSOM.CSSStyleDeclaration();
		this.style.parentRule = this;
	};
	CSSOM.CSSKeyframeRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSKeyframeRule.prototype.constructor = CSSOM.CSSKeyframeRule;
	CSSOM.CSSKeyframeRule.prototype.type = 8;
	Object.defineProperty(CSSOM.CSSKeyframeRule.prototype, "cssText", {
		get: function () {
			return `${this.keyText} {${this.style.cssText}} `;
		},
	});
	exports.CSSKeyframeRule = CSSOM.CSSKeyframeRule;
});

// node_modules/cssom/lib/CSSKeyframesRule.js
var require_CSSKeyframesRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
	};
	CSSOM.CSSKeyframesRule = function CSSKeyframesRule() {
		CSSOM.CSSRule.call(this);
		this.name = "";
		this.cssRules = [];
	};
	CSSOM.CSSKeyframesRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSKeyframesRule.prototype.constructor = CSSOM.CSSKeyframesRule;
	CSSOM.CSSKeyframesRule.prototype.type = 7;
	Object.defineProperty(CSSOM.CSSKeyframesRule.prototype, "cssText", {
		get: function () {
			var cssTexts = [];
			for (var i = 0, length = this.cssRules.length; i < length; i++) {
				cssTexts.push(`  ${this.cssRules[i].cssText}`);
			}
			return (
				"@" +
				(this._vendorPrefix || "") +
				"keyframes " +
				this.name +
				` { 
` +
				cssTexts.join(`
`) +
				`
}`
			);
		},
	});
	exports.CSSKeyframesRule = CSSOM.CSSKeyframesRule;
});

// node_modules/cssom/lib/CSSValue.js
var require_CSSValue = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.CSSValue = function CSSValue() {};
	CSSOM.CSSValue.prototype = {
		constructor: CSSOM.CSSValue,
		set cssText(text) {
			var name = this._getConstructorName();
			throw new Error(
				'DOMException: property "cssText" of "' +
					name +
					'" is readonly and can not be replaced with "' +
					text +
					'"!',
			);
		},
		get cssText() {
			var name = this._getConstructorName();
			throw new Error(`getter "cssText" of "${name}" is not implemented!`);
		},
		_getConstructorName: function () {
			var s = this.constructor.toString(),
				c = s.match(/function\s([^(]+)/),
				name = c[1];
			return name;
		},
	};
	exports.CSSValue = CSSOM.CSSValue;
});

// node_modules/cssom/lib/CSSValueExpression.js
var require_CSSValueExpression = __commonJS((exports) => {
	var CSSOM = {
		CSSValue: require_CSSValue().CSSValue,
	};
	CSSOM.CSSValueExpression = function CSSValueExpression(token, idx) {
		this._token = token;
		this._idx = idx;
	};
	CSSOM.CSSValueExpression.prototype = new CSSOM.CSSValue();
	CSSOM.CSSValueExpression.prototype.constructor = CSSOM.CSSValueExpression;
	CSSOM.CSSValueExpression.prototype.parse = function () {
		var token = this._token,
			idx = this._idx;
		var character = "",
			expression = "",
			error = "",
			info,
			paren = [];
		for (; ; ++idx) {
			character = token.charAt(idx);
			if (character === "") {
				error = "css expression error: unfinished expression!";
				break;
			}
			switch (character) {
				case "(":
					paren.push(character);
					expression += character;
					break;
				case ")":
					paren.pop(character);
					expression += character;
					break;
				case "/":
					if ((info = this._parseJSComment(token, idx))) {
						if (info.error) {
							error = "css expression error: unfinished comment in expression!";
						} else {
							idx = info.idx;
						}
					} else if ((info = this._parseJSRexExp(token, idx))) {
						idx = info.idx;
						expression += info.text;
					} else {
						expression += character;
					}
					break;
				case "'":
				case '"':
					info = this._parseJSString(token, idx, character);
					if (info) {
						idx = info.idx;
						expression += info.text;
					} else {
						expression += character;
					}
					break;
				default:
					expression += character;
					break;
			}
			if (error) {
				break;
			}
			if (paren.length === 0) {
				break;
			}
		}
		var ret;
		if (error) {
			ret = {
				error,
			};
		} else {
			ret = {
				idx,
				expression,
			};
		}
		return ret;
	};
	CSSOM.CSSValueExpression.prototype._parseJSComment = (token, idx) => {
		var nextChar = token.charAt(idx + 1),
			text;
		if (nextChar === "/" || nextChar === "*") {
			var startIdx = idx,
				endIdx,
				commentEndChar;
			if (nextChar === "/") {
				commentEndChar = `
`;
			} else if (nextChar === "*") {
				commentEndChar = "*/";
			}
			endIdx = token.indexOf(commentEndChar, startIdx + 1 + 1);
			if (endIdx !== -1) {
				endIdx = endIdx + commentEndChar.length - 1;
				text = token.substring(idx, endIdx + 1);
				return {
					idx: endIdx,
					text,
				};
			} else {
				var error = "css expression error: unfinished comment in expression!";
				return {
					error,
				};
			}
		} else {
			return false;
		}
	};
	CSSOM.CSSValueExpression.prototype._parseJSString = function (
		token,
		idx,
		sep,
	) {
		var endIdx = this._findMatchedIdx(token, idx, sep),
			text;
		if (endIdx === -1) {
			return false;
		} else {
			text = token.substring(idx, endIdx + sep.length);
			return {
				idx: endIdx,
				text,
			};
		}
	};
	CSSOM.CSSValueExpression.prototype._parseJSRexExp = function (token, idx) {
		var before2 = token.substring(0, idx).replace(/\s+$/, ""),
			legalRegx = [
				/^$/,
				/\($/,
				/\[$/,
				/!$/,
				/\+$/,
				/-$/,
				/\*$/,
				/\/\s+/,
				/%$/,
				/=$/,
				/>$/,
				/<$/,
				/&$/,
				/\|$/,
				/\^$/,
				/~$/,
				/\?$/,
				/,$/,
				/delete$/,
				/in$/,
				/instanceof$/,
				/new$/,
				/typeof$/,
				/void$/,
			];
		var isLegal = legalRegx.some((reg) => reg.test(before2));
		if (!isLegal) {
			return false;
		} else {
			var sep = "/";
			return this._parseJSString(token, idx, sep);
		}
	};
	CSSOM.CSSValueExpression.prototype._findMatchedIdx = (token, idx, sep) => {
		var startIdx = idx,
			endIdx;
		var NOT_FOUND = -1;
		while (true) {
			endIdx = token.indexOf(sep, startIdx + 1);
			if (endIdx === -1) {
				endIdx = NOT_FOUND;
				break;
			} else {
				var text = token.substring(idx + 1, endIdx),
					matched = text.match(/\\+$/);
				if (!matched || matched[0] % 2 === 0) {
					break;
				} else {
					startIdx = endIdx;
				}
			}
		}
		var nextNewLineIdx = token.indexOf(
			`
`,
			idx + 1,
		);
		if (nextNewLineIdx < endIdx) {
			endIdx = NOT_FOUND;
		}
		return endIdx;
	};
	exports.CSSValueExpression = CSSOM.CSSValueExpression;
});

// node_modules/cssom/lib/MatcherList.js
var require_MatcherList = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.MatcherList = function MatcherList() {
		this.length = 0;
	};
	CSSOM.MatcherList.prototype = {
		constructor: CSSOM.MatcherList,
		get matcherText() {
			return Array.prototype.join.call(this, ", ");
		},
		set matcherText(value) {
			var values = value.split(",");
			var length = (this.length = values.length);
			for (var i = 0; i < length; i++) {
				this[i] = values[i].trim();
			}
		},
		appendMatcher: function (matcher) {
			if (Array.prototype.indexOf.call(this, matcher) === -1) {
				this[this.length] = matcher;
				this.length++;
			}
		},
		deleteMatcher: function (matcher) {
			var index = Array.prototype.indexOf.call(this, matcher);
			if (index !== -1) {
				Array.prototype.splice.call(this, index, 1);
			}
		},
	};
	exports.MatcherList = CSSOM.MatcherList;
});

// node_modules/cssom/lib/CSSDocumentRule.js
var require_CSSDocumentRule = __commonJS((exports) => {
	var CSSOM = {
		CSSRule: require_CSSRule().CSSRule,
		MatcherList: require_MatcherList().MatcherList,
	};
	CSSOM.CSSDocumentRule = function CSSDocumentRule() {
		CSSOM.CSSRule.call(this);
		this.matcher = new CSSOM.MatcherList();
		this.cssRules = [];
	};
	CSSOM.CSSDocumentRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSDocumentRule.prototype.constructor = CSSOM.CSSDocumentRule;
	CSSOM.CSSDocumentRule.prototype.type = 10;
	Object.defineProperty(CSSOM.CSSDocumentRule.prototype, "cssText", {
		get: function () {
			var cssTexts = [];
			for (var i = 0, length = this.cssRules.length; i < length; i++) {
				cssTexts.push(this.cssRules[i].cssText);
			}
			return (
				"@-moz-document " +
				this.matcher.matcherText +
				" {" +
				cssTexts.join("") +
				"}"
			);
		},
	});
	exports.CSSDocumentRule = CSSOM.CSSDocumentRule;
});

// node_modules/cssom/lib/parse.js
var require_parse = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.parse = function parse3(token) {
		var i = 0;
		var state = "before-selector";
		var index;
		var buffer = "";
		var valueParenthesisDepth = 0;
		var SIGNIFICANT_WHITESPACE = {
			selector: true,
			value: true,
			"value-parenthesis": true,
			atRule: true,
			"importRule-begin": true,
			importRule: true,
			atBlock: true,
			conditionBlock: true,
			"documentRule-begin": true,
		};
		var styleSheet = new CSSOM.CSSStyleSheet();
		var currentScope = styleSheet;
		var parentRule;
		var ancestorRules = [];
		var hasAncestors = false;
		var prevScope;
		var name,
			priority = "",
			styleRule,
			mediaRule,
			supportsRule,
			importRule,
			fontFaceRule,
			keyframesRule,
			documentRule,
			hostRule;
		var atKeyframesRegExp = /@(-(?:\w+-)+)?keyframes/g;
		var parseError = (message) => {
			var lines = token.substring(0, i).split(`
`);
			var lineCount = lines.length;
			var charCount = lines.pop().length + 1;
			var error = new Error(
				`${message} (line ${lineCount}, char ${charCount})`,
			);
			error.line = lineCount;
			error.char = charCount;
			error.styleSheet = styleSheet;
			throw error;
		};
		for (var character; (character = token.charAt(i)); i++) {
			switch (character) {
				case " ":
				case "\t":
				case "\r":
				case `
`:
				case "\f":
					if (SIGNIFICANT_WHITESPACE[state]) {
						buffer += character;
					}
					break;
				case '"':
					index = i + 1;
					do {
						index = token.indexOf('"', index) + 1;
						if (!index) {
							parseError('Unmatched "');
						}
					} while (token[index - 2] === "\\");
					buffer += token.slice(i, index);
					i = index - 1;
					switch (state) {
						case "before-value":
							state = "value";
							break;
						case "importRule-begin":
							state = "importRule";
							break;
					}
					break;
				case "'":
					index = i + 1;
					do {
						index = token.indexOf("'", index) + 1;
						if (!index) {
							parseError("Unmatched '");
						}
					} while (token[index - 2] === "\\");
					buffer += token.slice(i, index);
					i = index - 1;
					switch (state) {
						case "before-value":
							state = "value";
							break;
						case "importRule-begin":
							state = "importRule";
							break;
					}
					break;
				case "/":
					if (token.charAt(i + 1) === "*") {
						i += 2;
						index = token.indexOf("*/", i);
						if (index === -1) {
							parseError("Missing */");
						} else {
							i = index + 1;
						}
					} else {
						buffer += character;
					}
					if (state === "importRule-begin") {
						buffer += " ";
						state = "importRule";
					}
					break;
				case "@":
					if (token.indexOf("@-moz-document", i) === i) {
						state = "documentRule-begin";
						documentRule = new CSSOM.CSSDocumentRule();
						documentRule.__starts = i;
						i += "-moz-document".length;
						buffer = "";
						break;
					} else if (token.indexOf("@media", i) === i) {
						state = "atBlock";
						mediaRule = new CSSOM.CSSMediaRule();
						mediaRule.__starts = i;
						i += "media".length;
						buffer = "";
						break;
					} else if (token.indexOf("@supports", i) === i) {
						state = "conditionBlock";
						supportsRule = new CSSOM.CSSSupportsRule();
						supportsRule.__starts = i;
						i += "supports".length;
						buffer = "";
						break;
					} else if (token.indexOf("@host", i) === i) {
						state = "hostRule-begin";
						i += "host".length;
						hostRule = new CSSOM.CSSHostRule();
						hostRule.__starts = i;
						buffer = "";
						break;
					} else if (token.indexOf("@import", i) === i) {
						state = "importRule-begin";
						i += "import".length;
						buffer += "@import";
						break;
					} else if (token.indexOf("@font-face", i) === i) {
						state = "fontFaceRule-begin";
						i += "font-face".length;
						fontFaceRule = new CSSOM.CSSFontFaceRule();
						fontFaceRule.__starts = i;
						buffer = "";
						break;
					} else {
						atKeyframesRegExp.lastIndex = i;
						var matchKeyframes = atKeyframesRegExp.exec(token);
						if (matchKeyframes && matchKeyframes.index === i) {
							state = "keyframesRule-begin";
							keyframesRule = new CSSOM.CSSKeyframesRule();
							keyframesRule.__starts = i;
							keyframesRule._vendorPrefix = matchKeyframes[1];
							i += matchKeyframes[0].length - 1;
							buffer = "";
							break;
						} else if (state === "selector") {
							state = "atRule";
						}
					}
					buffer += character;
					break;
				case "{":
					if (state === "selector" || state === "atRule") {
						styleRule.selectorText = buffer.trim();
						styleRule.style.__starts = i;
						buffer = "";
						state = "before-name";
					} else if (state === "atBlock") {
						mediaRule.media.mediaText = buffer.trim();
						if (parentRule) {
							ancestorRules.push(parentRule);
						}
						currentScope = parentRule = mediaRule;
						mediaRule.parentStyleSheet = styleSheet;
						buffer = "";
						state = "before-selector";
					} else if (state === "conditionBlock") {
						supportsRule.conditionText = buffer.trim();
						if (parentRule) {
							ancestorRules.push(parentRule);
						}
						currentScope = parentRule = supportsRule;
						supportsRule.parentStyleSheet = styleSheet;
						buffer = "";
						state = "before-selector";
					} else if (state === "hostRule-begin") {
						if (parentRule) {
							ancestorRules.push(parentRule);
						}
						currentScope = parentRule = hostRule;
						hostRule.parentStyleSheet = styleSheet;
						buffer = "";
						state = "before-selector";
					} else if (state === "fontFaceRule-begin") {
						if (parentRule) {
							fontFaceRule.parentRule = parentRule;
						}
						fontFaceRule.parentStyleSheet = styleSheet;
						styleRule = fontFaceRule;
						buffer = "";
						state = "before-name";
					} else if (state === "keyframesRule-begin") {
						keyframesRule.name = buffer.trim();
						if (parentRule) {
							ancestorRules.push(parentRule);
							keyframesRule.parentRule = parentRule;
						}
						keyframesRule.parentStyleSheet = styleSheet;
						currentScope = parentRule = keyframesRule;
						buffer = "";
						state = "keyframeRule-begin";
					} else if (state === "keyframeRule-begin") {
						styleRule = new CSSOM.CSSKeyframeRule();
						styleRule.keyText = buffer.trim();
						styleRule.__starts = i;
						buffer = "";
						state = "before-name";
					} else if (state === "documentRule-begin") {
						documentRule.matcher.matcherText = buffer.trim();
						if (parentRule) {
							ancestorRules.push(parentRule);
							documentRule.parentRule = parentRule;
						}
						currentScope = parentRule = documentRule;
						documentRule.parentStyleSheet = styleSheet;
						buffer = "";
						state = "before-selector";
					}
					break;
				case ":":
					if (state === "name") {
						name = buffer.trim();
						buffer = "";
						state = "before-value";
					} else {
						buffer += character;
					}
					break;
				case "(":
					if (state === "value") {
						if (buffer.trim() === "expression") {
							var info = new CSSOM.CSSValueExpression(token, i).parse();
							if (info.error) {
								parseError(info.error);
							} else {
								buffer += info.expression;
								i = info.idx;
							}
						} else {
							state = "value-parenthesis";
							valueParenthesisDepth = 1;
							buffer += character;
						}
					} else if (state === "value-parenthesis") {
						valueParenthesisDepth++;
						buffer += character;
					} else {
						buffer += character;
					}
					break;
				case ")":
					if (state === "value-parenthesis") {
						valueParenthesisDepth--;
						if (valueParenthesisDepth === 0) state = "value";
					}
					buffer += character;
					break;
				case "!":
					if (state === "value" && token.indexOf("!important", i) === i) {
						priority = "important";
						i += "important".length;
					} else {
						buffer += character;
					}
					break;
				case ";":
					switch (state) {
						case "value":
							styleRule.style.setProperty(name, buffer.trim(), priority);
							priority = "";
							buffer = "";
							state = "before-name";
							break;
						case "atRule":
							buffer = "";
							state = "before-selector";
							break;
						case "importRule":
							importRule = new CSSOM.CSSImportRule();
							importRule.parentStyleSheet =
								importRule.styleSheet.parentStyleSheet = styleSheet;
							importRule.cssText = buffer + character;
							styleSheet.cssRules.push(importRule);
							buffer = "";
							state = "before-selector";
							break;
						default:
							buffer += character;
							break;
					}
					break;
				case "}":
					switch (state) {
						case "value":
							styleRule.style.setProperty(name, buffer.trim(), priority);
							priority = "";
						case "before-name":
						case "name":
							styleRule.__ends = i + 1;
							if (parentRule) {
								styleRule.parentRule = parentRule;
							}
							styleRule.parentStyleSheet = styleSheet;
							currentScope.cssRules.push(styleRule);
							buffer = "";
							if (currentScope.constructor === CSSOM.CSSKeyframesRule) {
								state = "keyframeRule-begin";
							} else {
								state = "before-selector";
							}
							break;
						case "keyframeRule-begin":
						case "before-selector":
						case "selector":
							if (!parentRule) {
								parseError("Unexpected }");
							}
							hasAncestors = ancestorRules.length > 0;
							while (ancestorRules.length > 0) {
								parentRule = ancestorRules.pop();
								if (
									parentRule.constructor.name === "CSSMediaRule" ||
									parentRule.constructor.name === "CSSSupportsRule"
								) {
									prevScope = currentScope;
									currentScope = parentRule;
									currentScope.cssRules.push(prevScope);
									break;
								}
								if (ancestorRules.length === 0) {
									hasAncestors = false;
								}
							}
							if (!hasAncestors) {
								currentScope.__ends = i + 1;
								styleSheet.cssRules.push(currentScope);
								currentScope = styleSheet;
								parentRule = null;
							}
							buffer = "";
							state = "before-selector";
							break;
					}
					break;
				default:
					switch (state) {
						case "before-selector":
							state = "selector";
							styleRule = new CSSOM.CSSStyleRule();
							styleRule.__starts = i;
							break;
						case "before-name":
							state = "name";
							break;
						case "before-value":
							state = "value";
							break;
						case "importRule-begin":
							state = "importRule";
							break;
					}
					buffer += character;
					break;
			}
		}
		return styleSheet;
	};
	exports.parse = CSSOM.parse;
	CSSOM.CSSStyleSheet = require_CSSStyleSheet().CSSStyleSheet;
	CSSOM.CSSStyleRule = require_CSSStyleRule().CSSStyleRule;
	CSSOM.CSSImportRule = require_CSSImportRule().CSSImportRule;
	CSSOM.CSSGroupingRule = require_CSSGroupingRule().CSSGroupingRule;
	CSSOM.CSSMediaRule = require_CSSMediaRule().CSSMediaRule;
	CSSOM.CSSConditionRule = require_CSSConditionRule().CSSConditionRule;
	CSSOM.CSSSupportsRule = require_CSSSupportsRule().CSSSupportsRule;
	CSSOM.CSSFontFaceRule = require_CSSFontFaceRule().CSSFontFaceRule;
	CSSOM.CSSHostRule = require_CSSHostRule().CSSHostRule;
	CSSOM.CSSStyleDeclaration = require_CSSStyleDeclaration().CSSStyleDeclaration;
	CSSOM.CSSKeyframeRule = require_CSSKeyframeRule().CSSKeyframeRule;
	CSSOM.CSSKeyframesRule = require_CSSKeyframesRule().CSSKeyframesRule;
	CSSOM.CSSValueExpression = require_CSSValueExpression().CSSValueExpression;
	CSSOM.CSSDocumentRule = require_CSSDocumentRule().CSSDocumentRule;
});

// node_modules/cssom/lib/CSSStyleDeclaration.js
var require_CSSStyleDeclaration = __commonJS((exports) => {
	var CSSOM = {};
	CSSOM.CSSStyleDeclaration = function CSSStyleDeclaration2() {
		this.length = 0;
		this.parentRule = null;
		this._importants = {};
	};
	CSSOM.CSSStyleDeclaration.prototype = {
		constructor: CSSOM.CSSStyleDeclaration,
		getPropertyValue: function (name) {
			return this[name] || "";
		},
		setProperty: function (name, value, priority) {
			if (this[name]) {
				var index = Array.prototype.indexOf.call(this, name);
				if (index < 0) {
					this[this.length] = name;
					this.length++;
				}
			} else {
				this[this.length] = name;
				this.length++;
			}
			this[name] = `${value}`;
			this._importants[name] = priority;
		},
		removeProperty: function (name) {
			if (!(name in this)) {
				return "";
			}
			var index = Array.prototype.indexOf.call(this, name);
			if (index < 0) {
				return "";
			}
			var prevValue = this[name];
			this[name] = "";
			Array.prototype.splice.call(this, index, 1);
			return prevValue;
		},
		getPropertyCSSValue: () => {},
		getPropertyPriority: function (name) {
			return this._importants[name] || "";
		},
		getPropertyShorthand: () => {},
		isPropertyImplicit: () => {},
		get cssText() {
			var properties = [];
			for (var i = 0, length = this.length; i < length; ++i) {
				var name = this[i];
				var value = this.getPropertyValue(name);
				var priority = this.getPropertyPriority(name);
				if (priority) {
					priority = ` !${priority}`;
				}
				properties[i] = `${name}: ${value}${priority};`;
			}
			return properties.join(" ");
		},
		set cssText(text) {
			var i, name;
			for (i = this.length; i--; ) {
				name = this[i];
				this[name] = "";
			}
			Array.prototype.splice.call(this, 0, this.length);
			this._importants = {};
			var dummyRule = CSSOM.parse(`#bogus{${text}}`).cssRules[0].style;
			var length = dummyRule.length;
			for (i = 0; i < length; ++i) {
				name = dummyRule[i];
				this.setProperty(
					dummyRule[i],
					dummyRule.getPropertyValue(name),
					dummyRule.getPropertyPriority(name),
				);
			}
		},
	};
	exports.CSSStyleDeclaration = CSSOM.CSSStyleDeclaration;
	CSSOM.parse = require_parse().parse;
});

// node_modules/cssom/lib/clone.js
var require_clone = __commonJS((exports) => {
	var CSSOM = {
		CSSStyleSheet: require_CSSStyleSheet().CSSStyleSheet,
		CSSRule: require_CSSRule().CSSRule,
		CSSStyleRule: require_CSSStyleRule().CSSStyleRule,
		CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
		CSSConditionRule: require_CSSConditionRule().CSSConditionRule,
		CSSMediaRule: require_CSSMediaRule().CSSMediaRule,
		CSSSupportsRule: require_CSSSupportsRule().CSSSupportsRule,
		CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
		CSSKeyframeRule: require_CSSKeyframeRule().CSSKeyframeRule,
		CSSKeyframesRule: require_CSSKeyframesRule().CSSKeyframesRule,
	};
	CSSOM.clone = function clone(stylesheet) {
		var cloned = new CSSOM.CSSStyleSheet();
		var rules = stylesheet.cssRules;
		if (!rules) {
			return cloned;
		}
		for (var i = 0, rulesLength = rules.length; i < rulesLength; i++) {
			var rule = rules[i];
			var ruleClone = (cloned.cssRules[i] = new rule.constructor());
			var style = rule.style;
			if (style) {
				var styleClone = (ruleClone.style = new CSSOM.CSSStyleDeclaration());
				for (var j = 0, styleLength = style.length; j < styleLength; j++) {
					var name = (styleClone[j] = style[j]);
					styleClone[name] = style[name];
					styleClone._importants[name] = style.getPropertyPriority(name);
				}
				styleClone.length = style.length;
			}
			if (Object.hasOwn(rule, "keyText")) {
				ruleClone.keyText = rule.keyText;
			}
			if (Object.hasOwn(rule, "selectorText")) {
				ruleClone.selectorText = rule.selectorText;
			}
			if (Object.hasOwn(rule, "mediaText")) {
				ruleClone.mediaText = rule.mediaText;
			}
			if (Object.hasOwn(rule, "conditionText")) {
				ruleClone.conditionText = rule.conditionText;
			}
			if (Object.hasOwn(rule, "cssRules")) {
				ruleClone.cssRules = clone(rule).cssRules;
			}
		}
		return cloned;
	};
	exports.clone = CSSOM.clone;
});

// node_modules/cssom/lib/index.js
var _$CSSStyleDeclaration,
	_$CSSRule,
	_$CSSGroupingRule,
	_$CSSConditionRule,
	_$CSSStyleRule,
	_$MediaList,
	_$CSSMediaRule,
	_$CSSSupportsRule,
	_$CSSImportRule,
	_$CSSFontFaceRule,
	_$CSSHostRule,
	_$StyleSheet,
	_$CSSStyleSheet,
	_$CSSKeyframesRule,
	_$CSSKeyframeRule,
	_$MatcherList,
	_$CSSDocumentRule,
	_$CSSValue,
	_$CSSValueExpression,
	$parse,
	_$clone;
var init_lib = __esm(() => {
	_$CSSStyleDeclaration = require_CSSStyleDeclaration().CSSStyleDeclaration;
	_$CSSRule = require_CSSRule().CSSRule;
	_$CSSGroupingRule = require_CSSGroupingRule().CSSGroupingRule;
	_$CSSConditionRule = require_CSSConditionRule().CSSConditionRule;
	_$CSSStyleRule = require_CSSStyleRule().CSSStyleRule;
	_$MediaList = require_MediaList().MediaList;
	_$CSSMediaRule = require_CSSMediaRule().CSSMediaRule;
	_$CSSSupportsRule = require_CSSSupportsRule().CSSSupportsRule;
	_$CSSImportRule = require_CSSImportRule().CSSImportRule;
	_$CSSFontFaceRule = require_CSSFontFaceRule().CSSFontFaceRule;
	_$CSSHostRule = require_CSSHostRule().CSSHostRule;
	_$StyleSheet = require_StyleSheet().StyleSheet;
	_$CSSStyleSheet = require_CSSStyleSheet().CSSStyleSheet;
	_$CSSKeyframesRule = require_CSSKeyframesRule().CSSKeyframesRule;
	_$CSSKeyframeRule = require_CSSKeyframeRule().CSSKeyframeRule;
	_$MatcherList = require_MatcherList().MatcherList;
	_$CSSDocumentRule = require_CSSDocumentRule().CSSDocumentRule;
	_$CSSValue = require_CSSValue().CSSValue;
	_$CSSValueExpression = require_CSSValueExpression().CSSValueExpression;
	$parse = require_parse().parse;
	_$clone = require_clone().clone;
});

// node_modules/linkedom/esm/html/style-element.js
var tagName4 = "style",
	HTMLStyleElement;
var init_style_element = __esm(() => {
	init_lib();
	init_register_html_class();
	init_symbols();
	init_text_element();
	HTMLStyleElement = class HTMLStyleElement extends TextElement {
		constructor(ownerDocument, localName = tagName4) {
			super(ownerDocument, localName);
			this[SHEET] = null;
		}
		get sheet() {
			const sheet = this[SHEET];
			if (sheet !== null) {
				return sheet;
			}
			return (this[SHEET] = $parse(this.textContent));
		}
		get innerHTML() {
			return super.innerHTML || "";
		}
		set innerHTML(value) {
			super.textContent = value;
			this[SHEET] = null;
		}
		get innerText() {
			return super.innerText || "";
		}
		set innerText(value) {
			super.textContent = value;
			this[SHEET] = null;
		}
		get textContent() {
			return super.textContent || "";
		}
		set textContent(value) {
			super.textContent = value;
			this[SHEET] = null;
		}
	};
	registerHTMLClass(tagName4, HTMLStyleElement);
});

// node_modules/linkedom/esm/html/time-element.js
var HTMLTimeElement;
var init_time_element = __esm(() => {
	init_attributes();
	init_register_html_class();
	init_element3();
	HTMLTimeElement = class HTMLTimeElement extends HTMLElement {
		constructor(ownerDocument, localName = "time") {
			super(ownerDocument, localName);
		}
		get dateTime() {
			return stringAttribute.get(this, "datetime");
		}
		set dateTime(value) {
			stringAttribute.set(this, "datetime", value);
		}
	};
	registerHTMLClass("time", HTMLTimeElement);
});

// node_modules/linkedom/esm/html/field-set-element.js
var HTMLFieldSetElement;
var init_field_set_element = __esm(() => {
	init_element3();
	HTMLFieldSetElement = class HTMLFieldSetElement extends HTMLElement {
		constructor(ownerDocument, localName = "fieldset") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/embed-element.js
var HTMLEmbedElement;
var init_embed_element = __esm(() => {
	init_element3();
	HTMLEmbedElement = class HTMLEmbedElement extends HTMLElement {
		constructor(ownerDocument, localName = "embed") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/hr-element.js
var HTMLHRElement;
var init_hr_element = __esm(() => {
	init_element3();
	HTMLHRElement = class HTMLHRElement extends HTMLElement {
		constructor(ownerDocument, localName = "hr") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/progress-element.js
var HTMLProgressElement;
var init_progress_element = __esm(() => {
	init_element3();
	HTMLProgressElement = class HTMLProgressElement extends HTMLElement {
		constructor(ownerDocument, localName = "progress") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/paragraph-element.js
var HTMLParagraphElement;
var init_paragraph_element = __esm(() => {
	init_element3();
	HTMLParagraphElement = class HTMLParagraphElement extends HTMLElement {
		constructor(ownerDocument, localName = "p") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/table-element.js
var HTMLTableElement;
var init_table_element = __esm(() => {
	init_element3();
	HTMLTableElement = class HTMLTableElement extends HTMLElement {
		constructor(ownerDocument, localName = "table") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/frame-set-element.js
var HTMLFrameSetElement;
var init_frame_set_element = __esm(() => {
	init_element3();
	HTMLFrameSetElement = class HTMLFrameSetElement extends HTMLElement {
		constructor(ownerDocument, localName = "frameset") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/li-element.js
var HTMLLIElement;
var init_li_element = __esm(() => {
	init_element3();
	HTMLLIElement = class HTMLLIElement extends HTMLElement {
		constructor(ownerDocument, localName = "li") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/base-element.js
var HTMLBaseElement;
var init_base_element = __esm(() => {
	init_element3();
	HTMLBaseElement = class HTMLBaseElement extends HTMLElement {
		constructor(ownerDocument, localName = "base") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/data-list-element.js
var HTMLDataListElement;
var init_data_list_element = __esm(() => {
	init_element3();
	HTMLDataListElement = class HTMLDataListElement extends HTMLElement {
		constructor(ownerDocument, localName = "datalist") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/input-element.js
var tagName5 = "input",
	HTMLInputElement;
var init_input_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLInputElement = class HTMLInputElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName5) {
			super(ownerDocument, localName);
		}
		get autofocus() {
			return booleanAttribute.get(this, "autofocus") || -1;
		}
		set autofocus(value) {
			booleanAttribute.set(this, "autofocus", value);
		}
		get disabled() {
			return booleanAttribute.get(this, "disabled");
		}
		set disabled(value) {
			booleanAttribute.set(this, "disabled", value);
		}
		get name() {
			return this.getAttribute("name");
		}
		set name(value) {
			this.setAttribute("name", value);
		}
		get placeholder() {
			return this.getAttribute("placeholder");
		}
		set placeholder(value) {
			this.setAttribute("placeholder", value);
		}
		get type() {
			return this.getAttribute("type");
		}
		set type(value) {
			this.setAttribute("type", value);
		}
		get value() {
			return stringAttribute.get(this, "value");
		}
		set value(value) {
			stringAttribute.set(this, "value", value);
		}
	};
	registerHTMLClass(tagName5, HTMLInputElement);
});

// node_modules/linkedom/esm/html/param-element.js
var HTMLParamElement;
var init_param_element = __esm(() => {
	init_element3();
	HTMLParamElement = class HTMLParamElement extends HTMLElement {
		constructor(ownerDocument, localName = "param") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/media-element.js
var HTMLMediaElement;
var init_media_element = __esm(() => {
	init_element3();
	HTMLMediaElement = class HTMLMediaElement extends HTMLElement {
		constructor(ownerDocument, localName = "media") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/audio-element.js
var HTMLAudioElement;
var init_audio_element = __esm(() => {
	init_element3();
	HTMLAudioElement = class HTMLAudioElement extends HTMLElement {
		constructor(ownerDocument, localName = "audio") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/heading-element.js
var tagName6 = "h1",
	HTMLHeadingElement;
var init_heading_element = __esm(() => {
	init_register_html_class();
	init_element3();
	HTMLHeadingElement = class HTMLHeadingElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName6) {
			super(ownerDocument, localName);
		}
	};
	registerHTMLClass(
		[tagName6, "h2", "h3", "h4", "h5", "h6"],
		HTMLHeadingElement,
	);
});

// node_modules/linkedom/esm/html/directory-element.js
var HTMLDirectoryElement;
var init_directory_element = __esm(() => {
	init_element3();
	HTMLDirectoryElement = class HTMLDirectoryElement extends HTMLElement {
		constructor(ownerDocument, localName = "dir") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/quote-element.js
var HTMLQuoteElement;
var init_quote_element = __esm(() => {
	init_element3();
	HTMLQuoteElement = class HTMLQuoteElement extends HTMLElement {
		constructor(ownerDocument, localName = "quote") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/commonjs/canvas-shim.cjs
var require_canvas_shim = __commonJS((_exports, module) => {
	class Canvas {
		constructor(width, height) {
			this.width = width;
			this.height = height;
		}
		getContext() {
			return null;
		}
		toDataURL() {
			return "";
		}
	}
	module.exports = {
		createCanvas: (width, height) => new Canvas(width, height),
	};
});

// node_modules/linkedom/commonjs/canvas.cjs
var require_canvas = __commonJS((_exports, module) => {
	try {
		module.exports = (() => {
			throw new Error("Cannot require module " + "canvas");
		})();
	} catch (_fallback) {
		module.exports = require_canvas_shim();
	}
});

// node_modules/linkedom/esm/html/canvas-element.js
var import_canvas,
	createCanvas,
	tagName7 = "canvas",
	HTMLCanvasElement;
var init_canvas_element = __esm(() => {
	init_symbols();
	init_register_html_class();
	init_attributes();
	init_element3();
	import_canvas = __toESM(require_canvas(), 1);
	({ createCanvas } = import_canvas.default);
	HTMLCanvasElement = class HTMLCanvasElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName7) {
			super(ownerDocument, localName);
			this[IMAGE] = createCanvas(300, 150);
		}
		get width() {
			return this[IMAGE].width;
		}
		set width(value) {
			numericAttribute.set(this, "width", value);
			this[IMAGE].width = value;
		}
		get height() {
			return this[IMAGE].height;
		}
		set height(value) {
			numericAttribute.set(this, "height", value);
			this[IMAGE].height = value;
		}
		getContext(type) {
			return this[IMAGE].getContext(type);
		}
		toDataURL(...args) {
			return this[IMAGE].toDataURL(...args);
		}
	};
	registerHTMLClass(tagName7, HTMLCanvasElement);
});

// node_modules/linkedom/esm/html/legend-element.js
var HTMLLegendElement;
var init_legend_element = __esm(() => {
	init_element3();
	HTMLLegendElement = class HTMLLegendElement extends HTMLElement {
		constructor(ownerDocument, localName = "legend") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/option-element.js
var tagName8 = "option",
	HTMLOptionElement;
var init_option_element = __esm(() => {
	init_element3();
	init_attributes();
	init_register_html_class();
	HTMLOptionElement = class HTMLOptionElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName8) {
			super(ownerDocument, localName);
		}
		get value() {
			return stringAttribute.get(this, "value");
		}
		set value(value) {
			stringAttribute.set(this, "value", value);
		}
		get selected() {
			return booleanAttribute.get(this, "selected");
		}
		set selected(value) {
			const option = this.parentElement?.querySelector("option[selected]");
			if (option && option !== this) option.selected = false;
			booleanAttribute.set(this, "selected", value);
		}
	};
	registerHTMLClass(tagName8, HTMLOptionElement);
});

// node_modules/linkedom/esm/html/span-element.js
var HTMLSpanElement;
var init_span_element = __esm(() => {
	init_element3();
	HTMLSpanElement = class HTMLSpanElement extends HTMLElement {
		constructor(ownerDocument, localName = "span") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/meter-element.js
var HTMLMeterElement;
var init_meter_element = __esm(() => {
	init_element3();
	HTMLMeterElement = class HTMLMeterElement extends HTMLElement {
		constructor(ownerDocument, localName = "meter") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/video-element.js
var HTMLVideoElement;
var init_video_element = __esm(() => {
	init_element3();
	HTMLVideoElement = class HTMLVideoElement extends HTMLElement {
		constructor(ownerDocument, localName = "video") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/table-cell-element.js
var HTMLTableCellElement;
var init_table_cell_element = __esm(() => {
	init_element3();
	HTMLTableCellElement = class HTMLTableCellElement extends HTMLElement {
		constructor(ownerDocument, localName = "td") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/title-element.js
var tagName9 = "title",
	HTMLTitleElement;
var init_title_element = __esm(() => {
	init_register_html_class();
	init_text_element();
	HTMLTitleElement = class HTMLTitleElement extends TextElement {
		constructor(ownerDocument, localName = tagName9) {
			super(ownerDocument, localName);
		}
	};
	registerHTMLClass(tagName9, HTMLTitleElement);
});

// node_modules/linkedom/esm/html/output-element.js
var HTMLOutputElement;
var init_output_element = __esm(() => {
	init_element3();
	HTMLOutputElement = class HTMLOutputElement extends HTMLElement {
		constructor(ownerDocument, localName = "output") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/table-row-element.js
var HTMLTableRowElement;
var init_table_row_element = __esm(() => {
	init_element3();
	HTMLTableRowElement = class HTMLTableRowElement extends HTMLElement {
		constructor(ownerDocument, localName = "tr") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/data-element.js
var HTMLDataElement;
var init_data_element = __esm(() => {
	init_element3();
	HTMLDataElement = class HTMLDataElement extends HTMLElement {
		constructor(ownerDocument, localName = "data") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/menu-element.js
var HTMLMenuElement;
var init_menu_element = __esm(() => {
	init_element3();
	HTMLMenuElement = class HTMLMenuElement extends HTMLElement {
		constructor(ownerDocument, localName = "menu") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/select-element.js
var tagName10 = "select",
	HTMLSelectElement;
var init_select_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	init_node_list();
	HTMLSelectElement = class HTMLSelectElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName10) {
			super(ownerDocument, localName);
		}
		get options() {
			const children = new NodeList();
			let { firstElementChild } = this;
			while (firstElementChild) {
				if (firstElementChild.tagName === "OPTGROUP")
					children.push(...firstElementChild.children);
				else children.push(firstElementChild);
				firstElementChild = firstElementChild.nextElementSibling;
			}
			return children;
		}
		get disabled() {
			return booleanAttribute.get(this, "disabled");
		}
		set disabled(value) {
			booleanAttribute.set(this, "disabled", value);
		}
		get name() {
			return this.getAttribute("name");
		}
		set name(value) {
			this.setAttribute("name", value);
		}
		get value() {
			return this.querySelector("option[selected]")?.value;
		}
	};
	registerHTMLClass(tagName10, HTMLSelectElement);
});

// node_modules/linkedom/esm/html/br-element.js
var HTMLBRElement;
var init_br_element = __esm(() => {
	init_element3();
	HTMLBRElement = class HTMLBRElement extends HTMLElement {
		constructor(ownerDocument, localName = "br") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/button-element.js
var tagName11 = "button",
	HTMLButtonElement;
var init_button_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLButtonElement = class HTMLButtonElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName11) {
			super(ownerDocument, localName);
		}
		get disabled() {
			return booleanAttribute.get(this, "disabled");
		}
		set disabled(value) {
			booleanAttribute.set(this, "disabled", value);
		}
		get name() {
			return this.getAttribute("name");
		}
		set name(value) {
			this.setAttribute("name", value);
		}
		get type() {
			return this.getAttribute("type");
		}
		set type(value) {
			this.setAttribute("type", value);
		}
	};
	registerHTMLClass(tagName11, HTMLButtonElement);
});

// node_modules/linkedom/esm/html/map-element.js
var HTMLMapElement;
var init_map_element = __esm(() => {
	init_element3();
	HTMLMapElement = class HTMLMapElement extends HTMLElement {
		constructor(ownerDocument, localName = "map") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/opt-group-element.js
var HTMLOptGroupElement;
var init_opt_group_element = __esm(() => {
	init_element3();
	HTMLOptGroupElement = class HTMLOptGroupElement extends HTMLElement {
		constructor(ownerDocument, localName = "optgroup") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/d-list-element.js
var HTMLDListElement;
var init_d_list_element = __esm(() => {
	init_element3();
	HTMLDListElement = class HTMLDListElement extends HTMLElement {
		constructor(ownerDocument, localName = "dl") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/text-area-element.js
var tagName12 = "textarea",
	HTMLTextAreaElement;
var init_text_area_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_text_element();
	HTMLTextAreaElement = class HTMLTextAreaElement extends TextElement {
		constructor(ownerDocument, localName = tagName12) {
			super(ownerDocument, localName);
		}
		get disabled() {
			return booleanAttribute.get(this, "disabled");
		}
		set disabled(value) {
			booleanAttribute.set(this, "disabled", value);
		}
		get name() {
			return this.getAttribute("name");
		}
		set name(value) {
			this.setAttribute("name", value);
		}
		get placeholder() {
			return this.getAttribute("placeholder");
		}
		set placeholder(value) {
			this.setAttribute("placeholder", value);
		}
		get type() {
			return this.getAttribute("type");
		}
		set type(value) {
			this.setAttribute("type", value);
		}
		get value() {
			return this.textContent;
		}
		set value(content) {
			this.textContent = content;
		}
	};
	registerHTMLClass(tagName12, HTMLTextAreaElement);
});

// node_modules/linkedom/esm/html/font-element.js
var HTMLFontElement;
var init_font_element = __esm(() => {
	init_element3();
	HTMLFontElement = class HTMLFontElement extends HTMLElement {
		constructor(ownerDocument, localName = "font") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/div-element.js
var HTMLDivElement;
var init_div_element = __esm(() => {
	init_element3();
	HTMLDivElement = class HTMLDivElement extends HTMLElement {
		constructor(ownerDocument, localName = "div") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/link-element.js
var tagName13 = "link",
	HTMLLinkElement;
var init_link_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLLinkElement = class HTMLLinkElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName13) {
			super(ownerDocument, localName);
		}
		get disabled() {
			return booleanAttribute.get(this, "disabled");
		}
		set disabled(value) {
			booleanAttribute.set(this, "disabled", value);
		}
		get href() {
			return stringAttribute.get(this, "href").trim();
		}
		set href(value) {
			stringAttribute.set(this, "href", value);
		}
		get hreflang() {
			return stringAttribute.get(this, "hreflang");
		}
		set hreflang(value) {
			stringAttribute.set(this, "hreflang", value);
		}
		get media() {
			return stringAttribute.get(this, "media");
		}
		set media(value) {
			stringAttribute.set(this, "media", value);
		}
		get rel() {
			return stringAttribute.get(this, "rel");
		}
		set rel(value) {
			stringAttribute.set(this, "rel", value);
		}
		get type() {
			return stringAttribute.get(this, "type");
		}
		set type(value) {
			stringAttribute.set(this, "type", value);
		}
	};
	registerHTMLClass(tagName13, HTMLLinkElement);
});

// node_modules/linkedom/esm/html/slot-element.js
var tagName14 = "slot",
	HTMLSlotElement;
var init_slot_element = __esm(() => {
	init_element3();
	init_register_html_class();
	HTMLSlotElement = class HTMLSlotElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName14) {
			super(ownerDocument, localName);
		}
		get name() {
			return this.getAttribute("name");
		}
		set name(value) {
			this.setAttribute("name", value);
		}
		assign() {}
		assignedNodes(options) {
			const isNamedSlot = !!this.name;
			const hostChildNodes = this.getRootNode().host?.childNodes ?? [];
			let slottables;
			if (isNamedSlot) {
				slottables = [...hostChildNodes].filter(
					(node2) => node2.slot === this.name,
				);
			} else {
				slottables = [...hostChildNodes].filter((node2) => !node2.slot);
			}
			if (options?.flatten) {
				const result = [];
				for (const slottable of slottables) {
					if (slottable.localName === "slot") {
						result.push(...slottable.assignedNodes({ flatten: true }));
					} else {
						result.push(slottable);
					}
				}
				slottables = result;
			}
			return slottables.length ? slottables : [...this.childNodes];
		}
		assignedElements(options) {
			const slottables = this.assignedNodes(options).filter(
				(n) => n.nodeType === 1,
			);
			return slottables.length ? slottables : [...this.children];
		}
	};
	registerHTMLClass(tagName14, HTMLSlotElement);
});

// node_modules/linkedom/esm/html/form-element.js
var HTMLFormElement;
var init_form_element = __esm(() => {
	init_element3();
	HTMLFormElement = class HTMLFormElement extends HTMLElement {
		constructor(ownerDocument, localName = "form") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/image-element.js
var tagName15 = "img",
	HTMLImageElement;
var init_image_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLImageElement = class HTMLImageElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName15) {
			super(ownerDocument, localName);
		}
		get alt() {
			return stringAttribute.get(this, "alt");
		}
		set alt(value) {
			stringAttribute.set(this, "alt", value);
		}
		get sizes() {
			return stringAttribute.get(this, "sizes");
		}
		set sizes(value) {
			stringAttribute.set(this, "sizes", value);
		}
		get src() {
			return stringAttribute.get(this, "src");
		}
		set src(value) {
			stringAttribute.set(this, "src", value);
		}
		get srcset() {
			return stringAttribute.get(this, "srcset");
		}
		set srcset(value) {
			stringAttribute.set(this, "srcset", value);
		}
		get title() {
			return stringAttribute.get(this, "title");
		}
		set title(value) {
			stringAttribute.set(this, "title", value);
		}
		get width() {
			return numericAttribute.get(this, "width");
		}
		set width(value) {
			numericAttribute.set(this, "width", value);
		}
		get height() {
			return numericAttribute.get(this, "height");
		}
		set height(value) {
			numericAttribute.set(this, "height", value);
		}
	};
	registerHTMLClass(tagName15, HTMLImageElement);
});

// node_modules/linkedom/esm/html/pre-element.js
var HTMLPreElement;
var init_pre_element = __esm(() => {
	init_element3();
	HTMLPreElement = class HTMLPreElement extends HTMLElement {
		constructor(ownerDocument, localName = "pre") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/u-list-element.js
var HTMLUListElement;
var init_u_list_element = __esm(() => {
	init_element3();
	HTMLUListElement = class HTMLUListElement extends HTMLElement {
		constructor(ownerDocument, localName = "ul") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/meta-element.js
var tagName16 = "meta",
	HTMLMetaElement;
var init_meta_element = __esm(() => {
	init_element3();
	init_register_html_class();
	init_attributes();
	HTMLMetaElement = class HTMLMetaElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName16) {
			super(ownerDocument, localName);
		}
		get name() {
			return stringAttribute.get(this, "name");
		}
		set name(value) {
			stringAttribute.set(this, "name", value);
		}
		get httpEquiv() {
			return stringAttribute.get(this, "http-equiv");
		}
		set httpEquiv(value) {
			stringAttribute.set(this, "http-equiv", value);
		}
		get content() {
			return stringAttribute.get(this, "content");
		}
		set content(value) {
			stringAttribute.set(this, "content", value);
		}
		get charset() {
			return stringAttribute.get(this, "charset");
		}
		set charset(value) {
			stringAttribute.set(this, "charset", value);
		}
		get media() {
			return stringAttribute.get(this, "media");
		}
		set media(value) {
			stringAttribute.set(this, "media", value);
		}
	};
	registerHTMLClass(tagName16, HTMLMetaElement);
});

// node_modules/linkedom/esm/html/picture-element.js
var HTMLPictureElement;
var init_picture_element = __esm(() => {
	init_element3();
	HTMLPictureElement = class HTMLPictureElement extends HTMLElement {
		constructor(ownerDocument, localName = "picture") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/area-element.js
var HTMLAreaElement;
var init_area_element = __esm(() => {
	init_element3();
	HTMLAreaElement = class HTMLAreaElement extends HTMLElement {
		constructor(ownerDocument, localName = "area") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/o-list-element.js
var HTMLOListElement;
var init_o_list_element = __esm(() => {
	init_element3();
	HTMLOListElement = class HTMLOListElement extends HTMLElement {
		constructor(ownerDocument, localName = "ol") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/table-caption-element.js
var HTMLTableCaptionElement;
var init_table_caption_element = __esm(() => {
	init_element3();
	HTMLTableCaptionElement = class HTMLTableCaptionElement extends HTMLElement {
		constructor(ownerDocument, localName = "caption") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/anchor-element.js
var tagName17 = "a",
	HTMLAnchorElement;
var init_anchor_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLAnchorElement = class HTMLAnchorElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName17) {
			super(ownerDocument, localName);
		}
		get href() {
			return encodeURI(decodeURI(stringAttribute.get(this, "href"))).trim();
		}
		set href(value) {
			stringAttribute.set(this, "href", decodeURI(value));
		}
		get download() {
			return encodeURI(decodeURI(stringAttribute.get(this, "download")));
		}
		set download(value) {
			stringAttribute.set(this, "download", decodeURI(value));
		}
		get target() {
			return stringAttribute.get(this, "target");
		}
		set target(value) {
			stringAttribute.set(this, "target", value);
		}
		get type() {
			return stringAttribute.get(this, "type");
		}
		set type(value) {
			stringAttribute.set(this, "type", value);
		}
		get rel() {
			return stringAttribute.get(this, "rel");
		}
		set rel(value) {
			stringAttribute.set(this, "rel", value);
		}
	};
	registerHTMLClass(tagName17, HTMLAnchorElement);
});

// node_modules/linkedom/esm/html/label-element.js
var HTMLLabelElement;
var init_label_element = __esm(() => {
	init_element3();
	HTMLLabelElement = class HTMLLabelElement extends HTMLElement {
		constructor(ownerDocument, localName = "label") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/unknown-element.js
var HTMLUnknownElement;
var init_unknown_element = __esm(() => {
	init_element3();
	HTMLUnknownElement = class HTMLUnknownElement extends HTMLElement {
		constructor(ownerDocument, localName = "unknown") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/mod-element.js
var HTMLModElement;
var init_mod_element = __esm(() => {
	init_element3();
	HTMLModElement = class HTMLModElement extends HTMLElement {
		constructor(ownerDocument, localName = "mod") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/details-element.js
var HTMLDetailsElement;
var init_details_element = __esm(() => {
	init_element3();
	HTMLDetailsElement = class HTMLDetailsElement extends HTMLElement {
		constructor(ownerDocument, localName = "details") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/source-element.js
var tagName18 = "source",
	HTMLSourceElement;
var init_source_element = __esm(() => {
	init_register_html_class();
	init_attributes();
	init_element3();
	HTMLSourceElement = class HTMLSourceElement extends HTMLElement {
		constructor(ownerDocument, localName = tagName18) {
			super(ownerDocument, localName);
		}
		get src() {
			return stringAttribute.get(this, "src");
		}
		set src(value) {
			stringAttribute.set(this, "src", value);
		}
		get srcset() {
			return stringAttribute.get(this, "srcset");
		}
		set srcset(value) {
			stringAttribute.set(this, "srcset", value);
		}
		get sizes() {
			return stringAttribute.get(this, "sizes");
		}
		set sizes(value) {
			stringAttribute.set(this, "sizes", value);
		}
		get type() {
			return stringAttribute.get(this, "type");
		}
		set type(value) {
			stringAttribute.set(this, "type", value);
		}
	};
	registerHTMLClass(tagName18, HTMLSourceElement);
});

// node_modules/linkedom/esm/html/track-element.js
var HTMLTrackElement;
var init_track_element = __esm(() => {
	init_element3();
	HTMLTrackElement = class HTMLTrackElement extends HTMLElement {
		constructor(ownerDocument, localName = "track") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/html/marquee-element.js
var HTMLMarqueeElement;
var init_marquee_element = __esm(() => {
	init_element3();
	HTMLMarqueeElement = class HTMLMarqueeElement extends HTMLElement {
		constructor(ownerDocument, localName = "marquee") {
			super(ownerDocument, localName);
		}
	};
});

// node_modules/linkedom/esm/shared/html-classes.js
var HTMLClasses;
var init_html_classes = __esm(() => {
	init_element3();
	init_template_element();
	init_html_element();
	init_script_element();
	init_frame_element();
	init_i_frame_element();
	init_object_element();
	init_head_element();
	init_body_element();
	init_style_element();
	init_time_element();
	init_field_set_element();
	init_embed_element();
	init_hr_element();
	init_progress_element();
	init_paragraph_element();
	init_table_element();
	init_frame_set_element();
	init_li_element();
	init_base_element();
	init_data_list_element();
	init_input_element();
	init_param_element();
	init_media_element();
	init_audio_element();
	init_heading_element();
	init_directory_element();
	init_quote_element();
	init_canvas_element();
	init_legend_element();
	init_option_element();
	init_span_element();
	init_meter_element();
	init_video_element();
	init_table_cell_element();
	init_title_element();
	init_output_element();
	init_table_row_element();
	init_data_element();
	init_menu_element();
	init_select_element();
	init_br_element();
	init_button_element();
	init_map_element();
	init_opt_group_element();
	init_d_list_element();
	init_text_area_element();
	init_font_element();
	init_div_element();
	init_link_element();
	init_slot_element();
	init_form_element();
	init_image_element();
	init_pre_element();
	init_u_list_element();
	init_meta_element();
	init_picture_element();
	init_area_element();
	init_o_list_element();
	init_table_caption_element();
	init_anchor_element();
	init_label_element();
	init_unknown_element();
	init_mod_element();
	init_details_element();
	init_source_element();
	init_track_element();
	init_marquee_element();
	HTMLClasses = {
		HTMLElement,
		HTMLTemplateElement,
		HTMLHtmlElement,
		HTMLScriptElement,
		HTMLFrameElement,
		HTMLIFrameElement,
		HTMLObjectElement,
		HTMLHeadElement,
		HTMLBodyElement,
		HTMLStyleElement,
		HTMLTimeElement,
		HTMLFieldSetElement,
		HTMLEmbedElement,
		HTMLHRElement,
		HTMLProgressElement,
		HTMLParagraphElement,
		HTMLTableElement,
		HTMLFrameSetElement,
		HTMLLIElement,
		HTMLBaseElement,
		HTMLDataListElement,
		HTMLInputElement,
		HTMLParamElement,
		HTMLMediaElement,
		HTMLAudioElement,
		HTMLHeadingElement,
		HTMLDirectoryElement,
		HTMLQuoteElement,
		HTMLCanvasElement,
		HTMLLegendElement,
		HTMLOptionElement,
		HTMLSpanElement,
		HTMLMeterElement,
		HTMLVideoElement,
		HTMLTableCellElement,
		HTMLTitleElement,
		HTMLOutputElement,
		HTMLTableRowElement,
		HTMLDataElement,
		HTMLMenuElement,
		HTMLSelectElement,
		HTMLBRElement,
		HTMLButtonElement,
		HTMLMapElement,
		HTMLOptGroupElement,
		HTMLDListElement,
		HTMLTextAreaElement,
		HTMLFontElement,
		HTMLDivElement,
		HTMLLinkElement,
		HTMLSlotElement,
		HTMLFormElement,
		HTMLImageElement,
		HTMLPreElement,
		HTMLUListElement,
		HTMLMetaElement,
		HTMLPictureElement,
		HTMLAreaElement,
		HTMLOListElement,
		HTMLTableCaptionElement,
		HTMLAnchorElement,
		HTMLLabelElement,
		HTMLUnknownElement,
		HTMLModElement,
		HTMLDetailsElement,
		HTMLSourceElement,
		HTMLTrackElement,
		HTMLMarqueeElement,
	};
});

// node_modules/linkedom/esm/shared/mime.js
var voidElements2, Mime;
var init_mime = __esm(() => {
	voidElements2 = { test: () => true };
	Mime = {
		"text/html": {
			docType: "<!DOCTYPE html>",
			ignoreCase: true,
			voidElements:
				/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,
		},
		"image/svg+xml": {
			docType: '<?xml version="1.0" encoding="utf-8"?>',
			ignoreCase: false,
			voidElements: voidElements2,
		},
		"text/xml": {
			docType: '<?xml version="1.0" encoding="utf-8"?>',
			ignoreCase: false,
			voidElements: voidElements2,
		},
		"application/xml": {
			docType: '<?xml version="1.0" encoding="utf-8"?>',
			ignoreCase: false,
			voidElements: voidElements2,
		},
		"application/xhtml+xml": {
			docType: '<?xml version="1.0" encoding="utf-8"?>',
			ignoreCase: false,
			voidElements: voidElements2,
		},
	};
});

// node_modules/linkedom/esm/interface/custom-event.js
var CustomEvent;
var init_custom_event = __esm(() => {
	init_event();
	CustomEvent = class CustomEvent extends GlobalEvent {
		constructor(type, eventInitDict = {}) {
			super(type, eventInitDict);
			this.detail = eventInitDict.detail;
		}
	};
});

// node_modules/linkedom/esm/interface/input-event.js
var InputEvent;
var init_input_event = __esm(() => {
	init_event();
	InputEvent = class InputEvent extends GlobalEvent {
		constructor(type, inputEventInit = {}) {
			super(type, inputEventInit);
			this.inputType = inputEventInit.inputType;
			this.data = inputEventInit.data;
			this.dataTransfer = inputEventInit.dataTransfer;
			this.isComposing = inputEventInit.isComposing || false;
			this.ranges = inputEventInit.ranges;
		}
	};
});

// node_modules/linkedom/esm/interface/image.js
var ImageClass = (ownerDocument) =>
	class Image extends HTMLImageElement {
		constructor(width, height) {
			super(ownerDocument);
			switch (arguments.length) {
				case 1:
					this.height = width;
					this.width = width;
					break;
				case 2:
					this.height = height;
					this.width = width;
					break;
			}
		}
	};
var init_image = __esm(() => {
	init_image_element();
});

// node_modules/linkedom/esm/interface/range.js
class Range {
	constructor() {
		this[START] = null;
		this[END] = null;
		this.commonAncestorContainer = null;
	}
	insertNode(newNode) {
		this[END].parentNode.insertBefore(newNode, this[START]);
	}
	selectNode(node2) {
		this[START] = node2;
		this[END] = getEnd(node2);
	}
	selectNodeContents(node2) {
		this.selectNode(node2);
		this.commonAncestorContainer = node2;
	}
	surroundContents(parentNode) {
		parentNode.replaceChildren(this.extractContents());
	}
	setStartBefore(node2) {
		this[START] = node2;
	}
	setStartAfter(node2) {
		this[START] = node2.nextSibling;
	}
	setEndBefore(node2) {
		this[END] = getEnd(node2.previousSibling);
	}
	setEndAfter(node2) {
		this[END] = getEnd(node2);
	}
	cloneContents() {
		let { [START]: start, [END]: end } = this;
		const fragment = start.ownerDocument.createDocumentFragment();
		while (start !== end) {
			fragment.insertBefore(start.cloneNode(true), fragment[END]);
			start = getEnd(start);
			if (start !== end) start = start[NEXT];
		}
		return fragment;
	}
	deleteContents() {
		deleteContents(this);
	}
	extractContents() {
		const fragment = this[START].ownerDocument.createDocumentFragment();
		deleteContents(this, fragment);
		return fragment;
	}
	createContextualFragment(html) {
		const { commonAncestorContainer: doc } = this;
		const isSVG = "ownerSVGElement" in doc;
		const document = isSVG ? doc.ownerDocument : doc;
		let content = htmlToFragment(document, html);
		if (isSVG) {
			const childNodes = [...content.childNodes];
			content = document.createDocumentFragment();
			Object.setPrototypeOf(content, SVGElement.prototype);
			content.ownerSVGElement = document;
			for (const child of childNodes) {
				Object.setPrototypeOf(child, SVGElement.prototype);
				child.ownerSVGElement = document;
				content.appendChild(child);
			}
		} else this.selectNode(content);
		return content;
	}
	cloneRange() {
		const range = new Range();
		range[START] = this[START];
		range[END] = this[END];
		return range;
	}
}
var deleteContents = ({ [START]: start, [END]: end }, fragment = null) => {
	setAdjacent(start[PREV], end[NEXT]);
	do {
		const after2 = getEnd(start);
		const next = after2 === end ? after2 : after2[NEXT];
		if (fragment) fragment.insertBefore(start, fragment[END]);
		else start.remove();
		start = next;
	} while (start !== end);
};
var init_range = __esm(() => {
	init_symbols();
	init_element2();
	init_utils();
});

// node_modules/linkedom/esm/interface/tree-walker.js
class TreeWalker {
	constructor(root, whatToShow = SHOW_ALL) {
		this.root = root;
		this.currentNode = root;
		this.whatToShow = whatToShow;
		let { [NEXT]: next, [END]: end } = root;
		if (root.nodeType === DOCUMENT_NODE) {
			const { documentElement } = root;
			next = documentElement;
			end = documentElement[END];
		}
		const nodes = [];
		while (next && next !== end) {
			if (isOK(next, whatToShow)) nodes.push(next);
			next = next[NEXT];
		}
		this[PRIVATE] = { i: 0, nodes };
	}
	nextNode() {
		const $ = this[PRIVATE];
		this.currentNode = $.i < $.nodes.length ? $.nodes[$.i++] : null;
		return this.currentNode;
	}
}
var isOK = ({ nodeType }, mask) => {
	switch (nodeType) {
		case ELEMENT_NODE:
			return mask & SHOW_ELEMENT;
		case TEXT_NODE:
			return mask & SHOW_TEXT;
		case COMMENT_NODE:
			return mask & SHOW_COMMENT;
		case CDATA_SECTION_NODE:
			return mask & SHOW_CDATA_SECTION;
	}
	return 0;
};
var init_tree_walker = __esm(() => {
	init_constants();
	init_symbols();
});

// node_modules/linkedom/esm/interface/document.js
var query = (method, ownerDocument, selectors) => {
		const { [NEXT]: next, [END]: end } = ownerDocument;
		return method.call({ ownerDocument, [NEXT]: next, [END]: end }, selectors);
	},
	globalExports,
	window,
	Document2;
var init_document = __esm(() => {
	init_constants();
	init_symbols();
	init_facades();
	init_html_classes();
	init_mime();
	init_utils();
	init_object();
	init_non_element_parent_node();
	init_element2();
	init_attr();
	init_cdata_section();
	init_comment();
	init_custom_element_registry();
	init_custom_event();
	init_document_fragment();
	init_document_type();
	init_element();
	init_event();
	init_event_target();
	init_input_event();
	init_image();
	init_mutation_observer();
	init_named_node_map();
	init_node_list();
	init_range();
	init_text();
	init_tree_walker();
	globalExports = assign({}, Facades, HTMLClasses, {
		CustomEvent,
		Event: GlobalEvent,
		EventTarget: DOMEventTarget,
		InputEvent,
		NamedNodeMap,
		NodeList,
	});
	window = new WeakMap();
	Document2 = class Document2 extends NonElementParentNode {
		constructor(type) {
			super(null, "#document", DOCUMENT_NODE);
			this[CUSTOM_ELEMENTS] = { active: false, registry: null };
			this[MUTATION_OBSERVER] = { active: false, class: null };
			this[MIME] = Mime[type];
			this[DOCTYPE] = null;
			this[DOM_PARSER] = null;
			this[GLOBALS] = null;
			this[IMAGE] = null;
			this[UPGRADE] = null;
		}
		get defaultView() {
			if (!window.has(this))
				window.set(
					this,
					new Proxy(globalThis, {
						set: (target, name, value) => {
							switch (name) {
								case "addEventListener":
								case "removeEventListener":
								case "dispatchEvent":
									this[EVENT_TARGET][name] = value;
									break;
								default:
									target[name] = value;
									break;
							}
							return true;
						},
						get: (globalThis2, name) => {
							switch (name) {
								case "addEventListener":
								case "removeEventListener":
								case "dispatchEvent":
									if (!this[EVENT_TARGET]) {
										const et = (this[EVENT_TARGET] = new DOMEventTarget());
										et.dispatchEvent = et.dispatchEvent.bind(et);
										et.addEventListener = et.addEventListener.bind(et);
										et.removeEventListener = et.removeEventListener.bind(et);
									}
									return this[EVENT_TARGET][name];
								case "document":
									return this;
								case "navigator":
									return {
										userAgent:
											"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
									};
								case "window":
									return window.get(this);
								case "customElements":
									if (!this[CUSTOM_ELEMENTS].registry)
										this[CUSTOM_ELEMENTS] = new CustomElementRegistry(this);
									return this[CUSTOM_ELEMENTS];
								case "performance":
									return globalThis2.performance;
								case "DOMParser":
									return this[DOM_PARSER];
								case "Image":
									if (!this[IMAGE]) this[IMAGE] = ImageClass(this);
									return this[IMAGE];
								case "MutationObserver":
									if (!this[MUTATION_OBSERVER].class)
										this[MUTATION_OBSERVER] = new MutationObserverClass(this);
									return this[MUTATION_OBSERVER].class;
							}
							return (
								this[GLOBALS]?.[name] ||
								globalExports[name] ||
								globalThis2[name]
							);
						},
					}),
				);
			return window.get(this);
		}
		get doctype() {
			const docType = this[DOCTYPE];
			if (docType) return docType;
			const { firstChild } = this;
			if (firstChild && firstChild.nodeType === DOCUMENT_TYPE_NODE)
				return (this[DOCTYPE] = firstChild);
			return null;
		}
		set doctype(value) {
			if (
				/^([a-z:]+)(\s+system|\s+public(\s+"([^"]+)")?)?(\s+"([^"]+)")?/i.test(
					value,
				)
			) {
				const { $1: name, $4: publicId, $6: systemId } = RegExp;
				this[DOCTYPE] = new DocumentType(this, name, publicId, systemId);
				knownSiblings(this, this[DOCTYPE], this[NEXT]);
			}
		}
		get documentElement() {
			return this.firstElementChild;
		}
		get isConnected() {
			return true;
		}
		_getParent() {
			return this[EVENT_TARGET];
		}
		createAttribute(name) {
			return new Attr(this, name);
		}
		createCDATASection(data) {
			return new CDATASection(this, data);
		}
		createComment(textContent2) {
			return new Comment3(this, textContent2);
		}
		createDocumentFragment() {
			return new DocumentFragment(this);
		}
		createDocumentType(name, publicId, systemId) {
			return new DocumentType(this, name, publicId, systemId);
		}
		createElement(localName) {
			return new Element2(this, localName);
		}
		createRange() {
			const range = new Range();
			range.commonAncestorContainer = this;
			return range;
		}
		createTextNode(textContent2) {
			return new Text3(this, textContent2);
		}
		createTreeWalker(root, whatToShow = -1) {
			return new TreeWalker(root, whatToShow);
		}
		createNodeIterator(root, whatToShow = -1) {
			return this.createTreeWalker(root, whatToShow);
		}
		createEvent(name) {
			const event = create(
				name === "Event" ? new GlobalEvent("") : new CustomEvent(""),
			);
			event.initEvent = event.initCustomEvent = (
				type,
				canBubble = false,
				cancelable = false,
				detail,
			) => {
				event.bubbles = !!canBubble;
				defineProperties(event, {
					type: { value: type },
					canBubble: { value: canBubble },
					cancelable: { value: cancelable },
					detail: { value: detail },
				});
			};
			return event;
		}
		cloneNode(deep = false) {
			const {
				constructor,
				[CUSTOM_ELEMENTS]: customElements2,
				[DOCTYPE]: doctype,
			} = this;
			const document = new constructor();
			document[CUSTOM_ELEMENTS] = customElements2;
			if (deep) {
				const end = document[END];
				const { childNodes } = this;
				for (let { length } = childNodes, i = 0; i < length; i++)
					document.insertBefore(childNodes[i].cloneNode(true), end);
				if (doctype) document[DOCTYPE] = childNodes[0];
			}
			return document;
		}
		importNode(externalNode) {
			const deep = 1 < arguments.length && !!arguments[1];
			const node2 = externalNode.cloneNode(deep);
			const { [CUSTOM_ELEMENTS]: customElements2 } = this;
			const { active } = customElements2;
			const upgrade = (element) => {
				const { ownerDocument, nodeType } = element;
				element.ownerDocument = this;
				if (active && ownerDocument !== this && nodeType === ELEMENT_NODE)
					customElements2.upgrade(element);
			};
			upgrade(node2);
			if (deep) {
				switch (node2.nodeType) {
					case ELEMENT_NODE:
					case DOCUMENT_FRAGMENT_NODE: {
						let { [NEXT]: next, [END]: end } = node2;
						while (next !== end) {
							if (next.nodeType === ELEMENT_NODE) upgrade(next);
							next = next[NEXT];
						}
						break;
					}
				}
			}
			return node2;
		}
		toString() {
			return this.childNodes.join("");
		}
		querySelector(selectors) {
			return query(super.querySelector, this, selectors);
		}
		querySelectorAll(selectors) {
			return query(super.querySelectorAll, this, selectors);
		}
		getElementsByTagNameNS(_, name) {
			return this.getElementsByTagName(name);
		}
		createAttributeNS(_, name) {
			return this.createAttribute(name);
		}
		createElementNS(nsp, localName, options) {
			return nsp === SVG_NAMESPACE
				? new SVGElement(this, localName, null)
				: this.createElement(localName, options);
		}
	};
	setPrototypeOf(
		(globalExports.Document = function Document3() {
			illegalConstructor();
		}),
		Document2,
	).prototype = Document2.prototype;
});

// node_modules/linkedom/esm/html/document.js
var createHTMLElement = (ownerDocument, builtin, localName, options) => {
		if (!builtin && htmlClasses.has(localName)) {
			const Class = htmlClasses.get(localName);
			return new Class(ownerDocument, localName);
		}
		const {
			[CUSTOM_ELEMENTS]: { active, registry },
		} = ownerDocument;
		if (active) {
			const ce = builtin ? options.is : localName;
			if (registry.has(ce)) {
				const { Class } = registry.get(ce);
				const element = new Class(ownerDocument, localName);
				customElements.set(element, { connected: false });
				return element;
			}
		}
		return new HTMLElement(ownerDocument, localName);
	},
	HTMLDocument;
var init_document2 = __esm(() => {
	init_constants();
	init_symbols();
	init_register_html_class();
	init_document();
	init_node_list();
	init_custom_element_registry();
	init_element3();
	HTMLDocument = class HTMLDocument extends Document2 {
		constructor() {
			super("text/html");
		}
		get all() {
			const nodeList = new NodeList();
			let { [NEXT]: next, [END]: end } = this;
			while (next !== end) {
				switch (next.nodeType) {
					case ELEMENT_NODE:
						nodeList.push(next);
						break;
				}
				next = next[NEXT];
			}
			return nodeList;
		}
		get head() {
			const { documentElement } = this;
			let { firstElementChild } = documentElement;
			if (!firstElementChild || firstElementChild.tagName !== "HEAD") {
				firstElementChild = this.createElement("head");
				documentElement.prepend(firstElementChild);
			}
			return firstElementChild;
		}
		get body() {
			const { head } = this;
			let { nextElementSibling: nextElementSibling3 } = head;
			if (!nextElementSibling3 || nextElementSibling3.tagName !== "BODY") {
				nextElementSibling3 = this.createElement("body");
				head.after(nextElementSibling3);
			}
			return nextElementSibling3;
		}
		get title() {
			const { head } = this;
			return head.getElementsByTagName("title").at(0)?.textContent || "";
		}
		set title(textContent2) {
			const { head } = this;
			const title = head.getElementsByTagName("title").at(0);
			if (title) title.textContent = textContent2;
			else {
				head.insertBefore(
					this.createElement("title"),
					head.firstChild,
				).textContent = textContent2;
			}
		}
		createElement(localName, options) {
			const builtin = !!options?.is;
			const element = createHTMLElement(this, builtin, localName, options);
			if (builtin) element.setAttribute("is", options.is);
			return element;
		}
	};
});

// node_modules/linkedom/esm/svg/document.js
var SVGDocument;
var init_document3 = __esm(() => {
	init_symbols();
	init_document();
	SVGDocument = class SVGDocument extends Document2 {
		constructor() {
			super("image/svg+xml");
		}
		toString() {
			return this[MIME].docType + super.toString();
		}
	};
});

// node_modules/linkedom/esm/xml/document.js
var XMLDocument;
var init_document4 = __esm(() => {
	init_symbols();
	init_document();
	XMLDocument = class XMLDocument extends Document2 {
		constructor() {
			super("text/xml");
		}
		toString() {
			return this[MIME].docType + super.toString();
		}
	};
});

// node_modules/linkedom/esm/dom/parser.js
class DOMParser {
	parseFromString(markupLanguage, mimeType, globals = null) {
		let isHTML = false,
			document;
		if (mimeType === "text/html") {
			isHTML = true;
			document = new HTMLDocument();
		} else if (mimeType === "image/svg+xml") document = new SVGDocument();
		else document = new XMLDocument();
		document[DOM_PARSER] = DOMParser;
		if (globals) document[GLOBALS] = globals;
		if (isHTML && markupLanguage === "...")
			markupLanguage = "<!doctype html><html><head></head><body></body></html>";
		return markupLanguage
			? parseFromString(document, isHTML, markupLanguage)
			: document;
	}
}
var init_parser = __esm(() => {
	init_symbols();
	init_parse_from_string();
	init_document2();
	init_document3();
	init_document4();
});

// node_modules/linkedom/esm/shared/parse-json.js
var init_parse_json = __esm(() => {
	init_constants();
	init_symbols();
	init_register_html_class();
	init_utils();
	init_attr();
	init_cdata_section();
	init_comment();
	init_document_type();
	init_text();
	init_document2();
	init_element3();
	init_element2();
});

// node_modules/linkedom/esm/interface/node-filter.js
var init_node_filter = __esm(() => {
	init_constants();
});

// node_modules/linkedom/esm/index.js
function Document4() {
	illegalConstructor();
}
var parseHTML = (html, globals = null) =>
	new DOMParser().parseFromString(html, "text/html", globals).defaultView;
var init_esm9 = __esm(() => {
	init_parser();
	init_document();
	init_facades();
	init_object();
	init_parse_json();
	init_custom_event();
	init_event();
	init_event_target();
	init_input_event();
	init_node_list();
	init_node_filter();
	init_facades();
	init_html_classes();
	setPrototypeOf(Document4, Document2).prototype = Document2.prototype;
});

// src/prebuild/plugins/audit-accessibility.js
var audit_accessibility_default;
var init_audit_accessibility = __esm(() => {
	init_esm9();
	audit_accessibility_default = {
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
			if (rules["img-alt"] !== false) {
				for (const _img of doc.querySelectorAll("img:not([alt])")) {
					violations.push(`[img-alt] <img> missing alt attribute in ${label}`);
				}
			}
			if (rules["link-name"] !== false) {
				for (const a of doc.querySelectorAll("a[href]")) {
					const text = (a.textContent || "").trim();
					if (
						!text &&
						!a.getAttribute("aria-label") &&
						!a.getAttribute("aria-labelledby")
					) {
						violations.push(
							`[link-name] <a> has no accessible name in ${label}`,
						);
					}
				}
			}
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
			if (rules["heading-order"] !== false) {
				const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
					(h) => parseInt(h.tagName.slice(1), 10),
				);
				let prev = 0;
				for (const level of headings) {
					if (level > prev + 1 && prev !== 0) {
						violations.push(
							`[heading-order] heading level skipped (h${prev}\u2192h${level}) in ${label}`,
						);
					}
					prev = level;
				}
			}
			if (rules["html-lang"] !== false) {
				const htmlEl = doc.documentElement || doc.querySelector("html");
				if (htmlEl && !htmlEl.getAttribute("lang")) {
					violations.push(
						`[html-lang] <html> missing lang attribute in ${label}`,
					);
				}
			}
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
			if (rules.list !== false) {
				const ALLOWED = new Set(["li", "script", "template"]);
				for (const list of doc.querySelectorAll("ul, ol, menu")) {
					if (list.closest("template")) continue;
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
			if (rules.listitem !== false) {
				const LIST_PARENTS = new Set(["ul", "ol", "menu"]);
				for (const li of doc.querySelectorAll("li")) {
					if (li.closest("template")) continue;
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
					process.stderr.write(`[audit-accessibility] ${v}
`);
				}
				if (failOnError) {
					throw new Error(
						`audit-accessibility: ${violations.length} violation(s) found`,
					);
				}
			}
			return html;
		},
	};
});

// src/prebuild/plugins/audit-meta-tags.js
var audit_meta_tags_default;
var init_audit_meta_tags = __esm(() => {
	init_esm9();
	audit_meta_tags_default = {
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
			if (!head.querySelector("title")) {
				issues.push(`missing <title> in ${filePath || "unknown"}`);
			}
			if (!head.querySelector('meta[name="description"]')) {
				issues.push(
					`missing <meta name="description"> in ${filePath || "unknown"}`,
				);
			}
			const htmlEl = doc.documentElement || doc.querySelector("html");
			if (htmlEl && !htmlEl.getAttribute("lang")) {
				issues.push(
					`missing lang attribute on <html> in ${filePath || "unknown"}`,
				);
			}
			if (issues.length > 0 && failOnError) {
				throw new Error(`audit-meta-tags: ${issues.join("; ")}`);
			}
			if (issues.length > 0 && typeof process !== "undefined") {
				for (const issue of issues) {
					process.stderr.write(`[audit-meta-tags] warn: ${issue}
`);
				}
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/compile-templates.js
import { createHash } from "node:crypto";

var compile_templates_default;
var init_compile_templates = __esm(() => {
	init_esm9();
	compile_templates_default = {
		name: "compile-templates",
		description:
			"Extract loop fragments into <template> for faster DOM cloning",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const body = doc.body;
			if (!body) return html;
			const loopElements = doc.querySelectorAll("[for]");
			if (loopElements.length === 0) return html;
			const templatesContainer = doc.createElement("div");
			templatesContainer.style.display = "none";
			templatesContainer.setAttribute("data-nojs-templates", "");
			const addedTemplates = new Set();
			let hasTemplates = false;
			for (const el of loopElements) {
				const innerHTML = el.innerHTML.trim();
				if (!innerHTML) continue;
				const hash = createHash("md5")
					.update(innerHTML)
					.digest("hex")
					.slice(0, 8);
				const templateId = `nt-${hash}`;
				if (!addedTemplates.has(templateId)) {
					const template = doc.createElement("template");
					template.id = templateId;
					template.innerHTML = innerHTML;
					templatesContainer.appendChild(template);
					addedTemplates.add(templateId);
					hasTemplates = true;
				}
				el.setAttribute("data-nojs-template", templateId);
				el.innerHTML = "";
			}
			if (hasTemplates) {
				body.appendChild(templatesContainer);
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/differential-serving.js
import {
	readFile as readFile2,
	writeFile as writeFile3,
} from "node:fs/promises";
import { extname, join as join3 } from "node:path";

var differential_serving_default;
var init_differential_serving = __esm(() => {
	init_esm9();
	differential_serving_default = {
		name: "differential-serving",
		description:
			"Generate modern and legacy bundles and update HTML to use module/nomodule pattern",
		async finalize({ outputDir, processedFiles }) {
			for (const htmlPath of processedFiles) {
				const html = await readFile2(htmlPath, "utf-8");
				const { document: doc } = parseHTML(html);
				const scripts = doc.querySelectorAll("script[src]");
				let changed = false;
				for (const script of scripts) {
					const src = script.getAttribute("src");
					if (!src || src.startsWith("http") || src.startsWith("//")) continue;
					if (
						script.getAttribute("type") === "module" ||
						script.hasAttribute("nomodule")
					)
						continue;
					const ext = extname(src);
					const base = src.slice(0, -ext.length);
					const legacySrc = `${base}.legacy${ext}`;
					const inputPath = join3(outputDir, src);
					const _outputPath = join3(outputDir, legacySrc);
					try {
						await Bun.build({
							entrypoints: [inputPath],
							outdir: outputDir,
							naming: "[dir]/[name].legacy.[ext]",
							minify: true,
							target: "browser",
						});
						script.setAttribute("type", "module");
						const nomoduleScript = doc.createElement("script");
						nomoduleScript.setAttribute("src", legacySrc);
						nomoduleScript.setAttribute("nomodule", "");
						nomoduleScript.setAttribute("defer", "");
						script.parentNode.insertBefore(nomoduleScript, script.nextSibling);
						changed = true;
					} catch (err) {
						console.error(
							`[differential-serving] Failed to build legacy bundle for ${src}:`,
							err,
						);
					}
				}
				if (changed) {
					await writeFile3(htmlPath, doc.toString(), "utf-8");
				}
			}
			console.log(
				`[differential-serving] Module/nomodule pattern applied to ${processedFiles.length} files`,
			);
		},
	};
});

// src/prebuild/plugins/enforce-script-loading.js
function isThirdParty(src) {
	return (
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("//")
	);
}
var enforce_script_loading_default;
var init_enforce_script_loading = __esm(() => {
	init_esm9();
	enforce_script_loading_default = {
		name: "enforce-script-loading",
		description:
			"Add defer/async to third-party scripts to prevent render-blocking.",
		async process(html, { config }) {
			const opts = config || {};
			const strategy = opts.strategy === "async" ? "async" : "defer";
			const allowList = new Set(opts.allowList || []);
			const { document: doc } = parseHTML(html);
			let changed = false;
			for (const script of doc.querySelectorAll("script[src]")) {
				const src = script.getAttribute("src") || "";
				if (!isThirdParty(src)) continue;
				if (script.getAttribute("type") === "module") continue;
				if (script.hasAttribute("defer") || script.hasAttribute("async"))
					continue;
				try {
					const origin = new URL(src.startsWith("//") ? `https:${src}` : src)
						.hostname;
					if (allowList.has(origin)) continue;
				} catch {
					continue;
				}
				script.setAttribute(strategy, "");
				changed = true;
			}
			return changed ? doc.toString() : html;
		},
	};
});

import { createHash as createHash2 } from "node:crypto";
// src/prebuild/plugins/fingerprint-assets.js
import {
	readdir,
	readFile as readFile3,
	rename,
	writeFile as writeFile4,
} from "node:fs/promises";
import {
	basename as basename3,
	dirname as dirname2,
	extname as extname2,
	join as join4,
} from "node:path";

async function getFilesRecursively(dir) {
	const entries2 = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries2.map((res) => {
			const resPath = join4(dir, res.name);
			return res.isDirectory() ? getFilesRecursively(resPath) : resPath;
		}),
	);
	return files.flat();
}
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var fingerprint_assets_default;
var init_fingerprint_assets = __esm(() => {
	fingerprint_assets_default = {
		name: "fingerprint-assets",
		description:
			"Add content hashes to JS and CSS files for cache busting and update HTML references",
		async finalize({ outputDir, processedFiles }) {
			const allFiles = await getFilesRecursively(outputDir);
			const assets = allFiles.filter(
				(f) =>
					(f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".css")) &&
					!f.includes(".bundle-report.html"),
			);
			const map = new Map();
			for (const assetPath of assets) {
				const content = await readFile3(assetPath);
				const hash = createHash2("sha1")
					.update(content)
					.digest("hex")
					.slice(0, 8);
				const ext = extname2(assetPath);
				const base = basename3(assetPath, ext);
				const dir = dirname2(assetPath);
				if (base.match(/\.[a-f0-9]{8}$/)) continue;
				const newBase = `${base}.${hash}${ext}`;
				const newPath = join4(dir, newBase);
				await rename(assetPath, newPath);
				const oldName = basename3(assetPath);
				const newName = newBase;
				map.set(oldName, newName);
			}
			if (map.size === 0) return;
			for (const htmlPath of processedFiles) {
				let html = await readFile3(htmlPath, "utf-8");
				let changed = false;
				for (const [oldName, newName] of map) {
					const re = new RegExp(
						`(["'\\/])${escapeRegExp(oldName)}(?=["'\\?#])`,
						"g",
					);
					const updated = html.replace(re, `$1${newName}`);
					if (updated !== html) {
						html = updated;
						changed = true;
					}
				}
				if (changed) {
					await writeFile4(htmlPath, html, "utf-8");
				}
			}
			const headersPath = join4(outputDir, "_headers");
			try {
				let headers = await readFile3(headersPath, "utf-8");
				let changed = false;
				for (const [oldName, newName] of map) {
					const re = new RegExp(
						`(\\/|<)${escapeRegExp(oldName)}(?=[\\s>])`,
						"g",
					);
					const updated = headers.replace(re, `$1${newName}`);
					if (updated !== headers) {
						headers = updated;
						changed = true;
					}
				}
				if (changed) {
					await writeFile4(headersPath, headers, "utf-8");
				}
			} catch {}
			console.log(`[fingerprint-assets] Fingerprinted ${map.size} assets`);
		},
	};
});

// src/prebuild/plugins/generate-bundle-report.js
import {
	readdir as readdir2,
	stat,
	writeFile as writeFile5,
} from "node:fs/promises";
import { join as join5, relative as relative3 } from "node:path";

async function getFilesRecursively2(dir) {
	const entries2 = await readdir2(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries2.map((res) => {
			const resPath = join5(dir, res.name);
			return res.isDirectory() ? getFilesRecursively2(resPath) : resPath;
		}),
	);
	return files.flat();
}
function getFileType(f) {
	if (f.endsWith(".js") || f.endsWith(".mjs")) return "JS";
	if (f.endsWith(".css")) return "CSS";
	if (f.endsWith(".html")) return "HTML";
	return "Other";
}
function formatBytes(bytes) {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
function generateHtml(data, totalSize) {
	const rows = data
		.map(
			(d) => `
        <tr>
            <td>${d.path}</td>
            <td><span class="badge ${d.type.toLowerCase()}">${d.type}</span></td>
            <td>${formatBytes(d.size)}</td>
            <td>${((d.size / (totalSize || 1)) * 100).toFixed(2)}%</td>
        </tr>
    `,
		)
		.join("");
	const blocks = data
		.filter((d) => d.size > 0)
		.map(
			(d) => `
        <div class="block ${d.type.toLowerCase()}" style="flex-grow: ${d.size}; flex-basis: ${(d.size / (totalSize || 1)) * 100}%;" title="${d.path}: ${formatBytes(d.size)}">
            <span class="label">${d.path.split("/").pop()}</span>
        </div>
    `,
		)
		.join("");
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No.JS Bundle Analysis Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; line-height: 1.5; background: #fdfdfd; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-top: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .card { background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .card h2 { margin: 0; font-size: 0.875rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
        .card p { margin: 0.5rem 0 0; font-size: 1.5rem; font-weight: bold; }
        
        .treemap { display: flex; flex-wrap: wrap; gap: 4px; height: 120px; margin-bottom: 2rem; border-radius: 8px; overflow: hidden; background: #eee; }
        .block { display: flex; align-items: center; justify-content: center; overflow: hidden; color: white; padding: 4px; text-align: center; transition: opacity 0.2s; cursor: help; }
        .block:hover { opacity: 0.9; }
        .block.js { background: #f7df1e; color: black; }
        .block.css { background: #264de4; }
        .block.html { background: #e34c26; }
        .block.other { background: #666; }
        .label { font-size: 10px; font-weight: bold; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; padding: 0 4px; }
        
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
        th, td { text-align: left; padding: 1rem; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; font-size: 0.875rem; color: #666; }
        tr:last-child td { border-bottom: none; }
        
        .badge { font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .badge.js { background: #fef9c3; color: #854d0e; }
        .badge.css { background: #dbeafe; color: #1e40af; }
        .badge.html { background: #fee2e2; color: #991b1b; }
        .badge.other { background: #f3f4f6; color: #374151; }
        
        @media (max-width: 600px) {
            body { padding: 1rem; }
            .summary { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <h1>No.JS Bundle Analysis</h1>
    
    <div class="summary">
        <div class="card">
            <h2>Total Size</h2>
            <p>${formatBytes(totalSize)}</p>
        </div>
        <div class="card">
            <h2>Total Files</h2>
            <p>${data.length}</p>
        </div>
    </div>

    <div class="treemap">
        ${blocks}
    </div>

    <table>
        <thead>
            <tr>
                <th>File Path</th>
                <th>Type</th>
                <th>Size</th>
                <th>Proportion</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>`;
}
var generate_bundle_report_default;
var init_generate_bundle_report = __esm(() => {
	generate_bundle_report_default = {
		name: "generate-bundle-report",
		description:
			"Generate a visual report of the bundle composition and sizes (HTML report)",
		async finalize({ outputDir }) {
			const files = await getFilesRecursively2(outputDir);
			const targetFiles = files.filter(
				(f) =>
					f.endsWith(".js") ||
					f.endsWith(".mjs") ||
					f.endsWith(".css") ||
					f.endsWith(".html"),
			);
			const data = [];
			for (const f of targetFiles) {
				const s = await stat(f);
				data.push({
					path: relative3(outputDir, f),
					size: s.size,
					type: getFileType(f),
				});
			}
			data.sort((a, b) => b.size - a.size);
			const totalSize = data.reduce((acc, d) => acc + d.size, 0);
			const reportHtml = generateHtml(data, totalSize);
			const reportPath = join5(outputDir, "nojs-bundle-report.html");
			await writeFile5(reportPath, reportHtml, "utf-8");
			console.log(`[generate-bundle-report] Report generated: ${reportPath}`);
		},
	};
});

// src/prebuild/plugins/generate-deploy-config.js
import { writeFile as writeFile6 } from "node:fs/promises";
import { join as join6 } from "node:path";

async function writeNetlify(outputDir, base, useHashDetected) {
	const prefix = base === "/" ? "" : base;
	const content = `${prefix}/* ${prefix}/index.html 200
`;
	const dest = join6(outputDir, "_redirects");
	await writeFile6(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected \u2014 may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Netlify SPA fallback written${note}`,
	);
}
async function writeVercel(outputDir, base, useHashDetected) {
	const source = base === "/" ? "/(.*)" : `${base}/(.*)`;
	const destination = base === "/" ? "/index.html" : `${base}/index.html`;
	const content =
		JSON.stringify({ rewrites: [{ source, destination }] }, null, 2) +
		`
`;
	const dest = join6(outputDir, "vercel.json");
	await writeFile6(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected \u2014 may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Vercel SPA fallback written${note}`,
	);
}
async function writeApache(outputDir, base, useHashDetected) {
	const rewriteBase = base === "/" ? "/" : `${base}/`;
	const content = [
		"<IfModule mod_rewrite.c>",
		"  RewriteEngine On",
		`  RewriteBase ${rewriteBase}`,
		"  RewriteRule ^index\\.html$ - [L]",
		"  RewriteCond %{REQUEST_FILENAME} !-f",
		"  RewriteCond %{REQUEST_FILENAME} !-d",
		"  RewriteRule . /index.html [L]",
		"</IfModule>",
		"",
	].join(`
`);
	const dest = join6(outputDir, ".htaccess");
	await writeFile6(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected \u2014 may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Apache SPA fallback written${note}`,
	);
}
async function writeNginx(outputDir, base, useHashDetected) {
	const location = base === "/" ? "/" : `${base}/`;
	const fallback = base === "/" ? "/index.html" : `${base}/index.html`;
	const content = [
		`location ${location} {`,
		`  try_files $uri $uri/ ${fallback};`,
		"}",
		"",
	].join(`
`);
	const dest = join6(outputDir, "nginx.conf");
	await writeFile6(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected \u2014 may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: nginx SPA fallback written${note}`,
	);
}
var USEHASH_RE, generate_deploy_config_default;
var init_generate_deploy_config = __esm(() => {
	init_esm9();
	USEHASH_RE = /useHash\s*:\s*true/;
	generate_deploy_config_default = {
		name: "generate-deploy-config",
		description:
			"Generate SPA fallback deployment configs for Netlify, Vercel, Apache, or nginx",
		async process(html, { filePath }) {
			if (this._useHashDetected) return html;
			const { document: doc } = parseHTML(html);
			for (const script of doc.querySelectorAll("script:not([src])")) {
				if (USEHASH_RE.test(script.textContent || "")) {
					this._useHashDetected = true;
					console.warn(
						`[generate-deploy-config] warn: useHash: true detected in ${filePath} \u2014 ` +
							"SPA fallback configs are ineffective in hash mode",
					);
					break;
				}
			}
			return html;
		},
		async finalize({ outputDir, config }) {
			const useHashDetected = !!this._useHashDetected;
			this._useHashDetected = false;
			const targets = Array.isArray(config.targets)
				? config.targets
				: ["netlify"];
			const base =
				typeof config.base === "string"
					? config.base.replace(/\/+$/, "") || "/"
					: "/";
			for (const target of targets) {
				switch (target) {
					case "netlify":
						await writeNetlify(outputDir, base, useHashDetected);
						break;
					case "vercel":
						await writeVercel(outputDir, base, useHashDetected);
						break;
					case "apache":
						await writeApache(outputDir, base, useHashDetected);
						break;
					case "nginx":
						await writeNginx(outputDir, base, useHashDetected);
						break;
					default:
						console.warn(
							`[generate-deploy-config] unknown target "${target}" \u2014 skipped`,
						);
				}
			}
		},
	};
});

// src/prebuild/plugins/generate-early-hints.js
import { writeFile as writeFile7 } from "node:fs/promises";
import { join as join7, relative as relative4 } from "node:path";

function getPublicPath(outputPath, outputDir) {
	const rel = `/${relative4(outputDir, outputPath).replace(/\\/g, "/")}`;
	if (rel === "/index.html") return "/";
	if (rel.endsWith("/index.html")) return rel.slice(0, -10);
	return rel;
}
async function extractHintsFromOutputFile(path) {
	const { readFile: readFile4 } = await import("node:fs/promises");
	const html = await readFile4(path, "utf-8");
	const { document: doc } = parseHTML(html);
	const hints = new Set();
	for (const script of doc.querySelectorAll("script[src]")) {
		const src = script.getAttribute("src");
		if (src && !src.startsWith("http") && !src.startsWith("//")) {
			hints.add(`Link: <${src}>; rel=preload; as=script`);
		}
	}
	for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
		const href = link.getAttribute("href");
		if (href && !href.startsWith("http") && !href.startsWith("//")) {
			hints.add(`Link: <${href}>; rel=preload; as=style`);
		}
	}
	for (const link of doc.querySelectorAll('link[rel="preload"]')) {
		const href = link.getAttribute("href");
		const as = link.getAttribute("as");
		if (href && !href.startsWith("http") && !href.startsWith("//")) {
			hints.add(`Link: <${href}>; rel=preload${as ? `; as=${as}` : ""}`);
		}
	}
	return hints;
}
var generate_early_hints_default;
var init_generate_early_hints = __esm(() => {
	init_esm9();
	generate_early_hints_default = {
		name: "generate-early-hints",
		description:
			"Generate server push/early hints configuration (e.g., _headers for Netlify/Cloudflare)",
		_hints: new Map(),
		async process(html, { filePath }) {
			const { document: doc } = parseHTML(html);
			const hints = new Set();
			for (const script of doc.querySelectorAll("script[src]")) {
				const src = script.getAttribute("src");
				if (src && !src.startsWith("http") && !src.startsWith("//")) {
					hints.add(`Link: <${src}>; rel=preload; as=script`);
				}
			}
			for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
				const href = link.getAttribute("href");
				if (href && !href.startsWith("http") && !href.startsWith("//")) {
					hints.add(`Link: <${href}>; rel=preload; as=style`);
				}
			}
			for (const link of doc.querySelectorAll('link[rel="preload"]')) {
				const href = link.getAttribute("href");
				const as = link.getAttribute("as");
				if (href && !href.startsWith("http") && !href.startsWith("//")) {
					hints.add(`Link: <${href}>; rel=preload${as ? `; as=${as}` : ""}`);
				}
			}
			if (hints.size > 0) {
				this._hints.set(filePath, hints);
			}
			return html;
		},
		async finalize({ outputDir, config, processedFiles }) {
			const target = config.target || "netlify";
			if (target !== "netlify" && target !== "cloudflare") {
				console.warn(`[generate-early-hints] Unsupported target: ${target}`);
				return;
			}
			let content = "";
			for (const outputPath of processedFiles) {
				const publicPath = getPublicPath(outputPath, outputDir);
				const hints = await extractHintsFromOutputFile(outputPath);
				if (hints.size > 0) {
					content += `${publicPath}
`;
					for (const hint of hints) {
						content += `  ${hint}
`;
					}
					content += `
`;
				}
			}
			if (content) {
				const dest = join7(outputDir, "_headers");
				await writeFile7(dest, content, "utf-8");
				console.log(
					`[generate-early-hints] ${dest}: Early hints written for ${target}`,
				);
			}
			this._hints.clear();
		},
	};
});

// src/prebuild/plugins/generate-import-map.js
var generate_import_map_default;
var init_generate_import_map = __esm(() => {
	init_esm9();
	generate_import_map_default = {
		name: "generate-import-map",
		description:
			"Generate and inject an import map for bare specifiers (e.g., 'nojs')",
		async process(html, { config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			if (doc.querySelector('script[type="importmap"]')) return html;
			const userImports = config.importMap?.imports || {};
			const imports = {
				nojs: "/nojs.bundle.js",
				...userImports,
			};
			const importMap = { imports };
			const script = doc.createElement("script");
			script.setAttribute("type", "importmap");
			script.textContent = `
${JSON.stringify(importMap, null, 2)}
`;
			const firstModule = head.querySelector('script[type="module"]');
			if (firstModule) {
				head.insertBefore(script, firstModule);
			} else {
				head.appendChild(script);
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/generate-pwa-manifest.js
import { writeFile as writeFile8 } from "node:fs/promises";
import { join as join8 } from "node:path";

var generate_pwa_manifest_default;
var init_generate_pwa_manifest = __esm(() => {
	init_esm9();
	generate_pwa_manifest_default = {
		name: "generate-pwa-manifest",
		description: "Generate manifest.webmanifest and inject manifest link tag.",
		async process(html, { _config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			if (head.querySelector('link[rel="manifest"]')) return html;
			const link = doc.createElement("link");
			link.setAttribute("rel", "manifest");
			link.setAttribute("href", "/manifest.webmanifest");
			head.appendChild(link);
			return doc.toString();
		},
		async finalize({ outputDir, config }) {
			const opts = config || {};
			const manifest = {
				name: opts.name || "App",
				short_name: opts.shortName || opts.name || "App",
				description: opts.description || "",
				theme_color: opts.themeColor || "#ffffff",
				background_color: opts.backgroundColor || "#ffffff",
				display: opts.display || "standalone",
				start_url: opts.startUrl || "/",
				icons: opts.icons || [],
			};
			const dest = join8(outputDir, "manifest.webmanifest");
			await writeFile8(dest, JSON.stringify(manifest, null, 2), "utf-8");
		},
	};
});

// src/prebuild/plugins/generate-responsive-images.js
import {
	basename as basename4,
	dirname as dirname3,
	extname as extname3,
} from "node:path";

function isLocalPath(src) {
	return (
		src &&
		!src.startsWith("http://") &&
		!src.startsWith("https://") &&
		!src.startsWith("data:")
	);
}
function buildVariantPath(src, width, format) {
	const ext = extname3(src);
	const base = basename4(src, ext);
	const dir = dirname3(src);
	const prefix = dir === "." ? "" : `${dir}/`;
	return `${prefix}${base}-${width}w.${format}`;
}
function buildSrcset(src, widths, format) {
	return widths
		.map((w) => `${buildVariantPath(src, w, format)} ${w}w`)
		.join(", ");
}
var SUPPORTED_EXTS, DEFAULT_WIDTHS, generate_responsive_images_default;
var init_generate_responsive_images = __esm(() => {
	init_esm9();
	SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png"]);
	DEFAULT_WIDTHS = [480, 800, 1200];
	generate_responsive_images_default = {
		name: "generate-responsive-images",
		description:
			"Generate AVIF/WebP responsive image variants and update srcset.",
		async process(html, { config }) {
			let sharp;
			try {
				({ default: sharp } = await import("sharp"));
			} catch {
				process.stderr.write(`[generate-responsive-images] warn: sharp not installed. Run: npm install sharp
`);
				return html;
			}
			const widths = config.widths || DEFAULT_WIDTHS;
			const { document: doc } = parseHTML(html);
			const images = doc.querySelectorAll("img[src]");
			if (images.length === 0) return html;
			for (const img of images) {
				if (img.hasAttribute("data-no-responsive")) continue;
				const parent = img.parentNode;
				if (parent?.tagName && parent.tagName.toLowerCase() === "picture")
					continue;
				const src = img.getAttribute("src");
				if (!isLocalPath(src)) continue;
				const ext = extname3(src).toLowerCase();
				if (!SUPPORTED_EXTS.has(ext)) continue;
				const picture = doc.createElement("picture");
				const avifSource = doc.createElement("source");
				avifSource.setAttribute("type", "image/avif");
				avifSource.setAttribute("srcset", buildSrcset(src, widths, "avif"));
				const webpSource = doc.createElement("source");
				webpSource.setAttribute("type", "image/webp");
				webpSource.setAttribute("srcset", buildSrcset(src, widths, "webp"));
				picture.appendChild(avifSource);
				picture.appendChild(webpSource);
				picture.appendChild(img.cloneNode(true));
				img.parentNode.replaceChild(picture, img);
			}
			this._sharp = sharp;
			return doc.toString();
		},
		async finalize({ outputDir, _config }) {
			const sharp = this._sharp;
			if (!sharp || !outputDir) return;
			this._sharp = null;
		},
	};
});

// src/prebuild/plugins/generate-sitemap.js
import {
	existsSync as existsSync2,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { writeFile as writeFile9 } from "node:fs/promises";
import { join as join9 } from "node:path";

function isIndexable(route) {
	if (route === "*") return false;
	if (/\{[^}]+\}/.test(route)) return false;
	if (route.includes("*")) return false;
	if (route.includes(":")) return false;
	return true;
}
function escapeXml(str) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
var generate_sitemap_default;
var init_generate_sitemap = __esm(() => {
	init_esm9();
	generate_sitemap_default = {
		name: "generate-sitemap",
		description:
			"Generate sitemap.xml from No.JS route definitions and canonical URLs",
		async process(html, { _filePath, _config }) {
			if (!this._routes) this._routes = new Set();
			const { document: doc } = parseHTML(html);
			const templates = doc.querySelectorAll("template[route]");
			for (const tpl of templates) {
				if (tpl.hasAttribute("guard")) continue;
				const route = tpl.getAttribute("route");
				if (!route) continue;
				if (!isIndexable(route)) continue;
				this._routes.add(route);
			}
			const canonical = doc.querySelector('link[rel="canonical"]');
			if (canonical) {
				const href = canonical.getAttribute("href");
				if (href) this._routes.add(href);
			}
			return html;
		},
		async finalize({ outputDir, config }) {
			if (!config.baseUrl) {
				console.warn(
					"[generate-sitemap] Skipped: baseUrl is required in config",
				);
				return;
			}
			const routes = this._routes || new Set();
			if (routes.size === 0) return;
			const excludePatterns = config.excludePatterns || [];
			const changefreq = config.changefreq || "weekly";
			const priority = config.priority ?? 0.8;
			const baseUrl = config.baseUrl.replace(/\/$/, "");
			const sortedRoutes = [...routes].sort();
			const urls = sortedRoutes
				.filter((r) => !excludePatterns.some((p) => r.includes(p)))
				.map((route) => {
					const loc = route.startsWith("http") ? route : `${baseUrl}${route}`;
					return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
				});
			const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join(`
`)}
</urlset>
`;
			const dest = join9(outputDir, "sitemap.xml");
			await writeFile9(dest, xml, "utf-8");
			console.log(
				`[generate-sitemap] Written ${routes.size} URL(s) to ${dest}`,
			);
			const sitemapUrl = `${baseUrl}/sitemap.xml`;
			const robotsPath = join9(outputDir, "robots.txt");
			if (existsSync2(robotsPath)) {
				const existing = readFileSync(robotsPath, "utf-8");
				if (!existing.includes(`Sitemap: ${sitemapUrl}`)) {
					writeFileSync(
						robotsPath,
						existing.trimEnd() +
							`
Sitemap: ${sitemapUrl}
`,
						"utf-8",
					);
				}
			} else {
				writeFileSync(
					robotsPath,
					`User-agent: *
Allow: /
Sitemap: ${sitemapUrl}
`,
					"utf-8",
				);
			}
			this._routes = null;
		},
	};
});

// src/prebuild/plugins/generate-service-worker.js
import {
	readdir as readdir3,
	writeFile as writeFile10,
} from "node:fs/promises";
import { join as join10, relative as relative5 } from "node:path";

async function getFilesRecursively3(dir) {
	const entries2 = await readdir3(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries2.map((res) => {
			const resPath = join10(dir, res.name);
			return res.isDirectory() ? getFilesRecursively3(resPath) : resPath;
		}),
	);
	return files.flat();
}
var generate_service_worker_default;
var init_generate_service_worker = __esm(() => {
	init_esm9();
	generate_service_worker_default = {
		name: "generate-service-worker",
		description:
			"Generate a Service Worker for precaching assets and offline support",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const body = doc.body;
			if (!body) return html;
			if (doc.querySelector('script[data-nojs="sw-register"]')) return html;
			const script = doc.createElement("script");
			script.setAttribute("data-nojs", "sw-register");
			script.textContent = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('SW registration failed: ', err);
    });
  });
}
`.trim();
			body.appendChild(script);
			return doc.toString();
		},
		async finalize({ outputDir, config }) {
			const allFiles = await getFilesRecursively3(outputDir);
			const swName = config.swName || "sw.js";
			const cacheName = config.cacheName || `nojs-cache-${Date.now()}`;
			const assetsToCache = allFiles
				.map((f) => `/${relative5(outputDir, f).replace(/\\/g, "/")}`)
				.filter((f) => {
					const skip = [
						swName,
						"_headers",
						"_redirects",
						"nojs-bundle-report.html",
					];
					return !skip.some((s) => f.endsWith(s));
				});
			if (!assetsToCache.includes("/")) assetsToCache.push("/");
			const swContent = `
const CACHE_NAME = '${cacheName}';
const ASSETS = ${JSON.stringify(assetsToCache, null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
`.trim();
			const dest = join10(outputDir, swName);
			await writeFile10(dest, swContent, "utf-8");
			console.log(
				`[generate-service-worker] ${dest}: Service Worker generated with ${assetsToCache.length} assets`,
			);
		},
	};
});

// src/prebuild/plugins/hoist-static-content.js
var DYNAMIC_ATTRS, INTERPOLATION_RE, hoist_static_content_default;
var init_hoist_static_content = __esm(() => {
	init_esm9();
	DYNAMIC_ATTRS = new Set([
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
		"each",
		"template",
		"watch",
		"var",
		"filter",
		"include",
		"loading",
		"error",
		"then",
		"confirm",
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
	INTERPOLATION_RE = /\$\{/;
	hoist_static_content_default = {
		name: "hoist-static-content",
		description: "Mark static HTML sub-trees to be skipped by the runtime",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const body = doc.body;
			if (!body) return html;
			const isNodeDynamic = new Map();
			function checkDynamic(node2) {
				if (isNodeDynamic.has(node2)) return isNodeDynamic.get(node2);
				if (node2.nodeType === 3) {
					const text = node2.textContent || "";
					const dynamic2 = INTERPOLATION_RE.test(text);
					isNodeDynamic.set(node2, dynamic2);
					return dynamic2;
				}
				if (node2.nodeType !== 1) {
					isNodeDynamic.set(node2, false);
					return false;
				}
				let selfIsDynamic = false;
				for (const attr of node2.getAttributeNames()) {
					if (
						DYNAMIC_ATTRS.has(attr) ||
						attr.startsWith("on:") ||
						attr.startsWith("on-") ||
						attr.startsWith("bind-") ||
						INTERPOLATION_RE.test(node2.getAttribute(attr) || "")
					) {
						selfIsDynamic = true;
						break;
					}
				}
				let childrenAreDynamic = false;
				for (const child of Array.from(node2.childNodes)) {
					if (checkDynamic(child)) {
						childrenAreDynamic = true;
					}
				}
				const dynamic = selfIsDynamic || childrenAreDynamic;
				isNodeDynamic.set(node2, dynamic);
				return dynamic;
			}
			checkDynamic(body);
			function markStaticRoots(node2, parentIsDynamic) {
				if (node2.nodeType !== 1) return;
				const dynamic = isNodeDynamic.get(node2);
				if (!dynamic) {
					if (parentIsDynamic) {
						node2.setAttribute("data-nojs-static", "");
						return;
					}
				} else {
					for (const child of Array.from(node2.childNodes)) {
						markStaticRoots(child, true);
					}
				}
			}
			const bodyIsDynamic = isNodeDynamic.get(body);
			if (bodyIsDynamic) {
				for (const child of Array.from(body.childNodes)) {
					markStaticRoots(child, true);
				}
			} else {
				for (const child of Array.from(body.childNodes)) {
					if (child.nodeType === 1) {
						child.setAttribute("data-nojs-static", "");
					}
				}
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-canonical-url.js
import { relative as relative6 } from "node:path";

var inject_canonical_url_default;
var init_inject_canonical_url = __esm(() => {
	init_esm9();
	inject_canonical_url_default = {
		name: "inject-canonical-url",
		description: "Inject canonical link tag from siteUrl config and file path.",
		async process(html, { filePath, config }) {
			const siteUrl = config?.siteUrl;
			if (!siteUrl) return html;
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			if (head.querySelector('link[rel="canonical"]')) return html;
			const cwd = config?.cwd || process.cwd();
			const rel = filePath ? relative6(cwd, filePath) : "index.html";
			const parts = rel.replace(/\\/g, "/").split("/");
			let urlPath;
			if (parts[parts.length - 1] === "index.html") {
				urlPath =
					parts.length === 1 ? "/" : `/${parts.slice(0, -1).join("/")}/`;
			} else {
				urlPath = `/${parts.join("/")}`;
			}
			const canonical = siteUrl.replace(/\/$/, "") + urlPath;
			const link = doc.createElement("link");
			link.setAttribute("rel", "canonical");
			link.setAttribute("href", canonical);
			head.appendChild(link);
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-csp-hashes.js
import { createHash as createHash3 } from "node:crypto";

function sha384(content) {
	const hash = createHash3("sha384").update(content, "utf8").digest("base64");
	return `'sha384-${hash}'`;
}
var inject_csp_hashes_default;
var init_inject_csp_hashes = __esm(() => {
	init_esm9();
	inject_csp_hashes_default = {
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
			for (const el of doc.querySelectorAll("script:not([src])")) {
				if (el.getAttribute("type") === "speculationrules") continue;
				const content = el.textContent || "";
				if (!content.trim()) continue;
				scriptHashes.push(sha384(content));
			}
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
});

// src/prebuild/plugins/inject-event-delegation.js
function generateDelegationScript(events) {
	return `
(function() {
  const h = (e) => {
    const t = e.target.closest('[data-nojs-event*="' + e.type + '"]');
    if (t && window.nojs && typeof window.nojs.run === 'function') {
      const expr = t.getAttribute('data-nojs-on-' + e.type);
      if (expr) window.nojs.run(expr, t, e);
    }
  };
  ${JSON.stringify(events)}.forEach(ev => document.addEventListener(ev, h, true));
})();`.trim();
}
var inject_event_delegation_default;
var init_inject_event_delegation = __esm(() => {
	init_esm9();
	inject_event_delegation_default = {
		name: "inject-event-delegation",
		description:
			"Transform individual event listeners into root-delegated events for better performance",
		async process(html, { config = {} } = {}) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const eventsToDelegate = config.events || [
				"click",
				"input",
				"change",
				"submit",
			];
			let hasDelegated = false;
			const allElements = doc.querySelectorAll("*");
			for (const el of allElements) {
				const attrs = el.getAttributeNames();
				const delegatedForThisEl = [];
				for (const attr of attrs) {
					let eventName = null;
					if (attr.startsWith("on:")) {
						eventName = attr.slice(3);
					} else if (attr.startsWith("on-")) {
						eventName = attr.slice(3);
					}
					if (eventName && eventsToDelegate.includes(eventName)) {
						const value = el.getAttribute(attr);
						el.removeAttribute(attr);
						el.setAttribute(`data-nojs-on-${eventName}`, value);
						delegatedForThisEl.push(eventName);
						hasDelegated = true;
					}
				}
				if (delegatedForThisEl.length > 0) {
					const existing = el.getAttribute("data-nojs-event") || "";
					const combined = [
						...new Set([
							...existing.split(",").filter(Boolean),
							...delegatedForThisEl,
						]),
					].join(",");
					el.setAttribute("data-nojs-event", combined);
				}
			}
			if (hasDelegated && !doc.querySelector("script[data-nojs-delegation]")) {
				const script = doc.createElement("script");
				script.setAttribute("data-nojs-delegation", "");
				script.textContent = generateDelegationScript(eventsToDelegate);
				head.appendChild(script);
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-head-attrs.js
function extractLiteral(expr) {
	if (!expr) return null;
	const m = expr.trim().match(/^(['"])([\s\S]*)\1$/);
	return m ? m[2] : null;
}
function setTitle(head, doc, value) {
	let el = head.querySelector("title");
	if (!el) {
		el = doc.createElement("title");
		head.appendChild(el);
	}
	el.textContent = value;
}
function setDescription(head, doc, value) {
	let el = head.querySelector('meta[name="description"]');
	if (!el) {
		el = doc.createElement("meta");
		el.setAttribute("name", "description");
		head.appendChild(el);
	}
	el.setAttribute("content", value);
}
function setCanonical(head, doc, value) {
	let el = head.querySelector('link[rel="canonical"]');
	if (!el) {
		el = doc.createElement("link");
		el.setAttribute("rel", "canonical");
		head.appendChild(el);
	}
	el.setAttribute("href", value);
}
function setJsonLd(head, doc, json) {
	let el = head.querySelector('script[type="application/ld+json"][data-nojs]');
	if (!el) {
		el = doc.createElement("script");
		el.setAttribute("type", "application/ld+json");
		el.setAttribute("data-nojs", "");
		head.appendChild(el);
	}
	el.textContent = json;
}
var inject_head_attrs_default;
var init_inject_head_attrs = __esm(() => {
	init_esm9();
	inject_head_attrs_default = {
		name: "inject-head-attrs",
		description:
			"Inject static page-title, page-description, page-canonical, and page-jsonld into <head>",
		async process(html, { filePath, _config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			let modified = false;
			for (const el of doc.querySelectorAll(
				"[page-title]:not(template[route])",
			)) {
				const val = extractLiteral(el.getAttribute("page-title"));
				if (val == null) continue;
				setTitle(head, doc, val);
				modified = true;
			}
			for (const el of doc.querySelectorAll(
				"[page-description]:not(template[route])",
			)) {
				const val = extractLiteral(el.getAttribute("page-description"));
				if (val == null) continue;
				setDescription(head, doc, val);
				modified = true;
			}
			for (const el of doc.querySelectorAll(
				"[page-canonical]:not(template[route])",
			)) {
				const val = extractLiteral(el.getAttribute("page-canonical"));
				if (val == null) continue;
				setCanonical(head, doc, val);
				modified = true;
			}
			for (const el of doc.querySelectorAll(
				"[page-jsonld]:not(template[route])",
			)) {
				const json = (el.textContent || "").trim();
				if (!json) continue;
				setJsonLd(head, doc, json);
				modified = true;
			}
			const routeTemplates = [...doc.querySelectorAll("template[route]")];
			const defaultTpl =
				routeTemplates.find((t) => t.getAttribute("route") === "/") ||
				routeTemplates[0];
			for (const tpl of routeTemplates) {
				const isSpaDefault = tpl === defaultTpl;
				const isOnlyTemplate = routeTemplates.length === 1;
				if (!isSpaDefault && !isOnlyTemplate) continue;
				const titleVal = extractLiteral(tpl.getAttribute("page-title"));
				if (
					titleVal != null &&
					!doc.querySelector("[page-title]:not(template[route])")
				) {
					setTitle(head, doc, titleVal);
					modified = true;
				}
				const descVal = extractLiteral(tpl.getAttribute("page-description"));
				if (
					descVal != null &&
					!doc.querySelector("[page-description]:not(template[route])")
				) {
					setDescription(head, doc, descVal);
					modified = true;
				}
				const canonicalVal = extractLiteral(tpl.getAttribute("page-canonical"));
				if (
					canonicalVal != null &&
					!doc.querySelector("[page-canonical]:not(template[route])")
				) {
					setCanonical(head, doc, canonicalVal);
					modified = true;
				}
				const jsonldAttr = tpl.getAttribute("page-jsonld");
				if (
					jsonldAttr &&
					!doc.querySelector("[page-jsonld]:not(template[route])")
				) {
					setJsonLd(head, doc, jsonldAttr);
					modified = true;
				}
			}
			return modified ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/inject-i18n-preload.js
function isEnglishLocale(lang) {
	return lang === "en" || lang.startsWith("en-");
}
function isValidLocaleCode(lang) {
	return /^[a-z]{2}$/.test(lang) || /^[a-z]{2}-[A-Z]{2}$/.test(lang);
}
var inject_i18n_preload_default;
var init_inject_i18n_preload = __esm(() => {
	init_esm9();
	inject_i18n_preload_default = {
		name: "inject-i18n-preload",
		description:
			"Inject <link rel='preload'> for the default language locale file",
		async process(html, { config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const lang = doc.documentElement?.getAttribute("lang") || "";
			if (!lang || isEnglishLocale(lang) || !isValidLocaleCode(lang))
				return html;
			const localesDir = config.localesDir || "/locales/";
			const localeHref = `${localesDir.endsWith("/") ? localesDir : `${localesDir}/`}${lang}.json`;
			const existingPreload = head.querySelector(
				`link[rel="preload"][href="${localeHref}"]`,
			);
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
});

// src/prebuild/plugins/inject-jsonld.js
var inject_jsonld_default;
var init_inject_jsonld = __esm(() => {
	init_esm9();
	inject_jsonld_default = {
		name: "inject-jsonld",
		description:
			"Inject WebPage/WebSite JSON-LD structured data from page metadata.",
		async process(html, { config }) {
			const opts = config || {};
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			if (doc.querySelector('script[type="application/ld+json"]')) return html;
			const title = head.querySelector("title")?.textContent?.trim();
			const description = head
				.querySelector('meta[name="description"]')
				?.getAttribute("content")
				?.trim();
			const canonical = head
				.querySelector('link[rel="canonical"]')
				?.getAttribute("href")
				?.trim();
			const lang =
				doc.documentElement?.getAttribute("lang") ||
				doc.querySelector("html")?.getAttribute("lang");
			const url = canonical || opts.siteUrl || "";
			if (!title && !url) return html;
			const schema = {
				"@context": "https://schema.org",
				"@type": opts.type || "WebPage",
			};
			if (title) schema.name = title;
			if (description) schema.description = description;
			if (url) schema.url = url;
			if (lang) schema.inLanguage = lang;
			if (opts.organization) {
				schema.isPartOf = {
					"@type": "WebSite",
					name: opts.organization.name,
					url: opts.organization.url,
				};
			}
			const script = doc.createElement("script");
			script.setAttribute("type", "application/ld+json");
			script.textContent = JSON.stringify(schema, null, 2);
			head.appendChild(script);
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-modulepreload.js
import { readFile as readFile9 } from "node:fs/promises";
import { dirname as dirname6, join as join15, relative as relative8 } from "node:path";
function isInterpolated(url) {
	return /\{[^}]+\}/.test(url);
}
function isCrossOrigin(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}
function appendModulepreload(doc, href) {
	const link = doc.createElement("link");
	link.setAttribute("rel", "modulepreload");
	link.setAttribute("href", href);
	doc.head.appendChild(link);
}
async function findWebRoot(startDir, webPath) {
	if (!webPath.startsWith("/")) return startDir;
	const rel = webPath.slice(1);
	let dir = startDir;
	for (;;) {
		try {
			await readFile9(join15(dir, rel));
			return dir;
		} catch {
			const parent = dirname6(dir);
			if (parent === dir) return null;
			dir = parent;
		}
	}
}
const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g;
async function collectImports(filePath, webRoot, visited) {
	let src;
	try {
		src = await readFile9(filePath, "utf8");
	} catch {
		return [];
	}
	const results = [];
	const fileDir = dirname6(filePath);
	IMPORT_RE.lastIndex = 0;
	let m;
	while ((m = IMPORT_RE.exec(src)) !== null) {
		const specifier = m[1];
		if (!specifier.startsWith(".")) continue;
		const absPath = join15(fileDir, specifier);
		if (visited.has(absPath)) continue;
		visited.add(absPath);
		results.push("/" + relative8(webRoot, absPath));
		const nested = await collectImports(absPath, webRoot, visited);
		results.push(...nested);
	}
	return results;
}
var inject_modulepreload_default;
var init_inject_modulepreload = __esm(() => {
	init_esm9();
	inject_modulepreload_default = {
		name: "inject-modulepreload",
		description:
			"Inject modulepreload hints for module scripts and their transitive imports to reduce load latency.",
		async process(html, { filePath } = {}) {
			const { document: doc } = parseHTML(html);
			if (!doc.head) return html;
			const existing = new Set(
				[...doc.querySelectorAll('link[rel="modulepreload"]')].map((el) =>
					el.getAttribute("href"),
				),
			);
			const scripts = doc.querySelectorAll('script[type="module"][src]');
			let changed = false;
			for (const script of scripts) {
				const src = script.getAttribute("src");
				if (!src || isInterpolated(src) || isCrossOrigin(src)) continue;
				if (!existing.has(src)) {
					appendModulepreload(doc, src);
					existing.add(src);
					changed = true;
				}
				if (!filePath) continue;
				const webRoot = await findWebRoot(dirname6(filePath), src);
				if (!webRoot) continue;
				const entryPath = join15(webRoot, src.startsWith("/") ? src.slice(1) : src);
				const imports = await collectImports(entryPath, webRoot, new Set([entryPath]));
				for (const webPath of imports) {
					if (existing.has(webPath)) continue;
					appendModulepreload(doc, webPath);
					existing.add(webPath);
					changed = true;
				}
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/inject-og-twitter.js
function getStaticPageAttr(doc, attr) {
	const el = doc.querySelector(`[${attr}]`);
	if (!el) return null;
	const value = el.getAttribute(attr)?.trim();
	const match = value?.match(/^(['"])(.*)\1$/);
	return match ? match[2] : null;
}
function setMeta(doc, head, attrType, name, content) {
	if (head.querySelector(`meta[${attrType}="${name}"]`)) return;
	const meta = doc.createElement("meta");
	meta.setAttribute(attrType, name);
	meta.setAttribute("content", content);
	head.appendChild(meta);
}
var inject_og_twitter_default;
var init_inject_og_twitter = __esm(() => {
	init_esm9();
	inject_og_twitter_default = {
		name: "inject-og-twitter",
		description:
			"Generate Open Graph and Twitter Card meta tags from No.JS page-* directives",
		async process(html, { _filePath, config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const title =
				getStaticPageAttr(doc, "page-title") ||
				head.querySelector("title")?.textContent?.trim();
			const description =
				getStaticPageAttr(doc, "page-description") ||
				head.querySelector('meta[name="description"]')?.getAttribute("content");
			const canonical =
				getStaticPageAttr(doc, "page-canonical") ||
				head.querySelector('link[rel="canonical"]')?.getAttribute("href");
			setMeta(doc, head, "property", "og:type", config.type || "website");
			if (title) setMeta(doc, head, "property", "og:title", title);
			if (description)
				setMeta(doc, head, "property", "og:description", description);
			if (canonical) setMeta(doc, head, "property", "og:url", canonical);
			if (config.defaultImage)
				setMeta(doc, head, "property", "og:image", config.defaultImage);
			if (config.siteName)
				setMeta(doc, head, "property", "og:site_name", config.siteName);
			setMeta(
				doc,
				head,
				"name",
				"twitter:card",
				config.twitterCard || "summary",
			);
			if (title) setMeta(doc, head, "name", "twitter:title", title);
			if (description)
				setMeta(doc, head, "name", "twitter:description", description);
			if (config.twitterSite)
				setMeta(doc, head, "name", "twitter:site", config.twitterSite);
			if (config.defaultImage)
				setMeta(doc, head, "name", "twitter:image", config.defaultImage);
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-resource-hints.js
function isInterpolated2(url) {
	return /\{[^}]+\}/.test(url);
}
function isCrossOrigin2(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}
function appendLink(doc, head, rel, href, as) {
	const link = doc.createElement("link");
	link.setAttribute("rel", rel);
	link.setAttribute("href", href);
	if (as) link.setAttribute("as", as);
	if (rel === "preconnect" || as === "fetch") link.setAttribute("crossorigin", "anonymous");
	head.appendChild(link);
}
var inject_resource_hints_default;
var init_inject_resource_hints = __esm(() => {
	init_esm9();
	inject_resource_hints_default = {
		name: "inject-resource-hints",
		description:
			"Inject preload, prefetch, and preconnect hints for No.JS fetch directives and route templates",
		async process(html, { _filePath, config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const existingHrefs = new Set(
				[
					...head.querySelectorAll(
						'link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]',
					),
				].map((el) => el.getAttribute("href")),
			);
			const fetchEls = doc.querySelectorAll("[get]");
			for (const el of fetchEls) {
				const url = el.getAttribute("get");
				if (!url || isInterpolated2(url) || existingHrefs.has(url)) continue;
				appendLink(doc, head, "preload", url, "fetch");
				existingHrefs.add(url);
				if (isCrossOrigin2(url)) {
					const origin = new URL(url).origin;
					if (!existingHrefs.has(origin)) {
						appendLink(doc, head, "preconnect", origin);
						existingHrefs.add(origin);
					}
				}
			}
			const routeTemplates = doc.querySelectorAll("template[route][src]");
			for (const tpl of routeTemplates) {
				const src = tpl.getAttribute("src");
				if (!src || isInterpolated2(src) || existingHrefs.has(src)) continue;
				appendLink(doc, head, "prefetch", src, "fetch");
				existingHrefs.add(src);
			}
			if (config.apiBase) {
				try {
					const origin = new URL(config.apiBase).origin;
					const existingDnsPrefetch = new Set(
						[...head.querySelectorAll('link[rel="dns-prefetch"]')].map((el) =>
							el.getAttribute("href"),
						),
					);
					if (!existingDnsPrefetch.has(origin)) {
						const link = doc.createElement("link");
						link.setAttribute("rel", "dns-prefetch");
						link.setAttribute("href", origin);
						head.appendChild(link);
					}
				} catch {}
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-speculation-rules.js
var inject_speculation_rules_default;
var init_inject_speculation_rules = __esm(() => {
	init_esm9();
	inject_speculation_rules_default = {
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
});

// src/prebuild/plugins/inject-sri-hashes.js
import { createHash as createHash4 } from "node:crypto";

function isInterpolated3(url) {
	return /\{[^}]+\}/.test(url);
}
async function fetchAndHash(url, timeout) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return createHash4("sha384").update(Buffer.from(buf)).digest("base64");
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
var inject_sri_hashes_default;
var init_inject_sri_hashes = __esm(() => {
	init_esm9();
	inject_sri_hashes_default = {
		name: "inject-sri-hashes",
		description:
			"Add integrity (SHA-384) and crossorigin to external scripts and stylesheets.",
		async process(html, { config }) {
			const opts = config || {};
			const timeout = opts.timeout ?? 5000;
			const skipHosts = new Set(opts.skip || []);
			const { document: doc } = parseHTML(html);
			let changed = false;
			const targets = [
				...doc.querySelectorAll("script[src]"),
				...doc.querySelectorAll('link[rel="stylesheet"][href]'),
			];
			for (const el of targets) {
				const url = el.getAttribute("src") || el.getAttribute("href") || "";
				if (!url.startsWith("https://")) continue;
				if (isInterpolated3(url)) continue;
				if (el.hasAttribute("integrity")) continue;
				try {
					const host = new URL(url).hostname;
					if (skipHosts.has(host)) continue;
				} catch {
					continue;
				}
				const hash = await fetchAndHash(url, timeout);
				if (!hash) continue;
				el.setAttribute("integrity", `sha384-${hash}`);
				if (!el.hasAttribute("crossorigin")) {
					el.setAttribute("crossorigin", "anonymous");
				}
				changed = true;
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/inject-template-hints.js
var SLOT_ATTRS,
	SKELETON_CSS_ATTR = "data-nojs-skeleton-css",
	SKELETON_CSS,
	inject_template_hints_default;
var init_inject_template_hints = __esm(() => {
	init_esm9();
	SLOT_ATTRS = ["loading", "skeleton", "error", "empty", "success"];
	SKELETON_CSS =
		".skeleton{background:#e0e0e0;border-radius:4px;animation:skeleton-pulse 1.5s ease-in-out infinite}" +
		"@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:.4}}";
	inject_template_hints_default = {
		name: "inject-template-hints",
		description:
			"Preload stylesheets referenced by loading/skeleton/error templates and inline skeleton animation CSS",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const templateIds = new Set();
			for (const attr of SLOT_ATTRS) {
				for (const el of doc.querySelectorAll(`[${attr}]`)) {
					const val = el.getAttribute(attr);
					if (val?.startsWith("#")) templateIds.add(val.slice(1));
				}
			}
			if (templateIds.size === 0) return html;
			let hasSkeletonClass = false;
			for (const id of templateIds) {
				const tpl = doc.getElementById(id);
				if (!tpl) continue;
				const root = tpl?.content ?? tpl;
				for (const el of root?.querySelectorAll("[class]") ?? []) {
					for (const cls of el.classList) {
						if (/skeleton/i.test(cls)) hasSkeletonClass = true;
					}
				}
			}
			let modified = false;
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
});

// src/prebuild/plugins/inject-view-transitions.js
var inject_view_transitions_default;
var init_inject_view_transitions = __esm(() => {
	init_esm9();
	inject_view_transitions_default = {
		name: "inject-view-transitions",
		description:
			"Inject @view-transition CSS to enable smooth same-origin navigations.",
		async process(html, { config }) {
			if (config?.enabled === false) return html;
			const { document: doc } = parseHTML(html);
			if (!doc.head) return html;
			if (doc.head.querySelector("[data-nojs-view-transitions]")) return html;
			const style = doc.createElement("style");
			style.setAttribute("data-nojs-view-transitions", "");
			style.textContent = "@view-transition { navigation: auto; }";
			doc.head.appendChild(style);
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inject-visibility-css.js
function isInsideTemplate(el) {
	return !!el.closest("template");
}
var PENDING_ATTR = "data-nojs-pending",
	STYLE_ATTR = "data-nojs-pending-css",
	PENDING_CSS,
	inject_visibility_css_default;
var init_inject_visibility_css = __esm(() => {
	init_esm9();
	PENDING_CSS = `[${PENDING_ATTR}] { visibility: hidden; }`;
	inject_visibility_css_default = {
		name: "inject-visibility-css",
		description:
			"Prevent flash of conditional content by hiding if=/show=/hide= elements until the runtime processes them",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const candidates = [
				...doc.querySelectorAll("[if], [show], [hide]"),
			].filter((el) => !isInsideTemplate(el));
			if (candidates.length === 0) return html;
			for (const el of candidates) {
				el.setAttribute(PENDING_ATTR, "");
			}
			if (!head.querySelector(`[${STYLE_ATTR}]`)) {
				const style = doc.createElement("style");
				style.setAttribute(STYLE_ATTR, "");
				style.textContent = PENDING_CSS;
				head.appendChild(style);
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inline-animation-css.js
var KEYFRAMES, ANIM_ATTRS, inline_animation_css_default;
var init_inline_animation_css = __esm(() => {
	init_esm9();
	KEYFRAMES = new Map([
		["fadeIn", "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }"],
		[
			"fadeOut",
			"@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }",
		],
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
	ANIM_ATTRS = ["animate", "animate-enter", "animate-leave"];
	inline_animation_css_default = {
		name: "inline-animation-css",
		description:
			"Inline only the animation keyframes used in the document to prevent FOUC on first paint",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			if (head.querySelector("[data-nojs-animations]")) return html;
			const names = new Set();
			for (const attr of ANIM_ATTRS) {
				for (const el of doc.querySelectorAll(`[${attr}]`)) {
					const val = el.getAttribute(attr);
					if (val) names.add(val.trim());
				}
			}
			for (const tpl of doc.querySelectorAll("template")) {
				const content = tpl.outerHTML;
				for (const attr of ANIM_ATTRS) {
					const re = new RegExp(`${attr}="([^"]+)"`, "g");
					let m;
					while ((m = re.exec(content)) !== null) {
						names.add(m[1].trim());
					}
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
			style.textContent = rules.join(`
`);
			head.appendChild(style);
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/inline-critical-css.js
var inline_critical_css_default;
var init_inline_critical_css = __esm(() => {
	inline_critical_css_default = {
		name: "inline-critical-css",
		description:
			"Inline critical CSS and async-load full stylesheets using beasties.",
		async process(html, { filePath, config }) {
			let Beasties;
			try {
				({ default: Beasties } = await import("beasties"));
			} catch {
				process.stderr.write(`[inline-critical-css] warn: beasties not installed. Run: npm install beasties
`);
				return html;
			}
			const opts = config || {};
			const beasties = new Beasties({
				path: opts.path || process.cwd(),
				publicPath: opts.publicPath || "/",
				logLevel: "warn",
				pruneSource: opts.pruneSource !== false,
				mergeStylesheets: opts.mergeStylesheets !== false,
				preload: "swap",
				...opts.beastiesOptions,
			});
			try {
				return await beasties.process(html);
			} catch (err) {
				process.stderr.write(`[inline-critical-css] warn: failed to process ${filePath}: ${err.message}
`);
				return html;
			}
		},
	};
});

// src/prebuild/plugins/inline-css.js
import { readFile as readFile10 } from "node:fs/promises";
import { dirname as dirname7, join as join16 } from "node:path";
function isCrossOriginCss(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}
async function findWebRootCss(startDir, webPath) {
	if (!webPath.startsWith("/")) return startDir;
	const rel = webPath.slice(1);
	let dir = startDir;
	for (;;) {
		try {
			await readFile10(join16(dir, rel));
			return dir;
		} catch {
			const parent = dirname7(dir);
			if (parent === dir) return null;
			dir = parent;
		}
	}
}
var inline_css_default;
var init_inline_css = __esm(() => {
	init_esm9();
	inline_css_default = {
		name: "inline-css",
		description:
			"Inline local CSS stylesheets into <style> tags to eliminate render-blocking requests.",
		async process(html, { filePath, config } = {}) {
			const opts = config || {};
			const maxSize = opts.maxSize ?? 10240;
			const { document: doc } = parseHTML(html);
			if (!doc.head) return html;
			const links = [...doc.querySelectorAll('link[rel="stylesheet"][href]')];
			if (links.length === 0) return html;
			let changed = false;
			for (const link of links) {
				const href = link.getAttribute("href");
				if (!href || isCrossOriginCss(href)) continue;
				const webRoot = filePath ? await findWebRootCss(dirname7(filePath), href) : null;
				if (!webRoot) continue;
				const cssPath = join16(webRoot, href.startsWith("/") ? href.slice(1) : href);
				let css;
				try {
					css = await readFile10(cssPath, "utf8");
				} catch {
					continue;
				}
				if (css.length > maxSize) continue;
				const style = doc.createElement("style");
				style.textContent = css;
				link.parentNode.replaceChild(style, link);
				changed = true;
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/inline-svg.js
import { readFile as readFile4, stat as stat3 } from "node:fs/promises";
import { join as join11, resolve as resolve4 } from "node:path";

var inline_svg_default;
var init_inline_svg = __esm(() => {
	inline_svg_default = {
		name: "inline-svg",
		description: "Inline small SVG files from img[src$=.svg] into the HTML.",
		async process(html, { filePath, config }) {
			const opts = config || {};
			const maxBytes = opts.maxBytes ?? 4096;
			const cwd =
				opts.cwd ||
				(filePath ? filePath.replace(/\/[^/]+$/, "") : process.cwd());
			const IMG_RE = /<img\s([^>]*)>/gi;
			let result = html;
			const replacements = [];
			for (const match of html.matchAll(IMG_RE)) {
				const [fullMatch, attrs] = match;
				const srcMatch = attrs.match(/src="([^"]+\.svg)"/i);
				if (!srcMatch) continue;
				const src = srcMatch[1];
				if (
					src.startsWith("http://") ||
					src.startsWith("https://") ||
					src.startsWith("//")
				)
					continue;
				if (/data-no-inline/.test(attrs)) continue;
				const absPath = src.startsWith("/")
					? join11(cwd, src)
					: resolve4(cwd, src);
				let fileSize;
				try {
					fileSize = (await stat3(absPath)).size;
				} catch {
					continue;
				}
				if (fileSize > maxBytes) continue;
				let svgContent;
				try {
					svgContent = await readFile4(absPath, "utf-8");
				} catch {
					continue;
				}
				svgContent = svgContent
					.replace(/<\?xml[^?]*\?>/i, "")
					.replace(/<!DOCTYPE[^>]*>/i, "")
					.trim();
				const altMatch = attrs.match(/alt="([^"]*)"/i);
				const alt = altMatch ? altMatch[1] : null;
				if (alt) {
					svgContent = svgContent.replace(
						"<svg",
						`<svg aria-label="${alt.replace(/"/g, "&quot;")}" role="img"`,
					);
				} else {
					svgContent = svgContent.replace("<svg", '<svg aria-hidden="true"');
				}
				svgContent = svgContent.replace(/(<svg[^>]*)\s+width="[^"]*"/i, "$1");
				svgContent = svgContent.replace(/(<svg[^>]*)\s+height="[^"]*"/i, "$1");
				replacements.push({ original: fullMatch, replacement: svgContent });
			}
			for (const { original, replacement } of replacements) {
				result = result.replace(original, replacement);
			}
			return result;
		},
	};
});

// src/prebuild/plugins/minify-html.js
var minify_html_default;
var init_minify_html = __esm(() => {
	minify_html_default = {
		name: "minify-html",
		description: "Collapse whitespace and remove comments from HTML output.",
		async process(html, { config }) {
			const opts = config || {};
			const removeComments = opts.removeComments !== false;
			const collapseWhitespace = opts.collapseWhitespace !== false;
			const preserved = [];
			const VERBATIM_RE = /<(pre|script|style|textarea)[\s\S]*?<\/\1>/gi;
			let protected_html = html.replace(VERBATIM_RE, (match) => {
				preserved.push(match);
				return `\uE000PRESERVED_${preserved.length - 1}\uE000`;
			});
			if (removeComments) {
				protected_html = protected_html.replace(
					/<!--(?!\[if\s)[\s\S]*?-->/g,
					"",
				);
			}
			if (collapseWhitespace) {
				protected_html = protected_html.replace(/>\s+</g, "><");
				protected_html = protected_html.replace(/\s{2,}/g, " ");
				protected_html = protected_html.trim();
			}
			protected_html = protected_html.replace(
				/\uE000PRESERVED_(\d+)\uE000/g,
				(_, i) => preserved[Number(i)],
			);
			return protected_html;
		},
	};
});

// src/prebuild/plugins/normalize-directives.js
var INTERPOLATION_RE2, STATE_PATH_RE, normalize_directives_default;
var init_normalize_directives = __esm(() => {
	init_esm9();
	INTERPOLATION_RE2 = /\$\{([\s\S]*?)\}/g;
	STATE_PATH_RE = /\bstate\.([a-zA-Z0-9_.]+)\b/g;
	normalize_directives_default = {
		name: "normalize-directives",
		description: "Normalize complex state paths into short indices",
		_pathMap: new Map(),
		_nextIndex: 0,
		async process(html) {
			const { document: doc } = parseHTML(html);
			const allElements = doc.querySelectorAll("*");
			for (const el of allElements) {
				for (const attr of el.getAttributeNames()) {
					const value = el.getAttribute(attr);
					if (!value) continue;
					const newValue = this._normalizeExpression(value);
					if (newValue !== value) {
						el.setAttribute(attr, newValue);
					}
				}
			}
			const walker = doc.createTreeWalker(doc.body || doc, 4);
			let node2;
			while ((node2 = walker.nextNode())) {
				const text = node2.textContent || "";
				if (INTERPOLATION_RE2.test(text)) {
					node2.textContent = this._normalizeExpression(text);
				}
			}
			return doc.toString();
		},
		async finalize({ outputDir }) {
			if (this._pathMap.size === 0) return this._reset();
			console.log(
				`[normalize-directives] Normalized ${this._pathMap.size} state paths`,
			);
			this._reset();
		},
		_normalizeExpression(expr) {
			let result = expr.replace(INTERPOLATION_RE2, (_match, inner) => {
				return `\${${this._normalizeStatePaths(inner)}}`;
			});
			result = this._normalizeStatePaths(result);
			return result;
		},
		_normalizeStatePaths(expr) {
			return expr.replace(STATE_PATH_RE, (_match, path) => {
				if (!this._pathMap.has(path)) {
					this._pathMap.set(path, this._nextIndex++);
				}
				const index = this._pathMap.get(path);
				return `s[${index}]`;
			});
		},
		_reset() {
			this._pathMap = new Map();
			this._nextIndex = 0;
		},
	};
});

// src/prebuild/plugins/optimize-fonts.js
var GFONTS_API = "https://fonts.googleapis.com",
	GFONTS_STATIC = "https://fonts.gstatic.com",
	optimize_fonts_default;
var init_optimize_fonts = __esm(() => {
	init_esm9();
	optimize_fonts_default = {
		name: "optimize-fonts",
		description:
			"Add preconnect for Google Fonts and inject font-display:swap.",
		async process(html) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			let hasGoogleFonts = false;
			let changed = false;
			for (const link of head.querySelectorAll("link[href]")) {
				const href = link.getAttribute("href") || "";
				if (!href.includes("fonts.googleapis.com")) continue;
				hasGoogleFonts = true;
				if (!href.includes("display=")) {
					const sep = href.includes("?") ? "&" : "?";
					link.setAttribute("href", `${href + sep}display=swap`);
					changed = true;
				}
			}
			for (const style of head.querySelectorAll("style")) {
				const text = style.textContent || "";
				if (text.includes("fonts.googleapis.com")) {
					hasGoogleFonts = true;
					if (!text.includes("display=")) {
						style.textContent = text.replace(
							/(fonts\.googleapis\.com\/css[^'")]*)/g,
							(match) =>
								match.includes("?")
									? `${match}&display=swap`
									: `${match}?display=swap`,
						);
						changed = true;
					}
				}
			}
			if (!hasGoogleFonts) return html;
			const existingPreconnects = new Set(
				[...head.querySelectorAll('link[rel="preconnect"]')].map((el) =>
					el.getAttribute("href"),
				),
			);
			for (const origin of [GFONTS_API, GFONTS_STATIC]) {
				if (!existingPreconnects.has(origin)) {
					const link = doc.createElement("link");
					link.setAttribute("rel", "preconnect");
					link.setAttribute("href", origin);
					link.setAttribute("crossorigin", "");
					head.insertBefore(link, head.firstChild);
					changed = true;
				}
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/optimize-images.js
function detectLcpCandidate(images, lcpSelector, doc) {
	if (lcpSelector) return doc.querySelector(lcpSelector);
	for (const img of images) {
		if (LCP_CLASS_RE.test(img.getAttribute("class") || "")) return img;
	}
	return images[0] ?? null;
}
var LCP_CLASS_RE, optimize_images_default;
var init_optimize_images = __esm(() => {
	init_esm9();
	LCP_CLASS_RE = /\bhero\b|\bfeatured\b|\bbanner\b|\blcp\b/i;
	optimize_images_default = {
		name: "optimize-images",
		description:
			"Add lazy loading, LCP preload, and fetchpriority hints to images",
		async process(html, { filePath, config }) {
			const { document: doc } = parseHTML(html);
			const head = doc.head;
			if (!head) return html;
			const images = [...doc.querySelectorAll("img")];
			if (images.length === 0) return html;
			for (const img of images) {
				if (!img.hasAttribute("alt")) {
					const src =
						img.getAttribute("src") ||
						img.getAttribute("bind-src") ||
						"(unknown)";
					console.warn(
						`[optimize-images] missing alt on <img src="${src}"> in ${filePath}`,
					);
				}
			}
			const skipLazy = config.skipLazy || null;
			const lcpImage = detectLcpCandidate(
				images,
				config.lcpSelector || null,
				doc,
			);
			for (const img of images) {
				if (img.closest("template")) continue;
				if (img === lcpImage) {
					img.setAttribute("fetchpriority", "high");
					if (img.getAttribute("loading") === "lazy") {
						img.removeAttribute("loading");
					}
					if (img.hasAttribute("bind-src")) {
						console.warn(
							`[optimize-images] LCP candidate has dynamic bind-src in ${filePath} \u2014 preload skipped`,
						);
					} else {
						const src = img.getAttribute("src");
						if (!src || src.includes("{")) continue;
						if (!head.querySelector(`link[rel="preload"][href="${src}"]`)) {
							const link = doc.createElement("link");
							link.setAttribute("rel", "preload");
							link.setAttribute("as", "image");
							link.setAttribute("href", src);
							head.insertBefore(link, head.firstChild);
						}
					}
				} else {
					if (skipLazy && img.matches(skipLazy)) continue;
					if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
					if (!img.hasAttribute("decoding"))
						img.setAttribute("decoding", "async");
				}
			}
			return doc.toString();
		},
	};
});

// src/prebuild/plugins/precompress-assets.js
import {
	readdir as readdir4,
	readFile as readFile5,
	writeFile as writeFile11,
} from "node:fs/promises";
import { extname as extname4, join as join12 } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, gzip } from "node:zlib";

async function collectFiles(dir, extensions) {
	const results = [];
	let entries2;
	try {
		entries2 = await readdir4(dir, { withFileTypes: true });
	} catch {
		return results;
	}
	for (const entry of entries2) {
		const full = join12(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await collectFiles(full, extensions)));
		} else if (entry.isFile() && extensions.has(extname4(entry.name))) {
			if (!entry.name.endsWith(".br") && !entry.name.endsWith(".gz")) {
				results.push(full);
			}
		}
	}
	return results;
}
var brotliCompressAsync,
	gzipAsync,
	DEFAULT_EXTENSIONS,
	precompress_assets_default;
var init_precompress_assets = __esm(() => {
	brotliCompressAsync = promisify(brotliCompress);
	gzipAsync = promisify(gzip);
	DEFAULT_EXTENSIONS = new Set([
		".html",
		".css",
		".js",
		".json",
		".svg",
		".txt",
		".xml",
		".woff2",
	]);
	precompress_assets_default = {
		name: "precompress-assets",
		description:
			"Generate .br and .gz companion files for all compressible assets.",
		async process(html) {
			return html;
		},
		async finalize({ outputDir, config }) {
			const opts = config || {};
			const doBrotli = opts.brotli !== false;
			const doGzip = opts.gzip !== false;
			const extensions = new Set(opts.extensions || DEFAULT_EXTENSIONS);
			if (!doBrotli && !doGzip) return;
			const files = await collectFiles(outputDir, extensions);
			await Promise.all(
				files.map(async (filePath) => {
					const content = await readFile5(filePath);
					const tasks = [];
					if (doBrotli) {
						tasks.push(
							brotliCompressAsync(content).then((buf) =>
								writeFile11(`${filePath}.br`, buf),
							),
						);
					}
					if (doGzip) {
						tasks.push(
							gzipAsync(content).then((buf) =>
								writeFile11(`${filePath}.gz`, buf),
							),
						);
					}
					await Promise.all(tasks);
				}),
			);
		},
	};
});

// src/prebuild/plugins/purge-unused-css.js
function purgeCSS(css, doc) {
	const result = [];
	let i = 0;
	while (i < css.length) {
		const wsMatch = css.slice(i).match(/^\s+/);
		if (wsMatch) {
			result.push(wsMatch[0]);
			i += wsMatch[0].length;
			continue;
		}
		if (css[i] === "@") {
			const block = extractBlock(css, i);
			result.push(block.text);
			i += block.length;
			continue;
		}
		const ruleMatch = css.slice(i).match(/^([^{]+)\{([^}]*)\}/s);
		if (!ruleMatch) {
			result.push(css.slice(i));
			break;
		}
		const selectorPart = ruleMatch[1].trim();
		if (selectorUsed(selectorPart, doc)) {
			result.push(ruleMatch[0]);
		}
		i += ruleMatch[0].length;
	}
	return result.join("");
}
function extractBlock(css, start) {
	let depth = 0;
	let i = start;
	let foundOpen = false;
	while (i < css.length) {
		if (css[i] === "{") {
			depth++;
			foundOpen = true;
		} else if (css[i] === "}") {
			depth--;
			if (foundOpen && depth === 0) {
				i++;
				break;
			}
		} else if (!foundOpen && css[i] === ";") {
			i++;
			break;
		}
		i++;
	}
	return { text: css.slice(start, i), length: i - start };
}
function selectorUsed(selectorGroup, doc) {
	const selectors = selectorGroup.split(",").map((s) => s.trim());
	for (const sel of selectors) {
		const base = sel.replace(/::?[\w-]+(\([^)]*\))?/g, "").trim();
		if (!base) return true;
		try {
			if (doc.querySelector(base)) return true;
		} catch {
			return true;
		}
	}
	return false;
}
var NOJS_STYLE_ATTRS, purge_unused_css_default;
var init_purge_unused_css = __esm(() => {
	init_esm9();
	NOJS_STYLE_ATTRS = [
		"data-nojs-animations",
		"data-nojs-pending-css",
		"data-nojs-skeleton-css",
		"data-nojs-view-transitions",
	];
	purge_unused_css_default = {
		name: "purge-unused-css",
		description: "Remove unused CSS rules from inline style tags.",
		async process(html) {
			const { document: doc } = parseHTML(html);
			let changed = false;
			for (const style of doc.querySelectorAll("style")) {
				if (NOJS_STYLE_ATTRS.some((attr) => style.hasAttribute(attr))) continue;
				const original = style.textContent || "";
				const purged = purgeCSS(original, doc);
				if (purged !== original) {
					style.textContent = purged;
					changed = true;
				}
			}
			return changed ? doc.toString() : html;
		},
	};
});

// src/prebuild/plugins/tree-shake-framework.js
import {
	access,
	readFile as readFile6,
	rename as rename2,
	unlink,
	writeFile as writeFile12,
} from "node:fs/promises";
import {
	dirname as dirname4,
	join as join13,
	resolve as resolve5,
} from "node:path";

function stripUnusedImports(src, keep, frameworkSrc) {
	return src
		.replace(/^import "\.\/([^"]+)";\n/gm, (_match, modPath) => {
			if (SIDE_EFFECT_MODULES.has(modPath) && !keep.has(modPath)) return "";
			return `import "${join13(frameworkSrc, modPath)}";
`;
		})
		.replace(
			/^(import\s+.*?from\s+)"\.\/([^"]+)"/gm,
			(_match, prefix, modPath) => {
				return `${prefix}"${join13(frameworkSrc, modPath)}"`;
			},
		);
}
async function findFrameworkSrc(outputDir, config) {
	if (config.frameworkSrc) {
		const p = resolve5(config.frameworkSrc);
		if (await pathExists(join13(p, "index.js"))) return p;
	}
	let dir = outputDir;
	for (let i = 0; i < 8; i++) {
		const candidate = join13(
			dir,
			"node_modules",
			"@erickxavier",
			"no-js",
			"src",
		);
		if (await pathExists(join13(candidate, "index.js"))) return candidate;
		const parent = dirname4(dir);
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
var ATTR_MODULE_MAP,
	SIDE_EFFECT_MODULES,
	NOJS_SCRIPT_RE,
	tree_shake_framework_default;
var init_tree_shake_framework = __esm(() => {
	init_esm9();
	ATTR_MODULE_MAP = {
		state: "directives/state.js",
		store: "directives/state.js",
		"persist-fields": "directives/state.js",
		get: "directives/http.js",
		post: "directives/http.js",
		put: "directives/http.js",
		patch: "directives/http.js",
		delete: "directives/http.js",
		bind: "directives/binding.js",
		model: "directives/binding.js",
		if: "directives/conditionals.js",
		"else-if": "directives/conditionals.js",
		else: "directives/conditionals.js",
		show: "directives/conditionals.js",
		hide: "directives/conditionals.js",
		switch: "directives/conditionals.js",
		animate: "directives/conditionals.js",
		"animate-enter": "directives/conditionals.js",
		"animate-leave": "directives/conditionals.js",
		transition: "directives/conditionals.js",
		for: "directives/loops.js",
		"class-if": "directives/styling.js",
		"toggle-class": "directives/styling.js",
		"add-class": "directives/styling.js",
		"remove-class": "directives/styling.js",
		"style-if": "directives/styling.js",
		on: "directives/events.js",
		ref: "directives/refs.js",
		validate: "directives/validation.js",
		"form-validate": "directives/validation.js",
		required: "directives/validation.js",
		"min-length": "directives/validation.js",
		"max-length": "directives/validation.js",
		pattern: "directives/validation.js",
		t: "directives/i18n.js",
		"bind-t": "directives/i18n.js",
		lang: "directives/i18n.js",
		draggable: "directives/dnd.js",
		droppable: "directives/dnd.js",
		"drag-handle": "directives/dnd.js",
		"page-title": "directives/head.js",
		"page-description": "directives/head.js",
		"page-canonical": "directives/head.js",
		"page-jsonld": "directives/head.js",
	};
	SIDE_EFFECT_MODULES = new Set([
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
	NOJS_SCRIPT_RE = /(?:cdn\.no-js\.dev|[/@]no-js\b|\/nojs(?:\.min)?\.js)/i;
	tree_shake_framework_default = {
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
					"[tree-shake-framework] no no-js script tag found \u2014 skipping",
				);
				return this._reset();
			}
			const frameworkSrc = await findFrameworkSrc(outputDir, config);
			if (!frameworkSrc) {
				console.warn(
					`[tree-shake-framework] @erickxavier/no-js source not found \u2014 skipping.
` + "  Install the package or set config.frameworkSrc to the src/ directory.",
				);
				return this._reset();
			}
			const keep = new Set(this._usedModules);
			const removed = [...SIDE_EFFECT_MODULES].filter((m) => !keep.has(m));
			const indexContent = await readFile6(
				join13(frameworkSrc, "index.js"),
				"utf-8",
			);
			const entry = stripUnusedImports(indexContent, keep, frameworkSrc);
			const entryPath = join13(outputDir, ".nojs-tree-entry.tmp.js");
			const bundleName = "nojs.bundle.js";
			await writeFile12(entryPath, entry, "utf-8");
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
				const builtPath = result.outputs[0]?.path;
				if (builtPath && builtPath !== join13(outputDir, bundleName)) {
					await rename2(builtPath, join13(outputDir, bundleName));
				}
				const srcEscaped = this._scriptSrc.replace(
					/[.*+?^${}()|[\]\\]/g,
					"\\$&",
				);
				const scriptRe = new RegExp(
					`(<script[^>]*\\ssrc=")${srcEscaped}"`,
					"g",
				);
				for (const filePath of processedFiles) {
					const html = await readFile6(filePath, "utf-8");
					const updated = html.replace(scriptRe, `$1${bundleName}"`);
					if (updated !== html) await writeFile12(filePath, updated, "utf-8");
				}
				const keptNames = [...keep].map((m) =>
					m.replace("directives/", "").replace(".js", ""),
				);
				const removedNames = removed.map((m) =>
					m.replace("directives/", "").replace(".js", ""),
				);
				console.log(
					`[tree-shake-framework] ${join13(outputDir, bundleName)}: built` +
						`
  kept:    ${keptNames.join(", ") || "(core only)"}` +
						`
  removed: ${removedNames.join(", ") || "none"}`,
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
});

// src/prebuild/plugins/index.js
var builtinPlugins;
var init_plugins = __esm(() => {
	init_audit_accessibility();
	init_audit_meta_tags();
	init_compile_templates();
	init_differential_serving();
	init_enforce_script_loading();
	init_fingerprint_assets();
	init_generate_bundle_report();
	init_generate_deploy_config();
	init_generate_early_hints();
	init_generate_import_map();
	init_generate_pwa_manifest();
	init_generate_responsive_images();
	init_generate_sitemap();
	init_generate_service_worker();
	init_hoist_static_content();
	init_inject_canonical_url();
	init_inject_csp_hashes();
	init_inject_event_delegation();
	init_inject_head_attrs();
	init_inject_i18n_preload();
	init_inject_jsonld();
	init_inject_modulepreload();
	init_inject_og_twitter();
	init_inject_resource_hints();
	init_inject_speculation_rules();
	init_inject_sri_hashes();
	init_inject_template_hints();
	init_inject_view_transitions();
	init_inject_visibility_css();
	init_inline_animation_css();
	init_inline_critical_css();
	init_inline_css();
	init_inline_svg();
	init_minify_html();
	init_normalize_directives();
	init_optimize_fonts();
	init_optimize_images();
	init_precompress_assets();
	init_purge_unused_css();
	init_tree_shake_framework();
	builtinPlugins = {
		[inject_resource_hints_default.name]: inject_resource_hints_default,
		[inject_head_attrs_default.name]: inject_head_attrs_default,
		[inject_i18n_preload_default.name]: inject_i18n_preload_default,
		[inject_speculation_rules_default.name]: inject_speculation_rules_default,
		[inject_og_twitter_default.name]: inject_og_twitter_default,
		[generate_sitemap_default.name]: generate_sitemap_default,
		[generate_service_worker_default.name]: generate_service_worker_default,
		[generate_bundle_report_default.name]: generate_bundle_report_default,
		[generate_early_hints_default.name]: generate_early_hints_default,
		[generate_import_map_default.name]: generate_import_map_default,
		[generate_deploy_config_default.name]: generate_deploy_config_default,
		[inline_animation_css_default.name]: inline_animation_css_default,
		[inject_visibility_css_default.name]: inject_visibility_css_default,
		[inject_template_hints_default.name]: inject_template_hints_default,
		[minify_html_default.name]: minify_html_default,
		[inject_view_transitions_default.name]: inject_view_transitions_default,
		[inject_modulepreload_default.name]: inject_modulepreload_default,
		[audit_meta_tags_default.name]: audit_meta_tags_default,
		[inject_canonical_url_default.name]: inject_canonical_url_default,
		[enforce_script_loading_default.name]: enforce_script_loading_default,
		[inject_csp_hashes_default.name]: inject_csp_hashes_default,
		[inject_sri_hashes_default.name]: inject_sri_hashes_default,
		[precompress_assets_default.name]: precompress_assets_default,
		[inject_jsonld_default.name]: inject_jsonld_default,
		[inline_critical_css_default.name]: inline_critical_css_default,
		[inline_css_default.name]: inline_css_default,
		[optimize_fonts_default.name]: optimize_fonts_default,
		[generate_responsive_images_default.name]:
			generate_responsive_images_default,
		[generate_pwa_manifest_default.name]: generate_pwa_manifest_default,
		[purge_unused_css_default.name]: purge_unused_css_default,
		[audit_accessibility_default.name]: audit_accessibility_default,
		[inline_svg_default.name]: inline_svg_default,
		[tree_shake_framework_default.name]: tree_shake_framework_default,
		[inject_event_delegation_default.name]: inject_event_delegation_default,
		[compile_templates_default.name]: compile_templates_default,
		[differential_serving_default.name]: differential_serving_default,
		[hoist_static_content_default.name]: hoist_static_content_default,
		[normalize_directives_default.name]: normalize_directives_default,
		[optimize_images_default.name]: optimize_images_default,
		[fingerprint_assets_default.name]: fingerprint_assets_default,
	};
});

// src/prebuild/runner.js
async function prebuild(options = {}) {
	const cwd = options.cwd || process.cwd();
	const config = await loadConfig(options.configPath, cwd);
	const input = options.input || config.input;
	const output = options.output || config.output;
	const pluginConfig = { ...config.plugins, ...options.plugins };
	const activePlugins = resolvePlugins(pluginConfig);
	if (activePlugins.length === 0) {
		return { files: 0, plugins: [] };
	}
	const files = await discoverFiles(input, cwd);
	if (files.length === 0) {
		return { files: 0, plugins: activePlugins.map((p) => p.name) };
	}
	const processedFiles = [];
	for (const filePath of files) {
		let html = await readHtml(filePath);
		for (const plugin of activePlugins) {
			const pluginOpts = pluginConfig[plugin.name];
			const opts = typeof pluginOpts === "object" ? pluginOpts : {};
			html = await plugin.process(html, {
				filePath,
				config: opts,
				allFiles: files,
			});
		}
		const dest = await writeHtml(filePath, html, { outputDir: output, cwd });
		processedFiles.push(dest);
	}
	for (const plugin of activePlugins) {
		if (typeof plugin.finalize === "function") {
			const pluginOpts = pluginConfig[plugin.name];
			const opts = typeof pluginOpts === "object" ? pluginOpts : {};
			await plugin.finalize({
				outputDir: output || cwd,
				config: opts,
				processedFiles,
			});
		}
	}
	return {
		files: processedFiles.length,
		plugins: activePlugins.map((p) => p.name),
	};
}
function resolvePlugins(pluginConfig) {
	const active = [];
	for (const [name, value] of Object.entries(pluginConfig)) {
		if (value === false) continue;
		const plugin = builtinPlugins[name];
		if (!plugin) {
			throw new Error(
				`Unknown plugin: "${name}". Available: ${Object.keys(builtinPlugins).join(", ")}`,
			);
		}
		active.push(plugin);
	}
	return active;
}
var init_runner = __esm(() => {
	init_config();
	init_html();
	init_plugins();
});

// src/commands/prebuild.js
var exports_prebuild = {};
__export(exports_prebuild, {
	run: () => run2,
});
async function run2(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(HELP2.trim());
		return;
	}
	if (argv.includes("--list")) {
		console.log(`Available prebuild plugins:
`);
		for (const [name, plugin] of Object.entries(builtinPlugins)) {
			console.log(`  ${name}`);
			console.log(`    ${plugin.description}
`);
		}
		return;
	}
	const args = parseArgs(argv);
	if (args.dryRun) {
		const config = await loadConfig(args.config);
		const input = args.input || config.input;
		const files = await discoverFiles(input);
		console.log(`Would process ${files.length} file(s):`);
		for (const f of files) console.log(`  ${f}`);
		return;
	}
	const options = {
		...(args.input && { input: args.input }),
		...(args.output && { output: args.output }),
		...(args.config && { configPath: args.config }),
	};
	if (args.plugins.length > 0) {
		options.plugins = {};
		for (const name of args.plugins) {
			options.plugins[name] = true;
		}
	}
	const result = await prebuild(options);
	console.log(
		`Done. Processed ${result.files} file(s) with ${result.plugins.length} plugin(s): ${result.plugins.join(", ") || "(none)"}`,
	);
}
function parseArgs(argv) {
	const args = {
		input: null,
		output: null,
		config: null,
		plugins: [],
		dryRun: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--input":
				args.input = argv[++i];
				break;
			case "--output":
				args.output = argv[++i];
				break;
			case "--config":
				args.config = argv[++i];
				break;
			case "--plugin":
				args.plugins.push(argv[++i]);
				break;
			case "--dry-run":
				args.dryRun = true;
				break;
			default:
				throw new Error(
					`Unknown option: ${arg}. Run "nojs prebuild --help" for usage.`,
				);
		}
	}
	return args;
}
var HELP2 = `
nojs prebuild \u2014 Run build-time optimizations on HTML files

Usage:
  nojs prebuild [options]

Options:
  --input <glob>      HTML files to process (default: "**/*.html")
  --output <dir>      Output directory (default: in-place)
  --config <path>     Path to config file (default: auto-detect)
  --plugin <name>     Run only this plugin (can be repeated)
  --list              List available plugins
  --dry-run           Show what would be processed without writing
  -h, --help          Show this help

Examples:
  nojs prebuild
  nojs prebuild --input "pages/**/*.html" --output dist/
  nojs prebuild --plugin inject-head-attrs --plugin inject-resource-hints
`;
var init_prebuild = __esm(() => {
	init_config();
	init_html();
	init_plugins();
	init_runner();
});

// src/dev/server.js
import { watch } from "node:fs";
import { stat as stat4 } from "node:fs/promises";
import {
	extname as extname5,
	join as join14,
	resolve as resolve6,
} from "node:path";

function logRequest(method, pathname, status, note) {
	const color = STATUS_COLORS[Math.floor(status / 100)] || "";
	const suffix = note ? ` ${DIM}${note}${RESET}` : "";
	console.log(`  ${color}${status}${RESET} ${method} ${pathname}${suffix}`);
}
async function createServer(options = {}) {
	const port = options.port || 3000;
	const root = resolve6(options.root || ".");
	const liveReload = options.liveReload !== false;
	const openBrowser = options.open || false;
	const quiet = options.quiet || false;
	const sseControllers = new Set();
	if (liveReload) {
		let debounceTimer = null;
		const watcher = watch(root, { recursive: true }, (_eventType, filename) => {
			if (
				!filename ||
				filename.startsWith(".") ||
				filename.includes("node_modules")
			)
				return;
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				if (!quiet) console.log(`  ${DIM}reload${RESET} ${filename} changed`);
				for (const controller of sseControllers) {
					try {
						controller.enqueue(`event: reload
data: 

`);
					} catch {
						sseControllers.delete(controller);
					}
				}
			}, 100);
		});
		process.on("exit", () => watcher.close());
	}
	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);
			let pathname;
			try {
				pathname = decodeURIComponent(url.pathname);
			} catch {
				if (!quiet) logRequest(req.method, url.pathname, 400, "bad encoding");
				return new Response("Bad request", {
					status: 400,
					headers: { "Content-Type": "text/plain" },
				});
			}
			const method = req.method;
			if (pathname.includes("\x00")) {
				if (!quiet) logRequest(method, pathname, 400, "null byte");
				return new Response("Bad request", {
					status: 400,
					headers: { "Content-Type": "text/plain" },
				});
			}
			if (pathname === "/__nojs_reload") {
				if (sseControllers.size >= MAX_SSE_CLIENTS) {
					return new Response("Too many connections", {
						status: 503,
						headers: { "Content-Type": "text/plain" },
					});
				}
				let controller;
				const stream = new ReadableStream({
					start(c) {
						controller = c;
						sseControllers.add(controller);
						controller.enqueue(`data: connected

`);
					},
					cancel() {
						sseControllers.delete(controller);
					},
				});
				req.signal.addEventListener("abort", () => {
					sseControllers.delete(controller);
				});
				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			}
			try {
				let filePath = join14(root, pathname);
				const realFile = resolve6(filePath);
				if (!realFile.startsWith(`${root}/`) && realFile !== root) {
					if (!quiet)
						logRequest(method, pathname, 403, "path traversal blocked");
					return new Response("Forbidden", {
						status: 403,
						headers: { "Content-Type": "text/plain" },
					});
				}
				let fileExists = await exists(filePath);
				if (fileExists) {
					const fileStat = await stat4(filePath);
					if (fileStat.isDirectory()) {
						filePath = join14(filePath, "index.html");
						fileExists = await exists(filePath);
					}
				}
				if (!fileExists && !extname5(pathname)) {
					filePath = join14(root, "index.html");
					fileExists = await exists(filePath);
				}
				if (!fileExists) {
					if (!quiet) logRequest(method, pathname, 404);
					return new Response("Not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}
				const ext = extname5(filePath);
				const mime = MIME_TYPES[ext] || "application/octet-stream";
				const relative7 = filePath.replace(root, ".");
				const spaNote =
					relative7 !== `.${pathname}` ? `\u2192 ${relative7}` : "";
				if (!quiet) logRequest(method, pathname, 200, spaNote);
				if (liveReload && mime === "text/html") {
					let html = await Bun.file(filePath).text();
					if (html.includes("</body>")) {
						html = html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`);
					} else {
						html += LIVE_RELOAD_SCRIPT;
					}
					return new Response(html, {
						headers: { "Content-Type": mime, "Cache-Control": "no-cache" },
					});
				}
				return new Response(Bun.file(filePath), {
					headers: { "Content-Type": mime, "Cache-Control": "no-cache" },
				});
			} catch (err) {
				if (!quiet) logRequest(req.method, pathname, 500, err.message);
				return new Response("Internal server error", {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				});
			}
		},
	});
	console.log(`
  No.JS dev server running at http://localhost:${port}/`);
	if (liveReload) console.log("  Live reload enabled");
	console.log(`  Press Ctrl+C to stop
`);
	if (openBrowser) {
		const cmd =
			process.platform === "darwin"
				? "open"
				: process.platform === "win32"
					? "start"
					: "xdg-open";
		Bun.spawn([cmd, `http://localhost:${port}`]);
	}
	return server;
}
async function exists(filePath) {
	const f = Bun.file(filePath);
	return f.exists();
}
var MIME_TYPES,
	MAX_SSE_CLIENTS = 100,
	LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  function connect() {
    var source = new EventSource('/__nojs_reload');
    source.addEventListener('reload', function() { location.reload(); });
    source.onerror = function() {
      source.close();
      setTimeout(connect, 2000);
    };
  }
  connect();
})();
</script>
`,
	STATUS_COLORS,
	RESET = "\x1B[0m",
	DIM = "\x1B[2m";
var init_server = __esm(() => {
	MIME_TYPES = {
		".html": "text/html",
		".css": "text/css",
		".js": "application/javascript",
		".mjs": "application/javascript",
		".json": "application/json",
		".svg": "image/svg+xml",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".webp": "image/webp",
		".ico": "image/x-icon",
		".woff": "font/woff",
		".woff2": "font/woff2",
		".ttf": "font/ttf",
		".tpl": "text/html",
		".md": "text/markdown",
		".xml": "application/xml",
		".txt": "text/plain",
	};
	STATUS_COLORS = {
		2: "\x1B[32m",
		3: "\x1B[36m",
		4: "\x1B[33m",
		5: "\x1B[31m",
	};
});

// src/commands/dev.js
var exports_dev = {};
__export(exports_dev, {
	run: () => run3,
});
async function run3(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(HELP3.trim());
		return;
	}
	const args = parseArgs2(argv);
	const server = await createServer({
		port: args.port,
		root: args.root,
		liveReload: args.liveReload,
		open: args.open,
		quiet: args.quiet,
	});
	const shutdown = () => {
		console.log(`
Shutting down...`);
		server.stop();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
function parseArgs2(argv) {
	const args = {
		port: 3000,
		root: ".",
		liveReload: true,
		open: false,
		quiet: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--port":
				args.port = parseInt(argv[++i], 10);
				break;
			case "--no-reload":
				args.liveReload = false;
				break;
			case "--open":
				args.open = true;
				break;
			case "--quiet":
			case "-q":
				args.quiet = true;
				break;
			default:
				if (!arg.startsWith("-")) args.root = arg;
				else
					throw new Error(
						`Unknown option: ${arg}. Run "nojs dev --help" for usage.`,
					);
		}
	}
	return args;
}
var HELP3 = `
nojs dev \u2014 Start a local dev server with live reload

Usage:
  nojs dev [options]

Arguments:
  path                Root directory to serve (default: current directory)

Options:
  --port <port>       Port number (default: 3000)
  --no-reload         Disable live reload
  --open              Open browser on start
  --quiet, -q         Suppress request logging
  -h, --help          Show this help

Features:
  - Serves HTML files with correct MIME types
  - Live reload on file changes (via SSE)
  - SPA fallback for clean URLs (extensionless paths serve index.html)
  - Rewrites CDN URLs to local No.JS build if available
`;
var init_dev = __esm(() => {
	init_server();
});

// src/validate/rules.js
function validateFiles(html, _filePath) {
	const { document: doc } = parseHTML(html);
	const issues = [];
	for (const rule of RULES.filter((r) => r.global)) {
		const result = rule.test(doc);
		if (result) {
			const messages = Array.isArray(result) ? result : [result];
			for (const msg of messages) {
				issues.push({ rule: rule.name, severity: rule.severity, message: msg });
			}
		}
	}
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
var FETCH_DIRECTIVES, RULES;
var init_rules = __esm(() => {
	init_esm9();
	FETCH_DIRECTIVES = ["get", "post", "put", "patch", "delete"];
	RULES = [
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
					return `each="${value}" \u2014 missing "in" keyword. Expected format: each="item in items".`;
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
				const formTags2 = ["INPUT", "SELECT", "TEXTAREA"];
				if (!formTags2.includes(el.tagName)) {
					return `model="${el.getAttribute("model")}" on <${el.tagName.toLowerCase()}> \u2014 model should be used on form elements (input, select, textarea).`;
				}
				return null;
			},
		},
		{
			name: "bind-html-warning",
			severity: "warning",
			test(el) {
				if (!el.hasAttribute("bind-html")) return null;
				return `bind-html="${el.getAttribute("bind-html")}" \u2014 ensure the bound content is trusted. No.JS sanitizes by default, but be careful with user-generated content.`;
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
					return `Route templates found but no element with "route-view" attribute. Routes won't render.`;
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
				if (!el.hasAttribute("each") && !el.hasAttribute("foreach"))
					return null;
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
});

// src/commands/validate.js
var exports_validate = {};
__export(exports_validate, {
	run: () => run4,
});
async function run4(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(HELP4.trim());
		return;
	}
	const args = parseArgs3(argv);
	const files = await discoverFiles(args.glob);
	if (files.length === 0) {
		console.log("No HTML files found.");
		return;
	}
	let totalErrors = 0;
	let totalWarnings = 0;
	const allResults = [];
	for (const filePath of files) {
		const html = await readHtml(filePath);
		const issues = validateFiles(html, filePath);
		if (issues.length > 0) {
			allResults.push({ filePath, issues });
			for (const issue of issues) {
				if (issue.severity === "error") totalErrors++;
				else totalWarnings++;
			}
		}
	}
	if (args.format === "json") {
		console.log(JSON.stringify(allResults, null, 2));
	} else {
		if (allResults.length === 0) {
			console.log(`Validated ${files.length} file(s). No issues found.`);
		} else {
			for (const { filePath, issues } of allResults) {
				console.log(`
${filePath}`);
				for (const issue of issues) {
					const icon = issue.severity === "error" ? "x" : "!";
					console.log(`  ${icon} ${issue.message} [${issue.rule}]`);
				}
			}
			console.log(`
${totalErrors} error(s), ${totalWarnings} warning(s) in ${allResults.length} file(s)`);
		}
	}
	if (totalErrors > 0) process.exit(1);
}
function parseArgs3(argv) {
	const args = { glob: "**/*.html", format: "pretty", fix: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--format") args.format = argv[++i];
		else if (arg === "--fix") args.fix = true;
		else if (!arg.startsWith("-")) args.glob = arg;
		else
			throw new Error(
				`Unknown option: ${arg}. Run "nojs validate --help" for usage.`,
			);
	}
	return args;
}
var HELP4 = `
nojs validate \u2014 Validate No.JS templates for common mistakes

Usage:
  nojs validate [options] [glob]

Arguments:
  glob                HTML files to validate (default: "**/*.html")

Options:
  --fix               Auto-fix safe issues (e.g., add missing key on loops)
  --format <format>   Output format: "pretty" or "json" (default: "pretty")
  -h, --help          Show this help

Examples:
  nojs validate
  nojs validate "pages/**/*.html"
  nojs validate --format json
`;
var init_validate = __esm(() => {
	init_html();
	init_rules();
});

// src/plugin/registry.js
async function searchRegistry(query2) {
	const results = [];
	const cdnResults = await searchCdn(query2);
	results.push(...cdnResults);
	const npmResults = await searchNpm(query2);
	results.push(...npmResults);
	return results;
}
async function searchCdn(query2) {
	try {
		const res = await fetch(CDN_REGISTRY_URL);
		if (!res.ok) return [];
		const registry = await res.json();
		const q = query2.toLowerCase();
		return (registry.plugins || [])
			.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.description?.toLowerCase().includes(q),
			)
			.map((p) => ({ ...p, source: "cdn" }));
	} catch {
		return [];
	}
}
async function searchNpm(query2) {
	try {
		const url = `${NPM_SEARCH_URL}?text=nojs-plugin+${encodeURIComponent(query2)}&size=10`;
		const res = await fetch(url);
		if (!res.ok) return [];
		const data = await res.json();
		return (data.objects || []).map((obj) => ({
			name: obj.package.name,
			description: obj.package.description,
			version: obj.package.version,
			source: "npm",
		}));
	} catch {
		return [];
	}
}
var CDN_REGISTRY_URL = "https://cdn.no-js.dev/plugins/registry.json",
	NPM_SEARCH_URL = "https://registry.npmjs.org/-/v1/search";

// src/plugin/manager.js
import { createHash as createHash5 } from "node:crypto";
import {
	readFile as readFile7,
	writeFile as writeFile13,
} from "node:fs/promises";
import { resolve as resolve7 } from "node:path";

function validatePackageName(name) {
	if (!NPM_NAME_RE.test(name)) {
		throw new Error(
			`Invalid package name: "${name}". Only lowercase alphanumeric, hyphens, dots, tildes, and scoped names are allowed.`,
		);
	}
}
async function search(query2) {
	console.log(`Searching for "${query2}"...
`);
	const results = await searchRegistry(query2);
	if (results.length === 0) {
		console.log("No plugins found.");
		return;
	}
	for (const plugin of results) {
		const source = plugin.source === "cdn" ? "(official)" : "(npm)";
		console.log(`  ${plugin.name} ${source}`);
		if (plugin.description) console.log(`    ${plugin.description}`);
		console.log("");
	}
	console.log(`Found ${results.length} plugin(s).`);
}
async function install(name) {
	const config = await loadProjectConfig();
	const isNpm = name.startsWith("npm:");
	const cleanName = isNpm ? name.slice(4) : name;
	validatePackageName(cleanName);
	if (config.plugins?.some((p) => p.name === cleanName)) {
		console.log(`Plugin "${cleanName}" is already installed.`);
		return;
	}
	if (isNpm) {
		console.log(`Installing ${cleanName} from npm...`);
		Bun.spawnSync(["npm", "install", cleanName], {
			stdio: ["inherit", "inherit", "inherit"],
		});
		config.plugins = config.plugins || [];
		config.plugins.push({
			name: cleanName,
			source: "npm",
			installed: new Date().toISOString().split("T")[0],
		});
	} else {
		const cdnUrl = `${CDN_BASE}/${cleanName}.js`;
		console.log(`Installing ${cleanName} from CDN...`);
		const integrity = await computeIntegrity(cdnUrl);
		config.plugins = config.plugins || [];
		config.plugins.push({
			name: cleanName,
			source: "cdn",
			url: cdnUrl,
			integrity,
			installed: new Date().toISOString().split("T")[0],
		});
	}
	await saveProjectConfig(config);
	console.log(`
Plugin "${cleanName}" installed.`);
	console.log(`
Add to your HTML:`);
	if (isNpm) {
		console.log(
			`  <script src="node_modules/${cleanName}/dist/index.js"></script>`,
		);
	} else {
		const plugin = config.plugins.find((p) => p.name === cleanName);
		console.log(
			`  <script src="${CDN_BASE}/${cleanName}.js" integrity="${plugin.integrity}" crossorigin="anonymous"></script>`,
		);
	}
}
async function update2(name) {
	const config = await loadProjectConfig();
	const cleanName = name.startsWith("npm:") ? name.slice(4) : name;
	validatePackageName(cleanName);
	const plugin = config.plugins?.find((p) => p.name === cleanName);
	if (!plugin) {
		console.log(
			`Plugin "${cleanName}" is not installed. Run "nojs plugin install ${name}" first.`,
		);
		return;
	}
	if (plugin.source === "npm") {
		console.log(`Updating ${cleanName} from npm...`);
		Bun.spawnSync(["npm", "update", cleanName], {
			stdio: ["inherit", "inherit", "inherit"],
		});
	} else {
		const cdnUrl = `${CDN_BASE}/${cleanName}.js`;
		const integrity = await computeIntegrity(cdnUrl);
		plugin.integrity = integrity;
		console.log(`CDN plugin integrity updated.`);
	}
	plugin.updated = new Date().toISOString().split("T")[0];
	await saveProjectConfig(config);
	console.log(`Plugin "${cleanName}" updated.`);
}
async function remove2(name) {
	const config = await loadProjectConfig();
	const cleanName = name.startsWith("npm:") ? name.slice(4) : name;
	validatePackageName(cleanName);
	const idx = config.plugins?.findIndex((p) => p.name === cleanName);
	if (idx === undefined || idx === -1) {
		console.log(`Plugin "${cleanName}" is not installed.`);
		return;
	}
	const plugin = config.plugins[idx];
	if (plugin.source === "npm") {
		console.log(`Removing ${cleanName} from npm...`);
		Bun.spawnSync(["npm", "uninstall", cleanName], {
			stdio: ["inherit", "inherit", "inherit"],
		});
	}
	config.plugins.splice(idx, 1);
	await saveProjectConfig(config);
	console.log(`Plugin "${cleanName}" removed.`);
	console.log("Remember to remove the <script> tag from your HTML.");
}
async function list() {
	const config = await loadProjectConfig();
	const plugins = config.plugins || [];
	if (plugins.length === 0) {
		console.log(
			'No plugins installed. Run "nojs plugin search <query>" to find plugins.',
		);
		return;
	}
	console.log(`Installed plugins:
`);
	for (const plugin of plugins) {
		const source = plugin.source === "cdn" ? "(CDN)" : "(npm)";
		console.log(`  ${plugin.name} ${source}`);
		if (plugin.url) console.log(`    ${plugin.url}`);
		console.log("");
	}
}
async function computeIntegrity(url) {
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(`Failed to fetch plugin from ${url}: HTTP ${res.status}`);
	const buffer = await res.arrayBuffer();
	const hash = createHash5("sha384")
		.update(Buffer.from(buffer))
		.digest("base64");
	return `sha384-${hash}`;
}
async function loadProjectConfig() {
	const configPath = resolve7(process.cwd(), CONFIG_FILE);
	try {
		const content = await readFile7(configPath, "utf-8");
		return JSON.parse(content);
	} catch {
		return { name: "nojs-project", version: "0.1.0", plugins: [] };
	}
}
async function saveProjectConfig(config) {
	const configPath = resolve7(process.cwd(), CONFIG_FILE);
	await writeFile13(
		configPath,
		`${JSON.stringify(config, null, 2)}
`,
		"utf-8",
	);
}
var CONFIG_FILE = "nojs.config.json",
	CDN_BASE = "https://cdn.no-js.dev/plugins",
	NPM_NAME_RE;
var init_manager = __esm(() => {
	NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
});

// src/commands/plugin.js
var exports_plugin = {};
__export(exports_plugin, {
	run: () => run5,
});
async function run5(argv) {
	if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
		console.log(HELP5.trim());
		return;
	}
	const action = argv[0];
	const args = argv.slice(1);
	switch (action) {
		case "search":
			if (!args[0]) throw new Error("Usage: nojs plugin search <query>");
			await search(args[0]);
			break;
		case "install":
			if (!args[0]) throw new Error("Usage: nojs plugin install <name>");
			await install(args[0]);
			break;
		case "update":
			if (!args[0]) throw new Error("Usage: nojs plugin update <name>");
			await update2(args[0]);
			break;
		case "remove":
			if (!args[0]) throw new Error("Usage: nojs plugin remove <name>");
			await remove2(args[0]);
			break;
		case "list":
			await list();
			break;
		default:
			throw new Error(
				`Unknown action: "${action}". Run "nojs plugin --help" for usage.`,
			);
	}
}
var HELP5 = `
nojs plugin \u2014 Manage No.JS plugins

Usage:
  nojs plugin <action> [options]

Actions:
  search <query>      Search for plugins (CDN registry + npm)
  install <name>      Install a plugin
  update <name>       Update a plugin to latest version
  remove <name>       Remove an installed plugin
  list                List installed plugins

Plugin sources:
  Official (CDN):     nojs plugin install carousel
  npm:                nojs plugin install npm:@someone/nojs-carousel

Options:
  -h, --help          Show this help

Examples:
  nojs plugin search chart
  nojs plugin install carousel
  nojs plugin install npm:@someone/nojs-carousel
  nojs plugin update carousel
  nojs plugin remove carousel
  nojs plugin list
`;
var init_plugin = __esm(() => {
	init_manager();
});
// package.json
var package_default = {
	name: "@dieison-depra/nojs-cli-bun",
	version: "1.0.1",
	description:
		"Official CLI for No.JS \u2014 scaffold projects, optimize HTML, run dev server, validate templates, and manage plugins",
	main: "src/cli.js",
	bin: {
		nojs: "bin/nojs.js",
	},
	type: "module",
	scripts: {
		test: "bun test",
		"test:watch": "bun test --watch",
		"test:coverage": "bun test --coverage",
		lint: "biome lint .",
		"lint:fix": "biome lint --write .",
		format: "biome format --write .",
		check: "biome check --write .",
		knip: "knip",
		build: "bun build ./src/cli.js --target bun --outfile ./bin/nojs.js",
		prepublishOnly: "bun run build && bun test",
	},
	publishConfig: {
		access: "public",
		provenance: true,
	},
	keywords: [
		"nojs",
		"cli",
		"scaffold",
		"prebuild",
		"seo",
		"resource-hints",
		"speculation-rules",
		"sitemap",
		"html-optimization",
		"dev-server",
		"validation",
		"plugins",
	],
	author: "dieison-depra",
	license: "MIT",
	repository: {
		type: "git",
		url: "git+https://github.com/dieison-depra/nojs-cli-bun.git",
	},
	homepage: "https://github.com/dieison-depra/nojs-cli-bun#readme",
	bugs: {
		url: "https://github.com/dieison-depra/nojs-cli-bun/issues",
	},
	files: ["src/", "bin/"],
	engines: {
		bun: ">=1.3.11",
	},
	dependencies: {
		linkedom: "^0.18.9",
	},
	devDependencies: {
		"@biomejs/biome": "^2.4.7",
		"bun-types": "^1.3.11",
		knip: "^5.87.0",
	},
};

// src/cli.js
var COMMANDS = {
	init: () => Promise.resolve().then(() => (init_init(), exports_init)),
	prebuild: () =>
		Promise.resolve().then(() => (init_prebuild(), exports_prebuild)),
	dev: () => Promise.resolve().then(() => (init_dev(), exports_dev)),
	validate: () =>
		Promise.resolve().then(() => (init_validate(), exports_validate)),
	plugin: () => Promise.resolve().then(() => (init_plugin(), exports_plugin)),
};
var ALIASES = {
	i: "init",
	b: "prebuild",
	d: "dev",
	v: "validate",
	p: "plugin",
};
var HELP6 = `
nojs \u2014 Official CLI for the No.JS framework

Usage:
  nojs <command> [options]

Commands:
  init      (i)     Scaffold a new No.JS project (interactive wizard)
  prebuild  (b)     Run build-time optimizations on HTML files
  dev       (d)     Start a local dev server with live reload
  validate  (v)     Validate No.JS templates for common mistakes
  plugin    (p)     Search, install, update, and remove plugins

Options:
  -h, --help        Show this help
  -v, --version     Show version

Run "nojs <command> --help" for command-specific help.

Documentation: https://github.com/ErickXavier/NoJS-CLI
`;
async function run6(argv) {
	const raw = argv[0];
	if (!raw || raw === "-h" || raw === "--help" || raw === "help") {
		console.log(HELP6.trim());
		return;
	}
	if (raw === "-v" || raw === "--version" || raw === "version") {
		console.log(package_default.version);
		return;
	}
	const command = ALIASES[raw] || raw;
	const loader = COMMANDS[command];
	if (!loader) {
		console.error(`Unknown command: "${raw}". Run "nojs --help" for usage.`);
		process.exit(1);
	}
	try {
		const mod = await loader();
		await mod.run(argv.slice(1));
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
}

export { run6 as run };
run6(process.argv.slice(2));
