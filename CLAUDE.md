# CLAUDE.md — nojs-cli

## Project overview

Official CLI for the No.JS framework (`@erickxavier/nojs-cli`). Provides five commands:

### Origin

This CLI was created by Erick Xavier by consolidating the post-build scripts proposed in issue [#36](https://github.com/ErickXavier/no-js/issues/36) and the B-series PRs submitted to `ErickXavier/no-js`. The `prebuild` pipeline is the "installable" evolution of those standalone scripts — same logic, same plugin names, but distributed as a proper CLI package instead of copy-pasted files.

**Mapping from no-js standalone scripts → CLI plugins:**

| `no-js/scripts/` (PR) | `nojs-cli` plugin | Notes |
|---|---|---|
| `inject-resource-hints.js` (#33) | `inject-resource-hints` | ✅ migrated |
| `inject-head-attrs.js` (#35) | `inject-head-attrs` | ✅ migrated |
| `optimize-images.js` (B1) | `optimize-images` | ✅ migrated |
| `generate-sitemap.js` (B6) | `generate-sitemap` | ✅ migrated |
| *(B8 — issue #36)* | `inject-og-twitter` | ✅ created directly in CLI |
| *(T5 — issue #39)* | `inject-speculation-rules` | ✅ created directly in CLI |
| `inline-animation-css.js` (B2) | **missing** | ❌ not yet ported |
| `inject-visibility-css.js` (B5) | **missing** | ❌ not yet ported |
| `inject-template-hints.js` (B7) | **missing** | ❌ not yet ported |

B2, B5, and B7 are the next natural additions to the plugin set. B2 and B5 require a small framework change in `no-js` core (a guard in `animations.js` and `conditionals.js` respectively) — that coordination should happen before porting them here.

| Command | Alias | Purpose |
|---------|-------|---------|
| `init` | `i` | Interactive wizard — scaffold a No.JS project |
| `prebuild` | `b` | Post-build HTML optimization pipeline |
| `dev` | `d` | Local dev server with live reload (SSE) |
| `validate` | `v` | Lint No.JS templates against rule set |
| `plugin` | `p` | Search, install, update, remove plugins |

**Repo:** `ErickXavier/NoJS-CLI`
**npm:** `@erickxavier/nojs-cli`
**Node.js:** `>= 18.0.0`
**Module type:** ESM only (`"type": "module"` in `package.json`)

---

## Architecture

```
bin/nojs.js               Entry point — passes process.argv to src/cli.js
src/cli.js                Command router — lazy-loads commands, handles --help/--version
src/commands/
  init.js                 Arg parsing + readline wizard → src/init/generator.js
  prebuild.js             Arg parsing + --list/--dry-run → src/prebuild/runner.js
  dev.js                  Arg parsing → src/dev/server.js
  validate.js             Arg parsing → src/validate/rules.js
  plugin.js               Arg parsing → src/plugin/manager.js
src/init/
  generator.js            Creates index.html, pages/, locales/, assets/, nojs.config.json
src/prebuild/
  runner.js               Orchestrates per-file plugin pipeline + finalize phase
  config.js               Loads nojs-prebuild.config.js / .mjs or returns DEFAULTS
  html.js                 discoverFiles() / readHtml() / writeHtml()
  plugins/
    index.js              Exports builtinPlugins map (name → plugin object)
    inject-resource-hints.js
    inject-head-attrs.js
    inject-speculation-rules.js
    inject-og-twitter.js
    generate-sitemap.js
    optimize-images.js
src/dev/
  server.js               Node.js HTTP server — live reload via SSE, SPA fallback
src/validate/
  rules.js                RULES array + validateFiles(html, filePath) → issues[]
src/plugin/
  manager.js              install/update/remove/list — writes nojs.config.json
  registry.js             searchRegistry(query) — CDN + npm search
__tests__/
  cli.test.js             CLI entry point integration tests (execSync against bin)
  init.test.js            generator.js unit tests
  prebuild.test.js        runner.js + plugin tests
  validate.test.js        rules.js unit tests
```

---

## Plugin interface (prebuild)

Every prebuild plugin exports a default object with this shape:

```js
export default {
  name: 'plugin-name',          // must match key in builtinPlugins
  description: 'One line.',

  // Called once per HTML file. Must return the (modified) html string.
  async process(html, { filePath, config, allFiles }) {
    return html;
  },

  // Optional — called once after all files are processed.
  async finalize({ outputDir, config, processedFiles }) {},
};
```

Rules:
- `process` always returns a string (even if unchanged)
- `finalize` is optional; only implement it for cross-file artefacts (e.g. sitemap)
- Use `linkedom`'s `parseHTML` for DOM manipulation (same dependency as validate)
- Register in `src/prebuild/plugins/index.js`

---

## Adding a validation rule

Append to the `RULES` array in `src/validate/rules.js`:

```js
{
  name: 'rule-kebab-case',
  severity: 'error' | 'warning',
  // global: true → test(doc) receives the full document
  // (omit) → test(el) receives each element
  test(el) {
    if (!el.hasAttribute('some-attr')) return null;
    return 'Human-readable error message.';
  },
},
```

Global rules (operating on `document`) set `global: true`; element rules omit it.
Return `null` for no issue, a string for a single issue, or an array of strings.

---

## Adding a command

1. Create `src/commands/<name>.js` — export `async function run(argv)`
2. Register in `src/cli.js` — add to `COMMANDS` and `ALIASES`
3. Add tests in `__tests__/cli.test.js` (at minimum: `--help` shows correct text)

---

## Code conventions

### Style
- **ESM** — `import`/`export`, never `require()`
- **Node built-ins** — import from `node:*` prefix (`node:fs`, `node:path`, etc.)
- **No class syntax** — plain functions and objects
- **Arg parsing** — hand-rolled `switch` loops (no third-party arg parsers)
- **Async** — `async/await` throughout; Promises only when wrapping callback APIs
- **Error handling** — throw `Error` with actionable message; `cli.js` catches and exits 1
- **No comments on self-evident code** — add JSDoc only on exported functions
- **Formatting** — 2-space indent, single quotes, no semicolons... follow existing file style

### Dependency policy
- **Production deps** — add nothing without discussion; `linkedom` is the only current dep
- **Dev deps** — `jest` only
- Prefer Node.js built-ins: `crypto`, `zlib`, `fs`, `path`, `http`, `child_process`

### Security invariants (never regress)
| Invariant | Location |
|-----------|----------|
| No `exec` / `execSync` — use `execFileSync` with explicit args array | `plugin/manager.js`, `dev/server.js` |
| npm package names validated against `NPM_NAME_RE` before shell execution | `plugin/manager.js` |
| Path traversal protection: `resolve()` + boundary check against root | `dev/server.js`, `prebuild/config.js` |
| Config keys sanitized against `__proto__`, `constructor`, `prototype` | `prebuild/config.js` |
| Locale names validated with strict regex | `init/generator.js` |
| HTML values escaped before injection into generated files | `init/generator.js` |
| SSE client cap (`MAX_SSE_CLIENTS = 100`) — no DoS via open connections | `dev/server.js` |
| Server timeouts: `setTimeout(30000)`, `headersTimeout = 10000` | `dev/server.js` |
| SRI sha384 computed and stored for every CDN plugin install | `plugin/manager.js` |
| Null bytes rejected in dev server request paths | `dev/server.js` |

---

## Testing

```bash
npm test               # run all tests (no coverage)
npm run test:coverage  # with coverage report
npm run test:watch     # watch mode
```

- Tests live in `__tests__/*.test.js`
- Import with `from '@jest/globals'` (`describe`, `it`, `expect`)
- `cli.test.js` uses `execSync` against the real binary — integration level
- Other test files unit-test domain modules directly
- `linkedom`'s `parseHTML` is available in tests for DOM assertions
- **Every new plugin must have tests** in `__tests__/prebuild.test.js`
- **Every new validation rule must have tests** in `__tests__/validate.test.js`
- CI matrix: Node.js 18, 20, 22

---

## Config file (user-facing)

Supported filenames (auto-detected in project root):
- `nojs-prebuild.config.js`
- `nojs-prebuild.config.mjs`

Shape:
```js
export default {
  input: '**/*.html',       // glob pattern
  output: null,             // null = in-place, or a directory path
  plugins: {
    'inject-resource-hints': true,
    'inject-head-attrs': { siteUrl: 'https://example.com' },
    'generate-sitemap': false,   // false disables a plugin
  },
};
```

---

## Project config (`nojs.config.json`)

Created by `nojs init`. Used by `nojs plugin` to track installed plugins.

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "plugins": [
    {
      "name": "carousel",
      "source": "cdn",
      "url": "https://cdn.no-js.dev/plugins/carousel.js",
      "integrity": "sha384-...",
      "installed": "2026-03-25"
    }
  ]
}
```

---

## Commit style

Follow the pattern of the existing history:

```
feat(scope): short imperative summary
fix(scope): what was broken and what was fixed
docs(scope): documentation-only changes
chore: non-functional housekeeping
```

**Hard rules:**
- Never include "Co-Authored-By: Claude" or any AI/tool attribution in commits
- Never include any Claude, Anthropic, or AI references anywhere in the project
- PRs, issues, and code comments must be in English
- No `--no-verify` — fix hooks, don't skip them

---

## Ecosystem

This CLI is one of four related projects:

| Repo | npm | Purpose |
|------|-----|---------|
| `ErickXavier/no-js` | `@erickxavier/no-js` | Framework core |
| `ErickXavier/NoJS-CLI` | `@erickxavier/nojs-cli` | This project |
| `ErickXavier/nojs-skill` | — | Claude Code skill |
| `ErickXavier/nojs-lsp` | — | Language server |
| `ErickXavier/nojs-mcp` | `@erickxavier/nojs-mcp` | MCP server |

Version is kept in sync with the framework core (`package.json` `version` field).
