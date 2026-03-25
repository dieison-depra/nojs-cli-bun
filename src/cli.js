import { createRequire } from 'node:module';

const COMMANDS = {
  init: () => import('./commands/init.js'),
  prebuild: () => import('./commands/prebuild.js'),
  dev: () => import('./commands/dev.js'),
  validate: () => import('./commands/validate.js'),
  plugin: () => import('./commands/plugin.js'),
};

const ALIASES = {
  i: 'init',
  b: 'prebuild',
  d: 'dev',
  v: 'validate',
  p: 'plugin',
};

const HELP = `
nojs — Official CLI for the No.JS framework

Usage:
  nojs <command> [options]

Commands:
  init      (i)     Scaffold a new No.JS project (interactive wizard)
  prebuild  (b)     Run build-time optimizations on HTML files
  dev       (d)     Start a local dev server with live reload
  validate  (v)     Validate No.JS templates for common mistakes
  plugin    (p)     Search, install, update, and remove plugins

Options:
  -h, --help        Show this help
  -v, --version     Show version

Run "nojs <command> --help" for command-specific help.

Documentation: https://github.com/ErickXavier/NoJS-CLI
`;

export async function run(argv) {
  const raw = argv[0];

  if (!raw || raw === '-h' || raw === '--help' || raw === 'help') {
    console.log(HELP.trim());
    return;
  }

  if (raw === '-v' || raw === '--version' || raw === 'version') {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    console.log(pkg.version);
    return;
  }

  const command = ALIASES[raw] || raw;
  const loader = COMMANDS[command];
  if (!loader) {
    console.error(`Unknown command: "${raw}". Run "nojs --help" for usage.`);
    process.exit(1);
  }

  try {
    const mod = await loader();
    await mod.run(argv.slice(1));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
