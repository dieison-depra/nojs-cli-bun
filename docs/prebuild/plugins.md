# Built-in Plugins Reference

NoJS CLI ships with **26 built-in plugins** grouped by purpose. All plugins are opt-in — enable only the ones you need.

## Quick Reference

| Plugin | Category | External dep |
|--------|----------|-------------|
| [inject-resource-hints](#inject-resource-hints) | Performance | — |
| [inject-modulepreload](#inject-modulepreload) | Performance | — |
| [inject-speculation-rules](#inject-speculation-rules) | Performance | — |
| [optimize-images](#optimize-images) | Performance | — |
| [inject-view-transitions](#inject-view-transitions) | Performance | — |
| [inline-critical-css](#inline-critical-css) | Performance | `beasties` |
| [generate-responsive-images](#generate-responsive-images) | Performance | `sharp` |
| [precompress-assets](#precompress-assets) | Performance | — |
| [optimize-fonts](#optimize-fonts) | Performance | — |
| [minify-html](#minify-html) | Performance | — |
| [inline-svg](#inline-svg) | Performance | — |
| [inject-head-attrs](#inject-head-attrs) | SEO | — |
| [inject-og-twitter](#inject-og-twitter) | SEO | — |
| [inject-canonical-url](#inject-canonical-url) | SEO | — |
| [generate-sitemap](#generate-sitemap) | SEO | — |
| [inject-jsonld](#inject-jsonld) | SEO | — |
| [audit-meta-tags](#audit-meta-tags) | SEO | — |
| [inline-animation-css](#inline-animation-css) | No.JS Runtime | — |
| [inject-visibility-css](#inject-visibility-css) | No.JS Runtime | — |
| [inject-template-hints](#inject-template-hints) | No.JS Runtime | — |
| [inject-csp-hashes](#inject-csp-hashes) | Security | — |
| [inject-sri-hashes](#inject-sri-hashes) | Security | — |
| [enforce-script-loading](#enforce-script-loading) | Security | — |
| [audit-accessibility](#audit-accessibility) | Quality | — |
| [purge-unused-css](#purge-unused-css) | Quality | — |
| [generate-pwa-manifest](#generate-pwa-manifest) | PWA | — |

---

## Performance

### inject-resource-hints

Inject `preload`, `prefetch`, and `preconnect` hints for No.JS `get=`/`post=` fetch directives and route template `src=` attributes.

Also supports **B3** (i18n locale preload) and **B4** (base API DNS prefetch) via config.

```js
'inject-resource-hints': {
  apiBase: 'https://api.example.com',  // B4: inject dns-prefetch for this origin
}
```

- Elements with `get="/api/data"` (static URL) → `<link rel="preload" as="fetch">`
- Elements with `get="https://api.example.com/..."` → `<link rel="preconnect">`
- Interpolated URLs (`get="/api/{id}"`) are skipped
- `<html lang="pt-BR">` → `<link rel="preload" href="/locales/pt-BR.json" as="fetch">`
- Idempotent: never duplicates existing hints

---

### inject-modulepreload

Inject `<link rel="modulepreload">` for every `<script type="module" src="...">` tag.

```js
'inject-modulepreload': true
```

- Skips cross-origin modules (can only preload same-origin)
- Skips interpolated `src` values
- Idempotent

---

### inject-speculation-rules

Inject a `<script type="speculationrules">` tag based on No.JS `<template route="...">` definitions, enabling near-instant navigation via the [Speculation Rules API](https://developer.chrome.com/blog/speculation-rules-improvements/).

```js
'inject-speculation-rules': true
```

- Only includes static routes (`:param` routes are excluded)
- Idempotent

---

### optimize-images

Add performance attributes to `<img>` tags:

- First image: `fetchpriority="high"` (LCP candidate)
- Subsequent images: `loading="lazy"`

```js
'optimize-images': true
```

---

### inject-view-transitions

Inject `<style data-nojs-view-transitions>` with `@view-transition { navigation: auto; }` to enable smooth same-origin page transitions.

```js
'inject-view-transitions': true
// or disable explicitly:
'inject-view-transitions': { enabled: false }
```

---

### inline-critical-css

Extract and inline above-the-fold CSS, converting full stylesheet links to async `<link>` loads. Requires [`beasties`](https://github.com/GoogleChromeLabs/beasties).

```js
'inline-critical-css': {
  path: './dist',        // where to look for CSS files
  publicPath: '/',
  pruneSource: true,     // remove inlined rules from the external sheet
}
```

If `beasties` is not installed, the plugin logs a warning and passes the HTML through unchanged — it never breaks your build.

Install: `npm install beasties`

---

### generate-responsive-images

Generate AVIF and WebP variants at multiple widths for local `<img>` tags, wrapping them in `<picture>` elements with `srcset`. Requires [`sharp`](https://sharp.pixelplumbing.com/).

```js
'generate-responsive-images': {
  widths: [480, 800, 1200],
  quality: { avif: 60, webp: 80 },
}
```

- Skips GIF, SVG, already-converted formats
- Skips images with `data-no-responsive`
- Graceful fallback if `sharp` is not installed

Install: `npm install sharp`

---

### precompress-assets

Generate `.br` (Brotli) and `.gz` (gzip) companion files for all compressible assets using Node's built-in `zlib`. The web server can then serve pre-compressed files directly (e.g. nginx `gzip_static on`).

```js
'precompress-assets': {
  brotli: true,     // default true
  gzip: true,       // default true
  extensions: ['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.woff2'],
}
```

Uses the `finalize` hook — runs once after all HTML files are processed.

---

### optimize-fonts

Detect Google Fonts `<link>` tags and `@import` rules, then:

1. Inject `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>`
2. Inject `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
3. Append `&display=swap` to the Google Fonts URL (if not already present)

```js
'optimize-fonts': true
```

No-op on pages with no Google Fonts.

---

### minify-html

Collapse whitespace between tags and remove HTML comments. Preserves content inside `<script>`, `<style>`, `<pre>`, and `<textarea>` tags.

```js
'minify-html': {
  removeComments: true,       // default true
  collapseWhitespace: true,   // default true
}
```

IE conditional comments (`<!--[if IE]>`) are always preserved.

---

### inline-svg

Replace `<img src="path/to/file.svg">` with the inlined SVG content for small files.

```js
'inline-svg': {
  maxBytes: 4096,   // default: don't inline files larger than 4 KB
  cwd: '.',         // root for resolving relative SVG paths
}
```

- Skips cross-origin SVG URLs
- Skips images with `data-no-inline`
- Transfers `alt` to `aria-label` + `role="img"` (or `aria-hidden="true"` if no alt)
- Strips `width` and `height` from the root `<svg>` element (let CSS control sizing)

---

## SEO & Metadata

### inject-head-attrs

Read No.JS page-level directives from `<body>` and inject the corresponding `<head>` tags:

| Directive | Injects |
|-----------|---------|
| `page-title="'My Page'"` | `<title>My Page</title>` |
| `page-description="'...' "` | `<meta name="description" content="...">` |
| `page-canonical="'https://...'"` | `<link rel="canonical" href="...">` |
| `page-jsonld="{...}"` | `<script type="application/ld+json">` |

Only static string literals (wrapped in `'...'`) are processed. Dynamic expressions are skipped.

```js
'inject-head-attrs': true
```

---

### inject-og-twitter

Generate Open Graph and Twitter Card meta tags from No.JS `page-*` directives:

```js
'inject-og-twitter': true
```

Reads `page-title`, `page-description`, `page-image`, `page-url` from the document and emits:
- `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

---

### inject-canonical-url

Inject `<link rel="canonical" href="...">` by combining `config.siteUrl` with the file path.

```js
'inject-canonical-url': {
  siteUrl: 'https://example.com',
  cwd: process.cwd(),  // used to compute relative path from project root
}
```

- `index.html` → `https://example.com/`
- `about/index.html` → `https://example.com/about/`
- `blog/post.html` → `https://example.com/blog/post.html`
- No-op if `siteUrl` is not set
- Idempotent (skips if canonical already present)

---

### generate-sitemap

Generate `sitemap.xml` in the output directory from No.JS `<template route="...">` definitions.

```js
'generate-sitemap': {
  siteUrl: 'https://example.com',  // required
  changefreq: 'weekly',            // default
  priority: 0.8,                   // default
}
```

Uses the `finalize` hook.

---

### inject-jsonld

Inject `<script type="application/ld+json">` with WebPage or WebSite structured data, reading metadata from the existing `<title>`, `<meta name="description">`, `<link rel="canonical">`, and `<html lang>`.

```js
'inject-jsonld': {
  siteUrl: 'https://example.com',
  type: 'WebPage',  // or 'WebSite'
  organization: { name: 'Acme Corp', url: 'https://example.com' },
}
```

Idempotent — skips if a `<script type="application/ld+json">` already exists.

---

### audit-meta-tags

Verify required `<head>` tags and optionally inject missing ones.

```js
'audit-meta-tags': {
  inject: true,        // auto-inject charset and viewport (default true)
  failOnError: false,  // throw on violations (default false)
}
```

**Injected automatically** (if `inject: true`):
- `<meta charset="UTF-8">` — inserted as first child of `<head>`
- `<meta name="viewport" content="width=device-width, initial-scale=1">`

**Warned only** (logged to stderr):
- Missing `<title>`
- Missing `<meta name="description">`
- Missing `lang` on `<html>`

---

## No.JS Runtime

### inline-animation-css

Inline only the CSS keyframes that are actually used by `animate=`, `animate-enter=`, or `animate-leave=` directives in the document. Avoids shipping animation CSS for effects you don't use.

```js
'inline-animation-css': true
```

Supported animation names: `fadeIn`, `fadeOut`, `slideInLeft`, `slideInRight`, `slideInUp`, `slideInDown`, `slideOutLeft`, `slideOutRight`, `slideOutUp`, `slideOutDown`, `zoomIn`, `zoomOut`, `bounceIn`, `bounceOut`.

---

### inject-visibility-css

Prevent flash of conditional content by marking `if=`, `show=`, and `hide=` elements with `data-nojs-pending` and injecting `[data-nojs-pending] { visibility: hidden; }`. The No.JS runtime removes the attribute once it processes the element.

```js
'inject-visibility-css': true
```

- Elements inside `<template>` tags are skipped
- The CSS block is injected only once per document

---

### inject-template-hints

For elements with `loading=`, `skeleton=`, `error=`, `empty=`, or `success=` pointing to a `<template id="...">`:

1. Preload any external stylesheets linked from the template's target
2. If the template contains an element with a class matching `/skeleton/i`, inject a `skeleton-pulse` animation CSS block

```js
'inject-template-hints': true
```

---

## Security

### inject-csp-hashes

Compute SHA-384 hashes for all inline `<script>` and `<style>` tags, then inject or update a `<meta http-equiv="Content-Security-Policy">` tag.

```js
'inject-csp-hashes': {
  scriptSrc: "'self'",  // base directive (default)
  styleSrc:  "'self'",
}
```

Result: `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha384-...'; style-src 'self' 'sha384-...'">`

- `<script type="speculationrules">` is excluded from hashing
- Updates an existing CSP tag rather than adding a duplicate

---

### inject-sri-hashes

Fetch external `https://` scripts and stylesheets at build time, compute SHA-384 hashes, and add `integrity` + `crossorigin="anonymous"` attributes.

```js
'inject-sri-hashes': {
  timeout: 5000,                    // ms per fetch (default 5000)
  skip: ['cdn.example.com'],        // hosts to skip
}
```

- Fetch failures are silently swallowed — the build never breaks
- Skips interpolated URLs, non-https URLs, and resources already bearing `integrity`

---

### enforce-script-loading

Add `defer` (or `async`) to third-party `<script>` tags that would otherwise be render-blocking.

```js
'enforce-script-loading': {
  strategy: 'defer',                 // 'defer' (default) or 'async'
  allowList: ['cdn.trusted.com'],    // hosts to leave untouched
}
```

- Only processes cross-origin scripts (`http://`, `https://`, `//`)
- Skips `<script type="module">` (inherently deferred)
- Skips scripts already bearing `defer` or `async`

---

## Quality & Accessibility

### audit-accessibility

Run WCAG quick-checks on each HTML file and report violations to stderr.

```js
'audit-accessibility': {
  failOnError: false,   // throw on first violation (default false)
  rules: {
    'img-alt':       true,  // <img> without alt
    'link-name':     true,  // <a> with no accessible name
    'label':         true,  // <input> with no associated <label>
    'heading-order': true,  // skipped heading levels
    'html-lang':     true,  // <html> without lang
  },
}
```

This plugin **never modifies the HTML** — it is a pure audit.

---

### purge-unused-css

Remove CSS rules from inline `<style>` tags whose selectors match no elements in the document.

```js
'purge-unused-css': true
```

- `@keyframes`, `@media`, `@font-face`, and other at-rules are **always preserved**
- No.JS internal style tags (`data-nojs-animations`, etc.) are skipped
- Conservative: any selector that can't be parsed is kept

---

## PWA

### generate-pwa-manifest

Inject `<link rel="manifest" href="/manifest.webmanifest">` into every HTML file and generate `manifest.webmanifest` in the output directory.

```js
'generate-pwa-manifest': {
  name: 'My App',
  shortName: 'App',
  description: 'A progressive web app',
  themeColor: '#ffffff',
  backgroundColor: '#ffffff',
  display: 'standalone',
  startUrl: '/',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}
```

Uses the `finalize` hook to write the manifest file.
