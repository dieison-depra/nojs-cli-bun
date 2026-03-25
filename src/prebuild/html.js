import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { glob } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';

/**
 * Discover HTML files matching a glob pattern.
 *
 * @param {string} pattern - Glob pattern (e.g., '**\/*.html').
 * @param {string} [cwd] - Working directory.
 * @returns {Promise<string[]>} Absolute file paths.
 */
export function discoverFiles(pattern, cwd = process.cwd()) {
  return new Promise((res, rej) => {
    glob(pattern, { cwd, withFileTypes: false }, (err, matches) => {
      if (err) return rej(err);
      res(matches.map((m) => resolve(cwd, m)));
    });
  });
}

/**
 * Read an HTML file as a UTF-8 string.
 *
 * @param {string} filePath - Absolute path.
 * @returns {Promise<string>}
 */
export async function readHtml(filePath) {
  return readFile(filePath, 'utf-8');
}

/**
 * Write an HTML string to a file, creating directories as needed.
 *
 * @param {string} filePath - Original absolute file path.
 * @param {string} html - HTML content.
 * @param {object} [options]
 * @param {string} [options.outputDir] - Output directory (null = in-place).
 * @param {string} [options.cwd] - Working directory for computing relative paths.
 * @returns {Promise<string>} Path that was written.
 */
export async function writeHtml(filePath, html, { outputDir, cwd } = {}) {
  let dest = filePath;

  if (outputDir) {
    const rel = relative(cwd || process.cwd(), filePath);
    dest = join(resolve(outputDir), rel);
  }

  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, html, 'utf-8');
  return dest;
}
