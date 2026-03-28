import { describe, expect, it } from "bun:test";
import plugin from "../src/prebuild/plugins/inject-event-delegation.js";

describe("inject-event-delegation plugin", () => {
	it("should transform on:click into data-nojs-event and data-nojs-on-click", async () => {
		const html = `
			<html>
				<head></head>
				<body>
					<button on:click="count++">Click me</button>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-event="click"');
		expect(result).toContain('data-nojs-on-click="count++"');
		expect(result).not.toContain('on:click="count++"');
		expect(result).toContain("data-nojs-delegation");
		expect(result).toContain("document.addEventListener");
	});

	it("should handle multiple events on the same element", async () => {
		const html = `
			<html>
				<head></head>
				<body>
					<input on:input="update()" on:change="save()">
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-event="input,change"');
		expect(result).toContain('data-nojs-on-input="update()"');
		expect(result).toContain('data-nojs-on-change="save()"');
	});

	it("should support on- prefix as well", async () => {
		const html = `
			<html>
				<head></head>
				<body>
					<button on-click="count++">Click me</button>
				</body>
			</html>
		`;

		const result = await plugin.process(html);
		expect(result).toContain('data-nojs-event="click"');
		expect(result).toContain('data-nojs-on-click="count++"');
	});

	it("should only delegate events specified in config", async () => {
		const html = `
			<html>
				<head></head>
				<body>
					<button on:click="count++" on:mouseover="hover()">Click me</button>
				</body>
			</html>
		`;

		const result = await plugin.process(html, {
			config: { events: ["click"] },
		});
		expect(result).toContain('data-nojs-event="click"');
		expect(result).toContain('data-nojs-on-click="count++"');
		expect(result).toContain('on:mouseover="hover()"');
		expect(result).not.toContain("data-nojs-on-mouseover");
	});
});
