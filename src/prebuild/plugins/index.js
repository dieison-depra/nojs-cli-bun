import auditAccessibility from "./audit-accessibility.js";
import auditMetaTags from "./audit-meta-tags.js";
import compileTemplates from "./compile-templates.js";
import enforceScriptLoading from "./enforce-script-loading.js";
import generateDeployConfig from "./generate-deploy-config.js";
import generatePwaManifest from "./generate-pwa-manifest.js";
import generateResponsiveImages from "./generate-responsive-images.js";
import generateSitemap from "./generate-sitemap.js";
import injectCanonicalUrl from "./inject-canonical-url.js";
import injectCspHashes from "./inject-csp-hashes.js";
import injectEventDelegation from "./inject-event-delegation.js";
import injectHeadAttrs from "./inject-head-attrs.js";
import injectJsonld from "./inject-jsonld.js";
import injectModulepreload from "./inject-modulepreload.js";
import injectOgTwitter from "./inject-og-twitter.js";
import injectResourceHints from "./inject-resource-hints.js";
import injectSpeculationRules from "./inject-speculation-rules.js";
import injectSriHashes from "./inject-sri-hashes.js";
import injectTemplateHints from "./inject-template-hints.js";
import injectViewTransitions from "./inject-view-transitions.js";
import injectVisibilityCss from "./inject-visibility-css.js";
import inlineAnimationCss from "./inline-animation-css.js";
import inlineCriticalCss from "./inline-critical-css.js";
import inlineSvg from "./inline-svg.js";
import minifyHtml from "./minify-html.js";
import optimizeFonts from "./optimize-fonts.js";
import optimizeImages from "./optimize-images.js";
import precompressAssets from "./precompress-assets.js";
import purgeUnusedCss from "./purge-unused-css.js";
import treeShakeFramework from "./tree-shake-framework.js";

export const builtinPlugins = {
	[injectResourceHints.name]: injectResourceHints,
	[injectHeadAttrs.name]: injectHeadAttrs,
	[injectSpeculationRules.name]: injectSpeculationRules,
	[injectOgTwitter.name]: injectOgTwitter,
	[generateSitemap.name]: generateSitemap,
	[generateDeployConfig.name]: generateDeployConfig,
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
	[treeShakeFramework.name]: treeShakeFramework,
	[injectEventDelegation.name]: injectEventDelegation,
	[compileTemplates.name]: compileTemplates,
};
