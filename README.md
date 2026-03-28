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
- **Optimize** your HTML output with **34 built-in prebuild plugins** (`prebuild`)
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
| `nojs prebuild [dir]` | `b` | Build-time HTML optimization — 34 plugins for performance, SEO, security, and accessibility |
| `nojs dev [path]` | `d` | Local dev server with live reload (SSE), SPA fallback, colored request logging |
| `nojs validate [files]` | `v` | Validate No.JS templates against 10 rules (CI-friendly JSON output) |
| `nojs plugin <action>` | `p` | Manage plugins — `search`, `install`, `update`, `remove`, `list` |
| `nojs help` | | Show help |
| `nojs version` | | Show version |

---

## Performance Architecture (Evolution)

Following the [Roadmap 2026](docs/ARCHITECTURE_EVOLUTION.md), this CLI edition implements advanced build-time strategies to minimize Time-to-Interactive (TTI) and First Contentful Paint (FCP):

- **Islands Architecture:** Automatically identifies reactive sub-trees and isolates them, allowing the framework to skip 70-90% of the DOM during initial hydration.
- **Template Compilation:** Compiles `<template route>` blocks into optimized JavaScript functions, eliminating the need for HTML parsing at runtime.
- **Route-level Code Splitting:** Generates independent JS chunks for each route, loaded on-demand as the user navigates.
- **Differential Serving:** Serves modern ESNext bundles to modern browsers and optimized ES2015 fallbacks to legacy ones.
- **Content Hashing:** Ensures aggressive caching with stable, content-based fingerprints for all generated assets.

---

## Prebuild

The `prebuild` command runs a configurable pipeline of **34 built-in plugins**. Plugins are opt-in — enable only what you need in `nojs-prebuild.config.js`.

```bash
nojs prebuild            # process current directory
nojs prebuild ./dist/    # process a specific path
```

### High-Impact Performance (New)
| Plugin | What it does |
|--------|-------------|
| `identify-islands` | Mark reactive DOM sub-trees to enable selective hydration |
| `compile-templates-to-js` | Compile HTML templates into JS chunks with route-splitting |
| `differential-serving` | Apply `module/nomodule` pattern and generate legacy bundles |
| `generate-service-worker` | Auto-generate `sw.js` with precache manifest for offline-first |
| `generate-import-map` | Map bare specifiers (like `nojs`) to versioned/bundled URLs |
| `fingerprint-assets` | Add content hashes to JS/CSS files for immutable caching |
| `generate-early-hints` | Generate `_headers` (Netlify/Cloudflare) for H2 Early Hints |
| `inject-i18n-preload` | Inhibit waterfall by preloading the default locale JSON |

### Assets & Optimization
| Plugin | What it does |
|--------|-------------|
| `tree-shake-framework` | Bundle only the No.JS modules your HTML actually uses |
| `optimize-images` | Lazy loading, LCP priority, and fetchpriority hints |
| `inline-critical-css` | Inline above-fold CSS *(requires `beasties`)* |
| `generate-responsive-images` | AVIF/WebP srcset generation *(requires `sharp`)* |
| `precompress-assets` | `.br` and `.gz` companion files via Bun zlib |
| `minify-html` | Whitespace collapse and comment removal |
| `inline-svg` | Replace `<img src="*.svg">` with inline `<svg>` |
| `optimize-fonts` | Google Fonts preconnect + `font-display:swap` |

### SEO & Metadata
| Plugin | What it does |
|--------|-------------|
| `inject-head-attrs` | Inject title, description, and canonical from page directives |
| `inject-og-twitter` | Open Graph and Twitter Card meta tags |
| `inject-canonical-url` | `<link rel="canonical">` from `siteUrl` + path |
| `generate-sitemap` | `sitemap.xml` from route definitions |
| `inject-jsonld` | WebPage/WebSite JSON-LD structured data |
| `audit-meta-tags` | Auto-inject charset/viewport, audit SEO tags |

---

## Configuration

```js
// nojs-prebuild.config.js
export default {
  plugins: {
    'identify-islands': true,
    'compile-templates-to-js': true,
    'generate-service-worker': true,
    'fingerprint-assets': true,
    'minify-html': true,
    'tree-shake-framework': true,
  },
};
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Architecture Evolution](docs/ARCHITECTURE_EVOLUTION.md) | Vision, Roadmap, and Metrics Strategy |
| [Prebuild Plugins](docs/prebuild/plugins.md) | Full reference for all 34 built-in plugins |
| [Creating Plugins](docs/prebuild/creating-plugins.md) | How to write custom plugins |
| [Configuration](docs/configuration.md) | Config file reference |

---

## Architecture

```
src/
  prebuild/
    plugins/                    ← 34 built-in plugins
      identify-islands.js       ← NEW: Islands detection
      compile-templates-to-js.js ← NEW: Template compiler
      fingerprint-assets.js     ← NEW: Content hashing
      generate-service-worker.js ← NEW: SW generator
      ...
```

---

## Ecosystem

- [`@dieison-depra/nojs-bun`](https://github.com/dieison-depra/nojs-bun) — The Bun-native framework port.
- [`@dieison-depra/nojs-cli-bun`](https://github.com/dieison-depra/nojs-cli-bun) — This CLI edition.

---

## License

[MIT](LICENSE) © Erick Xavier
