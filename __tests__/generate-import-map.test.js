import { describe, expect, it } from "bun:test";
import plugin from "../src/prebuild/plugins/generate-import-map.js";

describe("generate-import-map plugin", () => {
	it("should inject default import map if none exists", async () => {
		const html = "<html><head></head><body></body></html>";
		const config = {};
		const result = await plugin.process(html, { config });

		expect(result).toContain('<script type="importmap">');
		expect(result).toContain('"nojs": "/nojs.bundle.js"');
	});

	it("should merge custom imports from config", async () => {
		const html = "<html><head></head><body></body></html>";
		const config = {
			importMap: {
				imports: {
					"my-lib": "/libs/my-lib.js",
				},
			},
		};
		const result = await plugin.process(html, { config });

		expect(result).toContain('"nojs": "/nojs.bundle.js"');
		expect(result).toContain('"my-lib": "/libs/my-lib.js"');
	});

	it("should allow overriding default nojs mapping", async () => {
		const html = "<html><head></head><body></body></html>";
		const config = {
			importMap: {
				imports: {
					nojs: "https://cdn.example.com/nojs.js",
				},
			},
		};
		const result = await plugin.process(html, { config });

		expect(result).toContain('"nojs": "https://cdn.example.com/nojs.js"');
		expect(result).not.toContain('"/nojs.bundle.js"');
	});

	it("should skip if importmap already exists", async () => {
		const html = `
			<html>
				<head>
					<script type="importmap">{"imports": {}}</script>
				</head>
				<body></body>
			</html>
		`;
		const config = {};
		const result = await plugin.process(html, { config });

		// Should be exactly the same (except maybe whitespace from linkedom, but here it shouldn't add new one)
		expect(result).not.toContain('"/nojs.bundle.js"');
	});

	it("should inject before first module script", async () => {
		const html = `
			<html>
				<head>
					<script type="module" src="/app.js"></script>
				</head>
				<body></body>
			</html>
		`;
		const config = {};
		const result = await plugin.process(html, { config });

		const importMapIndex = result.indexOf('type="importmap"');
		const moduleIndex = result.indexOf('type="module"');
		expect(importMapIndex).toBeLessThan(moduleIndex);
	});
});
