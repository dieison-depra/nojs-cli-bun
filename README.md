# NoJS CLI

**Official CLI for the [No.JS](https://github.com/ErickXavier/no-js) framework**

Scaffold projects, optimize HTML for production, run a dev server with live reload, validate templates, and manage plugins — all from the command line.

---

## Install

```bash
npm install -g @erickxavier/nojs-cli
```

Requires **Node.js >= 18**.

---

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `nojs init [path]` | `i` | Scaffold a new No.JS project with optional routing, i18n, and API base |
| `nojs prebuild [dir]` | `b` | Build-time HTML optimization (resource hints, speculation rules, sitemap, OG tags, image optimization) |
| `nojs dev [path]` | `d` | Local dev server with live reload (SSE), SPA fallback, colored request logging |
| `nojs validate [files]` | `v` | Validate No.JS templates against 10 rules (CI-friendly JSON output) |
| `nojs plugin <action>` | `p` | Manage plugins — `search`, `install`, `update`, `remove`, `list` |
| `nojs help` | | Show help |
| `nojs version` | | Show version |

---

## Quick Start

```bash
# Create a new project
nojs init my-app
cd my-app

# Start the dev server
nojs dev

# Validate your templates
nojs validate *.html

# Optimize for production
nojs prebuild
```

---

## Init

Interactive wizard that generates a ready-to-go No.JS project:

```bash
nojs init ./my-app
```

Non-interactive mode:

```bash
nojs init ./my-app --routing --i18n --locales en,pt --api https://api.example.com --yes
```

Generates `index.html`, route pages (`.tpl`), i18n locale files, and a `nojs.config.json`.

---

## Dev Server

```bash
nojs dev              # serve current directory
nojs dev ./docs/      # serve a specific path
nojs dev --port 8080  # custom port
nojs dev --open       # open browser on start
nojs dev --quiet      # suppress request logging
nojs dev --no-reload  # disable live reload
```

Features: live reload via SSE, SPA fallback (serves `index.html` for unmatched routes), MIME type detection, path traversal protection.

---

## Prebuild

Build-time HTML optimization pipeline with 6 plugins:

```bash
nojs prebuild            # process current directory
nojs prebuild ./dist/    # process a specific path
```

| Plugin | What it does |
|--------|-------------|
| `inject-resource-hints` | Preload, prefetch, preconnect for `get=` and route templates |
| `inject-head-attrs` | Static `page-title`, `page-description`, `page-canonical`, `page-jsonld` |
| `inject-speculation-rules` | Speculation Rules API from `<template route>` definitions |
| `inject-og-twitter` | Open Graph and Twitter Card meta tags from `page-*` directives |
| `generate-sitemap` | `sitemap.xml` from route definitions and canonical URLs |
| `optimize-images` | Lazy loading, LCP preload, `fetchpriority` hints |

---

## Validate

```bash
nojs validate *.html
nojs validate src/ --format json   # JSON output for CI
```

Rules: missing `as` on fetch, `each` without `in`, `foreach` without `from`, `model` on non-form elements, `bind-html` warning, routes without `route-view`, empty event handlers, loops without `key`, duplicate store names, `validate` outside `<form>`.

---

## Plugin Manager

Hybrid plugin manager — CDN for official plugins, npm for community packages:

```bash
nojs plugin search analytics
nojs plugin install @nojs/analytics
nojs plugin list
nojs plugin update @nojs/analytics
nojs plugin remove @nojs/analytics
```

CDN plugins get SRI integrity hashes (sha384) computed automatically.

---

## Project Structure

```plaintext
src/
├── cli.js              # CLI entry point — argument parsing, command routing
├── commands/           # Top-level command handlers
├── init/               # Project scaffolding templates and wizard
├── prebuild/           # HTML optimization plugins
├── dev/                # Dev server (HTTP + SSE live reload)
├── validate/           # Template validation rules
└── plugin/             # Plugin manager (CDN + npm)

__tests__/              # Jest unit tests
bin/
└── nojs.js             # Executable entry point
```

---

## Ecosystem

| Tool | Description |
|------|-------------|
| [No.JS](https://github.com/ErickXavier/no-js) | The HTML-first reactive framework |
| [NoJS-LSP](https://github.com/ErickXavier/nojs-lsp) | VS Code extension — autocomplete, hover docs, diagnostics |
| [NoJS-MCP](https://github.com/ErickXavier/nojs-mcp) | MCP server — AI tools for building No.JS apps |
| **NoJS-CLI** | This package |

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a PR.

- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE)

---

<p align="center">
  <strong>NoJS CLI</strong> — The command-line companion for No.JS<br>
  <code>MIT License</code>
</p>
