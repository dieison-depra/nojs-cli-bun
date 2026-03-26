import injectResourceHints from './inject-resource-hints.js';
import injectHeadAttrs from './inject-head-attrs.js';
import injectSpeculationRules from './inject-speculation-rules.js';
import injectOgTwitter from './inject-og-twitter.js';
import generateSitemap from './generate-sitemap.js';
import optimizeImages from './optimize-images.js';
import generateResponsiveImages from './generate-responsive-images.js';

export const builtinPlugins = {
  [injectResourceHints.name]: injectResourceHints,
  [injectHeadAttrs.name]: injectHeadAttrs,
  [injectSpeculationRules.name]: injectSpeculationRules,
  [injectOgTwitter.name]: injectOgTwitter,
  [generateSitemap.name]: generateSitemap,
  [optimizeImages.name]: optimizeImages,
  [generateResponsiveImages.name]: generateResponsiveImages,
};
