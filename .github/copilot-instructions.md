# NoJS CLI (Bun Edition) — Project Guidelines

## Overview

NoJS CLI is a Bun-native command-line tool for the [No.JS](https://github.com/ErickXavier/no-js) framework.
This is a fork of [ErickXavier/NoJS-CLI](https://github.com/ErickXavier/NoJS-CLI) with the entire runtime
replaced by Bun. It is recommended to be used alongside [`@dieison-depra/nojs-bun`](https://github.com/dieison-depra/nojs-bun).

## Architecture

```
bin/nojs.js               # Executable entry point (shebang: #!/usr/bin/env bun)
src/
  cli.js                  # Command dispatcher — reads package.json via JSON import
  commands/               # Thin wrappers that parse argv and delegate to src/
  init/generator.js       # Interactive project scaffold wizard
  dev/server.js           # Bun.serve() HTTP server with SSE live reload
  validate/rules.js       # Template validation — 10 rules
  plugin/manager.js       # Plugin install/remove via Bun.spawnSync
  prebuild/
    runner.js             # Plugin pipeline orchestrator
    config.js             # Config file loader
    html.js               # HTML file discovery utilities
    plugins/              # 26 built-in prebuild plugins (linkedom for DOM parsing)
__tests__/                # bun:test unit tests
```

## Runtime

- **Runtime:** Bun ≥ 1.3.11 — no Node.js required
- **HTTP server:** `Bun.serve()` with `ReadableStream` SSE
- **Process spawning:** `Bun.spawnSync` (never `execFileSync` or shell strings)
- **JSON imports:** `import pkg from '../package.json' with { type: 'json' }`
- **Tests:** `bun:test` — import from `'bun:test'`, not `@jest/globals`
- **Shutdown:** `server.stop()` (not `server.close()`)

## Conventions

- **ESM only** — all files use `import`/`export`, no `require()`
- **node:* built-ins** — `node:fs`, `node:path`, `node:crypto`, `node:zlib` are fully supported by Bun
- **No shell interpolation** — always use `Bun.spawnSync(['cmd', 'arg1', 'arg2'])`
- **Plugin interface** — every plugin exports `{ name, description, process(html, ctx), finalize?(ctx) }`
- **Idempotency** — plugins must check for a sentinel attribute before injecting content
- **linkedom** — the only production runtime dependency; used for DOM parsing in plugins

## Tooling

- **Lint + format:** `bun run check` (biome) — must pass before merging
- **Dead code:** `bun run knip` — must report 0 issues
- **Tests:** `bun test` — 161 tests, 0 failures required

## Build & Release

- No build step — source is shipped as-is (ESM)
- Publish: `bun publish` to npm as `@dieison-depra/nojs-cli-bun`
- Version must be bumped in `package.json` before release

## Key Patterns

- When adding a new prebuild plugin:
  1. Create `src/prebuild/plugins/<plugin-name>.js`
  2. Register in `src/prebuild/plugins/index.js`
  3. Add tests in `__tests__/prebuild.test.js` (3 cases: basic, idempotent, no-op)
  4. Document in `docs/prebuild/plugins.md`
- When modifying the dev server: changes live in `src/dev/server.js` using `Bun.serve()` API
- Optional dependencies (`beasties`, `sharp`): use dynamic `import()` with graceful fallback — never add to `dependencies` or `optionalDependencies`
