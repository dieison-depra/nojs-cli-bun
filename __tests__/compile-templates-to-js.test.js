import { describe, it, expect, afterEach } from "bun:test";
import plugin from "../src/prebuild/plugins/compile-templates-to-js.js";
import { mkdir, writeFile, rm, existsSync, readFile } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);
const readFileAsync = promisify(readFile);

describe("compile-templates-to-js plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-compile-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should extract templates and generate JS chunks", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		
		const html = '<html><body><template route="/home"><h1>Home</h1></template></body></html>';
		const result = await plugin.process(html, { filePath: "index.html" });
		
		expect(result).toContain('data-nojs-compiled="/home"');
		expect(result).not.toContain('<h1>Home</h1>');

		await plugin.finalize({ outputDir: tmpDir });

		const tplPath = join(tmpDir, "tpl-_home.js");
		expect(existsSync(tplPath)).toBe(true);

		const tplContent = await readFileAsync(tplPath, "utf-8");
		expect(tplContent).toContain("document.createElement('template')");
		expect(tplContent).toContain("<h1>Home</h1>");

		const manifestPath = join(tmpDir, "routes-manifest.js");
		expect(existsSync(manifestPath)).toBe(true);
		
		const manifestContent = await readFileAsync(manifestPath, "utf-8");
		expect(manifestContent).toContain('"/home": "./tpl-_home.js"');
	});
});
