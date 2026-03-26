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
