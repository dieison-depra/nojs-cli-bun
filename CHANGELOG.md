# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-03-28

### Added

- **`inline-css` plugin** — Inlines local CSS stylesheets as `<style>` tags during prebuild, eliminating render-blocking HTTP requests for small stylesheets. Configurable via `maxSize` (default 10 KiB).
- **`inject-modulepreload`: transitive import scanning** — Extended to read the module entry file and recursively trace `import … from "…"` statements, injecting `<link rel="modulepreload">` for each discovered local module. Reduces critical request chain depth from 2 to 1.
- **`audit-accessibility`: three new rules** — `landmark-main` (document must have a `<main>` landmark), `list` (`<ul>`/`<ol>`/`<menu>` must contain only `<li>`, `<script>`, `<template>`), `listitem` (`<li>` must be inside a list parent). All rules skip content inside `<template>` elements to avoid false positives from inert template fragments.
- **`inject-resource-hints`: `crossorigin="anonymous"` on fetch preloads** — Ensures credentials mode alignment between `<link rel="preload" as="fetch">` hints and the actual `fetch()` calls, preventing browser warnings.
- **`hoist-static-content`: extended `DYNAMIC_ATTRS`** — Added `each`, `template`, `watch`, `var`, `filter`, `include`, `loading`, `error`, `then`, `confirm` to prevent elements with No.JS directives from being incorrectly marked as static.

### Changed

- `inject-modulepreload` now accepts `{ filePath }` context to resolve module paths on disk.
- Updated test suite to 196 passing tests.

## [1.1.0] — 2026-03-28

### Added (Performance Evolution)

- **Islands Architecture** (`identify-islands`) — Automatically identifies and isolates reactive DOM sub-trees to enable selective hydration and reduce main thread work.
- **Template Compiler** (`compile-templates-to-js`) — Compiles HTML templates into optimized JavaScript functions, eliminating runtime parsing overhead.
- **Route-level Code Splitting** — In conjunction with the compiler, generates independent JS chunks for every route to minimize initial download.
- **Service Worker Generation** (`generate-service-worker`) — Automatically generates a `sw.js` with a precache manifest for offline-first support.
- **Differential Serving** (`differential-serving`) — Implements `module/nomodule` pattern, serving modern ESNext bundles to capable browsers and ES2015 fallbacks to legacy ones.
- **Content Hashing** (`fingerprint-assets`) — Adds SHA-1 content fingerprints to assets for immutable, long-term caching.
- **Import Map Generation** (`generate-import-map`) — Injects `<script type="importmap">` to map bare specifiers like `nojs` to versioned bundles.
- **Bundle Analysis Report** (`generate-bundle-report`) — Generates a visual HTML report (`nojs-bundle-report.html`) with file sizes and composition treemap.
- **HTTP/2 Early Hints** (`generate-early-hints`) — Automatically generates `_headers` (Netlify/Cloudflare compatible) with `Link` preload headers.
- **i18n Locale Preload** (`inject-i18n-preload`) — Injects preload hints for the default language JSON file to avoid waterfalls.

### Fixed

- Fix CLI regression tests where `stdout` was not being captured in `bun:test` environments.
- Updated `inject-resource-hints` to delegate i18n preloading to the dedicated `inject-i18n-preload` plugin.
- Fixed `optimize-images` plugin missing from the default builtin exports.

### Changed

- Updated `prebuild` runner to support 34 built-in plugins.
- Enhanced test suite to 232 passing tests covering all new performance features.

## [1.10.1] — 2026-03-25

### Added

- `nojs init` — interactive wizard to scaffold No.JS projects.
- `nojs prebuild` — build-time HTML optimization pipeline with 6 initial plugins.
- `nojs dev` — local dev server with live reload via SSE.
- `nojs validate` — template validation with 10 rules.
- `nojs plugin` — hybrid plugin manager.
