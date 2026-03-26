import { createServer } from '../dev/server.js';

const HELP = `
nojs dev — Start a local dev server with live reload

Usage:
  nojs dev [options]

Arguments:
  path                Root directory to serve (default: current directory)

Options:
  --port <port>       Port number (default: 3000)
  --no-reload         Disable live reload
  --open              Open browser on start
  --quiet, -q         Suppress request logging
  -h, --help          Show this help

Features:
  - Serves HTML files with correct MIME types
  - Live reload on file changes (via SSE)
  - SPA fallback for clean URLs (extensionless paths serve index.html)
  - Rewrites CDN URLs to local No.JS build if available
`;

export async function run(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP.trim());
    return;
  }

  const args = parseArgs(argv);

  const server = await createServer({
    port: args.port,
    root: args.root,
    liveReload: args.liveReload,
    open: args.open,
    quiet: args.quiet,
  });

  const shutdown = () => {
    console.log('\nShutting down...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function parseArgs(argv) {
  const args = { port: 3000, root: '.', liveReload: true, open: false, quiet: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--port': args.port = parseInt(argv[++i], 10); break;
      case '--no-reload': args.liveReload = false; break;
      case '--open': args.open = true; break;
      case '--quiet': case '-q': args.quiet = true; break;
      default:
        if (!arg.startsWith('-')) args.root = arg;
        else throw new Error(`Unknown option: ${arg}. Run "nojs dev --help" for usage.`);
    }
  }

  return args;
}
