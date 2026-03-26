import { parseHTML } from 'linkedom';
import { relative } from 'node:path';

export default {
  name: 'inject-canonical-url',
  description: 'Inject canonical link tag from siteUrl config and file path.',

  async process(html, { filePath, config }) {
    const siteUrl = config?.siteUrl;
    if (!siteUrl) return html;

    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    // Skip if canonical already present
    if (head.querySelector('link[rel="canonical"]')) return html;

    // Derive path
    const cwd = config?.cwd || process.cwd();
    const rel = filePath ? relative(cwd, filePath) : 'index.html';
    const parts = rel.replace(/\\/g, '/').split('/');
    let urlPath;
    if (parts[parts.length - 1] === 'index.html') {
      // directory index → trailing slash
      urlPath = parts.length === 1 ? '/' : '/' + parts.slice(0, -1).join('/') + '/';
    } else {
      urlPath = '/' + parts.join('/');
    }

    const canonical = siteUrl.replace(/\/$/, '') + urlPath;

    const link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', canonical);
    head.appendChild(link);

    return doc.toString();
  },
};
