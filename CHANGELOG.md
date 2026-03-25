# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Dev server accepts path argument: `nojs dev ./docs/` ([`525cf62`](https://github.com/ErickXavier/NoJS-CLI/commit/525cf62))

## [1.10.1](https://github.com/ErickXavier/NoJS-CLI/releases/tag/v1.10.1) — 2026-03-25

### Added

- `nojs init` — interactive wizard to scaffold No.JS projects with optional SPA routing, i18n, and API base URL
  - Generates files in current directory (or target path via `nojs init ./path`)
  - Non-interactive mode via flags: `--routing`, `--i18n`, `--locales`, `--default-locale`, `--api`, `--yes`
  - Route pages use `.tpl` extension with file-based routing (`route-view src`)
  - Project name defaults to target directory name
- `nojs prebuild` — build-time HTML optimization pipeline with 6 plugins:
  - `inject-resource-hints` — preload, prefetch, and preconnect for `get=` directives and route templates
  - `inject-head-attrs` — static `page-title`, `page-description`, `page-canonical`, `page-jsonld` into `<head>`
  - `inject-speculation-rules` — Speculation Rules API from `<template route>` definitions
  - `inject-og-twitter` — Open Graph and Twitter Card meta tags from `page-*` directives
  - `generate-sitemap` — `sitemap.xml` from route definitions and canonical URLs
  - `optimize-images` — lazy loading, LCP preload, and `fetchpriority` hints
- `nojs dev` — local dev server with live reload via SSE, SPA fallback, and colored request logging
  - `--quiet` / `-q` flag to suppress request logging
  - `--open` flag to open browser on start
  - `--no-reload` flag to disable live reload
- `nojs validate` — template validation with 10 rules (missing `as` on fetch, `each` without `in`, `foreach` without `from`, `model` on non-form elements, `bind-html` warning, routes without `route-view`, empty event handlers, loops without `key`, duplicate store names, `validate` outside `<form>`)
  - JSON output via `--format json` for CI integration
- `nojs plugin` — hybrid plugin manager (CDN official + npm community)
  - `search`, `install`, `update`, `remove`, `list` actions
  - SRI integrity hash (sha384) computed and stored for CDN plugins
- Single-character command aliases: `i` (init), `b` (prebuild), `d` (dev), `v` (validate), `p` (plugin)
- `nojs help` and `nojs version` work without `--` prefix

### Security

- Replace `execSync` with `execFileSync` to prevent command injection in plugin manager ([Finding #1](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Validate npm package names against strict regex before passing to `npm` ([Finding #1](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Add path traversal protection in dev server (resolve + boundary check) ([Finding #2](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Restrict prebuild config loading to project directory ([Finding #3](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Sanitize config object keys against prototype pollution (`__proto__`, `constructor`, `prototype`) ([Finding #4](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Validate locale names with strict regex to prevent path traversal in init generator ([Finding #5](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Escape HTML in generated templates to prevent XSS ([Finding #6](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Replace `exec` with `execFile` for browser open ([Finding #7](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Cap SSE clients at 100 to prevent DoS ([Finding #8](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Add server timeouts (30s request, 10s headers) ([Finding #9](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Remove wildcard CORS from dev server responses ([Finding #10](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Compute SRI integrity hash (sha384) for CDN plugin installs ([Finding #11](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Reject null bytes in dev server request paths
- Add `.env`, `.env.*`, and `.npmrc` to `.gitignore`

### Fixed

- Fix infinite reload loop in dev server — SSE now uses named events (`event: reload`) instead of generic messages; client only reloads on `reload` event, ignoring initial `connected` message ([`fd94863`](https://github.com/ErickXavier/NoJS-CLI/commit/fd94863))
- Add debounce (100ms) to file watcher to prevent rapid-fire reloads
- Complete XML escaping in sitemap generator (add `&quot;` and `&apos;`)

### CI

- GitHub Actions CI workflow: runs tests on push/PR to main across Node 18, 20, 22
- GitHub Actions publish workflow: manual trigger (`workflow_dispatch`) pending review; publishes to npm with provenance when enabled
