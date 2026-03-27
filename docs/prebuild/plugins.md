# Built-in Plugins Reference

NoJS CLI ships with **28 built-in plugins** grouped by purpose. All plugins are opt-in — enable only the ones you need.

## Quick Reference

| Plugin | Category | External dep | Modifies HTML | Writes files |
|--------|----------|-------------|:---:|:---:|
| [inject-resource-hints](#inject-resource-hints) | Performance | — | ✓ | — |
| [inject-modulepreload](#inject-modulepreload) | Performance | — | ✓ | — |
| [inject-speculation-rules](#inject-speculation-rules) | Performance | — | ✓ | — |
| [optimize-images](#optimize-images) | Performance | — | ✓ | — |
| [inject-view-transitions](#inject-view-transitions) | Performance | — | ✓ | — |
| [inline-critical-css](#inline-critical-css) | Performance | `beasties` | ✓ | — |
| [generate-responsive-images](#generate-responsive-images) | Performance | `sharp` | ✓ | ✓ |
| [precompress-assets](#precompress-assets) | Performance | — | — | ✓ |
| [optimize-fonts](#optimize-fonts) | Performance | — | ✓ | — |
| [minify-html](#minify-html) | Performance | — | ✓ | — |
| [inline-svg](#inline-svg) | Performance | — | ✓ | — |
| [inject-head-attrs](#inject-head-attrs) | SEO | — | ✓ | — |
| [inject-og-twitter](#inject-og-twitter) | SEO | — | ✓ | — |
| [inject-canonical-url](#inject-canonical-url) | SEO | — | ✓ | — |
| [generate-sitemap](#generate-sitemap) | SEO | — | — | ✓ |
| [inject-jsonld](#inject-jsonld) | SEO | — | ✓ | — |
| [audit-meta-tags](#audit-meta-tags) | SEO | — | ✓ | — |
| [inline-animation-css](#inline-animation-css) | No.JS Runtime | — | ✓ | — |
| [inject-visibility-css](#inject-visibility-css) | No.JS Runtime | — | ✓ | — |
| [inject-template-hints](#inject-template-hints) | No.JS Runtime | — | ✓ | — |
| [tree-shake-framework](#tree-shake-framework) | No.JS Runtime | — | ✓ | ✓ |
| [inject-csp-hashes](#inject-csp-hashes) | Security | — | ✓ | — |
| [inject-sri-hashes](#inject-sri-hashes) | Security | — | ✓ | — |
| [enforce-script-loading](#enforce-script-loading) | Security | — | ✓ | — |
| [audit-accessibility](#audit-accessibility) | Quality | — | — | — |
| [purge-unused-css](#purge-unused-css) | Quality | — | ✓ | — |
| [generate-pwa-manifest](#generate-pwa-manifest) | PWA | — | ✓ | ✓ |
| [generate-deploy-config](#generate-deploy-config) | Deployment | — | — | ✓ |

---

## Build-time vs No.JS Runtime

Several plugins work in tandem with — or as an alternative to — No.JS's own runtime behaviour. Understanding this relationship helps decide when a build-time plugin adds real value.

| Topic | No.JS runtime behaviour | Build-time plugin | Build-time advantage |
|-------|------------------------|-------------------|----------------------|
| **Page metadata** | `page-title`, `page-description`, `page-canonical` evaluated after route load | `inject-head-attrs` | Metadata present in static HTML; crawlers and OG scrapers without JS see correct values |
| **Social sharing** | `page-image`, `page-url` evaluated at route change | `inject-og-twitter` | OG/Twitter Card tags must exist in static HTML before bots request the page |
| **Animation CSS** | `_injectBuiltInStyles()` injects **all** keyframes on first animation use | `inline-animation-css` | Only used keyframes are shipped; ~5–15 KB savings; B2 guard prevents double-injection |
| **Conditional visibility** | `if=`, `show=`, `hide=` evaluated after JS initialises (100–300 ms window) | `inject-visibility-css` | `visibility:hidden` applied by the browser CSS engine before JS runs; eliminates FOUC |
| **Data preloading** | `get=` directive fetches reactively when the element is processed | `inject-resource-hints` | `<link rel="preload">` starts fetch during HTML parse, before directives initialise |
| **Route prefetch** | Router fetches route templates on first navigation | `inject-resource-hints` | `<link rel="prefetch">` loads route templates in idle time before the user clicks |
| **Navigation prerender** | Router renders new route on `popstate` / link click | `inject-speculation-rules` | Browser prerenders the entire target page speculatively; navigation takes <50 ms |
| **Framework bundle** | Full `nojs.min.js` loaded unconditionally | `tree-shake-framework` | Only directive modules used in HTML are bundled; 20–60 % bundle size reduction |
| **Module loading** | `<script type="module">` parsed sequentially | `inject-modulepreload` | Module graph fetched in parallel during HTML parse |
| **Skeleton styles** | Template target styles loaded on demand | `inject-template-hints` | CSS preloaded before skeleton is shown; no flash of unstyled skeleton |

---

## Performance

### inject-resource-hints

Inject `preload`, `prefetch`, and `preconnect` hints for No.JS fetch directives and route templates.

**When to use:** Any project with `get=` attributes or lazy-loaded `<template route src=...>`. Enables the browser to start fetching API responses and route templates before No.JS initialises.

**Expected gains:** 100–300 ms latency reduction on first data fetch; route transitions become near-instant after prefetch.

```js
'inject-resource-hints': {
  apiBase: 'https://api.example.com',  // B4: inject dns-prefetch for this origin
}
```

| HTML pattern | Injected hint |
|---|---|
| `<div get="/api/users">` | `<link rel="preload" as="fetch" href="/api/users">` |
| `<div get="https://api.ext.com/...">` | `<link rel="preconnect" href="https://api.ext.com" crossorigin>` |
| `<template route="/blog" src="/blog.tpl">` | `<link rel="prefetch" as="fetch" href="/blog.tpl">` |
| `<html lang="pt-BR">` | `<link rel="preload" as="fetch" href="/locales/pt-BR.json" crossorigin>` |
| `apiBase` configured | `<link rel="dns-prefetch" href="https://api.example.com">` |

- Interpolated URLs (`get="/api/{id}"`) are skipped
- Idempotent: never duplicates existing hints

---

### inject-modulepreload

Inject `<link rel="modulepreload">` for every `<script type="module" src="...">` tag.

**When to use:** Projects that reference local ES modules (including `nojs.esm.js`). Causes the browser to start downloading and parsing the module dependency graph during HTML parse rather than waiting for the `<script>` tag to be reached.

**Expected gains:** 50–150 ms reduction in time-to-interactive on module-heavy projects.

```js
'inject-modulepreload': true
```

- Skips cross-origin modules (browsers can only preload same-origin)
- Skips interpolated `src` values
- Idempotent

---

### inject-speculation-rules

Inject a `<script type="speculationrules">` tag based on No.JS `<template route="...">` definitions, enabling near-instant navigation via the Speculation Rules API.

**When to use:** SPAs with predictable navigation patterns and static routes. Ideal for portfolios, documentation sites, and e-commerce with a clear user flow. Not useful for apps where all routes are dynamic (`:param`).

**Expected gains:** Navigation latency drops to <50 ms in Chrome (page is fully rendered before the user clicks). Measurable LCP improvement on target pages.

```js
'inject-speculation-rules': {
  action: 'prerender',      // default — full prerender
  eagerness: 'moderate',    // 'conservative' | 'moderate' | 'eager'
  excludePatterns: ['/admin', '/checkout'],
}
```

- Only includes static routes — `:param` routes and wildcards are excluded
- Has no effect in browsers without Speculation Rules support (safe to ship unconditionally)
- Idempotent

---

### optimize-images

Add performance attributes to `<img>` tags, handle LCP image preloading, and warn on missing `alt` text.

**When to use:** Any page with images. The LCP optimisation alone typically has the highest impact on Core Web Vitals of any single plugin.

**Expected gains:** 30–60 % LCP time reduction from LCP preload + `fetchpriority="high"`; lazy loading reduces page weight by 40–70 % on image-heavy pages.

```js
'optimize-images': {
  lcpSelector: '.hero img',   // explicit LCP candidate (optional)
  skipLazy: '.above-fold',    // skip lazy loading for matching images (optional)
}
```

| Image | Treatment |
|---|---|
| First `<img>` (or class `hero`/`lcp`/`banner`/`featured`) | `fetchpriority="high"` + `<link rel="preload" as="image">` |
| Remaining `<img>` | `loading="lazy"` + `decoding="async"` |
| Inside `<template>` | Alt warning only — no loading attrs added |
| `bind-src` or interpolated `src` | Skipped for LCP preload |

---

### inject-view-transitions

Inject `<style data-nojs-view-transitions>` with `@view-transition { navigation: auto; }` for smooth same-origin page transitions.

**When to use:** SPAs where a visual transition improves perceived navigation performance. Has no visible effect in browsers without View Transitions support — safe to enable unconditionally.

**Expected gains:** Smooth, hardware-accelerated cross-page transitions with zero JavaScript. Eliminates jarring full-page repaints visually.

```js
'inject-view-transitions': true
// or disable:
'inject-view-transitions': { enabled: false }
```

Idempotent — injects the style block only once per document.

---

### inline-critical-css

Extract and inline above-the-fold CSS, converting full stylesheet links to async loads. Requires [`beasties`](https://github.com/GoogleChromeLabs/beasties).

**When to use:** Sites with external CSS files >20 KB. The biggest impact is on FCP and CLS. Not needed if you already inline all CSS or use only small stylesheets.

**Expected gains:** 200–500 ms FCP improvement by eliminating render-blocking `<link rel="stylesheet">` requests.

```js
'inline-critical-css': {
  path: './dist',
  publicPath: '/',
  pruneSource: true,
}
```

If `beasties` is not installed, the plugin logs a warning and passes the HTML through unchanged — the build never fails.

```bash
bun add beasties
```

---

### generate-responsive-images

Generate AVIF and WebP variants at multiple widths for local `<img>` tags, wrapping them in `<picture>` with `srcset`. Requires [`sharp`](https://sharp.pixelplumbing.com/).

**When to use:** Content sites with many product or editorial images (e-commerce, blogs, portfolios). Each image can represent a large fraction of page weight on mobile.

**Expected gains:** 50–80 % bandwidth savings for mobile users (AVIF vs JPEG at equivalent quality); measurable LCP improvement.

```js
'generate-responsive-images': {
  widths: [480, 800, 1200],
  quality: { avif: 60, webp: 80 },
}
```

- Skips GIF, SVG, already-converted formats, and images with `data-no-responsive`
- Graceful fallback if `sharp` is not installed

```bash
bun add sharp
```

---

### precompress-assets

Generate `.br` (Brotli) and `.gz` (gzip) companion files for all compressible assets using Bun's native `zlib`.

**When to use:** Deployments on nginx or Apache with `gzip_static on` / `brotli_static on`. The web server serves pre-compressed files directly, eliminating per-request compression overhead and allowing maximum compression levels without impacting response latency.

**Expected gains:** Brotli is 15–25 % smaller than gzip for text assets; eliminates compression latency on the server entirely.

```js
'precompress-assets': {
  brotli: true,
  gzip: true,
  extensions: ['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.woff2'],
}
```

Uses the `finalize` hook — runs once after all HTML files are processed.

---

### optimize-fonts

Detect Google Fonts, inject preconnect hints and add `display=swap`.

**When to use:** Any project using Google Fonts via `<link>` or `@import`. Without this, Google Fonts is render-blocking and causes FOUT (flash of unstyled text).

**Expected gains:** 100–200 ms font load improvement; eliminates FOUT with `display=swap`.

```js
'optimize-fonts': true
```

Automatically injects:
1. `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>`
2. `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
3. `&display=swap` appended to the Fonts URL (if not already present)

No-op on pages without Google Fonts.

---

### minify-html

Collapse whitespace between tags and remove HTML comments.

**When to use:** All production builds. Low-risk, negligible processing cost, consistent gains.

**Expected gains:** 5–15 % HTML size reduction; compounds well with Brotli/gzip.

```js
'minify-html': {
  removeComments: true,
  collapseWhitespace: true,
}
```

IE conditional comments (`<!--[if IE]>`) are always preserved. Content inside `<script>`, `<style>`, `<pre>`, `<textarea>` is untouched.

---

### inline-svg

Replace `<img src="*.svg">` with inlined SVG content for small files.

**When to use:** Sites with many icon-sized SVGs (navigation icons, UI decorations). Eliminates HTTP requests, enables CSS theming via `currentColor`, and removes icon flicker.

**Expected gains:** 1 HTTP request eliminated per icon; icons render immediately without a separate network round-trip; enables CSS `fill`/`stroke` control.

```js
'inline-svg': {
  maxBytes: 4096,
  cwd: '.',
}
```

- Transfers `alt` to `aria-label + role="img"` (or `aria-hidden="true"` if no alt)
- Strips `width`/`height` from root `<svg>` (CSS controls sizing)
- Skips cross-origin URLs and images with `data-no-inline`

---

## SEO & Metadata

### inject-head-attrs

Read No.JS page-level directives from the `<body>` and inject corresponding `<head>` tags at build time.

**When to use:** Any project that uses `page-title`, `page-description`, `page-canonical`, or `page-jsonld`. Without this plugin, these values only exist in the DOM after JavaScript evaluates them — search engines and social crawlers that don't execute JS see an empty `<title>`.

**Expected gains:** Full SEO visibility for all routes; correct social previews on first share; removes the JavaScript dependency for basic page metadata.

**Comparison with runtime:** No.JS evaluates `page-title` after route navigation. This works for single-page navigation but not for direct page loads where crawlers index raw HTML. This plugin fills that gap by embedding metadata statically.

```js
'inject-head-attrs': true
```

| Directive | Injected in `<head>` |
|---|---|
| `page-title="'My Page'"` | `<title>My Page</title>` |
| `page-description="'About us'"` | `<meta name="description" content="About us">` |
| `page-canonical="'https://example.com/about'"` | `<link rel="canonical" href="...">` |
| `page-jsonld='{...}'` | `<script type="application/ld+json">...</script>` |

- Only static string literals (e.g., `page-title="'My Title'"`) are processed; dynamic expressions are skipped
- Body directives take precedence over route template attributes
- For SPAs, reads the default route template when no body directive is present

---

### inject-og-twitter

Generate Open Graph and Twitter Card meta tags from No.JS `page-*` directives.

**When to use:** Any site where pages are shared on social networks. OG/Twitter Card tags are read by social crawlers at request time — they must be present in static HTML.

**Expected gains:** Correct link previews on Twitter/X, LinkedIn, Slack, iMessage, and WhatsApp when pages are shared.

```js
'inject-og-twitter': {
  type: 'website',
  siteName: 'Acme Corp',
  twitterCard: 'summary_large_image',
  twitterSite: '@acmecorp',
  defaultImage: '/og-default.png',
}
```

Reads from the document: `page-title`, `page-description`, `page-image`, `page-url`, existing `<title>`, `<meta name="description">`, `<link rel="canonical">`. Idempotent.

---

### inject-canonical-url

Inject `<link rel="canonical" href="...">` by combining `config.siteUrl` with the file path.

**When to use:** Multi-page sites and SPAs. Prevents Google from treating `example.com/page` and `example.com/page?ref=twitter` as separate pages.

**Expected gains:** Eliminates duplicate content penalties; helps Google understand the preferred URL for each page.

```js
'inject-canonical-url': {
  siteUrl: 'https://example.com',
}
```

| File | Canonical URL |
|---|---|
| `index.html` | `https://example.com/` |
| `about/index.html` | `https://example.com/about/` |
| `blog/post.html` | `https://example.com/blog/post.html` |

Idempotent — skips if canonical already present.

---

### generate-sitemap

Generate `sitemap.xml` and update `robots.txt` from No.JS route definitions.

**When to use:** Any public-facing site with multiple routes. A sitemap is the primary mechanism for telling search engines which URLs exist and should be indexed.

**Expected gains:** Faster indexing of new routes; search engines discover all pages even without external links.

```js
'generate-sitemap': {
  siteUrl: 'https://example.com',
  changefreq: 'weekly',
  priority: 0.8,
  excludePatterns: ['/admin', '/internal'],
}
```

Uses the `finalize` hook. Writes `sitemap.xml` and creates/updates `robots.txt` with a `Sitemap:` directive.

Routes excluded automatically: dynamic parameters (`:id`), wildcards (`*`), guarded routes (`guard=`). Remaining routes are sorted alphabetically.

---

### inject-jsonld

Inject `<script type="application/ld+json">` with WebPage or WebSite structured data.

**When to use:** Sites that benefit from rich snippets — blogs, e-commerce, events, organisations.

**Expected gains:** Eligibility for rich results in Google Search (breadcrumbs, sitelinks searchbox).

```js
'inject-jsonld': {
  siteUrl: 'https://example.com',
  type: 'WebPage',
  organization: { name: 'Acme Corp', url: 'https://example.com' },
}
```

Reads `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<html lang>`. Idempotent.

---

### audit-meta-tags

Verify required `<head>` tags and optionally inject missing boilerplate.

**When to use:** Always — especially in CI pipelines. Catches missing `charset`, `viewport`, `<title>`, `description`, and `lang` before deployment.

**Expected gains:** Prevents a class of SEO and mobile rendering bugs early; auto-injection of charset and viewport ensures correct rendering.

```js
'audit-meta-tags': {
  inject: true,
  failOnError: false,
}
```

**Injected automatically:** `<meta charset="UTF-8">` (first in `<head>`), `<meta name="viewport" ...>`.

**Warned only:** missing `<title>`, `<meta name="description">`, `lang` on `<html>`.

---

## No.JS Runtime

These plugins coordinate directly with the No.JS framework, pre-applying at build time what the framework would otherwise do — or attempt to do — at runtime in the browser.

### inline-animation-css

Inline only the CSS keyframes actually used by animation directives in the document.

**When to use:** Any project using No.JS animations (`animate=`, `animate-enter=`, `animate-leave=`, `transition=`). Without this plugin, the framework ships all built-in keyframes at runtime regardless of which are used.

**Expected gains:** 3–15 KB savings; no double-injection — the B2 guard in `src/animations.js` detects the pre-injected `<style data-nojs-animations>` block and skips the runtime injection entirely.

**Comparison with runtime:** `_injectBuiltInStyles()` injects the full animation library the first time any animation runs. This plugin replaces that with a build-time-selected subset. The framework's B2 guard (`document.querySelector('[data-nojs-animations]')`) is what makes the two work together — the runtime detects the build-time block and defers.

```js
'inline-animation-css': true
```

Supported: `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`, `fadeOutUp`, `fadeOutDown`, `slideInLeft`, `slideInRight`, `slideOutLeft`, `slideOutRight`, `zoomIn`, `zoomOut`, `bounceIn`, `bounceOut`.

Scans both the main document and `<template>` tags.

---

### inject-visibility-css

Prevent flash of conditional content (FOUC) by marking `if=`, `show=`, and `hide=` elements with `data-nojs-pending` and injecting `[data-nojs-pending] { visibility: hidden; }`.

**When to use:** Any project with `if=`, `show=`, or `hide=` directives visible in the initial HTML (not inside `<template>` tags). Without this plugin, there is a visible flash of the full DOM before No.JS evaluates and hides elements.

**Expected gains:** Zero flash of conditional content; no CLS from elements appearing then disappearing during JS initialisation; consistent layout on slow connections.

**Comparison with runtime:** No.JS `if`/`show`/`hide` directives evaluate after the directive tree is processed (50–300 ms on a cold load). During this window, hidden elements are visible. This plugin applies `visibility:hidden` via CSS — applied by the browser before any JS runs. The B5 fix in `src/directives/conditionals.js` (`el.removeAttribute('data-nojs-pending')`) lifts the state as soon as the directive takes control.

```js
'inject-visibility-css': true
```

- Only targets elements outside `<template>` tags
- Injects the CSS block once per document
- Idempotent

---

### inject-template-hints

For elements with `loading=`, `skeleton=`, `error=`, `empty=`, or `success=` template attributes:

1. Preload external stylesheets referenced inside the template target
2. If the template contains a skeleton element (class matching `/skeleton/i`), inject a `skeleton-pulse` CSS animation

**When to use:** Projects using No.JS skeleton/loading states. Without this plugin, the skeleton's CSS file is requested on demand when the state first activates — causing a flash of unstyled skeleton content.

**Expected gains:** Skeleton CSS is available before the skeleton is displayed; smooth loading states without FOUC.

**Comparison with runtime:** No.JS activates template states reactively. Stylesheet resources inside the template are only requested when the template is first shown. This plugin pre-fetches those stylesheets during HTML parse.

```js
'inject-template-hints': true
```

---

### tree-shake-framework

Build a minimal No.JS bundle containing only the directive modules actually used in your HTML, using Bun's native `Bun.build()` bundler.

**When to use:** Projects that use a subset of No.JS directives — which is most real-world projects. Most apps use 4–8 of the 12 directive modules.

**When NOT to use:** Projects that register custom directives via `NoJS.directive()` that depend on modules not detectable from HTML attributes, unless those modules are covered by the attribute scanner.

**Expected gains:** 20–60 % bundle size reduction; proportional reduction in JS parse/compile time, which directly affects Time to Interactive on mobile devices.

**Comparison with runtime:** The full `nojs.min.js` always loads all 12 directive modules. There is no runtime mechanism for partial loading. This plugin eliminates unused modules before the bundle is created, then replaces the original `<script>` tag with the generated bundle.

**Requirements:** Bun runtime (uses `Bun.build()` — no extra dependency). `@erickxavier/no-js` installed via npm (the `src/` directory is published in the package), or explicit `frameworkSrc` config.

```js
'tree-shake-framework': true

// with explicit source path:
'tree-shake-framework': {
  frameworkSrc: './node_modules/@erickxavier/no-js/src',
}
```

**Directive module map:**

| HTML attributes | Module removed when absent |
|---|---|
| `state=`, `store=`, `persist-fields=` | `directives/state.js` |
| `get=`, `post=`, `put=`, `patch=`, `delete=` | `directives/http.js` |
| `bind=`, `bind-*=`, `model=` | `directives/binding.js` |
| `if=`, `else-if=`, `else`, `show=`, `hide=`, `switch=` | `directives/conditionals.js` |
| `for=` | `directives/loops.js` |
| `class-if=`, `toggle-class=`, `style-if=`, etc. | `directives/styling.js` |
| `on=`, `on-*=` | `directives/events.js` |
| `ref=` | `directives/refs.js` |
| `validate=`, `form-validate=`, `required=` | `directives/validation.js` |
| `t=`, `bind-t=`, `lang=` | `directives/i18n.js` |
| `draggable=`, `droppable=`, `drag-handle=` | `directives/dnd.js` |
| `page-title=`, `page-description=`, `page-canonical=`, `page-jsonld=` | `directives/head.js` |

Core modules (globals, evaluate, context, registry, dom, filters, router, animations) are always included. Bun's tree shaker further eliminates dead code within included modules.

---

## Security

### inject-csp-hashes

Compute SHA-384 hashes for all inline `<script>` and `<style>` tags, then inject or update a `<meta http-equiv="Content-Security-Policy">` tag.

**When to use:** Production sites with strict XSS requirements. Enables CSP without `'unsafe-inline'` by allowlisting specific inline scripts by their hash.

**Expected gains:** Blocks injected inline scripts from XSS attacks; zero configuration once enabled.

> Run this plugin **after** `minify-html` so hashes reflect the final HTML content.

```js
'inject-csp-hashes': {
  scriptSrc: "'self'",
  styleSrc:  "'self'",
}
```

Result: `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha384-...'; style-src 'self' 'sha384-...'">`

- `<script type="speculationrules">` excluded from hashing
- Updates an existing CSP tag rather than adding a duplicate

---

### inject-sri-hashes

Fetch external `https://` scripts and stylesheets at build time and add `integrity` + `crossorigin="anonymous"` attributes.

**When to use:** Sites loading the No.JS framework or other libraries from a CDN. SRI protects against CDN compromise: a tampered resource is blocked by the browser before execution.

**Expected gains:** Protection against CDN supply chain attacks. Required by many compliance frameworks (SOC 2, PCI DSS).

```js
'inject-sri-hashes': {
  timeout: 5000,
  skip: ['cdn.trusted-internal.com'],
}
```

- Fetch failures are silently swallowed — the build never breaks
- Skips interpolated URLs, non-https, and resources already bearing `integrity`

---

### enforce-script-loading

Add `defer` (or `async`) to third-party `<script>` tags that would otherwise be render-blocking.

**When to use:** Sites that include third-party scripts (analytics, chat widgets, A/B testing). Render-blocking scripts are one of the most common causes of poor LCP and FCP scores.

**Expected gains:** 100–300 ms FCP improvement; third-party scripts no longer block initial paint.

```js
'enforce-script-loading': {
  strategy: 'defer',
  allowList: ['cdn.criticalvendor.com'],
}
```

- Only processes cross-origin scripts (`http://`, `https://`, `//`)
- Skips `<script type="module">` (inherently deferred)
- Skips scripts already bearing `defer` or `async`

---

## Quality & Accessibility

### audit-accessibility

Run WCAG quick-checks on each HTML file and report violations to stderr. **This plugin never modifies the HTML.**

**When to use:** CI/CD pipelines and pre-deploy checks. Catches the most common accessibility issues before they reach production.

**Expected gains:** Catches WCAG 2.1 Level A violations early; `failOnError: true` blocks deploys with accessibility regressions.

```js
'audit-accessibility': {
  failOnError: false,
  rules: {
    'img-alt':       true,
    'link-name':     true,
    'label':         true,
    'heading-order': true,
    'html-lang':     true,
  },
}
```

---

### purge-unused-css

Remove CSS rules from inline `<style>` tags whose selectors match no elements in the document.

**When to use:** Projects that inline large CSS blocks or utility CSS frameworks. Particularly effective after `inline-critical-css`.

**Expected gains:** 10–50 % reduction in inline style size depending on CSS usage ratio.

```js
'purge-unused-css': true
```

- `@keyframes`, `@media`, `@font-face`, and other at-rules are **always preserved**
- No.JS internal style tags (`data-nojs-animations`, etc.) are skipped
- Conservative: selectors that can't be parsed are kept

---

## PWA

### generate-pwa-manifest

Inject `<link rel="manifest">` and generate `manifest.webmanifest` in the output directory.

**When to use:** Any application that should be installable as a PWA — required for the browser "Add to Home Screen" prompt and Lighthouse PWA audits.

**Expected gains:** App becomes installable; enables offline capability foundation; improves engagement on mobile.

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

Uses the `finalize` hook to write `manifest.webmanifest`.

---

## Deployment

### generate-deploy-config

Generate SPA fallback routing configuration files for popular hosting platforms.

**When to use:** SPAs deployed to Netlify, Vercel, Apache, or nginx. Without a server-side fallback, direct URL access to client-side routes returns a 404. This plugin generates the correct configuration automatically, including a warning if `useHash: true` is detected (hash-based SPAs don't need fallback configs).

**When NOT to use:** Apps using `useHash: true` routing — hash-based routing handles all routes client-side and doesn't need server-side fallback.

**Expected gains:** Eliminates 404 errors on direct URL access and browser refresh; removes a common deployment gotcha without manual configuration per platform.

```js
'generate-deploy-config': {
  targets: ['netlify'],   // 'netlify' | 'vercel' | 'apache' | 'nginx'
  base: '/',              // app base path (e.g. '/app' for sub-path deployments)
}
```

| Target | Generated file | Content |
|---|---|---|
| `netlify` | `_redirects` | `/* /index.html 200` |
| `vercel` | `vercel.json` | Rewrites array pointing all paths to `/index.html` |
| `apache` | `.htaccess` | `mod_rewrite` rules with `RewriteBase` |
| `nginx` | `nginx.conf` | `location` block with `try_files` |

Multiple targets in one run:

```js
'generate-deploy-config': { targets: ['netlify', 'vercel'] }
```

Sub-path deployment (app at `/app/`):

```js
'generate-deploy-config': { targets: ['nginx'], base: '/app' }
// generates: location /app/ { try_files $uri $uri/ /app/index.html; }
```
