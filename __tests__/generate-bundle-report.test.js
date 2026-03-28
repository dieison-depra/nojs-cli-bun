import { describe, it, expect, afterEach } from "bun:test";
import plugin from "../src/prebuild/plugins/generate-bundle-report.js";
import { mkdir, writeFile, rm, existsSync } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);

describe("generate-bundle-report plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-report-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should generate a report file in outputDir", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		await writeFileAsync(join(tmpDir, "test.js"), "console.log('test')");
		await writeFileAsync(join(tmpDir, "style.css"), "body { color: red }");
		await writeFileAsync(join(tmpDir, "index.html"), "<html></html>");

		await plugin.finalize({ outputDir: tmpDir });

		const reportPath = join(tmpDir, "nojs-bundle-report.html");
		expect(existsSync(reportPath)).toBe(true);
	});
});
