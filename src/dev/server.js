import { createServer as httpServer } from 'node:http';
import { readFile, stat, access } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { watch } from 'node:fs';
import { exec } from 'node:child_process';

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

const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  var source = new EventSource('/__nojs_reload');
  source.onmessage = function() { location.reload(); };
  source.onerror = function() {
    source.close();
    setTimeout(function() { location.reload(); }, 1000);
  };
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
export async function createServer(options = {}) {
  const port = options.port || 3000;
  const root = resolve(options.root || '.');
  const liveReload = options.liveReload !== false;
  const openBrowser = options.open || false;

  // SSE clients for live reload
  const clients = new Set();

  // File watcher for live reload
  if (liveReload) {
    const watcher = watch(root, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith('.') || filename.includes('node_modules')) return;
      for (const res of clients) {
        res.write('data: reload\n\n');
      }
    });
    process.on('exit', () => watcher.close());
  }

  const server = httpServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    // SSE endpoint for live reload
    if (pathname === '/__nojs_reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('data: connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    try {
      let filePath = join(root, pathname);

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

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  });

  return new Promise((resolvePromise) => {
    server.listen(port, () => {
      console.log(`\n  No.JS dev server running at http://localhost:${port}/`);
      if (liveReload) console.log('  Live reload enabled');
      console.log('  Press Ctrl+C to stop\n');

      if (openBrowser) {
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${cmd} http://localhost:${port}`);
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
