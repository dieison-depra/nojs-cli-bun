import { search, install, update, remove, list } from '../plugin/manager.js';

const HELP = `
nojs plugin — Manage No.JS plugins

Usage:
  nojs plugin <action> [options]

Actions:
  search <query>      Search for plugins (CDN registry + npm)
  install <name>      Install a plugin
  update <name>       Update a plugin to latest version
  remove <name>       Remove an installed plugin
  list                List installed plugins

Plugin sources:
  Official (CDN):     nojs plugin install carousel
  npm:                nojs plugin install npm:@someone/nojs-carousel

Options:
  -h, --help          Show this help

Examples:
  nojs plugin search chart
  nojs plugin install carousel
  nojs plugin install npm:@someone/nojs-carousel
  nojs plugin update carousel
  nojs plugin remove carousel
  nojs plugin list
`;

export async function run(argv) {
  if (argv.includes('-h') || argv.includes('--help') || argv.length === 0) {
    console.log(HELP.trim());
    return;
  }

  const action = argv[0];
  const args = argv.slice(1);

  switch (action) {
    case 'search':
      if (!args[0]) throw new Error('Usage: nojs plugin search <query>');
      await search(args[0]);
      break;

    case 'install':
      if (!args[0]) throw new Error('Usage: nojs plugin install <name>');
      await install(args[0]);
      break;

    case 'update':
      if (!args[0]) throw new Error('Usage: nojs plugin update <name>');
      await update(args[0]);
      break;

    case 'remove':
      if (!args[0]) throw new Error('Usage: nojs plugin remove <name>');
      await remove(args[0]);
      break;

    case 'list':
      await list();
      break;

    default:
      throw new Error(`Unknown action: "${action}". Run "nojs plugin --help" for usage.`);
  }
}
