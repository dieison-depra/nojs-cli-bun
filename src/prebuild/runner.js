import { loadConfig } from "./config.js";
import { discoverFiles, readHtml, writeHtml } from "./html.js";
import { builtinPlugins } from "./plugins/index.js";

/**
 * Run the prebuild pipeline.
 *
 * @param {object} [options]
 * @param {string} [options.input] - Glob pattern for HTML files.
 * @param {string} [options.output] - Output directory (null = in-place).
 * @param {object} [options.plugins] - Plugin configuration map.
 * @param {string} [options.configPath] - Explicit config file path.
 * @param {string} [options.cwd] - Working directory.
 * @returns {Promise<{ files: number, plugins: string[] }>}
 */
export async function prebuild(options = {}) {
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
