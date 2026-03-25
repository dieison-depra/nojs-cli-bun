import { parseHTML } from 'linkedom';

export default {
  name: 'inject-head-attrs',
  description: 'Inject static page-title, page-description, page-canonical, and page-jsonld into <head>',

  async process(html, { filePath, config }) {
    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    const bodyAttrs = collectDirectives(doc.body);
    const routeAttrs = {};
    const defaultRoute = doc.querySelector('template[route="/"], template[route="*"]');
    if (defaultRoute) Object.assign(routeAttrs, collectDirectives(defaultRoute));

    const attrs = { ...routeAttrs, ...bodyAttrs };

    if (attrs.title) {
      let title = head.querySelector('title');
      if (!title) { title = doc.createElement('title'); head.prepend(title); }
      title.textContent = attrs.title;
    }

    if (attrs.description) {
      let meta = head.querySelector('meta[name="description"]');
      if (!meta) { meta = doc.createElement('meta'); meta.setAttribute('name', 'description'); head.appendChild(meta); }
      meta.setAttribute('content', attrs.description);
    }

    if (attrs.canonical) {
      let link = head.querySelector('link[rel="canonical"]');
      if (!link) { link = doc.createElement('link'); link.setAttribute('rel', 'canonical'); head.appendChild(link); }
      link.setAttribute('href', attrs.canonical);
    }

    if (attrs.jsonld) {
      let script = head.querySelector('script[type="application/ld+json"][data-nojs]');
      if (!script) {
        script = doc.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-nojs', '');
        head.appendChild(script);
      }
      script.textContent = attrs.jsonld;
    }

    return doc.toString();
  },
};

function collectDirectives(root) {
  const result = {};
  if (!root) return result;

  const mapping = { 'page-title': 'title', 'page-description': 'description', 'page-canonical': 'canonical' };

  for (const [attr, key] of Object.entries(mapping)) {
    const el = root.matches?.(`[${attr}]`) ? root : root.querySelector?.(`[${attr}]`);
    if (!el) continue;
    const literal = extractStringLiteral(el.getAttribute(attr));
    if (literal !== null) result[key] = literal;
  }

  const jsonldEl = root.matches?.('[page-jsonld]') ? root : root.querySelector?.('[page-jsonld]');
  if (jsonldEl) {
    const content = jsonldEl.textContent?.trim();
    if (content) result.jsonld = content;
  }

  return result;
}

function extractStringLiteral(value) {
  if (!value) return null;
  const match = value.trim().match(/^(['"])(.*)\1$/);
  return match ? match[2] : null;
}
