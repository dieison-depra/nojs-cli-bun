import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_FILES = [
  'nojs-prebuild.config.js',
  'nojs-prebuild.config.mjs',
];

const DEFAULTS = {
  input: '**/*.html',
  output: null,
  plugins: {},
};

/**
 * Load configuration from a config file or return defaults.
 *
 * @param {string} [configPath] - Explicit path to a config file.
 * @param {string} [cwd] - Working directory for config discovery.
 * @returns {Promise<object>} Merged configuration.
 */
export async function loadConfig(configPath, cwd = process.cwd()) {
  let userConfig = {};

  if (configPath) {
    const abs = resolve(cwd, configPath);
    userConfig = await importConfig(abs);
  } else {
    for (const name of CONFIG_FILES) {
      const abs = resolve(cwd, name);
      if (existsSync(abs)) {
        userConfig = await importConfig(abs);
        break;
      }
    }
  }

  return { ...DEFAULTS, ...userConfig };
}

async function importConfig(absPath) {
  const mod = await import(pathToFileURL(absPath).href);
  return mod.default ?? mod;
}
