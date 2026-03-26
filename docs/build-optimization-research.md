# Build-Time Optimization Research — No.JS

**Date:** 2026-03-25
**Scope:** Build-time optimization techniques used by state-of-the-art web frameworks that are not yet implemented in No.JS

---

## 1. What No.JS already has

Before listing what's missing, here is what is already covered by the B-series scripts and resource hints:

| Script | Technique |
|--------|-----------|
| B1 | LCP candidate detection, `<link rel="preload" as="image">`, `loading="lazy"` + `decoding="async"` for non-LCP images, `alt` attribute warnings |
| B2 | Inline only the animation keyframes actually used in the document — eliminates unused CSS |
| B5 | Inject `data-nojs-pending` on `if=`/`show=`/`hide=` elements — prevents FOUC |
| B6 | Generate `sitemap.xml` + `robots.txt` from `<template route>` declarations |
| B7 | Preload stylesheets referenced by `loading=`/`error=`/`skeleton=` templates |
| Resource hints | `<link rel="preload" as="fetch">` for static `get=` URLs, `<link rel="preconnect">` for cross-origin, `<link rel="prefetch">` for `<template route src>` |

---

## 2. Techniques Identified in Researched Frameworks

### Frameworks analysed

Astro, SvelteKit, Next.js, Nuxt, Qwik/QwikCity, SolidStart, Eleventy, HTMX ecosystem, Angular, Vite, Partytown

---

### T1 — Critical CSS Extraction and Inlining

**What it does:** Analyses the rendered HTML and associated stylesheets, identifies CSS rules affecting above-the-fold content, injects those rules as an inline `<style>` in `<head>`, and converts the full stylesheet `<link>` to async loading (`rel="preload" as="style" onload="this.rel='stylesheet'"`).

