import { describe, it, expect, afterEach } from '@jest/globals';
import { rm, readFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generate } from '../src/init/generator.js';

let testDir;

afterEach(async () => {
  if (testDir) await rm(testDir, { recursive: true, force: true });
});

async function makeTempDir() {
  testDir = join(tmpdir(), `nojs-init-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  return testDir;
}

describe('nojs init generator', () => {
  it('generates files in the given directory (not a subdirectory)', async () => {
    const cwd = await makeTempDir();
    const result = await generate({ name: 'test-app', routing: false, i18n: false, apiUrl: null }, cwd);

    expect(result.files).toContain('index.html');
    expect(result.files).toContain('assets/style.css');
    expect(result.files).toContain('nojs.config.json');

    const html = await readFile(join(cwd, 'index.html'), 'utf-8');
    expect(html).toContain('cdn.no-js.dev');
    expect(html).toContain('Hello, No.JS!');
    expect(html).not.toContain('route');
    expect(html).not.toContain('i18n');
  });

  it('generates a project with routing', async () => {
    const cwd = await makeTempDir();
    const result = await generate({ name: 'spa-app', routing: true, i18n: false, apiUrl: null }, cwd);

    expect(result.files).toContain('pages/home.tpl');
    expect(result.files).toContain('pages/about.tpl');

    const html = await readFile(join(cwd, 'index.html'), 'utf-8');
    expect(html).toContain('route-view');
    expect(html).toContain('src="pages/"');
    expect(html).toContain('route-index="home"');
  });

  it('generates a project with i18n', async () => {
    const cwd = await makeTempDir();
    const result = await generate({
      name: 'i18n-app',
      routing: false,
      i18n: true,
      locales: ['en', 'pt'],
      defaultLocale: 'en',
      apiUrl: null,
    }, cwd);

    expect(result.files).toContain('locales/en.json');
    expect(result.files).toContain('locales/pt.json');

    const html = await readFile(join(cwd, 'index.html'), 'utf-8');
    expect(html).toContain('i18n-config');
    expect(html).toContain('defaultLocale="en"');
    expect(html).toContain('t="greeting"');

    const enJson = JSON.parse(await readFile(join(cwd, 'locales', 'en.json'), 'utf-8'));
    expect(enJson.greeting).toBe('Hello, No.JS!');

    const ptJson = JSON.parse(await readFile(join(cwd, 'locales', 'pt.json'), 'utf-8'));
    expect(ptJson.greeting).toBe('Olá, No.JS!');
  });

  it('generates a project with routing + i18n + API', async () => {
    const cwd = await makeTempDir();
    const result = await generate({
      name: 'full-app',
      routing: true,
      i18n: true,
      locales: ['en', 'pt'],
      defaultLocale: 'pt',
      apiUrl: 'https://api.example.com',
    }, cwd);

    const html = await readFile(join(cwd, 'index.html'), 'utf-8');
    expect(html).toContain('base="https://api.example.com"');
    expect(html).toContain('route-view');
    expect(html).toContain('i18n-config');
    expect(html).toContain('lang="pt"');

    expect(result.files).toContain('pages/home.tpl');
    expect(result.files).toContain('locales/pt.json');
  });

  it('generates nojs.config.json with project metadata', async () => {
    const cwd = await makeTempDir();
    await generate({ name: 'config-test', routing: false, i18n: false, apiUrl: null }, cwd);

    const config = JSON.parse(await readFile(join(cwd, 'nojs.config.json'), 'utf-8'));
    expect(config.name).toBe('config-test');
    expect(config.version).toBe('0.1.0');
    expect(config.plugins).toEqual([]);
  });
});
