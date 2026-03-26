# Configuration

NoJS CLI uses two config files with distinct roles.

## nojs-prebuild.config.js

Controls the `nojs prebuild` pipeline. Place this file in your project root.

```js
// nojs-prebuild.config.js
export default {
  /**
   * Glob pattern for HTML files to process.
   * Default: '**\/*.html' (all HTML files under the project root)
   */
  input: '**/*.html',

  /**
   * Output directory. Omit (or set null) to overwrite files in-place.
   * When set, the relative directory structure is preserved.
   */
  // output: 'dist/',

  /**
   * Plugin configuration.
   * Key: plugin name. Value: true | false | options object.
   * Plugins run in the order they are listed.
   */
  plugins: {
    // Boolean shorthand — use all defaults
    'inject-resource-hints': true,

    // Options object — merged as ctx.config inside the plugin
    'generate-sitemap': {
      siteUrl: 'https://example.com',
      changefreq: 'weekly',
      priority: 0.8,
    },

    // Explicit disable — useful to temporarily turn off an enabled plugin
    'minify-html': false,
  },
};
```

The file can also use the `.mjs` extension: `nojs-prebuild.config.mjs`.

### Supported Formats

| Format | Supported |
|--------|-----------|
| `nojs-prebuild.config.js` | ✅ |
| `nojs-prebuild.config.mjs` | ✅ |
| `nojs-prebuild.config.cjs` | — |
| `nojs-prebuild.config.json` | — |

The file is imported dynamically at runtime, so any valid ESM syntax is allowed including `import` statements, computed properties, and environment variable reads.

### Per-Plugin Config Reference

Each plugin's accepted options are documented in [Built-in Plugins Reference](prebuild/plugins.md). Common patterns:

```js
export default {
  plugins: {
    // Resource hints + API dns-prefetch
    'inject-resource-hints': { apiBase: 'https://api.example.com' },

    // Canonical URL
    'inject-canonical-url': { siteUrl: 'https://example.com' },

    // Sitemap
    'generate-sitemap': { siteUrl: 'https://example.com' },

    // Meta tag auditing — strict mode
    'audit-meta-tags': { failOnError: true },

    // Minification — keep comments
    'minify-html': { removeComments: false },

    // CSP with custom base directives
    'inject-csp-hashes': {
      scriptSrc: "'self' https://cdn.example.com",
      styleSrc:  "'self'",
    },

    // SRI — skip specific CDN hosts
    'inject-sri-hashes': {
      timeout: 8000,
      skip: ['fonts.googleapis.com'],
    },

    // Third-party script loading
    'enforce-script-loading': {
      strategy: 'defer',
      allowList: ['cdn.trusted.com'],
    },

    // Precompression
    'precompress-assets': { brotli: true, gzip: true },

    // PWA manifest
    'generate-pwa-manifest': {
      name: 'My App',
      shortName: 'App',
      themeColor: '#1a1a2e',
      icons: [
        { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      ],
    },

    // Accessibility audit — warn only
    'audit-accessibility': {
      failOnError: false,
      rules: { 'heading-order': false },  // disable one rule
    },

    // SVG inlining — limit to 2 KB
    'inline-svg': { maxBytes: 2048, cwd: './src' },

    // JSON-LD
    'inject-jsonld': {
      type: 'WebSite',
      siteUrl: 'https://example.com',
      organization: { name: 'Acme Corp', url: 'https://example.com' },
    },
  },
};
```

---

## nojs.config.json

Managed automatically by `nojs plugin install` / `remove`. You should not edit it manually.

```json
{
  "name": "my-app",
  "plugins": [
    {
      "name": "nojs-plugin-charts",
      "source": "cdn",
      "version": "1.2.0",
      "integrity": "sha384-abc123..."
    },
    {
      "name": "my-custom-plugin",
      "source": "npm",
      "version": "0.1.0"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `name` | Project name (set during `nojs init`) |
| `plugins[].name` | Plugin package/module name |
| `plugins[].source` | `"cdn"` or `"npm"` |
| `plugins[].version` | Installed version |
| `plugins[].integrity` | SHA-384 hash (CDN plugins only, for integrity verification) |

---

## Environment Variables

The CLI does not use any environment variables by default. Individual plugins may read `process.env` inside their `process()` hook if needed (e.g. to inject an API URL from CI).

---

## CLI Flags (override config)

Flags passed to `nojs prebuild` override the values in `nojs-prebuild.config.js`:

| Flag | Overrides |
|------|-----------|
| `--input <glob>` | `config.input` |
| `--output <dir>` | `config.output` |
| `--config <path>` | config file path |
