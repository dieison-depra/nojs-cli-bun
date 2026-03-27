import { describe, it, expect, beforeEach } from "bun:test";
import plugin from "../src/prebuild/plugins/normalize-directives.js";

describe("normalize-directives plugin", () => {
	beforeEach(() => {
		// Reset internal state before each test
		plugin._reset();
	});

	it("should normalize state paths in attributes", async () => {
		const html = `
			<html>
				<body>
					<p bind-text="state.user.name"></p>
					<button on:click="state.count++">Add</button>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('bind-text="s[0]"');
		expect(result).toContain('on:click="s[1]++"');
	});

	it("should normalize state paths in interpolations", async () => {
		const html = `
			<html>
				<body>
					<p>Hello \${state.user.name}, you have \${state.user.messages.length} messages.</p>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('Hello ${s[0]}, you have ${s[1]} messages.');
	});

	it("should reuse indices for same state paths", async () => {
		const html = `
			<html>
				<body>
					<p bind-text="state.user.name"></p>
					<span bind-text="state.user.name"></span>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		const matches = result.match(/s\[0\]/g);
		expect(matches.length).toBe(2);
	});

	it("should handle complex expressions", async () => {
		const html = `
			<html>
				<body>
					<div if="state.show && state.user.id === 1"></div>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('if="s[0] && s[1] === 1"');
	});
});
