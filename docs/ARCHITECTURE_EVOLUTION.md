# NoJS Performance Architecture & Evolution

This document outlines the strategic roadmap and performance engineering principles implemented in the Bun edition of the NoJS CLI.

## Core Strategy: Build-time Intelligence

Modern web frameworks often solve interactivity by sending large JavaScript payloads that parse and hydrate the entire DOM. Our approach shifts this burden to **build-time**, using Bun's fast runtime to pre-analyze and pre-optimize the application structure.

### 1. Islands Architecture (`identify-islands`)
Instead of hydrating the whole `<body>`, the CLI identifies specific DOM sub-trees containing reactive directives (`state`, `bind`, `on:`, etc.).
- **Benefit:** Reduces the hydration scope by up to 90% for content-heavy pages.
- **Metric Impact:** Significantly lowers **Time to Interactive (TTI)** and **Main Thread Blocking Time**.

### 2. Template Compilation (`compile-templates-to-js`)
NoJS traditionally uses the DOM or string-based parsing at runtime. This plugin compiles `<template route>` blocks into pure JavaScript functions using `cloneNode`.
- **Benefit:** Eliminates the overhead of browser HTML parsing during navigation.
- **Metric Impact:** Faster **Soft Navigations** and reduced memory footprint.

### 3. Route-level Code Splitting (`B21`)
Combined with the template compiler, this strategy generates independent JS chunks for every route.
- **Benefit:** Users only download the JavaScript necessary for the current view.
- **Metric Impact:** Drastic reduction in **Total Byte Weight (L4)**.

### 4. Differential Serving (`differential-serving`)
We leverage Bun's transpiler to generate two versions of the application:
- **Modern:** Targets modern browsers with ESNext features (smaller, faster).
- **Legacy:** ES2015 fallback using the `nomodule` pattern.
- **Metric Impact:** -10–20% bundle size for 95% of users.

### 5. Aggressive Caching & Hints
- **Content Hashing (`fingerprint-assets`):** Implements `[name].[hash].js` for immutable caching.
- **H2 Early Hints (`generate-early-hints`):** Generates server configuration (`_headers`) to push critical assets before the HTML is fully parsed.
- **Service Worker (`generate-service-worker`):** Auto-generates an offline-first precache manifest.

---

## Traceability Matrix (Build-time)

| ID | Feature | Implementation | Metric Impact | Status |
|----|---------|----------------|---------------|--------|
| B13 | Islands Architecture | `identify-islands` | TTI / Main Thread | ✅ |
| B14 | Template Compiler | `compile-templates-to-js` | Bootup / Scripting | ✅ |
| B15 | Service Worker | `generate-service-worker` | Repeat Visits / TTI | ✅ |
| B16 | Differential Serving| `differential-serving` | Byte Weight | ✅ |
| B17 | i18n Preload | `inject-i18n-preload` | FCP / LCP | ✅ |
| B18 | Import Maps | `generate-import-map` | Caching / Updates | ✅ |
| B19 | Bundle Analysis | `generate-bundle-report` | Diagnostic | ✅ |
| B20 | Early Hints | `generate-early-hints` | FCP / LCP | ✅ |
| B21 | Code Splitting | `compile-templates-to-js` | Byte Weight | ✅ |
| B22 | Content Hashing | `fingerprint-assets` | Caching | ✅ |

---

## Roadmap 2026

1. **[B12] SSR / Static Site Generation:** (Priority 1 - High Effort) Generate full static HTML on build.
2. **Advanced Heuristics:** Smarter island grouping based on DOM distance.
3. **Image Auto-AVIF:** Integrated pipeline for next-gen image formats during prebuild.
