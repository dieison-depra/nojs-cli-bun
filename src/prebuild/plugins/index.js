import injectResourceHints from './inject-resource-hints.js';
import injectHeadAttrs from './inject-head-attrs.js';
import injectSpeculationRules from './inject-speculation-rules.js';
import injectOgTwitter from './inject-og-twitter.js';
import generateSitemap from './generate-sitemap.js';
import optimizeImages from './optimize-images.js';
import inlineAnimationCss from './inline-animation-css.js';
import injectVisibilityCss from './inject-visibility-css.js';
import injectTemplateHints from './inject-template-hints.js';
import minifyHtml from './minify-html.js';
import injectViewTransitions from './inject-view-transitions.js';
import injectModulepreload from './inject-modulepreload.js';
import auditMetaTags from './audit-meta-tags.js';
import injectCanonicalUrl from './inject-canonical-url.js';
import enforceScriptLoading from './enforce-script-loading.js';
import injectCspHashes from './inject-csp-hashes.js';
import injectSriHashes from './inject-sri-hashes.js';
import precompressAssets from './precompress-assets.js';
import injectJsonld from './inject-jsonld.js';
import inlineCriticalCss from './inline-critical-css.js';
import optimizeFonts from './optimize-fonts.js';
import generateResponsiveImages from './generate-responsive-images.js';
import generatePwaManifest from './generate-pwa-manifest.js';
import purgeUnusedCss from './purge-unused-css.js';
import auditAccessibility from './audit-accessibility.js';
import inlineSvg from './inline-svg.js';

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
  [minifyHtml.name]: minifyHtml,
  [injectViewTransitions.name]: injectViewTransitions,
  [injectModulepreload.name]: injectModulepreload,
  [auditMetaTags.name]: auditMetaTags,
  [injectCanonicalUrl.name]: injectCanonicalUrl,
  [enforceScriptLoading.name]: enforceScriptLoading,
  [injectCspHashes.name]: injectCspHashes,
  [injectSriHashes.name]: injectSriHashes,
  [precompressAssets.name]: precompressAssets,
  [injectJsonld.name]: injectJsonld,
  [inlineCriticalCss.name]: inlineCriticalCss,
  [optimizeFonts.name]: optimizeFonts,
  [generateResponsiveImages.name]: generateResponsiveImages,
  [generatePwaManifest.name]: generatePwaManifest,
  [purgeUnusedCss.name]: purgeUnusedCss,
  [auditAccessibility.name]: auditAccessibility,
  [inlineSvg.name]: inlineSvg,
};
