# Creating Plugins

Prebuild plugins are plain ES modules. Each plugin exports a default object that conforms to a simple interface.

## Plugin Interface

```js
// my-plugin.js
export default {
  // Required: unique identifier. Must match the key used in nojs-prebuild.config.js.
  name: 'my-plugin',

  // Required: one-line description of what the plugin does.
  description: 'Does something useful at build time.',

  /**
   * Called once for every HTML file discovered.
   * Must return the (possibly modified) html string.
   *
   * @param {string} html - Full HTML file content
   * @param {object} ctx
   * @param {string}   ctx.filePath  - Absolute path to the HTML file
   * @param {object}   ctx.config    - Plugin options from nojs-prebuild.config.js
   * @param {string[]} ctx.allFiles  - All HTML files in this run
   * @returns {Promise<string>}
   */
  async process(html, { filePath, config, allFiles }) {
    // transform html and return it
    return html;
  },

  /**
   * Optional: called once after ALL files have been processed.
   * Use this to write cross-file artifacts (sitemap, manifest, compressed files…).
   *
   * @param {object} ctx
   * @param {string}   ctx.outputDir      - Output directory
   * @param {object}   ctx.config         - Plugin options
   * @param {string[]} ctx.processedFiles - Paths of all written files
   */
  async finalize({ outputDir, config, processedFiles }) {
    // optional
  },
};
```

## Parsing HTML

Always use `linkedom` — the same library the rest of the project uses:

```js
import { parseHTML } from 'linkedom';

async process(html) {
  const { document: doc } = parseHTML(html);

  // query and mutate the DOM
  for (const el of doc.querySelectorAll('[my-directive]')) {
    el.setAttribute('data-processed', '');
  }

  return doc.toString();
}
```

### linkedom vs Browser DOM

linkedom is not a browser. Key differences to keep in mind:

- **`<template>` children** live in the regular DOM tree (no `DocumentFragment`) — `querySelectorAll` will return elements inside `<template>` tags.
- **`el.closest('template')`** works correctly and is the recommended way to detect whether an element is inside a template.
- **`el.outerHTML`** is available and reliable for string replacement.
- `document.documentElement` may not always be set — use `doc.querySelector('html')` as a fallback.

## Handling Config

Plugin options are passed as `ctx.config`:

```js
// nojs-prebuild.config.js
export default {
  plugins: {
    'my-plugin': { threshold: 1024, verbose: true },
  },
};
```

```js
async process(html, { config }) {
  const threshold = config?.threshold ?? 4096;
  const verbose = config?.verbose === true;
  // ...
}
```

## Idempotence

Plugins **must** be idempotent — running the same plugin twice on the same file should produce the same result as running it once. The standard pattern is to check for a sentinel attribute before injecting:

```js
async process(html) {
  const { document: doc } = parseHTML(html);

  // guard: skip if already injected
  if (doc.head.querySelector('[data-my-plugin]')) return html;

  const style = doc.createElement('style');
  style.setAttribute('data-my-plugin', '');
  style.textContent = '/* my styles */';
  doc.head.appendChild(style);

  return doc.toString();
}
```

## Writing Files (finalize hook)

Use Node built-ins only — no external dependencies:

```js
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async finalize({ outputDir, config }) {
  const content = JSON.stringify({ generated: true }, null, 2);
  await writeFile(join(outputDir, 'my-artifact.json'), content, 'utf-8');
}
```

## Optional External Dependencies

If your plugin needs a package that not every project will have (e.g. `sharp`, `beasties`), use a dynamic import with graceful degradation:

```js
async process(html) {
  let myLib;
  try {
    ({ default: myLib } = await import('my-optional-dep'));
  } catch {
    process.stderr.write('[my-plugin] warn: my-optional-dep not installed. Run: npm install my-optional-dep\n');
    return html;
  }

  // use myLib...
}
```

This keeps the build working even when the optional dep is absent.

## Security Guidelines

Follow the same invariants as the rest of the project:

- Never use `exec`/`execSync` with a string argument — use `execFileSync` with an explicit args array
- Validate any user-supplied values (URLs, file paths) before using them
- Reject path traversal attempts (verify `resolve(path)` stays within `outputDir`)
- Escape HTML attribute values before injecting them into the DOM
- Avoid writing to paths outside `outputDir` in `finalize`

## Registering a Built-in Plugin

To add a plugin to the NoJS CLI core (e.g. when contributing):

1. Create `src/prebuild/plugins/<plugin-name>.js`
2. Export a default object with `name`, `description`, `process` (and optionally `finalize`)
3. Import and register it in `src/prebuild/plugins/index.js`:

```js
// src/prebuild/plugins/index.js
import myPlugin from './my-plugin.js';

export const builtinPlugins = {
  // ... existing plugins ...
  [myPlugin.name]: myPlugin,
};
```

4. Add tests to `__tests__/prebuild.test.js` following the existing pattern:

```js
describe('my-plugin', () => {
  it('does X when Y is present', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>...</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'my-plugin': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('...');
  });

  it('is idempotent', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>...</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'my-plugin': true } });
    const first = await readTestHtml('index.html');
    await prebuild({ cwd: testDir, plugins: { 'my-plugin': true } });
    const second = await readTestHtml('index.html');
    expect(second).toBe(first);
  });

  it('is a no-op when condition is not met', async () => {
    const original = '<html><head></head><body><p>Nothing here</p></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'my-plugin': true } });
    const html = await readTestHtml('index.html');
    expect(html).toBe(original);
  });
});
```

## Full Example: inject-view-transitions

A real, minimal plugin as a reference:

```js
// src/prebuild/plugins/inject-view-transitions.js
import { parseHTML } from 'linkedom';

export default {
  name: 'inject-view-transitions',
  description: 'Inject @view-transition CSS to enable smooth same-origin navigations.',

  async process(html, { config }) {
    // respect explicit opt-out
    if (config?.enabled === false) return html;

    const { document: doc } = parseHTML(html);
    if (!doc.head) return html;

    // idempotence guard
    if (doc.head.querySelector('[data-nojs-view-transitions]')) return html;

    const style = doc.createElement('style');
    style.setAttribute('data-nojs-view-transitions', '');
    style.textContent = '@view-transition { navigation: auto; }';
    doc.head.appendChild(style);

    return doc.toString();
  },
};
```

**Tests:**

```js
describe('inject-view-transitions', () => {
  it('injects @view-transition CSS into head', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('@view-transition');
    expect(html).toContain('data-nojs-view-transitions');
  });

  it('is idempotent', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    const html = await readTestHtml('index.html');
    expect((html.match(/data-nojs-view-transitions/g) || []).length).toBe(1);
  });

  it('does nothing when config.enabled is false', async () => {
    const original = '<html><head></head><body></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': { enabled: false } } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('@view-transition');
  });
});
```
