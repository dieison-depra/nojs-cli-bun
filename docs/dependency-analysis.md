# Dependency Analysis — Security & Replaceability

Review of all external dependencies in `nojs-cli-bun`, assessing security risk and viability of replacing each with native/built-in implementations.

---

## Production Dependencies (runtime)

| Dep | Version | Usage | Transitive pkgs | Risk | Native alternative | Viability |
|-----|---------|-------|----------------|------|--------------------|-----------|
| `linkedom` | `0.18.12` | DOM parsing in 23 of 26 plugins (`parseHTML`, `querySelectorAll`, `createElement`, `toString`) | 14 pkgs (`htmlparser2`, `css-select`, `cssom`, `domutils`, `domhandler`, `dom-serializer`, `entities` ×2, `boolbase`, `css-what`, `nth-check`, `domelementtype`, `html-escaper`, `uhyphen`) | ⚠️ Medium — largest runtime attack surface; parses potentially untrusted HTML at build time | `Bun.HTMLRewriter` (SAX-style) for simple inject plugins; string/regex for others | **Partial / Medium effort** — 6–8 simple plugins (`inject-view-transitions`, `generate-pwa-manifest`, `inject-canonical-url`, `generate-sitemap`, `inject-speculation-rules`, `enforce-script-loading`) could use `Bun.HTMLRewriter` or string replacement. The remaining 17 plugins depend on real DOM traversal (`querySelectorAll`, `createElement`). Would not eliminate the dependency, only reduce its usage surface. |

---

## Optional Dependencies (not installed by default)

| Dep | Usage | Risk | Alternative | Viability |
|-----|-------|------|-------------|-----------|
| `beasties` | `inline-critical-css` — extracts above-the-fold CSS and async-loads the rest | ⚠️ Medium — complex CSS parsing + selector matching logic | None realistic | ❌ Not feasible — requires parsing both CSS and HTML with full selector matching; would be equivalent to reimplementing ~80% of the feature |
| `sharp` | `generate-responsive-images` — generates AVIF/WebP variants with srcset | ⚠️ Medium-High — native addon (C++), image parsing attack surface | Bun has no native image transcoding API | ❌ Not feasible — image format conversion is inherently a native addon concern |

---

## Development Dependencies (no production risk)

| Dep | Transitive pkgs | Runtime risk | Notes |
|-----|----------------|-------------|-------|
| `@biomejs/biome` | 0 (native binary) | None | Rust executable, never shipped in the package |
| `bun-types` | 2 (`@types/node`, `undici-types`) | None | Type declarations only, erased at runtime |
| `knip` | ~33 pkgs (`jiti`, `oxc-resolver`, `typescript`, `zod`, `yaml`, `fast-glob`, etc.) | None | Dev/CI only, never reaches end users |

---

## Summary

The project is already lean at runtime — **only 1 production dependency** (`linkedom`, 15 packages total). The optional dependencies (`beasties`, `sharp`) are opt-in and are never installed without explicit user action.

**The only actionable security improvement** would be to reduce `linkedom` usage in the simpler plugins — those that perform only one idempotency check + one tag injection — by replacing them with `Bun.HTMLRewriter` or string/regex operations. This would not eliminate the dependency (the 17 complex plugins would still require it), but it would reduce the amount of external HTML processed by the third-party parser.

**Estimated effort:** Medium — each plugin requires an individual rewrite and updated tests.

### Candidate plugins for native replacement

| Plugin | Current DOM calls | Replacement strategy |
|--------|------------------|---------------------|
| `inject-view-transitions` | 1 idempotency check + 1 style inject | `html.includes()` guard + `</head>` string replace |
| `generate-pwa-manifest` | 1 idempotency check + 1 link inject | `html.includes()` guard + `</head>` string replace |
| `inject-canonical-url` | 1 idempotency check + 1 link inject | `html.includes()` guard + `</head>` string replace |
| `generate-sitemap` | 2 queries for `<template route>` | Regex scan for `route=` attributes |
| `inject-speculation-rules` | 2 queries for `<template route>` | Regex scan for `route=` attributes |
| `enforce-script-loading` | 1 query for external `<script>` tags | Regex scan + string replacement |
| `minify-html` | 0 (already uses regex/string ops) | Already native — no linkedom |
| `precompress-assets` | 0 (finalize hook only) | Already native — no linkedom |
| `inline-svg` | 0 (uses `readFile` + string ops) | Already native — no linkedom |
