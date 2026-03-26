# nojs dev

Start a local development server with live reload.

## Usage

```bash
nojs dev [directory] [options]
nojs d   [directory] [options]
```

If `directory` is omitted, the current working directory is served.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--port <n>` | `3000` | TCP port to listen on |
| `--no-live-reload` | — | Disable live reload injection |
| `--open` | — | Open the browser automatically |
| `--help` | — | Show help |

If the requested port is already in use, the server automatically tries the next available port.

## Features

### Static File Serving

Serves any file under the project root with the correct `Content-Type`. Supported types include HTML, CSS, JS, JSON, SVG, images, fonts, `.tpl` (No.JS templates), and more.

Requests for directories automatically serve `index.html` from that directory, enabling client-side SPA routing.

### Live Reload

A small `<script>` is injected into every HTML response that opens a Server-Sent Events connection to `/__nojs_reload`. When any file in the project changes, all connected browsers reload automatically.

- Maximum 100 concurrent SSE connections
- Reconnects automatically after 2 seconds if the connection drops

### Security

- Null bytes rejected in all request paths
- Path traversal protection (requests cannot escape the project root)
- 30-second request timeout
- 10-second headers timeout

## Example

```bash
# Serve current directory on port 3000
nojs dev

# Serve the dist/ folder on port 8080
nojs dev dist --port 8080
```

## Typical Workflow

```bash
# Terminal 1 — dev server
nojs dev

# Terminal 2 — edit your HTML, the browser refreshes automatically
```

The dev server is intentionally minimal — it does not run the prebuild pipeline. Use `nojs prebuild` separately before deploying.
