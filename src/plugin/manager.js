import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import { searchRegistry } from './registry.js';

const CONFIG_FILE = 'nojs.config.json';
const CDN_BASE = 'https://cdn.no-js.dev/plugins';

/**
 * Search for plugins in the CDN registry and npm.
 */
export async function search(query) {
  console.log(`Searching for "${query}"...\n`);

  const results = await searchRegistry(query);

  if (results.length === 0) {
    console.log('No plugins found.');
    return;
  }

  for (const plugin of results) {
    const source = plugin.source === 'cdn' ? '(official)' : '(npm)';
    console.log(`  ${plugin.name} ${source}`);
    if (plugin.description) console.log(`    ${plugin.description}`);
    console.log('');
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
  const isNpm = name.startsWith('npm:');
  const cleanName = isNpm ? name.slice(4) : name;

  // Check if already installed
  if (config.plugins?.some((p) => p.name === cleanName)) {
    console.log(`Plugin "${cleanName}" is already installed.`);
    return;
  }

  if (isNpm) {
    // Install from npm
    console.log(`Installing ${cleanName} from npm...`);
    execSync(`npm install ${cleanName}`, { stdio: 'inherit' });

    config.plugins = config.plugins || [];
    config.plugins.push({
      name: cleanName,
      source: 'npm',
      installed: new Date().toISOString().split('T')[0],
    });
  } else {
    // Install from CDN
    const cdnUrl = `${CDN_BASE}/${cleanName}.js`;
    console.log(`Installing ${cleanName} from CDN...`);
    console.log(`  URL: ${cdnUrl}`);

    config.plugins = config.plugins || [];
    config.plugins.push({
      name: cleanName,
      source: 'cdn',
      url: cdnUrl,
      installed: new Date().toISOString().split('T')[0],
    });
  }

  await saveProjectConfig(config);
  console.log(`\nPlugin "${cleanName}" installed.`);
  console.log(`\nAdd to your HTML:`);

  if (isNpm) {
    console.log(`  <script src="node_modules/${cleanName}/dist/index.js"><\/script>`);
  } else {
    console.log(`  <script src="${CDN_BASE}/${cleanName}.js"><\/script>`);
  }
}

/**
 * Update an installed plugin.
 */
export async function update(name) {
  const config = await loadProjectConfig();
  const cleanName = name.startsWith('npm:') ? name.slice(4) : name;
  const plugin = config.plugins?.find((p) => p.name === cleanName);

  if (!plugin) {
    console.log(`Plugin "${cleanName}" is not installed. Run "nojs plugin install ${name}" first.`);
    return;
  }

  if (plugin.source === 'npm') {
    console.log(`Updating ${cleanName} from npm...`);
    execSync(`npm update ${cleanName}`, { stdio: 'inherit' });
  } else {
    console.log(`CDN plugins are always up-to-date (served from ${CDN_BASE}/${cleanName}.js).`);
  }

  plugin.updated = new Date().toISOString().split('T')[0];
  await saveProjectConfig(config);
  console.log(`Plugin "${cleanName}" updated.`);
}

/**
 * Remove an installed plugin.
 */
export async function remove(name) {
  const config = await loadProjectConfig();
  const cleanName = name.startsWith('npm:') ? name.slice(4) : name;
  const idx = config.plugins?.findIndex((p) => p.name === cleanName);

  if (idx === undefined || idx === -1) {
    console.log(`Plugin "${cleanName}" is not installed.`);
    return;
  }

  const plugin = config.plugins[idx];

  if (plugin.source === 'npm') {
    console.log(`Removing ${cleanName} from npm...`);
    execSync(`npm uninstall ${cleanName}`, { stdio: 'inherit' });
  }

  config.plugins.splice(idx, 1);
  await saveProjectConfig(config);
  console.log(`Plugin "${cleanName}" removed.`);
  console.log('Remember to remove the <script> tag from your HTML.');
}

/**
 * List installed plugins.
 */
export async function list() {
  const config = await loadProjectConfig();
  const plugins = config.plugins || [];

  if (plugins.length === 0) {
    console.log('No plugins installed. Run "nojs plugin search <query>" to find plugins.');
    return;
  }

  console.log('Installed plugins:\n');
  for (const plugin of plugins) {
    const source = plugin.source === 'cdn' ? '(CDN)' : '(npm)';
    console.log(`  ${plugin.name} ${source}`);
    if (plugin.url) console.log(`    ${plugin.url}`);
    console.log('');
  }
}

async function loadProjectConfig() {
  const configPath = resolve(process.cwd(), CONFIG_FILE);
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { name: 'nojs-project', version: '0.1.0', plugins: [] };
  }
}

async function saveProjectConfig(config) {
  const configPath = resolve(process.cwd(), CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
