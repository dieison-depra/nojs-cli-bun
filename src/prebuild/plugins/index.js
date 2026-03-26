import injectResourceHints from './inject-resource-hints.js';
import injectHeadAttrs from './inject-head-attrs.js';
import injectSpeculationRules from './inject-speculation-rules.js';
import injectOgTwitter from './inject-og-twitter.js';
import generateSitemap from './generate-sitemap.js';
import optimizeImages from './optimize-images.js';
import injectCspHashes from './inject-csp-hashes.js';

export const builtinPlugins = {
  [injectResourceHints.name]: injectResourceHints,
  [injectHeadAttrs.name]: injectHeadAttrs,
  [injectSpeculationRules.name]: injectSpeculationRules,
  [injectOgTwitter.name]: injectOgTwitter,
  [generateSitemap.name]: generateSitemap,
  [optimizeImages.name]: optimizeImages,
  [injectCspHashes.name]: injectCspHashes,
};
