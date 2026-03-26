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
