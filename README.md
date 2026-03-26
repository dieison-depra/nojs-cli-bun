# NoJS CLI — Bun Edition

**Bun-native CLI for the [No.JS](https://github.com/ErickXavier/no-js) framework**

Scaffold projects, optimize HTML for production, run a dev server with live reload, validate templates, and manage plugins — all from the command line.

> **This is a Bun fork of [ErickXavier/NoJS-CLI](https://github.com/ErickXavier/NoJS-CLI).**
> The original project targets Node.js ≥ 18. This fork replaces the entire runtime with
> [Bun](https://bun.sh) — the dev server uses `Bun.serve()`, the test suite runs on `bun:test`,
> spawning uses `Bun.spawnSync`, and all tooling (`biome`, `knip`) is Bun-first.
> This fork maintains its own feature roadmap and may periodically synchronise with upstream.
>
> **Recommended pairing:** use this CLI alongside [`@dieison-depra/nojs-bun`](https://github.com/dieison-depra/nojs-bun),
> the Bun-native port of the No.JS framework itself.

The CLI is the companion toolchain for No.JS projects. It provides everything you need to go from a blank folder to a production-ready application:

- **Scaffold** a new project with an interactive wizard (`init`)
- **Optimize** your HTML output with 26 built-in prebuild plugins (`prebuild`)
- **Develop** locally with a fast file server and live reload (`dev`)
- **Validate** your templates for common No.JS mistakes before shipping (`validate`)
- **Manage** community and official plugins (`plugin`)

---

## Install

```bash
bun install -g @dieison-depra/nojs-cli-bun
```

Requires **Bun >= 1.3.11**.

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

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `nojs init [path]` | `i` | Scaffold a new No.JS project with optional routing, i18n, and API base |
| `nojs prebuild [dir]` | `b` | Build-time HTML optimization — 26 plugins for performance, SEO, security, and accessibility |
| `nojs dev [path]` | `d` | Local dev server with live reload (SSE), SPA fallback, colored request logging |
| `nojs validate [files]` | `v` | Validate No.JS templates against 10 rules (CI-friendly JSON output) |
| `nojs plugin <action>` | `p` | Manage plugins — `search`, `install`, `update`, `remove`, `list` |
| `nojs help` | | Show help |
| `nojs version` | | Show version |

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

The `prebuild` command runs a configurable pipeline of **26 built-in plugins** that apply build-time transformations to your HTML files. Plugins are opt-in — enable only what you need in `nojs-prebuild.config.js`.

```bash
nojs prebuild            # process current directory
nojs prebuild ./dist/    # process a specific path
```

### Performance
| Plugin | What it does |
|--------|-------------|
| `inject-resource-hints` | Preload/prefetch hints for fetch directives and route templates |
| `inject-modulepreload` | `modulepreload` hints for ES module scripts |
| `inject-speculation-rules` | Speculation Rules API for near-instant SPA navigation |
| `optimize-images` | Lazy loading, LCP priority, and fetchpriority hints |
| `inject-view-transitions` | `@view-transition` CSS for smooth same-origin navigation |
| `inline-critical-css` | Inline above-fold CSS, async-load full sheet *(requires `beasties`)* |
| `generate-responsive-images` | AVIF/WebP srcset generation *(requires `sharp`)* |
| `precompress-assets` | `.br` and `.gz` companion files via Bun zlib |
| `optimize-fonts` | Google Fonts preconnect + `font-display:swap` |
| `minify-html` | Whitespace collapse and comment removal |
| `inline-svg` | Replace `<img src="*.svg">` with inline `<svg>` |

### SEO & Metadata
| Plugin | What it does |
|--------|-------------|
| `inject-head-attrs` | Inject title, description, and canonical from No.JS page directives |
| `inject-og-twitter` | Open Graph and Twitter Card meta tags |
| `inject-canonical-url` | `<link rel="canonical">` from `siteUrl` config + file path |
| `generate-sitemap` | `sitemap.xml` from No.JS route definitions |
| `inject-jsonld` | WebPage/WebSite JSON-LD structured data |
| `audit-meta-tags` | Auto-inject charset/viewport, warn on missing title/description/lang |

### No.JS Runtime
| Plugin | What it does |
|--------|-------------|
| `inline-animation-css` | Inline only the keyframes used by `animate=` directives |
| `inject-visibility-css` | Hide `if=/show=/hide=` elements until the runtime processes them |
| `inject-template-hints` | Preload stylesheets and inline skeleton CSS for loading templates |

### Security
| Plugin | What it does |
|--------|-------------|
| `inject-csp-hashes` | SHA-384 CSP `<meta>` tag for inline scripts and styles |
| `inject-sri-hashes` | `integrity` + `crossorigin` for external scripts and stylesheets |
| `enforce-script-loading` | Add `defer`/`async` to third-party scripts |

### Quality & Accessibility
| Plugin | What it does |
|--------|-------------|
| `audit-accessibility` | WCAG quick-checks: alt text, link names, labels, headings, lang |
| `purge-unused-css` | Remove CSS rules with no matching selectors in the HTML |
| `generate-pwa-manifest` | `manifest.webmanifest` + manifest link tag |

---

## Configuration

Create `nojs-prebuild.config.js` in your project root:

```js
// nojs-prebuild.config.js
export default {
  plugins: {
    'inject-resource-hints': true,
    'inject-head-attrs': true,
    'inject-og-twitter': true,
    'generate-sitemap': { siteUrl: 'https://example.com' },
    'inject-canonical-url': { siteUrl: 'https://example.com' },
    'minify-html': true,
    'optimize-images': true,
    'inject-view-transitions': true,
  },
};
```

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

## Writing Your Own Plugin

Plugins are plain ES modules:

```js
// my-plugin.js
export default {
  name: 'my-plugin',
  description: 'Does something useful.',

  async process(html, { filePath, config, allFiles }) {
    // transform html string and return it
    return html;
  },

  // optional — called once after all files are processed
  async finalize({ outputDir, config, processedFiles }) {},
};
```

See [docs/prebuild/creating-plugins.md](docs/prebuild/creating-plugins.md) for the full plugin development guide.

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first project, basic workflow |
| [Commands Reference](docs/commands/index.md) | All CLI commands in detail |
| [Prebuild Plugins](docs/prebuild/plugins.md) | Full reference for all 26 built-in plugins |
| [Creating Plugins](docs/prebuild/creating-plugins.md) | How to write and distribute custom plugins |
| [Configuration](docs/configuration.md) | Config file reference |
| [Dependency Analysis](docs/dependency-analysis.md) | Security risk and replaceability review |

---

## Architecture

```
bin/nojs.js                     ← executable entry point
src/
  cli.js                        ← command dispatcher
  commands/                     ← thin command wrappers
  init/generator.js             ← project scaffold
  dev/server.js                 ← HTTP server + SSE live reload
  validate/rules.js             ← template validation rules
  plugin/manager.js             ← plugin install/remove
  prebuild/
    runner.js                   ← plugin pipeline orchestrator
    config.js                   ← config loader
    html.js                     ← HTML file utilities
    plugins/                    ← 26 built-in plugins
__tests__/                      ← bun:test unit tests
```

**Zero production dependencies** (except `linkedom` for HTML parsing). Everything else uses Bun built-ins.

---

## Ecosystem

### Bun Edition (this fork)

| Tool | Description |
|------|-------------|
| [`@dieison-depra/nojs-bun`](https://github.com/dieison-depra/nojs-bun) | No.JS framework — Bun-native port ⭐ recommended pairing |
| **`@dieison-depra/nojs-cli-bun`** | This package — Bun-native CLI |

### Original (Node.js)

| Tool | Description |
|------|-------------|
| [No.JS](https://github.com/ErickXavier/no-js) | The HTML-first reactive framework (original) |
| [NoJS-CLI](https://github.com/ErickXavier/NoJS-CLI) | Original Node.js CLI (upstream of this fork) |
| [NoJS-LSP](https://github.com/ErickXavier/nojs-lsp) | VS Code extension — autocomplete, hover docs, diagnostics |
| [NoJS-MCP](https://github.com/ErickXavier/nojs-mcp) | MCP server — AI tools for building No.JS apps |

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a PR.

- [Changelog](CHANGELOG.md)
- [Security Policy](SECURITY.md)

## License

[MIT](LICENSE) © Erick Xavier

---

<p align="center">
  <strong>NoJS CLI — Bun Edition</strong> — The Bun-native command-line companion for No.JS<br>
  Fork of <a href="https://github.com/ErickXavier/NoJS-CLI">ErickXavier/NoJS-CLI</a> · <code>MIT License</code>
</p>
