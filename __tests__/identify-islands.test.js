import { describe, expect, it } from "bun:test";
import plugin from "../src/prebuild/plugins/identify-islands.js";

describe("identify-islands plugin", () => {
	it("should mark elements with directives as islands", async () => {
		const html =
			'<html><body><div>Static</div><div on:click="count++">Dynamic</div></body></html>';
		const result = await plugin.process(html);

		expect(result).toContain('data-nojs-island="island-');
		expect(result).toContain("Static");
		expect(result).toContain("Dynamic");
		expect(result).toContain("window.NoJS_Config.islands");
		expect(result).toContain("window.NoJS_Config.autoStart = false;");
	});

	it("should not mark elements without directives", async () => {
		const html = "<html><body><div>Static</div></body></html>";
		const result = await plugin.process(html);

		expect(result).not.toContain("data-nojs-island=");
		expect(result).not.toContain("window.NoJS_Config.islands");
	});

	it("should recognize multiple islands", async () => {
		const html =
			'<html><body><div state="{x:1}"></div><div bind="y"></div></body></html>';
		const result = await plugin.process(html);

		// Count occurrences in element tags, not in the script JSON
		const matches = result.match(/<div[^>]+data-nojs-island/g);
		expect(matches.length).toBe(2);
	});
});
