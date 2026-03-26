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
