import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchRegistry } from "./registry.js";

const CONFIG_FILE = "nojs.config.json";
const CDN_BASE = "https://cdn.no-js.dev/plugins";
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function validatePackageName(name) {
	if (!NPM_NAME_RE.test(name)) {
		throw new Error(
			`Invalid package name: "${name}". Only lowercase alphanumeric, hyphens, dots, tildes, and scoped names are allowed.`,
		);
	}
}

/**
 * Search for plugins in the CDN registry and npm.
 */
export async function search(query) {
	console.log(`Searching for "${query}"...\n`);

	const results = await searchRegistry(query);

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

/**
 * Install a plugin.
 *
 * @param {string} name - Plugin name. Prefix with "npm:" for npm packages.
 */
export async function install(name) {
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
	console.log(`\nPlugin "${cleanName}" installed.`);
	console.log(`\nAdd to your HTML:`);

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

/**
 * Update an installed plugin.
 */
export async function update(name) {
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

/**
 * Remove an installed plugin.
 */
export async function remove(name) {
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

/**
 * List installed plugins.
 */
export async function list() {
	const config = await loadProjectConfig();
	const plugins = config.plugins || [];

	if (plugins.length === 0) {
		console.log(
			'No plugins installed. Run "nojs plugin search <query>" to find plugins.',
		);
		return;
	}

	console.log("Installed plugins:\n");
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
	const hash = createHash("sha384")
		.update(Buffer.from(buffer))
		.digest("base64");
	return `sha384-${hash}`;
}

async function loadProjectConfig() {
	const configPath = resolve(process.cwd(), CONFIG_FILE);
	try {
		const content = await readFile(configPath, "utf-8");
		return JSON.parse(content);
	} catch {
		return { name: "nojs-project", version: "0.1.0", plugins: [] };
	}
}

async function saveProjectConfig(config) {
	const configPath = resolve(process.cwd(), CONFIG_FILE);
	await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}
