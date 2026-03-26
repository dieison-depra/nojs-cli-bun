export default {
  name: 'minify-html',
  description: 'Collapse whitespace and remove comments from HTML output.',

  async process(html, { config }) {
    const opts = config || {};
    const removeComments = opts.removeComments !== false;  // default true
    const collapseWhitespace = opts.collapseWhitespace !== false;  // default true

    // 1. Preserve verbatim blocks
    const preserved = [];
    const VERBATIM_RE = /<(pre|script|style|textarea)[\s\S]*?<\/\1>/gi;
    let protected_html = html.replace(VERBATIM_RE, (match) => {
      preserved.push(match);
      return `\x00PRESERVED_${preserved.length - 1}\x00`;
    });

    // 2. Remove comments (but not IE conditionals)
    if (removeComments) {
      protected_html = protected_html.replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '');
    }

    // 3. Collapse whitespace between tags
    if (collapseWhitespace) {
      protected_html = protected_html.replace(/>\s+</g, '><');
      protected_html = protected_html.replace(/\s{2,}/g, ' ');
      protected_html = protected_html.trim();
    }

    // 4. Restore
    protected_html = protected_html.replace(/\x00PRESERVED_(\d+)\x00/g, (_, i) => preserved[Number(i)]);

    return protected_html;
  },
};
