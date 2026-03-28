import { describe, it, expect } from "bun:test";
import plugin from "../src/prebuild/plugins/inject-i18n-preload.js";

describe("inject-i18n-preload plugin", () => {
	it("should inject preload for non-english lang", async () => {
		const html = '<html lang="pt-BR"><head></head><body></body></html>';
		const result = await plugin.process(html, { config: {} });
		expect(result).toContain('rel="preload"');
		expect(result).toContain('as="fetch"');
		expect(result).toContain('href="/locales/pt-BR.json"');
		expect(result).toContain('crossorigin="anonymous"');
	});

	it("should skip for english lang", async () => {
		const html = '<html lang="en"><head></head><body></body></html>';
		const result = await plugin.process(html, { config: {} });
		expect(result).not.toContain('<link rel="preload"');
	});

	it("should respect custom localesDir", async () => {
		const html = '<html lang="fr"><head></head><body></body></html>';
		const result = await plugin.process(html, { config: { localesDir: "/assets/lang/" } });
		expect(result).toContain('href="/assets/lang/fr.json"');
	});
});
