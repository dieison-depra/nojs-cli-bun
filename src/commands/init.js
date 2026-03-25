import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { basename, resolve } from 'node:path';
import { generate } from '../init/generator.js';

const HELP = `
nojs init (i) — Scaffold a new No.JS project

Usage:
  nojs init [path] [options]

Arguments:
  path                        Target directory (default: ".")

Options:
  --name <name>               Project name (default: directory name)
  --routing, -r               Enable SPA routing (y/n)
  --i18n                      Enable i18n (y/n)
  --locales <list>            Comma-separated locales (e.g., "en,pt")
  --default-locale <locale>   Default locale
  --api <url>                 Base API URL
  --yes, -y                   Accept all defaults (skip wizard)
  -h, --help                  Show this help

Examples:
  nojs init
  nojs i ./kanban
  nojs i --routing y --i18n y --locales en,pt --default-locale pt
  nojs i ./my-app -y
`;

export async function run(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP.trim());
    return;
  }

  const flags = parseFlags(argv);
  const targetDir = flags.path ? resolve(process.cwd(), flags.path) : process.cwd();
  const skipWizard = flags.yes || allAnswered(flags);

  const rl = skipWizard ? null : createInterface({ input: stdin, output: stdout });

  try {
    const answers = {};
    const dirName = basename(targetDir);

    answers.name = flags.name || (skipWizard ? dirName : await ask(rl, 'Project name:', dirName));
    answers.routing = flags.routing ?? (skipWizard ? true : await confirm(rl, 'Use SPA routing?', true));
    answers.i18n = flags.i18n ?? (skipWizard ? false : await confirm(rl, 'Use i18n (internationalization)?', false));

    if (answers.i18n) {
      const localesStr = flags.locales || (skipWizard ? 'en, pt' : await ask(rl, 'Locales (comma-separated):', 'en, pt'));
      answers.locales = localesStr.split(',').map((l) => l.trim()).filter(Boolean);
      answers.defaultLocale = flags.defaultLocale || (skipWizard ? answers.locales[0] : await ask(rl, 'Default locale:', answers.locales[0]));
    }

    const apiUrl = flags.api ?? (skipWizard ? '' : await ask(rl, 'Base API URL (leave empty for none):', ''));
    answers.apiUrl = apiUrl || null;

    console.log('');
    console.log(`Creating project "${answers.name}"...`);

    const result = await generate(answers, targetDir);

    console.log('');
    console.log(`Project created at ${flags.path || '.'}`);
    console.log('');
    console.log('  Files:');
    result.files.forEach((f) => console.log(`    ${f}`));
    console.log('');
    console.log('  Next steps:');
    if (flags.path) console.log(`    cd ${flags.path}`);
    console.log('    nojs dev');
    console.log('');
  } finally {
    rl?.close();
  }
}

function parseFlags(argv) {
  const flags = { path: null, name: null, routing: null, i18n: null, locales: null, defaultLocale: null, api: null, yes: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--name': flags.name = argv[++i]; break;
      case '--routing': case '-r': flags.routing = toBool(argv[++i]); break;
      case '--i18n': flags.i18n = toBool(argv[++i]); break;
      case '--locales': flags.locales = argv[++i]; break;
      case '--default-locale': flags.defaultLocale = argv[++i]; break;
      case '--api': flags.api = argv[++i]; break;
      case '--yes': case '-y': flags.yes = true; break;
      default:
        if (!arg.startsWith('-') && !flags.path) flags.path = arg;
        break;
    }
  }

  return flags;
}

function toBool(value) {
  if (!value) return null;
  const v = value.toLowerCase();
  return v === 'y' || v === 'yes' || v === 's' || v === 'sim' || v === 'true' || v === '1';
}

function allAnswered(flags) {
  return flags.routing !== null && flags.i18n !== null;
}

async function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const answer = await rl.question(`  ${question}${suffix} `);
  return answer.trim() || defaultValue || '';
}

async function confirm(rl, question, defaultValue) {
  const hint = defaultValue ? '(Y/n)' : '(y/N)';
  const answer = await rl.question(`  ${question} ${hint} `);
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return defaultValue;
  return trimmed === 'y' || trimmed === 'yes' || trimmed === 's' || trimmed === 'sim';
}
