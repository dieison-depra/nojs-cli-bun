import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prebuild } from '../src/prebuild/runner.js';

let testDir;

beforeEach(async () => {
  testDir = join(tmpdir(), `nojs-prebuild-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function writeTestHtml(name, content) {
  const path = join(testDir, name);
  await mkdir(join(testDir, ...name.split('/').slice(0, -1)), { recursive: true });
  await writeFile(path, content, 'utf-8');
  return path;
}

async function readTestHtml(name) {
  return readFile(join(testDir, name), 'utf-8');
}

describe('prebuild runner', () => {
  it('returns zero files when no HTML found', async () => {
    const result = await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    expect(result.files).toBe(0);
  });

  it('returns zero plugins when none enabled', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    const result = await prebuild({ cwd: testDir, plugins: {} });
    expect(result.files).toBe(0);
    expect(result.plugins).toEqual([]);
  });

  it('throws on unknown plugin name', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await expect(prebuild({ cwd: testDir, plugins: { 'nonexistent': true } })).rejects.toThrow(/Unknown plugin/);
  });
});

describe('inject-resource-hints', () => {
  it('injects preload for static get= URLs', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div get="/api/users" as="users"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('href="/api/users"');
  });

  it('skips interpolated URLs', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div get="/api/users/{id}" as="user"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="preload"');
  });

  it('injects preconnect for cross-origin URLs', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div get="https://api.example.com/data" as="data"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="preconnect"');
  });
});

describe('inject-resource-hints — B3/B4 extensions', () => {
  it('B3: injects locale preload for non-English lang attribute', async () => {
    await writeTestHtml('index.html', '<html lang="pt-BR"><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('href="/locales/pt-BR.json"');
    expect(html).toContain('crossorigin="anonymous"');
  });

  it('B3: does not inject locale preload when lang is "en"', async () => {
    await writeTestHtml('index.html', '<html lang="en"><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('/locales/');
  });

  it('B3: does not inject locale preload when lang is "en-US"', async () => {
    await writeTestHtml('index.html', '<html lang="en-US"><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('/locales/');
  });

  it('B3: does not duplicate locale preload if already present', async () => {
    await writeTestHtml('index.html', '<html lang="pt-BR"><head><link rel="preload" as="fetch" href="/locales/pt-BR.json" crossorigin="anonymous"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    const count = (html.match(/\/locales\/pt-BR\.json/g) || []).length;
    expect(count).toBe(1);
  });

  it('B4: injects dns-prefetch when config.apiBase is set', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': { apiBase: 'https://api.example.com' } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="dns-prefetch"');
    expect(html).toContain('href="https://api.example.com"');
  });

  it('B4: does not inject dns-prefetch when config.apiBase is absent', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="dns-prefetch"');
  });

  it('B4: does not duplicate dns-prefetch if already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="dns-prefetch" href="https://api.example.com"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-resource-hints': { apiBase: 'https://api.example.com' } } });
    const html = await readTestHtml('index.html');
    const count = (html.match(/rel="dns-prefetch"/g) || []).length;
    expect(count).toBe(1);
  });
});

describe('inject-head-attrs', () => {
  it('injects title from static page-title', async () => {
    await writeTestHtml('index.html', '<html><head></head><body page-title="\'My Site\'"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-head-attrs': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<title>My Site</title>');
  });

  it('skips dynamic expressions', async () => {
    await writeTestHtml('index.html', '<html><head></head><body page-title="pageTitle"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-head-attrs': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('<title>');
  });
});

describe('inject-speculation-rules', () => {
  it('injects speculation rules from route definitions', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><template route="/"></template><template route="/about"></template></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-speculation-rules': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('type="speculationrules"');
    expect(html).toContain('/about');
  });

  it('skips parameterized routes', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><template route="/users/:id"></template><template route="/about"></template></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-speculation-rules': true } });
    const html = await readTestHtml('index.html');
    const rules = JSON.parse(html.match(/<script type="speculationrules">([\s\S]*?)<\/script>/)?.[1] || '{}');
    expect(rules.prerender?.[0]?.urls).not.toContain('/users/:id');
  });
});

describe('optimize-images', () => {
  it('adds lazy loading to non-LCP images', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><img src="/hero.jpg"><img src="/thumb.jpg"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-images': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('loading="lazy"');
  });
});

describe('inline-animation-css', () => {
  it('injects only the keyframes used in the document', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div animate="fadeIn"></div><div animate-leave="fadeOut"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-animation-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('data-nojs-animations');
    expect(html).toContain('@keyframes fadeIn');
    expect(html).toContain('@keyframes fadeOut');
    expect(html).not.toContain('@keyframes zoomIn');
  });

  it('does not inject if no animation directives are present', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><p>No animations</p></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-animation-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('data-nojs-animations');
  });

  it('skips injection if data-nojs-animations already present', async () => {
    await writeTestHtml('index.html', '<html><head><style data-nojs-animations=""></style></head><body><div animate="fadeIn"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-animation-css': true } });
    const html = await readTestHtml('index.html');
    expect(html.match(/data-nojs-animations/g)).toHaveLength(1);
  });

  it('ignores unknown animation names', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div animate="customSlide"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-animation-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('data-nojs-animations');
  });

  it('handles animate-enter attribute', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div animate-enter="slideInLeft"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-animation-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('@keyframes slideInLeft');
  });
});

describe('inject-visibility-css', () => {
  it('marks if= elements with data-nojs-pending and injects CSS', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div if="showModal">Modal</div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-visibility-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('data-nojs-pending');
    expect(html).toContain('data-nojs-pending-css');
    expect(html).toContain('visibility: hidden');
  });

  it('marks show= and hide= elements', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div show="visible">A</div><div hide="hidden">B</div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-visibility-css': true } });
    const html = await readTestHtml('index.html');
    expect(html.match(/data-nojs-pending/g).length).toBeGreaterThanOrEqual(2);
  });

  it('does not mark elements inside <template>', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><template><div if="x">inside template</div></template><div if="y">outside</div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-visibility-css': true } });
    const html = await readTestHtml('index.html');
    // Only the outside div gets the attribute (not the one inside <template>)
    expect(html.match(/data-nojs-pending=""/g)).toHaveLength(1);
  });

  it('does not inject if no conditional elements present', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><p>No conditionals</p></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-visibility-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('data-nojs-pending');
  });

  it('injects the CSS block only once with multiple elements', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><div if="a">A</div><div show="b">B</div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-visibility-css': true } });
    const html = await readTestHtml('index.html');
    expect(html.match(/data-nojs-pending-css/g)).toHaveLength(1);
  });
});

describe('inject-template-hints', () => {
  it('preloads stylesheets when a loading= template is referenced', async () => {
    await writeTestHtml('index.html', [
      '<html><head><link rel="stylesheet" href="/styles.css"></head><body>',
      '<div get="/api/data" loading="#spinner"></div>',
      '<template id="spinner"><div class="loading-indicator">Loading...</div></template>',
      '</body></html>',
    ].join(''));
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="style"');
    expect(html).toContain('href="/styles.css"');
  });

  it('injects inline skeleton CSS when a skeleton class is detected', async () => {
    await writeTestHtml('index.html', [
      '<html><head></head><body>',
      '<div get="/api/data" loading="#skel"></div>',
      '<template id="skel"><div class="skeleton-line"></div></template>',
      '</body></html>',
    ].join(''));
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('data-nojs-skeleton-css');
    expect(html).toContain('skeleton-pulse');
  });

  it('does not inject skeleton CSS when no skeleton class is used', async () => {
    await writeTestHtml('index.html', [
      '<html><head></head><body>',
      '<div get="/api/data" loading="#spinner"></div>',
      '<template id="spinner"><div class="spinner">Loading...</div></template>',
      '</body></html>',
    ].join(''));
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('data-nojs-skeleton-css');
  });

  it('does nothing when no slot attributes are present', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><p>No templates</p></body></html>');
    const before = await readTestHtml('index.html');
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toBe(before);
  });

  it('does not duplicate stylesheet preloads', async () => {
    await writeTestHtml('index.html', [
      '<html><head>',
      '<link rel="stylesheet" href="/styles.css">',
      '<link rel="preload" as="style" href="/styles.css">',
      '</head><body>',
      '<div get="/api/data" loading="#skel"></div>',
      '<template id="skel"><div class="skeleton-box"></div></template>',
      '</body></html>',
    ].join(''));
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/rel="preload"[^>]+as="style"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('handles skeleton= attribute as well as loading=', async () => {
    await writeTestHtml('index.html', [
      '<html><head></head><body>',
      '<div get="/api/products" skeleton="#prod-skeleton"></div>',
      '<template id="prod-skeleton"><div class="skeleton-card"></div></template>',
      '</body></html>',
    ].join(''));
    await prebuild({ cwd: testDir, plugins: { 'inject-template-hints': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('data-nojs-skeleton-css');
  });
});
describe('minify-html', () => {
  it('collapses whitespace between tags', async () => {
    await writeTestHtml('index.html', '<html>\n  <head>\n  </head>\n  <body>\n    <p>Hello</p>\n  </body>\n</html>');
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toMatch(/>\s+</);
  });

  it('removes HTML comments', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><!-- this is a comment --><p>Hello</p></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('<!-- this is a comment -->');
    expect(html).toContain('<p>Hello</p>');
  });

  it('preserves content inside <script> tags', async () => {
    const scriptContent = '<script>var x =  1;\n  var y = 2;</script>';
    await writeTestHtml('index.html', `<html><head>${scriptContent}</head><body></body></html>`);
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('var x =  1;\n  var y = 2;');
  });

  it('preserves content inside <style> tags', async () => {
    const styleContent = '<style>body  {  color:  red;  }\n  p {  margin:  0;  }</style>';
    await writeTestHtml('index.html', `<html><head>${styleContent}</head><body></body></html>`);
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('body  {  color:  red;  }');
  });

  it('preserves IE conditional comments', async () => {
    await writeTestHtml('index.html', '<html><head><!--[if IE]><link rel="stylesheet" href="ie.css"><![endif]--></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<!--[if IE]>');
  });

  it('is idempotent (running twice gives same result)', async () => {
    await writeTestHtml('index.html', '<html>\n  <head>\n  </head>\n  <body>\n    <!-- comment -->\n    <p>Hello</p>\n  </body>\n</html>');
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const firstPass = await readTestHtml('index.html');
    await writeTestHtml('index.html', firstPass);
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const secondPass = await readTestHtml('index.html');
    expect(secondPass).toBe(firstPass);
  });

  it('is a no-op on already-minified HTML', async () => {
    const minified = '<html><head></head><body><p>Hello</p></body></html>';
    await writeTestHtml('index.html', minified);
    await prebuild({ cwd: testDir, plugins: { 'minify-html': true } });
    const html = await readTestHtml('index.html');
    expect(html).toBe(minified);
  });

  it('respects removeComments: false config option', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><!-- keep me --><p>Hello</p></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'minify-html': { removeComments: false } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<!-- keep me -->');
  });
});

describe('inject-view-transitions', () => {
  it('injects @view-transition CSS into head', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('@view-transition { navigation: auto; }');
  });

  it('is idempotent — running twice does not duplicate the style tag', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    const html = await readTestHtml('index.html');
    const count = (html.match(/@view-transition/g) || []).length;
    expect(count).toBe(1);
  });

  it('does nothing when config.enabled === false', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': { enabled: false } } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('@view-transition');
  });

  it('sets data-nojs-view-transitions attribute on the injected style tag', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-view-transitions': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('data-nojs-view-transitions');
  });
});

describe('inject-modulepreload', () => {
  it('injects modulepreload for module scripts with src', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script type="module" src="/app.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="modulepreload"');
    expect(html).toContain('href="/app.js"');
  });

  it('skips non-module scripts', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script src="/app.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="modulepreload"');
  });

  it('skips inline module scripts without src', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script type="module">console.log("hi");</script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="modulepreload"');
  });

  it('skips cross-origin module scripts', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script type="module" src="https://cdn.example.com/app.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="modulepreload"');
  });

  it('skips interpolated src values', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script type="module" src="/app.{hash}.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="modulepreload"');
  });

  it('does not duplicate modulepreload if already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="modulepreload" href="/app.js"></head><body><script type="module" src="/app.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-modulepreload': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/rel="modulepreload"/g) || [];
    expect(matches.length).toBe(1);
  });
});

describe('audit-meta-tags', () => {
  it('injects <meta charset="UTF-8"> when missing', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } });
    const html = await readTestHtml('index.html');
    expect(html).toMatch(/charset/i);
    expect(html).toContain('UTF-8');
  });

  it('injects <meta name="viewport"> when missing', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width, initial-scale=1');
  });

  it('does not duplicate charset if already present', async () => {
    await writeTestHtml('index.html', '<html><head><meta charset="UTF-8"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/charset/gi) || [];
    expect(matches.length).toBe(1);
  });

  it('does not duplicate viewport if already present', async () => {
    await writeTestHtml('index.html', '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/viewport/gi) || [];
    expect(matches.length).toBe(1);
  });

  it('throws when failOnError: true and title is missing', async () => {
    await writeTestHtml('index.html', '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="test"></head><body></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': { failOnError: true } } })
    ).rejects.toThrow(/audit-meta-tags/);
  });

  it('does not throw when failOnError: false (default) and tags are missing', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } })
    ).resolves.toBeDefined();
  });

  it('does not modify HTML when all tags already present', async () => {
    const original = '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Test</title><meta name="description" content="Test page"></head><body></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'audit-meta-tags': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('charset');
    expect(html).toContain('viewport');
    expect(html).toContain('<title>Test</title>');
    expect(html).toContain('description');
    expect(html).toContain('lang="en"');
  });
});

describe('inject-canonical-url', () => {
  it('injects canonical for index.html → https://example.com/', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { siteUrl: 'https://example.com', cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://example.com/"');
  });

  it('injects canonical for about/index.html → https://example.com/about/', async () => {
    await writeTestHtml('about/index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { siteUrl: 'https://example.com', cwd: testDir } } });
    const html = await readTestHtml('about/index.html');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://example.com/about/"');
  });

  it('injects canonical for blog/post.html → https://example.com/blog/post.html', async () => {
    await writeTestHtml('blog/post.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { siteUrl: 'https://example.com', cwd: testDir } } });
    const html = await readTestHtml('blog/post.html');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://example.com/blog/post.html"');
  });

  it('does not inject when siteUrl is not set', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('rel="canonical"');
  });

  it('does not duplicate if canonical already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="canonical" href="https://other.com/"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { siteUrl: 'https://example.com', cwd: testDir } } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/rel="canonical"/g);
    expect(matches).toHaveLength(1);
    expect(html).toContain('href="https://other.com/"');
  });

  it('normalizes trailing slash in siteUrl (no double slash)', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-canonical-url': { siteUrl: 'https://example.com/', cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('href="https://example.com/"');
    expect(html).not.toContain('https://example.com//');
  });
});

describe('enforce-script-loading', () => {
  it('adds defer to third-party scripts without defer/async', async () => {
    await writeTestHtml('index.html', '<html><head><script src="https://cdn.example.com/lib.js"></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('defer');
  });

  it('does not modify scripts that already have defer', async () => {
    const original = '<html><head><script src="https://cdn.example.com/lib.js" defer></script></head><body></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': true } });
    const html = await readTestHtml('index.html');
    // Should have exactly one defer (not duplicated)
    expect(html.match(/defer/g)?.length).toBe(1);
  });

  it('does not modify scripts that already have async', async () => {
    await writeTestHtml('index.html', '<html><head><script src="https://cdn.example.com/lib.js" async></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('async');
    expect(html).not.toContain('defer');
  });

  it('does not modify same-origin scripts', async () => {
    await writeTestHtml('index.html', '<html><head><script src="/local/lib.js"></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('defer');
    expect(html).not.toContain('async');
  });

  it('does not modify <script type="module"> tags', async () => {
    await writeTestHtml('index.html', '<html><head><script src="https://cdn.example.com/mod.js" type="module"></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('defer');
    expect(html).not.toContain(' async');
  });

  it('uses async when config.strategy is async', async () => {
    await writeTestHtml('index.html', '<html><head><script src="https://cdn.example.com/lib.js"></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': { strategy: 'async' } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('async');
    expect(html).not.toContain('defer');
  });

  it('skips scripts from hosts in the allowList', async () => {
    await writeTestHtml('index.html', '<html><head><script src="https://cdn.example.com/lib.js"></script></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'enforce-script-loading': { allowList: ['cdn.example.com'] } } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('defer');
    expect(html).not.toContain('async');
  });
});

describe('inject-csp-hashes', () => {
  it('injects CSP meta tag with sha384 hash for inline script', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script>console.log("hello");</script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('sha384-');
    expect(html).toContain('script-src');
  });

  it('injects CSP meta tag with sha384 hash for inline style', async () => {
    await writeTestHtml('index.html', '<html><head><style>body { color: red; }</style></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('sha384-');
    expect(html).toContain('style-src');
  });

  it('handles both inline script and style in same document', async () => {
    await writeTestHtml('index.html', '<html><head><style>body { margin: 0; }</style></head><body><script>var x = 1;</script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('script-src');
    expect(html).toContain('style-src');
    expect(html).toContain('sha384-');
  });

  it('does not hash external scripts with src attribute', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script src="/app.js"></script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('Content-Security-Policy');
  });

  it('does not hash script type speculationrules', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><script type="speculationrules">{"prerender":[]}</script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('Content-Security-Policy');
  });

  it('updates existing CSP meta tag without duplicating', async () => {
    await writeTestHtml('index.html', '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head><body><script>alert(1);</script></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/Content-Security-Policy/g) || [];
    expect(matches.length).toBe(1);
    expect(html).toContain('sha384-');
  });

  it('is a no-op when no inline scripts or styles exist', async () => {
    const original = '<html><head></head><body><p>Hello</p></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'inject-csp-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('Content-Security-Policy');
  });
});

describe('inject-sri-hashes', () => {
  it('skips scripts without https:// (relative paths, http://, //)', async () => {
    const input = [
      '<html><head>',
      '<script src="/local.js"></script>',
      '<script src="http://example.com/lib.js"></script>',
      '<script src="//cdn.example.com/lib.js"></script>',
      '</head><body></body></html>',
    ].join('');
    await writeTestHtml('index.html', input);
    await prebuild({ cwd: testDir, plugins: { 'inject-sri-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('integrity=');
  });

  it('skips scripts that already have an integrity attribute', async () => {
    const input = [
      '<html><head>',
      '<script src="https://cdn.example.com/lib.js" integrity="sha384-abc123" crossorigin="anonymous"></script>',
      '</head><body></body></html>',
    ].join('');
    await writeTestHtml('index.html', input);
    await prebuild({ cwd: testDir, plugins: { 'inject-sri-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('integrity="sha384-abc123"');
    expect((html.match(/integrity=/g) || []).length).toBe(1);
  });

  it('skips interpolated URLs', async () => {
    const input = [
      '<html><head>',
      '<script src="https://cdn.example.com/{version}/lib.js"></script>',
      '</head><body></body></html>',
    ].join('');
    await writeTestHtml('index.html', input);
    await prebuild({ cwd: testDir, plugins: { 'inject-sri-hashes': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('integrity=');
  });

  it('skips hosts listed in the skip config option', async () => {
    const input = [
      '<html><head>',
      '<script src="https://cdn.example.com/lib.js"></script>',
      '</head><body></body></html>',
    ].join('');
    await writeTestHtml('index.html', input);
    await prebuild({
      cwd: testDir,
      plugins: { 'inject-sri-hashes': { skip: ['cdn.example.com'] } },
    });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('integrity=');
  });

  it('does not break the build when the URL is unreachable', async () => {
    const input = [
      '<html><head>',
      '<script src="https://this-host-does-not-exist.invalid/lib.js"></script>',
      '</head><body></body></html>',
    ].join('');
    await writeTestHtml('index.html', input);
    await expect(
      prebuild({ cwd: testDir, plugins: { 'inject-sri-hashes': { timeout: 500 } } }),
    ).resolves.not.toThrow();
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('integrity=');
  });
});

describe('precompress-assets', () => {
  it('generates .br companion for HTML files when brotli: true', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>hello</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'precompress-assets': { brotli: true, gzip: false } } });
    const brContent = await readFile(join(testDir, 'index.html.br'));
    expect(brContent).toBeInstanceOf(Buffer);
    expect(brContent.length).toBeGreaterThan(0);
  });

  it('generates .gz companion for HTML files when gzip: true', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>hello</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'precompress-assets': { brotli: false, gzip: true } } });
    const gzContent = await readFile(join(testDir, 'index.html.gz'));
    expect(gzContent).toBeInstanceOf(Buffer);
    expect(gzContent.length).toBeGreaterThan(0);
  });

  it('skips .br generation when brotli: false', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>hello</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'precompress-assets': { brotli: false, gzip: true } } });
    await expect(readFile(join(testDir, 'index.html.br'))).rejects.toThrow();
  });

  it('skips .gz generation when gzip: false', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>hello</body></html>');
    await prebuild({ cwd: testDir, plugins: { 'precompress-assets': { brotli: true, gzip: false } } });
    await expect(readFile(join(testDir, 'index.html.gz'))).rejects.toThrow();
  });

  it('also compresses .css and .js files if present in the output dir', async () => {
    await writeTestHtml('index.html', '<html><head></head><body>hello</body></html>');
    await writeFile(join(testDir, 'styles.css'), 'body { color: red; }', 'utf-8');
    await writeFile(join(testDir, 'app.js'), 'console.log("hello");', 'utf-8');
    await prebuild({ cwd: testDir, plugins: { 'precompress-assets': { brotli: true, gzip: true } } });
    const cssBr = await readFile(join(testDir, 'styles.css.br'));
    const cssGz = await readFile(join(testDir, 'styles.css.gz'));
    const jsBr = await readFile(join(testDir, 'app.js.br'));
    const jsGz = await readFile(join(testDir, 'app.js.gz'));
    expect(cssBr.length).toBeGreaterThan(0);
    expect(cssGz.length).toBeGreaterThan(0);
    expect(jsBr.length).toBeGreaterThan(0);
    expect(jsGz.length).toBeGreaterThan(0);
  });
});

describe('inject-jsonld', () => {
  it('injects LD+JSON with name from <title>', async () => {
    await writeTestHtml('index.html', '<html><head><title>My Page</title></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('application/ld+json');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(match[1]);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebPage');
    expect(schema.name).toBe('My Page');
  });

  it('includes description from meta description', async () => {
    await writeTestHtml('index.html', '<html><head><title>My Page</title><meta name="description" content="A great page"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(match[1]);
    expect(schema.description).toBe('A great page');
  });

  it('includes url from canonical link', async () => {
    await writeTestHtml('index.html', '<html><head><title>My Page</title><link rel="canonical" href="https://example.com/my-page"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(match[1]);
    expect(schema.url).toBe('https://example.com/my-page');
  });

  it('includes inLanguage from <html lang>', async () => {
    await writeTestHtml('index.html', '<html lang="pt-BR"><head><title>Minha Página</title></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(match[1]);
    expect(schema.inLanguage).toBe('pt-BR');
  });

  it('does not inject when LD+JSON already exists (idempotent)', async () => {
    const existing = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Existing' });
    await writeTestHtml('index.html', `<html><head><title>My Page</title><script type="application/ld+json">${existing}</script></head><body></body></html>`);
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/<script type="application\/ld\+json">/g);
    expect(matches).toHaveLength(1);
  });

  it('does not inject when no title and no siteUrl', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('application/ld+json');
  });

  it('respects config.type === WebSite', async () => {
    await writeTestHtml('index.html', '<html><head><title>My Site</title></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inject-jsonld': { type: 'WebSite' } } });
    const html = await readTestHtml('index.html');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(match[1]);
    expect(schema['@type']).toBe('WebSite');
  });
});

describe('inline-critical-css', () => {
  it('returns HTML unchanged when beasties is not installed', async () => {
    const input = '<html><head><link rel="stylesheet" href="/styles.css"></head><body><h1>Hello</h1></body></html>';
    await writeTestHtml('index.html', input);
    await prebuild({ cwd: testDir, plugins: { 'inline-critical-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toBe(input);
  });

  it('does not throw when beasties is absent', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'inline-critical-css': true } })
    ).resolves.not.toThrow();
  });

  it('plugin can be enabled without crashing', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><p>Content</p></body></html>');
    const result = await prebuild({ cwd: testDir, plugins: { 'inline-critical-css': true } });
    expect(result).toBeDefined();
    expect(result.files).toBeGreaterThanOrEqual(0);
  });
});

describe('optimize-fonts', () => {
  it('injects preconnect for fonts.googleapis.com when Google Fonts link is present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('href="https://fonts.googleapis.com"');
    expect(html).toContain('rel="preconnect"');
  });

  it('injects preconnect for fonts.gstatic.com when Google Fonts link is present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('href="https://fonts.gstatic.com"');
  });

  it('adds display=swap to Google Fonts URL that does not have it', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('display=swap');
  });

  it('does not duplicate preconnects if already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="preconnect" href="https://fonts.googleapis.com" crossorigin><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    const apiMatches = (html.match(/href="https:\/\/fonts\.googleapis\.com"/g) || []).length;
    const staticMatches = (html.match(/href="https:\/\/fonts\.gstatic\.com"/g) || []).length;
    expect(apiMatches).toBe(1);
    expect(staticMatches).toBe(1);
  });

  it('does not modify pages with no Google Fonts', async () => {
    const original = '<html><head><link rel="stylesheet" href="/styles.css"></head><body></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).not.toContain('display=swap');
  });

  it('does not duplicate display=swap if already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'optimize-fonts': true } });
    const html = await readTestHtml('index.html');
    const swapMatches = (html.match(/display=swap/g) || []).length;
    expect(swapMatches).toBe(1);
  });
});

describe('generate-responsive-images', () => {
  it('returns HTML unchanged when sharp is not installed (graceful degradation)', async () => {
    const originalHtml = '<html><head></head><body><img src="/hero.jpg"></body></html>';
    await writeTestHtml('index.html', originalHtml);
    // sharp is not installed; runner must not throw and HTML must survive intact
    await expect(
      prebuild({ cwd: testDir, plugins: { 'generate-responsive-images': true } })
    ).resolves.not.toThrow();
    const html = await readTestHtml('index.html');
    // HTML should still contain the original img tag (unchanged because sharp absent)
    expect(html).toContain('<img');
    expect(html).toContain('/hero.jpg');
  });

  it('does not throw when sharp is absent', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><img src="/photo.png"></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'generate-responsive-images': true } })
    ).resolves.toBeDefined();
  });

  it('plugin can be enabled without crashing', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><p>No images here</p></body></html>');
    const result = await prebuild({ cwd: testDir, plugins: { 'generate-responsive-images': true } });
    expect(result.plugins).toContain('generate-responsive-images');
  });
});

describe('generate-pwa-manifest', () => {
  it('injects <link rel="manifest"> into head', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'generate-pwa-manifest': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.webmanifest"');
  });

  it('does not duplicate manifest link if already present', async () => {
    await writeTestHtml('index.html', '<html><head><link rel="manifest" href="/manifest.webmanifest"></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'generate-pwa-manifest': true } });
    const html = await readTestHtml('index.html');
    const matches = html.match(/rel="manifest"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('generates manifest.webmanifest file in output dir', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'generate-pwa-manifest': true } });
    const raw = await readFile(join(testDir, 'manifest.webmanifest'), 'utf-8');
    const manifest = JSON.parse(raw);
    expect(manifest).toBeDefined();
  });

  it('manifest JSON includes name, short_name, display, start_url', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'generate-pwa-manifest': true } });
    const raw = await readFile(join(testDir, 'manifest.webmanifest'), 'utf-8');
    const manifest = JSON.parse(raw);
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('start_url');
  });

  it('manifest respects config options (custom name, themeColor)', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await prebuild({
      cwd: testDir,
      plugins: {
        'generate-pwa-manifest': { name: 'My Custom App', themeColor: '#ff0000' },
      },
    });
    const raw = await readFile(join(testDir, 'manifest.webmanifest'), 'utf-8');
    const manifest = JSON.parse(raw);
    expect(manifest.name).toBe('My Custom App');
    expect(manifest.theme_color).toBe('#ff0000');
  });
});

describe('purge-unused-css', () => {
  it('removes CSS class rules with no matching elements in HTML', async () => {
    await writeTestHtml('index.html', '<html><head><style>.unused { color: red; } .used { color: blue; }</style></head><body><div class="used"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).not.toContain('.unused');
    expect(html).toContain('.used');
  });

  it('keeps CSS rules that have matching elements', async () => {
    await writeTestHtml('index.html', '<html><head><style>.card { padding: 1rem; } p { margin: 0; }</style></head><body><div class="card"><p>Hello</p></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('.card');
    expect(html).toContain('p {');
  });

  it('keeps @keyframes at-rules without purging', async () => {
    await writeTestHtml('index.html', '<html><head><style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .unused { color: red; }</style></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('@keyframes spin');
    expect(html).not.toContain('.unused');
  });

  it('keeps @media rules without purging', async () => {
    await writeTestHtml('index.html', '<html><head><style>@media (max-width: 768px) { .sidebar { display: none; } } .gone { color: green; }</style></head><body></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('@media');
    expect(html).toContain('.sidebar');
    expect(html).not.toContain('.gone');
  });

  it('does not touch NoJS internal style tags', async () => {
    const css = '.phantom { display: none; }';
    await writeTestHtml('index.html', `<html><head><style data-nojs-animations>${css}</style></head><body></body></html>`);
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('.phantom');
  });

  it('handles multiple selectors: keeps rule if ANY selector matches', async () => {
    await writeTestHtml('index.html', '<html><head><style>.missing, .present { font-size: 1rem; }</style></head><body><div class="present"></div></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('.missing, .present');
  });

  it('is a no-op when all CSS rules are used', async () => {
    const original = '<html><head><style>h1 { color: black; } p { margin: 0; }</style></head><body><h1>Title</h1><p>Text</p></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'purge-unused-css': true } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('h1');
    expect(html).toContain('p {');
  });
});

describe('audit-accessibility', () => {
  it('does not throw for compliant HTML', async () => {
    const compliantHtml = '<html lang="en"><head></head><body>' +
      '<img src="/hero.jpg" alt="Hero image">' +
      '<a href="/about">About</a>' +
      '<label for="name">Name</label><input id="name" type="text">' +
      '<h1>Title</h1><h2>Subtitle</h2>' +
      '</body></html>';
    await writeTestHtml('index.html', compliantHtml);
    await expect(prebuild({ cwd: testDir, plugins: { 'audit-accessibility': true } })).resolves.not.toThrow();
  });

  it('throws when failOnError is true and <img> has no alt', async () => {
    await writeTestHtml('index.html', '<html lang="en"><head></head><body><img src="/hero.jpg"></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-accessibility': { failOnError: true } } })
    ).rejects.toThrow(/violation/);
  });

  it('does not throw when failOnError is false despite violations', async () => {
    await writeTestHtml('index.html', '<html lang="en"><head></head><body><img src="/hero.jpg"></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-accessibility': { failOnError: false } } })
    ).resolves.not.toThrow();
  });

  it('returns HTML unchanged (audit only, no DOM mutation)', async () => {
    const original = '<html lang="en"><head></head><body><img src="/hero.jpg" alt="Hero"></body></html>';
    await writeTestHtml('index.html', original);
    await prebuild({ cwd: testDir, plugins: { 'audit-accessibility': true } });
    const result = await readTestHtml('index.html');
    expect(result).toBe(original);
  });

  it('does not flag <img alt=""> (decorative image with empty alt is valid)', async () => {
    await writeTestHtml('index.html', '<html lang="en"><head></head><body><img src="/deco.jpg" alt=""></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-accessibility': { failOnError: true } } })
    ).resolves.not.toThrow();
  });

  it('detects missing lang attribute on <html>', async () => {
    await writeTestHtml('index.html', '<html><head></head><body></body></html>');
    await expect(
      prebuild({ cwd: testDir, plugins: { 'audit-accessibility': { failOnError: true } } })
    ).rejects.toThrow(/violation/);
  });
});

describe('inline-svg', () => {
  it('inlines a small SVG file', async () => {
    await writeFile(join(testDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>');
    await writeTestHtml('index.html', '<html><head></head><body><img src="/icon.svg" alt="icon"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<svg');
    expect(html).not.toContain('<img');
  });

  it('does not inline SVG files larger than maxBytes', async () => {
    const bigSvg = '<svg xmlns="http://www.w3.org/2000/svg">' + 'x'.repeat(5000) + '</svg>';
    await writeFile(join(testDir, 'big.svg'), bigSvg);
    await writeTestHtml('index.html', '<html><head></head><body><img src="/big.svg"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir, maxBytes: 100 } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<img');
    expect(html).not.toContain('<svg');
  });

  it('does not inline external SVG URLs (https://)', async () => {
    await writeTestHtml('index.html', '<html><head></head><body><img src="https://example.com/icon.svg"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<img');
    expect(html).not.toContain('<svg');
  });

  it('does not inline when data-no-inline is present', async () => {
    await writeFile(join(testDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    await writeTestHtml('index.html', '<html><head></head><body><img src="/icon.svg" data-no-inline></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<img');
    expect(html).not.toContain('<svg');
  });

  it('adds aria-hidden="true" when no alt attribute', async () => {
    await writeFile(join(testDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    await writeTestHtml('index.html', '<html><head></head><body><img src="/icon.svg"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('aria-hidden="true"');
  });

  it('adds aria-label and role="img" when alt is provided', async () => {
    await writeFile(join(testDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    await writeTestHtml('index.html', '<html><head></head><body><img src="/icon.svg" alt="My Icon"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('aria-label="My Icon"');
    expect(html).toContain('role="img"');
  });

  it('strips width and height from the inlined SVG', async () => {
    await writeFile(join(testDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle r="10"/></svg>');
    await writeTestHtml('index.html', '<html><head></head><body><img src="/icon.svg"></body></html>');
    await prebuild({ cwd: testDir, plugins: { 'inline-svg': { cwd: testDir } } });
    const html = await readTestHtml('index.html');
    expect(html).toContain('<svg');
    expect(html).not.toMatch(/width="24"/);
    expect(html).not.toMatch(/height="24"/);
  });
});
