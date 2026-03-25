import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CDN_URL = 'https://cdn.no-js.dev/';

/**
 * Generate a No.JS project based on wizard answers.
 *
 * @param {object} answers
 * @param {string} answers.name - Project name
 * @param {boolean} answers.routing - Enable SPA routing
 * @param {boolean} answers.i18n - Enable i18n
 * @param {string[]} [answers.locales] - i18n locales
 * @param {string} [answers.defaultLocale] - Default locale
 * @param {string|null} [answers.apiUrl] - Base API URL
 * @param {string} [cwd] - Working directory
 * @returns {Promise<{ files: string[] }>}
 */
export async function generate(answers, cwd = process.cwd()) {
  const root = join(cwd, answers.name);
  const files = [];

  await mkdir(root, { recursive: true });

  // index.html
  const indexHtml = buildIndex(answers);
  await writeFile(join(root, 'index.html'), indexHtml, 'utf-8');
  files.push('index.html');

  // Routing pages
  if (answers.routing) {
    await mkdir(join(root, 'pages'), { recursive: true });

    await writeFile(join(root, 'pages', 'home.html'), buildPage('home', answers), 'utf-8');
    files.push('pages/home.html');

    await writeFile(join(root, 'pages', 'about.html'), buildPage('about', answers), 'utf-8');
    files.push('pages/about.html');
  }

  // i18n locale files
  if (answers.i18n && answers.locales) {
    await mkdir(join(root, 'locales'), { recursive: true });

    for (const locale of answers.locales) {
      const content = buildLocaleFile(locale, answers);
      await writeFile(join(root, 'locales', `${locale}.json`), content, 'utf-8');
      files.push(`locales/${locale}.json`);
    }
  }

  // Assets directory
  await mkdir(join(root, 'assets'), { recursive: true });

  await writeFile(join(root, 'assets', 'style.css'), buildCss(answers), 'utf-8');
  files.push('assets/style.css');

  // nojs.config.json (project metadata for CLI)
  const config = {
    name: answers.name,
    version: '0.1.0',
    plugins: [],
  };
  await writeFile(join(root, 'nojs.config.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8');
  files.push('nojs.config.json');

  return { files };
}

function buildIndex(answers) {
  const parts = [];

  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="' + (answers.defaultLocale || 'en') + '">');
  parts.push('<head>');
  parts.push('  <meta charset="UTF-8">');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  parts.push(`  <title>${answers.name}</title>`);
  parts.push('  <link rel="stylesheet" href="assets/style.css">');
  parts.push(`  <script src="${CDN_URL}"><\/script>`);
  parts.push('</head>');

  // Body attributes
  const bodyAttrs = [];
  if (answers.apiUrl) bodyAttrs.push(`base="${answers.apiUrl}"`);
  if (answers.i18n) bodyAttrs.push(`store="app" state="{ locale: '${answers.defaultLocale || 'en'}' }"`);

  parts.push(`<body${bodyAttrs.length ? ' ' + bodyAttrs.join(' ') : ''}>`);

  // Navigation
  if (answers.routing) {
    parts.push('');
    parts.push('  <nav>');
    if (answers.i18n) {
      parts.push('    <a route="/" t="nav.home">Home</a>');
      parts.push('    <a route="/about" t="nav.about">About</a>');
    } else {
      parts.push('    <a route="/">Home</a>');
      parts.push('    <a route="/about">About</a>');
    }
    if (answers.i18n) {
      parts.push('');
      parts.push('    <select model="$store.app.locale" on:change="NoJS.locale = $store.app.locale">');
      for (const locale of answers.locales) {
        parts.push(`      <option value="${locale}">${locale.toUpperCase()}</option>`);
      }
      parts.push('    </select>');
    }
    parts.push('  </nav>');
  }

  parts.push('');

  // i18n config
  if (answers.i18n) {
    parts.push(`  <div i18n-config loadPath="locales/{locale}.json" defaultLocale="${answers.defaultLocale}" persist></div>`);
    parts.push('');
  }

  // Main content
  if (answers.routing) {
    parts.push('  <template route="/" src="pages/home.html"></template>');
    parts.push('  <template route="/about" src="pages/about.html"></template>');
    parts.push('');
    parts.push('  <main route-view></main>');
  } else {
    // No routing — inline content
    parts.push('  <main>');
    if (answers.i18n) {
      parts.push('    <h1 t="greeting">Hello, No.JS!</h1>');
      parts.push('    <p t="description">Build dynamic web apps with just HTML.</p>');
    } else {
      parts.push('    <h1>Hello, No.JS!</h1>');
      parts.push('    <p>Build dynamic web apps with just HTML attributes.</p>');
    }
    parts.push('');
    parts.push('    <div state="{ count: 0 }">');
    parts.push('      <button on:click="count++">');
    parts.push('        Clicked: <span bind="count"></span> times');
    parts.push('      </button>');
    parts.push('    </div>');
    parts.push('  </main>');
  }

  parts.push('');
  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n') + '\n';
}

function buildPage(name, answers) {
  const parts = [];

  if (name === 'home') {
    if (answers.i18n) {
      parts.push('<section>');
      parts.push('  <h1 t="greeting">Hello, No.JS!</h1>');
      parts.push('  <p t="description">Build dynamic web apps with just HTML.</p>');
      parts.push('');
      parts.push('  <div state="{ count: 0 }">');
      parts.push('    <button on:click="count++">');
      parts.push('      <span t="counter">Clicked</span>: <span bind="count"></span>');
      parts.push('    </button>');
      parts.push('  </div>');
      parts.push('</section>');
    } else {
      parts.push('<section>');
      parts.push('  <h1>Hello, No.JS!</h1>');
      parts.push('  <p>Build dynamic web apps with just HTML attributes.</p>');
      parts.push('');
      parts.push('  <div state="{ count: 0 }">');
      parts.push('    <button on:click="count++">');
      parts.push('      Clicked: <span bind="count"></span> times');
      parts.push('    </button>');
      parts.push('  </div>');
      parts.push('</section>');
    }
  } else if (name === 'about') {
    if (answers.i18n) {
      parts.push('<section>');
      parts.push('  <h1 t="about.title">About</h1>');
      parts.push('  <p t="about.body">This project was built with No.JS.</p>');
      parts.push('</section>');
    } else {
      parts.push('<section>');
      parts.push('  <h1>About</h1>');
      parts.push('  <p>This project was built with No.JS — the HTML-first reactive framework.</p>');
      parts.push('</section>');
    }
  }

  return parts.join('\n') + '\n';
}

function buildLocaleFile(locale, answers) {
  const translations = {
    en: {
      'nav.home': 'Home',
      'nav.about': 'About',
      greeting: 'Hello, No.JS!',
      description: 'Build dynamic web apps with just HTML.',
      counter: 'Clicked',
      'about.title': 'About',
      'about.body': 'This project was built with No.JS.',
    },
    pt: {
      'nav.home': 'Início',
      'nav.about': 'Sobre',
      greeting: 'Olá, No.JS!',
      description: 'Crie apps web dinâmicos apenas com HTML.',
      counter: 'Clicado',
      'about.title': 'Sobre',
      'about.body': 'Este projeto foi construído com No.JS.',
    },
  };

  const content = translations[locale] || translations.en;
  return JSON.stringify(content, null, 2) + '\n';
}

function buildCss(answers) {
  return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 2rem;
}

nav a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

nav a.active {
  color: #1a1a1a;
  font-weight: 700;
}

nav select {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

p {
  color: #6b7280;
  margin-bottom: 1rem;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
}

button:hover {
  background: #2563eb;
}

section {
  padding: 1rem 0;
}
`;
}
