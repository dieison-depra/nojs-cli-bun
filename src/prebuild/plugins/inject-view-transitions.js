import { parseHTML } from 'linkedom';

export default {
  name: 'inject-view-transitions',
  description: 'Inject @view-transition CSS to enable smooth same-origin navigations.',

  async process(html, { config }) {
    if (config?.enabled === false) return html;
    const { document: doc } = parseHTML(html);
    if (!doc.head) return html;

    // Idempotence check
    if (doc.head.querySelector('[data-nojs-view-transitions]')) return html;

    const style = doc.createElement('style');
    style.setAttribute('data-nojs-view-transitions', '');
    style.textContent = '@view-transition { navigation: auto; }';
    doc.head.appendChild(style);
    return doc.toString();
  },
};
