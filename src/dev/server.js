import { createServer as httpServer } from 'node:http';
import { readFile, stat, access } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { watch } from 'node:fs';
import { execFile } from 'node:child_process';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.tpl': 'text/html',
  '.md': 'text/markdown',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const MAX_SSE_CLIENTS = 100;

const LIVE_RELOAD_SCRIPT = `
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
<\/script>
`;

/**
 * Create and start the dev server.
 *
 * @param {object} options
 * @param {number} [options.port=3000]
 * @param {string} [options.root='.']
 * @param {boolean} [options.liveReload=true]
 * @param {boolean} [options.open=false]
 * @returns {Promise<import('node:http').Server>}
 */
const STATUS_COLORS = {
  2: '\x1b[32m', // green
  3: '\x1b[36m', // cyan
  4: '\x1b[33m', // yellow
  5: '\x1b[31m', // red
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function logRequest(method, pathname, status, note) {
  const color = STATUS_COLORS[Math.floor(status / 100)] || '';
  const suffix = note ? ` ${DIM}${note}${RESET}` : '';
  console.log(`  ${color}${status}${RESET} ${method} ${pathname}${suffix}`);
}

export async function createServer(options = {}) {
  const port = options.port || 3000;
  const root = resolve(options.root || '.');
  const liveReload = options.liveReload !== false;
  const openBrowser = options.open || false;
  const quiet = options.quiet || false;

  const clients = new Set();

  // File watcher for live reload (debounced)
  if (liveReload) {
    let debounceTimer = null;
    const watcher = watch(root, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith('.') || filename.includes('node_modules')) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!quiet) console.log(`  ${DIM}reload${RESET} ${filename} changed`);
        for (const res of clients) {
          res.write('event: reload\ndata: \n\n');
        }
      }, 100);
    });
    process.on('exit', () => watcher.close());
  }

  const server = httpServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    const method = req.method;

    // Reject null bytes
    if (pathname.includes('\0')) {
      if (!quiet) logRequest(method, pathname, 400, 'null byte');
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }

    // SSE endpoint for live reload
    if (pathname === '/__nojs_reload') {
      if (clients.size >= MAX_SSE_CLIENTS) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Too many connections');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('data: connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    try {
      let filePath = join(root, pathname);

      // Path traversal protection
      const realFile = resolve(filePath);
      if (!realFile.startsWith(root + '/') && realFile !== root) {
        if (!quiet) logRequest(method, pathname, 403, 'path traversal blocked');
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      // Try the exact path first
      let fileExists = await exists(filePath);

      // If path is a directory, try index.html
      if (fileExists) {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          filePath = join(filePath, 'index.html');
          fileExists = await exists(filePath);
        }
      }

      // SPA fallback: extensionless paths → root index.html
      if (!fileExists && !extname(pathname)) {
        filePath = join(root, 'index.html');
        fileExists = await exists(filePath);
      }

      if (!fileExists) {
        if (!quiet) logRequest(method, pathname, 404);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      let content = await readFile(filePath);
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      // Inject live reload script into HTML responses
      if (liveReload && mime === 'text/html') {
        let html = content.toString('utf-8');
        if (html.includes('</body>')) {
          html = html.replace('</body>', LIVE_RELOAD_SCRIPT + '</body>');
        } else {
          html += LIVE_RELOAD_SCRIPT;
        }
        content = html;
      }

      const relative = filePath.replace(root, '.');
      const spaNote = (!fileExists || relative !== '.' + pathname) ? `→ ${relative}` : '';
      if (!quiet) logRequest(method, pathname, 200, spaNote);

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch (err) {
      if (!quiet) logRequest(method, pathname, 500, err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  });

  server.setTimeout(30000);
  server.headersTimeout = 10000;

  return new Promise((resolvePromise) => {
    server.listen(port, () => {
      console.log(`\n  No.JS dev server running at http://localhost:${port}/`);
      if (liveReload) console.log('  Live reload enabled');
      console.log('  Press Ctrl+C to stop\n');

      if (openBrowser) {
        const cmd = process.platform === 'darwin' ? 'open'
          : process.platform === 'win32' ? 'start'
          : 'xdg-open';
        execFile(cmd, [`http://localhost:${port}`]);
      }

      resolvePromise(server);
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
