import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

const DEFAULT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.woff2']);

export default {
  name: 'precompress-assets',
  description: 'Generate .br and .gz companion files for all compressible assets.',

  // process is a no-op — all work happens in finalize
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

    await Promise.all(files.map(async (filePath) => {
      const content = await readFile(filePath);
      const tasks = [];
      if (doBrotli) {
        tasks.push(brotliCompressAsync(content).then(buf => writeFile(filePath + '.br', buf)));
      }
      if (doGzip) {
        tasks.push(gzipAsync(content).then(buf => writeFile(filePath + '.gz', buf)));
      }
      await Promise.all(tasks);
    }));
  },
};

async function collectFiles(dir, extensions) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectFiles(full, extensions));
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      // Skip files that are already compressed companions
      if (!entry.name.endsWith('.br') && !entry.name.endsWith('.gz')) {
        results.push(full);
      }
    }
  }
  return results;
}
