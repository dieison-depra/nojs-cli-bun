import { parseHTML } from 'linkedom';

export default {
  name: 'enforce-script-loading',
  description: 'Add defer/async to third-party scripts to prevent render-blocking.',

  async process(html, { config }) {
    const opts = config || {};
    const strategy = opts.strategy === 'async' ? 'async' : 'defer';
    const allowList = new Set(opts.allowList || []);

    const { document: doc } = parseHTML(html);
    let changed = false;

    for (const script of doc.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src') || '';
      if (!isThirdParty(src)) continue;
      if (script.getAttribute('type') === 'module') continue;
      if (script.hasAttribute('defer') || script.hasAttribute('async')) continue;

      // Check allow list
      try {
        const origin = new URL(src.startsWith('//') ? 'https:' + src : src).hostname;
        if (allowList.has(origin)) continue;
      } catch { continue; }

      script.setAttribute(strategy, '');
      changed = true;
    }

    return changed ? doc.toString() : html;
  },
};

function isThirdParty(src) {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
}
