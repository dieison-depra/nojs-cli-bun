# Implementation Plan — Build-Time Optimization Plugins

Based on `build-optimization-research.md` (T1–T18) and `build-optimization-roadmap.md` (B-series).

## Status snapshot

| Plugin | Source | Status |
|--------|--------|--------|
| `inject-resource-hints` | PR #33 | ✅ done |
| `inject-head-attrs` | PR #35 | ✅ done |
| `generate-sitemap` | B6 | ✅ done |
| `optimize-images` | B1 | ✅ done |
| `inject-og-twitter` | B8 | ✅ done |
| `inject-speculation-rules` | T5 | ✅ done |
| `inline-animation-css` | B2 | ✅ done |
| `inject-visibility-css` | B5 | ✅ done |
| `inject-template-hints` | B7 | ✅ done |
| `inject-resource-hints` + B3/B4 | B3, B4 | ⏳ planned |
| `minify-html` | T6 | ⏳ planned |
| `inject-modulepreload` | T12 | ⏳ planned |
| `audit-meta-tags` | T15 | ⏳ planned |
| `inject-canonical-url` | T18 | ⏳ planned |
| `inject-view-transitions` | T11 | ⏳ planned |
| `enforce-script-loading` | T16 | ⏳ planned |
| `inject-csp-hashes` | T10 | ⏳ planned |
| `inject-sri-hashes` | T4 | ⏳ planned |
| `precompress-assets` | T7 | ⏳ planned |
| `inject-jsonld` | T9 | ⏳ planned |
| `inline-critical-css` | T1 | ⏳ planned |
| `optimize-fonts` | T2 | ⏳ planned |
| `generate-responsive-images` | T3 | ⏳ planned |
| `generate-pwa-manifest` | T8 | ⏳ planned |
| `purge-unused-css` | T13 | ⏳ planned |
| `audit-accessibility` | T14 | ⏳ planned |
| `inline-svg` | T17 | ⏳ planned |

---

## Branch plan

Each feature lives on its own branch off the same base commit. All branches merge into `main` locally.

| Branch | Plugin(s) | Deps | Notes |
|--------|-----------|------|-------|
| `feat/b3-b4-resource-hints-extend` | extends `inject-resource-hints` | none | Adds i18n locale preload + base API DNS prefetch to existing plugin |
| `feat/t6-minify-html` | `minify-html` | none (built-in) | Whitespace collapse, comment removal, attribute cleanup |
| `feat/t11-view-transitions` | `inject-view-transitions` | none | One-line CSS injection per page |
| `feat/t12-modulepreload` | `inject-modulepreload` | none | Detect NoJS script tag, inject modulepreload link |
| `feat/t15-meta-audit` | `audit-meta-tags` | none | Check/inject title, description, charset, viewport, lang |
| `feat/t18-canonical-url` | `inject-canonical-url` | none | Inject canonical link from siteUrl config + file path |
| `feat/t16-third-party-scripts` | `enforce-script-loading` | none | Detect known third-party origins, add defer/async |
| `feat/t10-csp-hashes` | `inject-csp-hashes` | none (Bun crypto) | SHA-384 of all inline scripts + styles → CSP meta tag |
| `feat/t4-sri-hashes` | `inject-sri-hashes` | none (Bun crypto) | SHA-384 for external script/link tags with static URLs |
| `feat/t7-precompress` | `precompress-assets` | none (Bun zlib) | Generate .br + .gz companion files in finalize |
| `feat/t9-inject-jsonld` | `inject-jsonld` | none | WebPage/WebSite schema from page metadata |
| `feat/t1-critical-css` | `inline-critical-css` | `beasties` | Extract + inline above-fold CSS, async-load full sheet |
| `feat/t2-font-optimization` | `optimize-fonts` | none (manual) | Detect Google Fonts, inject preconnect + font-display:swap |
| `feat/t3-responsive-images` | `generate-responsive-images` | `sharp` | Generate AVIF/WebP/srcset from source images |
| `feat/t8-pwa-manifest` | `generate-pwa-manifest` | none | Generate manifest.webmanifest + SW registration |
| `feat/t13-purge-css` | `purge-unused-css` | none (manual) | Remove CSS rules with no matching selectors in HTML |
| `feat/t14-accessibility-audit` | `audit-accessibility` | none (manual) | WCAG quick checks: alt, lang, title, labels, headings |
| `feat/t17-inline-svg` | `inline-svg` | none (manual) | Inline small SVGs from img[src$=.svg], basic SVGO-style cleanup |

---

## Plugin interface (reminder)

```js
// src/prebuild/plugins/my-plugin.js
import { parseHTML } from 'linkedom';

export default {
  name: 'my-plugin',
  description: 'One line.',

  // Called once per HTML file. Always returns the html string (modified or not).
  async process(html, { filePath, config, allFiles }) {
    const { document: doc } = parseHTML(html);
    // ... mutate doc ...
    return doc.toString();
  },

  // Optional — called once after all files. Use for cross-file artefacts.
  async finalize({ outputDir, config, processedFiles }) {},
};
```

Register in `src/prebuild/plugins/index.js`.

## Test conventions

Tests live in `__tests__/prebuild.test.js`. Each plugin gets a `describe` block with:
- Happy path (feature is applied correctly)
- Idempotence (running twice doesn't duplicate output)
- Edge case (empty input, missing attrs, already-present output)
- At least one negative test (no-op when input doesn't match)

```js
describe('my-plugin', () => {
  it('does X when Y is present', async () => {
    await writeTestHtml('index.html', '<html>...');
    await prebuild({ cwd: testDir, plugins: { 'my-plugin': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('...');
  });
});
```

## Config shape per plugin

Plugins that need configuration accept an options object via `nojs-prebuild.config.js`:

```js
export default {
  plugins: {
    'inject-canonical-url': { siteUrl: 'https://example.com' },
    'audit-meta-tags': { failOnError: false },
    'precompress-assets': { brotli: true, gzip: true },
  }
};
```

Config is passed as `ctx.config` in `process(html, ctx)`.
