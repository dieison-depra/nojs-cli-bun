import { describe, it, expect } from "bun:test";
import plugin from "../src/prebuild/plugins/compile-templates.js";

describe("compile-templates plugin", () => {
	it("should extract content of [for] into a template", async () => {
		const html = `
			<html>
				<body>
					<ul for="item in items">
						<li>\${item.name}</li>
					</ul>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-template="nt-');
		expect(result).toContain('<template id="nt-');
		expect(result).toContain('<li>${item.name}</li>');
		expect(result).toContain('for="item in items"');
		// The original content should be cleared, check with regex that ignores order
		expect(result).toMatch(/<ul[^>]+data-nojs-template="nt-[a-f0-9]+"[^>]*for="item in items"[^>]*><\/ul>/);
	});

	it("should reuse the same template for identical content", async () => {
		const html = `
			<html>
				<body>
					<ul for="item in items">
						<li>\${item.name}</li>
					</ul>
					<ul for="other in others">
						<li>\${item.name}</li>
					</ul>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		const templateMatches = result.match(/<template id="nt-[a-f0-9]+">/g);
		expect(templateMatches.length).toBe(1);
		
		const dataTemplateMatches = result.match(/data-nojs-template="nt-[a-f0-9]+"/g);
		expect(dataTemplateMatches.length).toBe(2);
		expect(dataTemplateMatches[0]).toBe(dataTemplateMatches[1]);
	});
});
