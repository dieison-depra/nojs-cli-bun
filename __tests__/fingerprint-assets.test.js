import { describe, it, expect, afterEach } from "bun:test";
import plugin from "../src/prebuild/plugins/fingerprint-assets.js";
import { mkdir, writeFile, rm, existsSync, readFile, readdir } from "node:fs";
import { promisify } from "node:util";
import { join, basename } from "node:path";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);
const readFileAsync = promisify(readFile);
const readdirAsync = promisify(readdir);

describe("fingerprint-assets plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-fingerprint-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should rename assets with hashes and update HTML", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		
		const jsContent = "console.log('hello')";
		await writeFileAsync(join(tmpDir, "app.js"), jsContent);
		
		const cssContent = "body { color: blue }";
		await writeFileAsync(join(tmpDir, "style.css"), cssContent);
		
		const html = `
			<html>
				<head>
					<link rel="stylesheet" href="/style.css">
					<script src="/app.js"></script>
				</head>
				<body></body>
			</html>
		`;
		const indexPath = join(tmpDir, "index.html");
		await writeFileAsync(indexPath, html);

		await plugin.finalize({
			outputDir: tmpDir,
			processedFiles: [indexPath],
		});

		const files = await readdirAsync(tmpDir);
		const fingerprintedJs = files.find(f => f.startsWith("app.") && f.endsWith(".js"));
		const fingerprintedCss = files.find(f => f.startsWith("style.") && f.endsWith(".css"));

		expect(fingerprintedJs).toBeDefined();
		expect(fingerprintedJs).not.toBe("app.js");
		expect(fingerprintedCss).toBeDefined();
		expect(fingerprintedCss).not.toBe("style.css");

		const updatedHtml = await readFileAsync(indexPath, "utf-8");
		expect(updatedHtml).toContain(fingerprintedJs);
		expect(updatedHtml).toContain(fingerprintedCss);
	});
});
