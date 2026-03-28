import auditAccessibility from "./audit-accessibility.js";
import auditMetaTags from "./audit-meta-tags.js";
import compileTemplates from "./compile-templates.js";
import differentialServing from "./differential-serving.js";
import enforceScriptLoading from "./enforce-script-loading.js";
import fingerprintAssets from "./fingerprint-assets.js";
import generateBundleReport from "./generate-bundle-report.js";
import generateDeployConfig from "./generate-deploy-config.js";
import generateEarlyHints from "./generate-early-hints.js";
import generateImportMap from "./generate-import-map.js";
import generatePwaManifest from "./generate-pwa-manifest.js";
import generateResponsiveImages from "./generate-responsive-images.js";
import generateSitemap from "./generate-sitemap.js";
import generateServiceWorker from "./generate-service-worker.js";
import hoistStaticContent from "./hoist-static-content.js";
import injectCanonicalUrl from "./inject-canonical-url.js";
import injectCspHashes from "./inject-csp-hashes.js";
import injectEventDelegation from "./inject-event-delegation.js";
import injectHeadAttrs from "./inject-head-attrs.js";
import injectI18nPreload from "./inject-i18n-preload.js";
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
import normalizeDirectives from "./normalize-directives.js";
import optimizeFonts from "./optimize-fonts.js";
import optimizeImages from "./optimize-images.js";
import precompressAssets from "./precompress-assets.js";
import purgeUnusedCss from "./purge-unused-css.js";
import treeShakeFramework from "./tree-shake-framework.js";

export const builtinPlugins = {
	[injectResourceHints.name]: injectResourceHints,
	[injectHeadAttrs.name]: injectHeadAttrs,
	[injectI18nPreload.name]: injectI18nPreload,
	[injectSpeculationRules.name]: injectSpeculationRules,
	[injectOgTwitter.name]: injectOgTwitter,
	[generateSitemap.name]: generateSitemap,
	[generateServiceWorker.name]: generateServiceWorker,
	[generateBundleReport.name]: generateBundleReport,
	[generateEarlyHints.name]: generateEarlyHints,
	[generateImportMap.name]: generateImportMap,
	[generateDeployConfig.name]: generateDeployConfig,
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
	[differentialServing.name]: differentialServing,
	[hoistStaticContent.name]: hoistStaticContent,
	[normalizeDirectives.name]: normalizeDirectives,
	[optimizeImages.name]: optimizeImages,
	[fingerprintAssets.name]: fingerprintAssets,
};
