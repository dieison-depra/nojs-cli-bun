# Prebuild System

The prebuild system is the heart of NoJS CLI's optimization story. It applies a configurable pipeline of transformation plugins to your HTML files at build time — before you deploy — so the browser receives the best possible output without any runtime overhead.

## Architecture

```
nojs prebuild
   │
   ├── loadConfig()          reads nojs-prebuild.config.js
   ├── discoverFiles()       finds **/*.html in project root
   │
   └── for each HTML file:
         │
         ├── plugin.process(html, ctx)    ← runs each enabled plugin in order
         ├── plugin.process(html, ctx)
         └── ...
         │
         writeHtml(dest)
   │
   └── for each plugin with finalize():
         plugin.finalize({ outputDir, config, processedFiles })
```

## The Two Plugin Hooks

### `process(html, ctx)` — per-file

Called once for every HTML file. Must return the (possibly modified) HTML string.

```js
async process(html, { filePath, config, allFiles }) {
  // transform html
  return html;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `html` | `string` | The full HTML file content |
| `filePath` | `string` | Absolute path to the file |
| `config` | `object` | Plugin-specific options from the config file |
| `allFiles` | `string[]` | All HTML files being processed in this run |

### `finalize(ctx)` — post-processing (optional)

Called once after **all** files have been processed. Use this to emit cross-file artifacts.

```js
async finalize({ outputDir, config, processedFiles }) {
  // write extra files (sitemap.xml, manifest.webmanifest, .gz companions, etc.)
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `outputDir` | `string` | Output directory (same as project root for in-place builds) |
| `config` | `object` | Plugin-specific options |
| `processedFiles` | `string[]` | Paths of all files written in this run |

## Plugin Execution Order

Plugins run in the order they appear in the `plugins` object in your config. The recommended order:

```js
export default {
  plugins: {
    // 1. Head / metadata (affect what other plugins read from the document)
    'inject-head-attrs': true,
    'audit-meta-tags': true,

    // 2. Resource hints and navigation
    'inject-resource-hints': true,
    'inject-modulepreload': true,
    'inject-speculation-rules': true,
    'inject-view-transitions': true,

    // 3. SEO and structured data
    'inject-og-twitter': true,
    'inject-canonical-url': { siteUrl: 'https://example.com' },
    'inject-jsonld': true,

    // 4. No.JS runtime helpers
    'inline-animation-css': true,
    'inject-visibility-css': true,
    'inject-template-hints': true,

    // 5. Asset optimization
    'optimize-images': true,
    'optimize-fonts': true,
    'inline-svg': true,
    'inline-critical-css': true,   // requires: bun add beasties
    'purge-unused-css': true,

    // 6. HTML output
    'minify-html': true,

    // 7. Security (must run after minify so hashes are stable)
    'inject-csp-hashes': true,
    'inject-sri-hashes': true,
    'enforce-script-loading': true,

    // 8. File generators (finalize hooks)
    'generate-sitemap': { siteUrl: 'https://example.com' },
    'generate-pwa-manifest': { name: 'My App' },
    'precompress-assets': true,

    // 9. Responsive images (requires: bun add sharp)
    'generate-responsive-images': true,

    // 10. Audits
    'audit-accessibility': { failOnError: false },
  },
};
```

## Adding an External Plugin

You can register any ES module as a plugin by importing it in your config:

```js
// nojs-prebuild.config.js
import myPlugin from './plugins/my-plugin.js';

export default {
  plugins: {
    [myPlugin.name]: true,
  },
  // external plugins map
  _external: { [myPlugin.name]: myPlugin },
};
```

> **Note:** External plugin support via `_external` is a planned enhancement. For now, contribute your plugin to the built-in set or see the [Creating Plugins](creating-plugins.md) guide.

## Further Reading

- [Built-in Plugins Reference](plugins.md) — every plugin, its options, and examples
- [Creating Plugins](creating-plugins.md) — write your own plugin
- [prebuild command](../commands/prebuild.md) — CLI flags and config file shape
