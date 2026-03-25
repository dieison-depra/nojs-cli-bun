import { prebuild } from '../prebuild/runner.js';
import { discoverFiles } from '../prebuild/html.js';
import { loadConfig } from '../prebuild/config.js';
import { builtinPlugins } from '../prebuild/plugins/index.js';

const HELP = `
nojs prebuild — Run build-time optimizations on HTML files

Usage:
  nojs prebuild [options]

Options:
  --input <glob>      HTML files to process (default: "**/*.html")
  --output <dir>      Output directory (default: in-place)
  --config <path>     Path to config file (default: auto-detect)
  --plugin <name>     Run only this plugin (can be repeated)
  --list              List available plugins
  --dry-run           Show what would be processed without writing
  -h, --help          Show this help

Examples:
  nojs prebuild
  nojs prebuild --input "pages/**/*.html" --output dist/
  nojs prebuild --plugin inject-head-attrs --plugin inject-resource-hints
`;

export async function run(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP.trim());
    return;
  }

  if (argv.includes('--list')) {
    console.log('Available prebuild plugins:\n');
    for (const [name, plugin] of Object.entries(builtinPlugins)) {
      console.log(`  ${name}`);
      console.log(`    ${plugin.description}\n`);
    }
    return;
  }

  const args = parseArgs(argv);

  if (args.dryRun) {
    const config = await loadConfig(args.config);
    const input = args.input || config.input;
    const files = await discoverFiles(input);
    console.log(`Would process ${files.length} file(s):`);
    files.forEach((f) => console.log(`  ${f}`));
    return;
  }

  const options = {
    ...(args.input && { input: args.input }),
    ...(args.output && { output: args.output }),
    ...(args.config && { configPath: args.config }),
  };

  if (args.plugins.length > 0) {
    options.plugins = {};
    for (const name of args.plugins) {
      options.plugins[name] = true;
    }
  }

  const result = await prebuild(options);

  console.log(
    `Done. Processed ${result.files} file(s) with ${result.plugins.length} plugin(s): ${result.plugins.join(', ') || '(none)'}`,
  );
}

function parseArgs(argv) {
  const args = { input: null, output: null, config: null, plugins: [], dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--input': args.input = argv[++i]; break;
      case '--output': args.output = argv[++i]; break;
      case '--config': args.config = argv[++i]; break;
      case '--plugin': args.plugins.push(argv[++i]); break;
      case '--dry-run': args.dryRun = true; break;
      default: throw new Error(`Unknown option: ${arg}. Run "nojs prebuild --help" for usage.`);
    }
  }

  return args;
}
