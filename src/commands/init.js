import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { generate } from '../init/generator.js';

const HELP = `
nojs init — Scaffold a new No.JS project

Usage:
  nojs init [options]

Options:
  --name <name>     Project name (skips prompt)
  --yes             Accept all defaults
  -h, --help        Show this help

The wizard asks what features you need and generates a tailored project.
`;

export async function run(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP.trim());
    return;
  }

  const defaults = argv.includes('--yes');
  const nameFlag = flagValue(argv, '--name');

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answers = {};

    // Project name
    answers.name = nameFlag || await ask(rl, 'Project name:', 'my-nojs-app', defaults);

    // SPA routing
    answers.routing = await confirm(rl, 'Use SPA routing?', true, defaults);

    // i18n
    answers.i18n = await confirm(rl, 'Use i18n (internationalization)?', false, defaults);

    if (answers.i18n) {
      const localesStr = await ask(rl, 'Locales (comma-separated):', 'en, pt', defaults);
      answers.locales = localesStr.split(',').map((l) => l.trim()).filter(Boolean);
      answers.defaultLocale = await ask(rl, 'Default locale:', answers.locales[0], defaults);
    }

    // Base API URL
    const apiUrl = await ask(rl, 'Base API URL (leave empty for none):', '', defaults);
    answers.apiUrl = apiUrl || null;

    console.log('');
    console.log(`Creating project "${answers.name}"...`);

    const result = await generate(answers);

    console.log('');
    console.log(`Project created at ./${answers.name}/`);
    console.log('');
    console.log('  Files:');
    result.files.forEach((f) => console.log(`    ${f}`));
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd ${answers.name}`);
    console.log('    nojs dev');
    console.log('');
  } finally {
    rl.close();
  }
}

async function ask(rl, question, defaultValue, useDefaults) {
  if (useDefaults && defaultValue !== undefined) return defaultValue;
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const answer = await rl.question(`  ${question}${suffix} `);
  return answer.trim() || defaultValue || '';
}

async function confirm(rl, question, defaultValue, useDefaults) {
  if (useDefaults) return defaultValue;
  const hint = defaultValue ? '(Y/n)' : '(y/N)';
  const answer = await rl.question(`  ${question} ${hint} `);
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return defaultValue;
  return trimmed === 'y' || trimmed === 'yes' || trimmed === 's' || trimmed === 'sim';
}

function flagValue(argv, flag) {
  const idx = argv.indexOf(flag);
  return idx !== -1 && idx + 1 < argv.length ? argv[idx + 1] : null;
}
