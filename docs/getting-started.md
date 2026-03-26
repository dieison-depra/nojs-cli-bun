# Getting Started

## Installation

Install the CLI globally with Bun:

```bash
bun install -g @erickxavier/nojs-cli
```

Verify the installation:

```bash
nojs --version
```

**Requirements:** Bun ≥ 1.3.11.

## Scaffold a Project

Run the interactive wizard to create a new No.JS project:

```bash
nojs init my-app
```

The wizard will ask you:

- **Project name** — used in the generated `<title>` and manifest
- **API base URL** — optional, sets the `base` attribute in your HTML
- **SPA routing** — generates `pages/` directory and route templates
- **i18n** — creates `locales/` directory with JSON translation files

After completion, your project will have this structure:

```
my-app/
  index.html              ← main entry point with No.JS CDN
  pages/
    home.tpl              ← (if routing enabled)
    about.tpl
  locales/
    en.json               ← (if i18n enabled)
  assets/
  nojs.config.json        ← CLI project config
```

## Start the Dev Server

```bash
cd my-app
nojs dev
```

The dev server starts on `http://localhost:3000` (or the next available port) and watches for file changes, triggering a live reload in connected browsers.

```bash
# Custom port
nojs dev --port 8080

# Serve a specific directory
nojs dev ./dist
```

## Optimize for Production

Before deploying, run the prebuild pipeline to apply performance and SEO optimizations:

```bash
nojs prebuild
```

The command reads `nojs-prebuild.config.js` from your project root. If the file doesn't exist, no plugins run.

Minimal config to get started:

```js
// nojs-prebuild.config.js
export default {
  plugins: {
    'inject-resource-hints': true,
    'inject-head-attrs': true,
    'optimize-images': true,
    'minify-html': true,
    'inject-og-twitter': true,
    'generate-sitemap': { siteUrl: 'https://example.com' },
  },
};
```

## Validate Your Templates

Check your HTML files for common No.JS mistakes:

```bash
nojs validate
```

The validator reports issues like missing `as=` on fetch elements, `each=` without `in`, misuse of `model=`, and more. See [validate command](commands/validate.md) for the full rule list.

## Install a Plugin

Search and install community plugins:

```bash
# Search
nojs plugin search sitemap

# Install an official plugin
nojs plugin install nojs-plugin-sitemap

# Install from npm
nojs plugin install npm:my-nojs-plugin
```

## Next Steps

- [Commands Reference](commands/index.md) — detailed flags and options for each command
- [Prebuild Plugins](prebuild/plugins.md) — the full list of 26 built-in optimization plugins
- [Configuration](configuration.md) — all configuration options