**Frameworks:** SvelteKit (Beasties), Nuxt (Beasties), Next.js (experimental), Astro (optional)
**Key tool:** [Beasties](https://github.com/danielroe/beasties) — actively maintained fork of Google Critters, now maintained by the Nuxt team (Daniel Roe). Operates on HTML strings + CSS content — exactly the inputs available to jsdom-based scripts.

**No.JS applicability:** High. No.JS already injects inline `<style>` for animations (B2) and FOUC prevention (B5). A new script could use Beasties as a library, process each HTML file against its linked CSS, inline the critical portion, and make the full stylesheet async.

**Complexity:** Medium (Beasties is an npm library; requires mapping between HTML files and their linked stylesheets)
**Performance impact:** High — eliminates render-blocking CSS; typical FCP improvement of 300–800ms on average connections

---

### T2 — Font Optimization (Self-Hosting, Preload, font-display, Subsetting)

**What it does:** Scans HTML for `<link href="https://fonts.googleapis.com/...">` tags, downloads font files at build time, self-hosts them as static assets, replaces CDN links with local `<link rel="preload" as="font" crossorigin>`, applies `font-display: swap` to prevent FOIT (Flash of Invisible Text), and subsets to only the Unicode ranges actually used.

**Frameworks:** Next.js (`next/font`), Nuxt (`@nuxt/fonts`), Astro (experimental Fonts API)
**Key tool:** `subfont` (Bun-compatible — full font audit from HTML)

**No.JS applicability:** High. Detecting Google Fonts `<link>` tags and replacing them with self-hosted + preloaded equivalents is straightforward via jsdom. Even without full subsetting (which requires external tooling), converting to `font-display: swap` + local hosting is a significant gain.

**Complexity:** Medium (Google Fonts detection is simple; download and replacement is direct; subsetting requires external tools)
**Performance impact:** High — eliminates 2 network round trips to Google's CDN; prevents FOIT; prevents layout shift with `size-adjust`

---

### T3 — Responsive Image Generation (`<picture>`, AVIF/WebP, srcset)

**What it does:** Scans `<img>` tags in the HTML, processes source images via Sharp to generate multiple sizes and modern formats (AVIF, WebP), replaces `<img>` with `<picture>` + `<source>` carrying `srcset` + `sizes`, and always sets `width` and `height` to prevent CLS.

**Frameworks:** Astro (`<Image>`, `<Picture>`), Eleventy (`@11ty/eleventy-img`), Next.js (`next/image`), Nuxt (`@nuxt/image`), Angular (`NgOptimizedImage`)
**Key tool:** Sharp — Bun-compatible image processing

**No.JS applicability:** High. B1 already identifies LCP candidates and applies `loading="lazy"`. The natural evolution is format generation (AVIF/WebP) and `srcset`. Eleventy's cache model (disk cache keyed by image hash + config) is the right approach to avoid expensive reruns.

**Complexity:** Medium-High (requires Sharp as a dependency; relative path resolution; images on external CDNs cannot be processed locally)
**Performance impact:** High — AVIF ~50% smaller than JPEG at equivalent quality; WebP ~30% smaller; `width`/`height` prevents CLS

---

### T4 — Subresource Integrity (SRI) Hash Injection

**What it does:** After the build, computes SHA-384 hashes for each `<script src>` and `<link rel="stylesheet" href>` pointing to external resources or CDNs, and injects `integrity="sha384-..."` + `crossorigin="anonymous"`.

**Frameworks:** Vite (`vite-plugin-sri`), general practice in PCI DSS 4.0-compliant builds
**Key tool:** Bun built-in `crypto`

**No.JS applicability:** Medium-High. Users referencing external scripts or CDN stylesheets benefit immediately. PCI DSS 4.0 (effective March 2025) requires integrity verification of scripts on payment pages. Bun `crypto.createHash` makes the implementation trivial.

**Complexity:** Low (Bun native crypto; direct HTML attribute injection)
**Performance impact:** Low direct — security benefit; prevents supply chain attacks and malicious CDN injection

---

### T5 — Speculation Rules API Injection

**What it does:** Injects a `<script type="speculationrules">` block with JSON that instructs Chrome/Edge to prefetch or prerender pages the user is likely to navigate to next. Supports `eagerness` levels (`conservative`, `moderate`, `eager`) and URL pattern matching.

**Frameworks:** No framework has this as a native core feature yet — WordPress has a plugin for it; a community module exists for Nuxt. Chrome DevRel recommends it actively.
**Browser support:** Chrome 121+, Edge 121+ (Safari: not yet as of early 2026)

**No.JS applicability:** High — and a potential competitive advantage. B6 already knows all routes via `<template route>`. That list is exactly the input needed to generate a `<script type="speculationrules">` block with all internal routes at `prefetch` with `moderate` eagerness. This replaces per-link `<link rel="prefetch">` with a declarative, browser-managed system. **No.JS could be ahead of all major frameworks on this technique.**

**Complexity:** Low (JSON generation + injecting one `<script>` tag; routes already known from B6)
**Performance impact:** High — prerender means navigation to the next page can be instantaneous (<100ms) because the page is already rendered in the background

---

### T6 — HTML Minification

**What it does:** Removes unnecessary whitespace, comments, redundant attributes (`type="text/javascript"`, `type="text/css"`), optional closing tags, and collapses boolean attributes. Also minifies inline `<script>` and `<style>` content.

**Frameworks:** Astro (optional post-build), Eleventy (community plugins), virtually all production builds
**Key tool:** `html-minifier-terser` (actively maintained, supports ES6+ in inline scripts via Terser)

**No.JS applicability:** High. The B-series scripts inject multiple `<style>` blocks and `<link>` tags. Minification should run last, after all other scripts. Typical reduction of 10–30% in HTML size.

**Complexity:** Low (one npm package, one pass over all `.html` files)
**Performance impact:** Medium — 10–30% size reduction; more impactful without CDN compression; less than Brotli alone but free

---

### T7 — Pre-Compressed Assets (Brotli + gzip)

**What it does:** After all HTML processing, generates companion `.html.br` (Brotli) and `.html.gz` (gzip) files for each output file. Servers configured to serve pre-compressed files (Nginx `gzip_static`, Caddy static compression) serve them directly with no per-request CPU cost.

**Frameworks:** Nuxt/Nitro (`compressPublicAssets`), `nuxt-precompress`, Vite (via plugins)
**Key tool:** Bun built-in `zlib` (no external dependencies)

**No.JS applicability:** Medium. Zero new dependencies (Bun `zlib.brotliCompress` + `zlib.gzip` are built-in). Value depends on the user's server configuration, but it is a zero-risk addition.

**Complexity:** Low (native zlib; no additional dependencies)
**Performance impact:** Medium — Brotli ~15–20% better compression than gzip on HTML; eliminates per-request compression CPU on static hosting

---

### T8 — Service Worker / PWA Manifest Generation

**What it does:** Generates a `manifest.webmanifest` from configured metadata, creates a `service-worker.js` with a precache manifest for all static assets, and injects `<link rel="manifest">` and the registration `<script>` into each HTML page.

**Frameworks:** Vite (`vite-plugin-pwa` + Workbox), SvelteKit, Nuxt (PWA module), Next.js (next-pwa)
**Key tool:** Workbox (usable as a library)

**No.JS applicability:** Medium. The full list of HTML output files and their assets is already known when the B-series scripts run. An optional script could generate the manifest, a minimal SW (or via Workbox `generateSW`), and inject `<link rel="manifest">` into each page. Requires minimal user configuration (name, icons, theme color).

**Complexity:** Medium (Workbox as a library; manifest generation is trivial; SW cache strategies need to be configurable)
**Performance impact:** High — PWA installability; offline support; cache-first makes repeat visits nearly instantaneous

---

### T9 — JSON-LD and Open Graph Injection

**What it does:** Scans HTML pages for metadata signals (title, description, `<article>` elements, dates, images) and injects `<script type="application/ld+json">` blocks with Schema.org JSON-LD (WebPage, Article, BreadcrumbList, WebSite, Organization). Also audits/injects Open Graph and Twitter Card `<meta>` tags.

**Frameworks:** Not built-in to any framework core; available as Astro integrations (`astro-seo`), Nuxt modules (`nuxt-schema-org`)

**No.JS applicability:** High. B6 already reads `<template route>` elements. A script can extract page metadata and inject JSON-LD for WebPage + WebSite schema. JSON-LD has reached 41% of pages on the web (Web Almanac 2024) and directly enables Rich Results in Google Search.

**Complexity:** Medium (requires conventions about which metadata is available; generating valid JSON-LD is direct; the challenge is knowing which schema types apply per page)
**Performance impact:** Medium — SEO benefit; enables Rich Results, significantly improves CTR

---

### T10 — CSP Hash Injection (static, via `<meta>`)

**What it does:** After all `<script>` and `<style>` inline blocks are finalised by the build scripts, computes SHA-256/384 hashes of each block's content and injects `<meta http-equiv="content-security-policy" content="script-src 'sha256-...'; style-src 'sha256-...'">`.

**Frameworks:** Astro 5.9 (experimental) — the first framework to do this for static sites, released February 2026

**No.JS applicability:** High — and with a structural advantage. Because B2 and B5 inject inline `<style>` blocks, the exact content of all inline scripts and styles is known at the end of the B-series pipeline. A final step can compute hashes and emit the CSP `<meta>` tag. This puts No.JS at the same level as the most advanced security technique available in static site tooling today.

**Complexity:** Low-Medium (Bun `crypto.createHash('sha384')` on each inline element; the tricky part is ensuring no other script injects inline content after this step)
**Performance impact:** Low direct — security benefit; prevents XSS; required for PCI DSS 4.0

---

### T11 — View Transitions Opt-In Injection

**What it does:** Injects `@view-transition { navigation: auto; }` into the global CSS of each page (or as a `<style>` block) to enable native cross-document view transitions in the browser. For advanced transitions, applies unique `view-transition-name` values to key elements (hero images, headers).

**Frameworks:** Astro (native View Transitions since Astro 3, cross-document since Astro 4+), SvelteKit (experimental)
**Browser support:** Chrome 126+, Edge 126+, Safari 18.2+ for cross-document transitions (Interop 2025 focus)

**No.JS applicability:** Medium. A build script can inject `<style>@view-transition { navigation: auto; }</style>` into each HTML page. The basic opt-in is a one-line injection per page; advanced `view-transition-name` coordination would require user annotation.

**Complexity:** Low (one `<style>` injection per page; advanced `view-transition-name` requires conventions)
**Performance impact:** Medium — improved perceived performance via smooth transitions; no impact on actual load time, but significant UX gain

---

### T12 — `<link rel="modulepreload">` for the No.JS Script

**What it does:** Detects the `<script src="...nojs...">` tag in the HTML and injects a corresponding `<link rel="modulepreload" href="...">` in `<head>`, ensuring the browser begins fetching the framework as early as possible — before the `<body>` is even parsed.

**Frameworks:** Vite (automatic), SvelteKit, Next.js, Astro

**No.JS applicability:** Medium. No.JS is delivered as a single module (~24KB). A build script can detect the No.JS script tag and inject the corresponding `modulepreload`. Simple, zero dependencies, real gain especially on mobile / slow connections.

**Complexity:** Low (pattern detection + one tag injection)
**Performance impact:** Medium — saves one round-trip chain; typically 100–300ms on mobile

---

### T13 — Unused CSS Elimination (PurgeCSS-style)

**What it does:** Scans all HTML output files for class names and element selectors, removes all CSS rules that do not match any selector found in the HTML.

**Frameworks:** Tailwind CSS (JIT mode does this automatically), PurgeCSS (standalone), UnCSS

**No.JS applicability:** Low-Medium. No.JS does not ship user CSS — only animation CSS (already handled by B2). For users including a utility CSS framework (Tailwind, Bootstrap), PurgeCSS could be run against the generated HTML. This is more of a user-space concern than No.JS-specific.

**Complexity:** Medium (PurgeCSS can be used as a library; challenge is handling dynamic classes generated by `if=`/`show=`)
**Performance impact:** High (can reduce CSS from 200KB to <10KB for utility frameworks)

---

### T14 — Accessibility Audit at Build Time

**What it does:** Runs axe-core or Pa11y against each generated HTML page, reports WCAG violations, and can either fail the build (CI gate) or log warnings. Can auto-correct trivial issues (missing `alt` attributes, missing `lang` on `<html>`, missing `<title>`).

**Frameworks:** Not built-in to any framework core; available as an Eleventy plugin, Astro integration (`astro-a11y`), CI step for all frameworks

**No.JS applicability:** Medium. B1 already warns about missing `alt`. Extending this with axe-core in Bun-compatible (via linkedom) against each HTML output page would catch ~30–40% of WCAG issues automatically. Auto-fixing missing `<html lang>` and `<title>` is trivial.

**Complexity:** Medium (axe-core works with jsdom but has limitations vs. a real browser; Pa11y requires a headless browser, which is heavier)
**Performance impact:** Low direct — compliance and inclusivity impact; risk mitigation for legal exposure (ADA/WCAG)

---

### T15 — Meta Tag Audit and Injection

**What it does:** Scans each HTML page for required `<meta>` tags (`<meta name="description">`, `<meta charset>`, `<meta name="viewport">`, canonical `<link>`, `<title>`) and injects defaults or emits warnings when absent. Also validates `<html lang>`.

**Frameworks:** Implicit in all SSG framework pipelines; standalone tools include `html-validate`

**No.JS applicability:** High. B6 already has a complete view of all routes. Adding a validation pass that checks `<title>`, `<meta name="description">`, `<meta charset="UTF-8">`, `<meta name="viewport">`, `<link rel="canonical">`, and `<html lang>` on each page catches common SEO/a11y omissions at build time.

**Complexity:** Low (pure HTML attribute/element checking and injection; auto-injecting `<meta charset="UTF-8">` and `<meta name="viewport">` is safe)
**Performance impact:** Low direct; High for SEO — missing `description` costs ranking; missing `viewport` breaks mobile rendering

---

### T16 — Third-Party Script Defer/Async Enforcement

**What it does:** Scans `<script>` tags for known third-party origins (Google Analytics, GTM, Meta Pixel, Hotjar, etc.) and either (a) rewrites `type` to `text/partytown` + injects a Partytown loader, (b) adds `defer`/`async` if absent, or (c) moves blocking scripts from `<head>` to the end of `<body>`.

**Frameworks:** Partytown (Qwik team); integrations for Astro, Next.js, Nuxt, Gatsby

**No.JS applicability:** Medium. A simpler version than full Partytown integration: a script that detects known third-party patterns and at minimum adds `defer` or `async` if absent, or warns the user that a blocking third-party script was found.

**Complexity:** Low for defer/async enforcement (attribute check + injection); Medium-High for full Partytown integration (service worker, proxy setup)
**Performance impact:** High — third-party scripts are consistently the leading cause of main-thread blocking; simply deferring GTM can improve TBT by 200–500ms

---

### T17 — Inline SVG Optimization (SVGO)

**What it does:** Scans HTML for `<img src="*.svg">` referencing icon files, inlines the SVG content directly into the HTML (eliminating a network request), and runs SVGO on the inlined SVG to reduce its size.

**Frameworks:** Eleventy (`@11ty/eleventy-plugin-icons`), Vite (`vite-plugin-svgr`), Astro (via integrations)

**No.JS applicability:** Medium. A script could inline small SVGs (below a configurable threshold, e.g. 2KB) directly and run SVGO on them, eliminating network requests for icon assets.

**Complexity:** Medium (requires SVGO as a dependency; distinguishing icon SVGs from illustrations/photos; path resolution)
**Performance impact:** Medium — each eliminated SVG request saves ~20–100ms on slow connections; more impactful in UIs with many icons

---

### T18 — Canonical URL and Trailing Slash Normalisation

**What it does:** Injects `<link rel="canonical" href="...">` into each HTML page based on the configured base URL and the page's output path; normalises trailing slashes consistently.

**Frameworks:** Astro (built-in canonical URL generation), Next.js, SvelteKit

**No.JS applicability:** High. B6 already knows all routes and generates `sitemap.xml`. Injecting `<link rel="canonical">` into each page is a natural extension. Duplicate content issues (with vs. without trailing slash) can cause ranking penalties.

**Complexity:** Low (one `<link>` element injection per page; requires a configured `siteUrl`)
**Performance impact:** Low direct; High for SEO — prevents duplicate content penalties; essential for sites with multiple URL forms

---

## 3. Consolidated Table

| ID | Technique | Frameworks | No.JS fit | Complexity | Impact |
|----|-----------|------------|-----------|------------|--------|
| T1 | Critical CSS extraction + inlining | SvelteKit, Nuxt, Next.js, Astro | High | Medium | High |
| T2 | Font optimisation (self-host, preload, subset) | Next.js, Nuxt, Astro | High | Medium | High |
| T3 | Responsive image generation (picture/srcset/AVIF) | Astro, Eleventy, Next.js, Nuxt, Angular | High | Medium-High | High |
| T4 | SRI hash injection | Vite, general | Medium-High | Low | Low (security) |
| T5 | Speculation Rules API injection | None as core yet | High | Low | High |
| T6 | HTML minification | Astro, Eleventy, universal | High | Low | Medium |
| T7 | Pre-compressed assets (Brotli/gzip) | Nuxt/Nitro, Vite plugins | Medium | Low | Medium |
| T8 | Service worker / PWA generation | Vite-PWA, SvelteKit, Nuxt, Next.js | Medium | Medium | High |
| T9 | JSON-LD + Open Graph injection | Astro integrations, Nuxt modules | High | Medium | Medium (SEO) |
| T10 | CSP hash injection (meta tag, static) | Astro 5.9 | High | Low-Medium | Low (security) |
| T11 | View transitions opt-in injection | Astro, SvelteKit | Medium | Low | Medium (UX) |
| T12 | `<link rel="modulepreload">` for No.JS script | Vite, SvelteKit, Next.js, Astro | Medium | Low | Medium |
| T13 | Unused CSS elimination (PurgeCSS) | Tailwind JIT, PurgeCSS | Low-Medium | Medium | High |
| T14 | Accessibility audit at build time | Eleventy plugins, CI tools | Medium | Medium | Low (compliance) |
| T15 | Meta tag audit + injection | Universal practice | High | Low | Low-High (SEO) |
| T16 | Third-party script defer/async/Partytown | Partytown, all frameworks | Medium | Low–High | High |
| T17 | Inline SVG optimisation (SVGO) | Eleventy, Vite, Astro | Medium | Medium | Medium |
| T18 | Canonical URL injection | Astro, Next.js, SvelteKit | High | Low | Low (SEO) |

---

## 4. Recommended Prioritisation

### Tier 1 — Maximum ROI, Low Complexity (immediate candidates for the build pipeline)

| # | Technique | Rationale |
|---|-----------|-----------|
| 1 | **T6 — HTML Minification** | One npm package, runs last in the pipeline, 10–30% reduction, zero risk. The final script that closes the B-series pipeline. |
| 2 | **T5 — Speculation Rules API** | Routes already known from B6. JSON generation + one `<script>` injection. No.JS could be the **only framework with this as a built-in** — a real competitive advantage. |
| 3 | **T15 — Meta Tag Audit + Injection** | Natural extension of B1's warning pattern. Zero dependencies. Catches missing `<title>`, `<meta description>`, `<meta charset>`, `<html lang>`. |
| 4 | **T18 — Canonical URL Injection** | Natural extension of B6. One tag per page. Requires a configured `siteUrl`. |
| 5 | **T12 — modulepreload for No.JS script** | Pattern detection + one tag injection. Guarantees early fetch of the framework. Zero dependencies. |

### Tier 2 — High Impact, Medium Complexity

| # | Technique | Rationale |
|---|-----------|-----------|
| 6 | **T1 — Critical CSS (Beasties)** | Largest possible FCP gain. Beasties can be used as a library. Requires HTML ↔ CSS mapping. |
| 7 | **T10 — CSP Hash Injection** | Natural final step after B2/B5 inject inline `<style>` blocks. Same approach as Astro 5.9. Puts No.JS at the state of the art in security. |
| 8 | **T2 — Font Optimisation** | Detect Google Fonts → download → self-host → preload + `font-display: swap`. High impact on sites using external fonts. |
| 9 | **T9 — JSON-LD + Open Graph** | Extends B6's route knowledge. High SEO value — enables Rich Results in Google Search. |

### Tier 3 — Significant Impact, Higher Complexity or Narrower Applicability

| # | Technique | Rationale |
|---|-----------|-----------|
| 10 | **T4 — SRI Hash Injection** | Security-first; relevant for PCI DSS 4.0; native Bun crypto. |
| 11 | **T11 — View Transitions** | One CSS line per page. Browser support growing fast (Chrome, Edge, Safari 18.2+). |
| 12 | **T16 — Third-Party Script Enforcement** | Detect blocking third-party scripts; enforce defer/async; log warnings. |
| 13 | **T8 — PWA / Service Worker** | High impact but requires user configuration; better as an optional module. |
| 14 | **T3 — Responsive Image Generation** | Largest image performance gain but requires Sharp and complex HTML rewriting. |
| 15 | **T7 — Pre-Compressed Assets** | Zero dependencies (native zlib); optional; depends on server configuration. |

---

## 5. Strategic Notes

### T5 (Speculation Rules) is the largest differentiation opportunity

No framework has the Speculation Rules API as a native build-time feature yet. No.JS's B6 already has exactly the input needed (the full list of routes). Implementing this would position No.JS as the first framework to deliver potentially instantaneous navigation via prerender with zero user configuration.

### T10 (CSP Hash) puts No.JS at the Astro 5.9 level

Astro 5.9 released static CSP via hashes in February 2026 as an experimental feature and was well received. The No.JS B-series pipeline is structurally better positioned for this than Astro, because it operates on plain HTML rather than `.astro` components. The hashing step would run after B2 and B5 (which inject inline `<style>` blocks), guaranteeing all inline elements are finalised.

### Beasties (T1) and the legacy of Google Critters

Google Critters has been archived. The actively maintained fork is **Beasties**, maintained by Daniel Roe (Nuxt core team). Used internally in Angular CLI, SvelteKit, and Nuxt. Operates on HTML strings + CSS — exactly what jsdom processes. It is the right choice for critical CSS in No.JS.

### Zero-dependency philosophy should guide sequencing

Tier 1 techniques (T6, T5, T15, T18, T12) can all be implemented **with no new dependencies**. Techniques with external dependencies (Beasties, subfont, Sharp, Workbox) are better suited as optional/configurable scripts, following Eleventy's `@11ty/eleventy-img` model — which uses a disk cache to avoid expensive reruns.

---

## 6. Sources and References

- [Astro Docs — Images](https://docs.astro.build/en/guides/images/)
- [Astro 5.9 — Experimental CSP](https://astro.build/blog/astro-590/)
- [Beasties (Critters fork)](https://github.com/danielroe/beasties)
- [Speculation Rules API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
- [Chrome DevRel — Implementing Speculation Rules](https://developer.chrome.com/docs/web-platform/implementing-speculation-rules)
- [Next.js — Font Optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [Next.js — Image Optimization](https://nextjs.org/docs/app/getting-started/images)
- [Nuxt — Prerendering & compressPublicAssets](https://nuxt.com/docs/4.x/getting-started/prerendering)
- [Qwik — Resumability](https://qwik.dev/docs/concepts/resumable/)
- [Eleventy — Image Plugin](https://www.11ty.dev/docs/plugins/image/)
- [Vite — Features & modulepreload](https://vite.dev/guide/features)
- [Partytown — Web Workers for third-party scripts](https://github.com/QwikDev/partytown)
- [Angular — NgOptimizedImage](https://angular.dev/guide/image-optimization)
- [SvelteKit — Performance](https://svelte.dev/docs/kit/performance)
- [View Transitions 2025 Update — Chrome DevRel](https://developer.chrome.com/blog/view-transitions-in-2025)
- [Web Almanac 2024 — Structured Data](https://almanac.httparchive.org/en/2024/structured-data)
- [web.dev — Optimize web fonts](https://web.dev/learn/performance/optimize-web-fonts)
- [web.dev — Preload modules](https://web.dev/articles/modulepreload)
- [html-minifier-terser](https://github.com/terser/html-minifier-terser)
- [PurgeCSS](https://purgecss.com/)
- [Subresource Integrity — MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)
