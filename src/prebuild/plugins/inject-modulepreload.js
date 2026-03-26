import { parseHTML } from 'linkedom';

export default {
  name: 'inject-modulepreload',
  description: 'Inject modulepreload hints for module scripts to reduce load latency.',

  async process(html) {
    const { document: doc } = parseHTML(html);
    if (!doc.head) return html;

    const existing = new Set(
      [...doc.querySelectorAll('link[rel="modulepreload"]')].map(el => el.getAttribute('href'))
    );

    const scripts = doc.querySelectorAll('script[type="module"][src]');
    let changed = false;
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (!src || isInterpolated(src) || isCrossOrigin(src) || existing.has(src)) continue;

      const link = doc.createElement('link');
      link.setAttribute('rel', 'modulepreload');
      link.setAttribute('href', src);
      doc.head.appendChild(link);
      existing.add(src);
      changed = true;
    }

    return changed ? doc.toString() : html;
  },
};

function isInterpolated(url) {
  return /\{[^}]+\}/.test(url);
}

function isCrossOrigin(url) {
  try { new URL(url); return true; } catch { return false; }
}
