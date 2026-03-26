export default {
  name: 'inline-critical-css',
  description: 'Inline critical CSS and async-load full stylesheets using beasties.',

  async process(html, { filePath, config }) {
    let Beasties;
    try {
      ({ default: Beasties } = await import('beasties'));
    } catch {
      process.stderr.write('[inline-critical-css] warn: beasties not installed. Run: npm install beasties\n');
      return html;
    }

    const opts = config || {};

    const beasties = new Beasties({
      path: opts.path || process.cwd(),
      publicPath: opts.publicPath || '/',
      logLevel: 'warn',
      pruneSource: opts.pruneSource !== false,
      mergeStylesheets: opts.mergeStylesheets !== false,
      preload: 'swap',
      ...opts.beastiesOptions,
    });

    try {
      return await beasties.process(html);
    } catch (err) {
      process.stderr.write(`[inline-critical-css] warn: failed to process ${filePath}: ${err.message}\n`);
      return html;
    }
  },
};
