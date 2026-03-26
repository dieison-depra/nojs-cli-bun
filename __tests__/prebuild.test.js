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
