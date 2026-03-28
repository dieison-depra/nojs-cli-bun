import { describe, it, expect, afterEach } from "bun:test";
import plugin from "../src/prebuild/plugins/generate-service-worker.js";
import { mkdir, writeFile, rm, existsSync, readFile } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);
const readFileAsync = promisify(readFile);

describe("generate-service-worker plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-sw-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should inject registration script in HTML", async () => {
		const html = "<html><body></body></html>";
		const result = await plugin.process(html);
		expect(result).toContain('navigator.serviceWorker.register(\'/sw.js\')');
		expect(result).toContain('data-nojs="sw-register"');
	});

	it("should generate sw.js with asset list", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		await writeFileAsync(join(tmpDir, "index.html"), "<html></html>");
		await writeFileAsync(join(tmpDir, "app.js"), "console.log(1)");

		await plugin.finalize({
			outputDir: tmpDir,
			config: {},
		});

		const swPath = join(tmpDir, "sw.js");
		expect(existsSync(swPath)).toBe(true);

		const content = await readFileAsync(swPath, "utf-8");
		expect(content).toContain('"/index.html"');
		expect(content).toContain('"/app.js"');
		expect(content).toContain('caches.open');
	});
});
