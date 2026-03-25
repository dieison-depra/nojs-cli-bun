import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_FILES = [
  'nojs-prebuild.config.js',
  'nojs-prebuild.config.mjs',
];

const DEFAULTS = Object.freeze({
  input: '**/*.html',
  output: null,
  plugins: {},
});

const POISONED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Load configuration from a config file or return defaults.
 *
 * @param {string} [configPath] - Explicit path to a config file.
 * @param {string} [cwd] - Working directory for config discovery.
 * @returns {Promise<object>} Merged configuration.
 */
export async function loadConfig(configPath, cwd = process.cwd()) {
  let userConfig = {};
  const resolvedCwd = resolve(cwd);

  if (configPath) {
    const abs = resolve(cwd, configPath);
    if (!abs.startsWith(resolvedCwd + '/') && abs !== resolvedCwd) {
      throw new Error(`Config file must be within the project directory: ${configPath}`);
    }
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

  return { ...DEFAULTS, ...sanitizeConfig(userConfig) };
}

function sanitizeConfig(obj) {
  if (obj == null || typeof obj !== 'object') return {};
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
