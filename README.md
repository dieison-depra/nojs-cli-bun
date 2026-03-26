# NoJS CLI

Official command-line interface for the **[No.JS](https://github.com/ErickXavier/no-js)** framework — the HTML-first reactive framework that lets you build dynamic web applications using only HTML attributes, with zero JavaScript written by you.

## What is NoJS CLI?

The CLI is the companion toolchain for No.JS projects. It provides everything you need to go from a blank folder to a production-ready application:

- **Scaffold** a new project with an interactive wizard (`init`)
- **Optimize** your HTML output with 26 built-in prebuild plugins (`prebuild`)
- **Develop** locally with a fast file server and live reload (`dev`)
- **Validate** your templates for common No.JS mistakes before shipping (`validate`)
- **Manage** community and official plugins (`plugin`)

## Installation

```bash
npm install -g @erickxavier/nojs-cli
```

Requires **Node.js ≥ 18**.

## Quick Start

```bash
# 1. Scaffold a new project
nojs init my-app

# 2. Enter the project folder
cd my-app

# 3. Start the dev server
nojs dev

# 4. (Before deploying) optimize the HTML output
nojs prebuild
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `nojs init [dir]` | `i` | Interactive wizard to scaffold a new No.JS project |
| `nojs prebuild` | `b` | Run build-time optimization plugins on HTML files |
| `nojs dev [dir]` | `d` | Start a local dev server with live reload |
| `nojs validate [dir]` | `v` | Validate No.JS templates for common mistakes |
| `nojs plugin <sub>` | `p` | Manage plugins (search, install, update, remove) |

Run `nojs <command> --help` for detailed options on each command.

## Prebuild Plugins

The `prebuild` command ships with **26 built-in plugins** that apply build-time transformations to your HTML files. Plugins are opt-in — enable only what you need in `nojs-prebuild.config.js`.

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
| `precompress-assets` | `.br` and `.gz` companion files via Node zlib |
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

## Writing Your Own Plugin

Plugins are plain ES modules. Drop a file into your project and point to it from your config:

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

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first project, basic workflow |
| [Commands Reference](docs/commands/index.md) | All CLI commands in detail |
| [Prebuild Plugins](docs/prebuild/plugins.md) | Full reference for all 26 built-in plugins |
| [Creating Plugins](docs/prebuild/creating-plugins.md) | How to write and distribute custom plugins |
| [Configuration](docs/configuration.md) | Config file reference |

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
```

**Zero production dependencies** (except `linkedom` for HTML parsing). Everything else uses Node.js built-ins.

## Requirements

- **Node.js** ≥ 18
- **No.JS** project (HTML files using No.JS directives)

## License

MIT © Erick Xavier
