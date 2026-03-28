import { describe, it, expect, afterEach } from "bun:test";
import plugin from "../src/prebuild/plugins/differential-serving.js";
import { mkdir, writeFile, rm, existsSync, readFile } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);
const readFileAsync = promisify(readFile);

describe("differential-serving plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-diff-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should transform script tags to module/nomodule", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		const jsContent = "console.log('modern')";
		await writeFileAsync(join(tmpDir, "app.js"), jsContent);
		
		const html = '<html><body><script src="app.js"></script></body></html>';
		const indexPath = join(tmpDir, "index.html");
		await writeFileAsync(indexPath, html);

		await plugin.finalize({
			outputDir: tmpDir,
			processedFiles: [indexPath],
		});

		const updatedHtml = await readFileAsync(indexPath, "utf-8");
		expect(updatedHtml).toContain('type="module"');
		expect(updatedHtml).toContain('nomodule');
		expect(updatedHtml).toContain('src="app.legacy.js"');
		
		expect(existsSync(join(tmpDir, "app.legacy.js"))).toBe(true);
	});
});
