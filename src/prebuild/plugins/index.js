import injectResourceHints from './inject-resource-hints.js';
import injectHeadAttrs from './inject-head-attrs.js';
import injectSpeculationRules from './inject-speculation-rules.js';
import injectOgTwitter from './inject-og-twitter.js';
import generateSitemap from './generate-sitemap.js';
import optimizeImages from './optimize-images.js';
import inlineAnimationCss from './inline-animation-css.js';
import injectVisibilityCss from './inject-visibility-css.js';
import injectTemplateHints from './inject-template-hints.js';

export const builtinPlugins = {
  [injectResourceHints.name]: injectResourceHints,
  [injectHeadAttrs.name]: injectHeadAttrs,
  [injectSpeculationRules.name]: injectSpeculationRules,
  [injectOgTwitter.name]: injectOgTwitter,
  [generateSitemap.name]: generateSitemap,
  [optimizeImages.name]: optimizeImages,
  [inlineAnimationCss.name]: inlineAnimationCss,
  [injectVisibilityCss.name]: injectVisibilityCss,
  [injectTemplateHints.name]: injectTemplateHints,
};
