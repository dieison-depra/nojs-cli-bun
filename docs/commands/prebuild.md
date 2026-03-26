# nojs prebuild

Run the build-time optimization plugin pipeline on your HTML files.

## Usage

```bash
nojs prebuild [options]
nojs b        [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--config <path>` | Path to config file (default: `nojs-prebuild.config.js`) |
| `--input <glob>` | Glob pattern for HTML files (default: `**/*.html`) |
| `--output <dir>` | Output directory for processed files (default: in-place) |
| `--help` | Show help |

## How It Works

1. Discovers all HTML files matching the input glob inside the project root
2. Loads `nojs-prebuild.config.js` (or `.mjs`) from the project root
3. For each HTML file, runs each enabled plugin's `process(html, ctx)` function in order
4. Writes the modified HTML back to disk (in-place or to `--output`)
5. After all files are processed, calls each plugin's optional `finalize(ctx)` hook once (used for cross-file artifacts like `sitemap.xml` or `.br` files)

## Configuration File

```js
// nojs-prebuild.config.js
export default {
  // glob for HTML files (relative to project root)
  input: '**/*.html',

  // output directory — omit to overwrite in place
  // output: 'dist/',

  plugins: {
    // enable with true (use all defaults)
    'inject-resource-hints': true,

    // enable with an options object
    'generate-sitemap': { siteUrl: 'https://example.com' },

    // disable explicitly
    'optimize-images': false,
  },
};
```

## Plugin Execution Order

Plugins run in the order they are listed in the `plugins` object. For best results, follow this recommended order:

1. Metadata / head plugins (`inject-head-attrs`, `inject-og-twitter`, `audit-meta-tags`)
2. Resource hints (`inject-resource-hints`, `inject-modulepreload`, `inject-speculation-rules`)
3. CSS / asset plugins (`inline-animation-css`, `inject-visibility-css`, `optimize-fonts`, `inline-critical-css`, `purge-unused-css`)
4. HTML processing (`minify-html`)
5. Security (`inject-csp-hashes`, `inject-sri-hashes`)
6. File generators (`generate-sitemap`, `generate-pwa-manifest`, `precompress-assets`)

## Context Object

Each plugin receives a context object in `process(html, ctx)`:

```js
{
  filePath: '/absolute/path/to/file.html',
  config: { /* plugin-specific options */ },
  allFiles: [/* all HTML file paths being processed */],
}
```

The `finalize` hook receives:

```js
{
  outputDir: '/absolute/path/to/output',
  config: { /* plugin-specific options */ },
  processedFiles: [/* list of written file paths */],
}
```

## Output

```
$ nojs prebuild
✓ prebuild complete — 12 files, 8 plugins
```

See [Built-in Plugins Reference](../prebuild/plugins.md) for the full plugin list and their options.
