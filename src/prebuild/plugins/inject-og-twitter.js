import { parseHTML } from 'linkedom';

export default {
  name: 'inject-og-twitter',
  description: 'Generate Open Graph and Twitter Card meta tags from No.JS page-* directives',

  async process(html, { filePath, config }) {
    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    const title = getStaticPageAttr(doc, 'page-title')
      || head.querySelector('title')?.textContent?.trim();
    const description = getStaticPageAttr(doc, 'page-description')
      || head.querySelector('meta[name="description"]')?.getAttribute('content');
    const canonical = getStaticPageAttr(doc, 'page-canonical')
      || head.querySelector('link[rel="canonical"]')?.getAttribute('href');

    setMeta(doc, head, 'property', 'og:type', config.type || 'website');
    if (title) setMeta(doc, head, 'property', 'og:title', title);
    if (description) setMeta(doc, head, 'property', 'og:description', description);
    if (canonical) setMeta(doc, head, 'property', 'og:url', canonical);
    if (config.defaultImage) setMeta(doc, head, 'property', 'og:image', config.defaultImage);
    if (config.siteName) setMeta(doc, head, 'property', 'og:site_name', config.siteName);

    setMeta(doc, head, 'name', 'twitter:card', config.twitterCard || 'summary');
    if (title) setMeta(doc, head, 'name', 'twitter:title', title);
    if (description) setMeta(doc, head, 'name', 'twitter:description', description);
    if (config.twitterSite) setMeta(doc, head, 'name', 'twitter:site', config.twitterSite);
    if (config.defaultImage) setMeta(doc, head, 'name', 'twitter:image', config.defaultImage);

    return doc.toString();
  },
};

function getStaticPageAttr(doc, attr) {
  const el = doc.querySelector(`[${attr}]`);
  if (!el) return null;
  const value = el.getAttribute(attr)?.trim();
  const match = value?.match(/^(['"])(.*)\1$/);
  return match ? match[2] : null;
}

function setMeta(doc, head, attrType, name, content) {
  if (head.querySelector(`meta[${attrType}="${name}"]`)) return;
  const meta = doc.createElement('meta');
  meta.setAttribute(attrType, name);
  meta.setAttribute('content', content);
  head.appendChild(meta);
}
