import { parseHTML } from 'linkedom';

export default {
  name: 'inject-jsonld',
  description: 'Inject WebPage/WebSite JSON-LD structured data from page metadata.',

  async process(html, { config }) {
    const opts = config || {};
    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    // Skip if LD+JSON already present
    if (doc.querySelector('script[type="application/ld+json"]')) return html;

    const title = head.querySelector('title')?.textContent?.trim();
    const description = head.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    const canonical = head.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim();
    const lang = doc.documentElement?.getAttribute('lang') || doc.querySelector('html')?.getAttribute('lang');

    const url = canonical || (opts.siteUrl || '');
    if (!title && !url) return html;

    const schema = {
      '@context': 'https://schema.org',
      '@type': opts.type || 'WebPage',
    };

    if (title) schema.name = title;
    if (description) schema.description = description;
    if (url) schema.url = url;
    if (lang) schema.inLanguage = lang;

    if (opts.organization) {
      schema.isPartOf = {
        '@type': 'WebSite',
        name: opts.organization.name,
        url: opts.organization.url,
      };
    }

    const script = doc.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(schema, null, 2);
    head.appendChild(script);

    return doc.toString();
  },
};
