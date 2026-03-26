import { parseHTML } from 'linkedom';

const PENDING_ATTR = 'data-nojs-pending';
const STYLE_ATTR = 'data-nojs-pending-css';
const PENDING_CSS = `[${PENDING_ATTR}] { visibility: hidden; }`;

export default {
  name: 'inject-visibility-css',
  description: 'Prevent flash of conditional content by hiding if=/show=/hide= elements until the runtime processes them',

  async process(html) {
    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    const candidates = [...doc.querySelectorAll('[if], [show], [hide]')]
      .filter((el) => !isInsideTemplate(el));

    if (candidates.length === 0) return html;

    for (const el of candidates) {
      el.setAttribute(PENDING_ATTR, '');
    }

    if (!head.querySelector(`[${STYLE_ATTR}]`)) {
      const style = doc.createElement('style');
      style.setAttribute(STYLE_ATTR, '');
      style.textContent = PENDING_CSS;
      head.appendChild(style);
    }

    return doc.toString();
  },
};

function isInsideTemplate(el) {
  return !!el.closest('template');
}
