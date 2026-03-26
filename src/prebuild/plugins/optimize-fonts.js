import { parseHTML } from 'linkedom';

const GFONTS_API = 'https://fonts.googleapis.com';
const GFONTS_STATIC = 'https://fonts.gstatic.com';

export default {
  name: 'optimize-fonts',
  description: 'Add preconnect for Google Fonts and inject font-display:swap.',

  async process(html) {
    const { document: doc } = parseHTML(html);
    const head = doc.head;
    if (!head) return html;

    let hasGoogleFonts = false;
    let changed = false;

    // Check <link href="https://fonts.googleapis.com/...">
    for (const link of head.querySelectorAll('link[href]')) {
      const href = link.getAttribute('href') || '';
      if (!href.includes('fonts.googleapis.com')) continue;
      hasGoogleFonts = true;

      // Inject display=swap if missing
      if (!href.includes('display=')) {
        const sep = href.includes('?') ? '&' : '?';
        link.setAttribute('href', href + sep + 'display=swap');
        changed = true;
      }
    }

    // Check @import in <style> tags
    for (const style of head.querySelectorAll('style')) {
      const text = style.textContent || '';
      if (text.includes('fonts.googleapis.com')) {
        hasGoogleFonts = true;
        // Inject display=swap in @import URL if missing
        if (!text.includes('display=')) {
          style.textContent = text.replace(
            /(fonts\.googleapis\.com\/css[^'")]*)/g,
            (match) => match.includes('?') ? match + '&display=swap' : match + '?display=swap'
          );
          changed = true;
        }
      }
    }

    if (!hasGoogleFonts) return html;

    // Inject preconnect hints
    const existingPreconnects = new Set(
      [...head.querySelectorAll('link[rel="preconnect"]')].map(el => el.getAttribute('href'))
    );

    for (const origin of [GFONTS_API, GFONTS_STATIC]) {
      if (!existingPreconnects.has(origin)) {
        const link = doc.createElement('link');
        link.setAttribute('rel', 'preconnect');
        link.setAttribute('href', origin);
        link.setAttribute('crossorigin', '');
        head.insertBefore(link, head.firstChild);
        changed = true;
      }
    }

    return changed ? doc.toString() : html;
  },
};
