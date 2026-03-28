import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, mkdir, rm, writeFile } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import plugin from "../src/prebuild/plugins/generate-bundle-report.js";

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
