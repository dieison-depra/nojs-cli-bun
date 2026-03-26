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
