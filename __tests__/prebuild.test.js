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
