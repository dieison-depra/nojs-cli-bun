import { describe, it, expect } from "bun:test";
import plugin from "../src/prebuild/plugins/hoist-static-content.js";

describe("hoist-static-content plugin", () => {
	it("should mark static sub-trees with data-nojs-static", async () => {
		const html = `
			<html>
				<body>
					<div for="item in items">
						<div class="static-content">
							<p>This is static</p>
						</div>
						<p>This is dynamic: \${item.name}</p>
					</div>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-static=""');
		// Use regex for flexible attribute order
		expect(result).toMatch(/<div[^>]+data-nojs-static=""[^>]*class="static-content"/);
		// The dynamic p should NOT be marked static
		expect(result).not.toMatch(/<p[^>]+data-nojs-static=""[^>]*>This is dynamic/);
	});

	it("should mark children if the whole body is static", async () => {
		const html = `
			<html>
				<body>
					<div class="static-1">
						<p>Static</p>
					</div>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-static=""');
		expect(result).toMatch(/<div[^>]+data-nojs-static=""[^>]*class="static-1"/);
	});

	it("should detect dynamic attributes", async () => {
		const html = `
			<html>
				<body>
					<div>
						<button on:click="do()">Click</button>
						<div class="real-static">
							<p>Static</p>
						</div>
					</div>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toMatch(/<div[^>]+data-nojs-static=""[^>]*class="real-static"/);
		expect(result).not.toMatch(/<button[^>]+data-nojs-static=""[^>]*on:click="do\(\)"/);
	});
});
