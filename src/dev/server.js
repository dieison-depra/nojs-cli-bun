import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const MIME_TYPES = {
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
</script>
`;

const STATUS_COLORS = {
	2: "\x1b[32m", // green
	3: "\x1b[36m", // cyan
	4: "\x1b[33m", // yellow
	5: "\x1b[31m", // red
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

function logRequest(method, pathname, status, note) {
	const color = STATUS_COLORS[Math.floor(status / 100)] || "";
	const suffix = note ? ` ${DIM}${note}${RESET}` : "";
	console.log(`  ${color}${status}${RESET} ${method} ${pathname}${suffix}`);
}

/**
 * Create and start the dev server using Bun.serve().
 *
 * @param {object} options
 * @param {number} [options.port=3000]
 * @param {string} [options.root='.']
 * @param {boolean} [options.liveReload=true]
 * @param {boolean} [options.open=false]
 * @param {boolean} [options.quiet=false]
 * @returns {Promise<import('bun').Server>}
 */
export async function createServer(options = {}) {
	const port = options.port || 3000;
	const root = resolve(options.root || ".");
	const liveReload = options.liveReload !== false;
	const openBrowser = options.open || false;
	const quiet = options.quiet || false;

	// SSE controllers — one per connected client
	const sseControllers = new Set();

	// File watcher for live reload (debounced)
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
						controller.enqueue("event: reload\ndata: \n\n");
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

			// Reject null bytes
			if (pathname.includes("\0")) {
				if (!quiet) logRequest(method, pathname, 400, "null byte");
				return new Response("Bad request", {
					status: 400,
					headers: { "Content-Type": "text/plain" },
				});
			}

			// SSE endpoint for live reload
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
						controller.enqueue("data: connected\n\n");
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
				let filePath = join(root, pathname);

				// Path traversal protection
				const realFile = resolve(filePath);
				if (!realFile.startsWith(`${root}/`) && realFile !== root) {
					if (!quiet)
						logRequest(method, pathname, 403, "path traversal blocked");
					return new Response("Forbidden", {
						status: 403,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Try the exact path first
				let fileExists = await exists(filePath);

				// If path is a directory, try index.html
				if (fileExists) {
					const fileStat = await stat(filePath);
					if (fileStat.isDirectory()) {
						filePath = join(filePath, "index.html");
						fileExists = await exists(filePath);
					}
				}

				// SPA fallback: extensionless paths → root index.html
				if (!fileExists && !extname(pathname)) {
					filePath = join(root, "index.html");
					fileExists = await exists(filePath);
				}

				if (!fileExists) {
					if (!quiet) logRequest(method, pathname, 404);
					return new Response("Not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const ext = extname(filePath);
				const mime = MIME_TYPES[ext] || "application/octet-stream";

				const relative = filePath.replace(root, ".");
				const spaNote = relative !== `.${pathname}` ? `→ ${relative}` : "";
				if (!quiet) logRequest(method, pathname, 200, spaNote);

				// Inject live reload script into HTML responses
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

	console.log(`\n  No.JS dev server running at http://localhost:${port}/`);
	if (liveReload) console.log("  Live reload enabled");
	console.log("  Press Ctrl+C to stop\n");

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
