import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, mkdir, readFile, rm, writeFile } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import plugin from "../src/prebuild/plugins/generate-early-hints.js";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const rmAsync = promisify(rm);
const readFileAsync = promisify(readFile);

describe("generate-early-hints plugin", () => {
	const tmpDir = join(process.cwd(), "tmp-hints-test");

	afterEach(async () => {
		if (existsSync(tmpDir)) {
			await rmAsync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should generate _headers file with preloads", async () => {
		await mkdirAsync(tmpDir, { recursive: true });
		const html = `
			<html>
				<head>
					<link rel="stylesheet" href="/style.css">
					<script src="/app.js"></script>
					<link rel="preload" href="/font.woff2" as="font">
				</head>
				<body></body>
			</html>
		`;
		const indexPath = join(tmpDir, "index.html");
		await writeFileAsync(indexPath, html);

		await plugin.finalize({
			outputDir: tmpDir,
			config: { target: "netlify" },
			processedFiles: [indexPath],
		});

		const headersPath = join(tmpDir, "_headers");
		expect(existsSync(headersPath)).toBe(true);

		const content = await readFileAsync(headersPath, "utf-8");
		expect(content).toContain("/");
		expect(content).toContain("Link: </style.css>; rel=preload; as=style");
		expect(content).toContain("Link: </app.js>; rel=preload; as=script");
		expect(content).toContain("Link: </font.woff2>; rel=preload; as=font");
	});

	it("should handle subdirectories correctly", async () => {
		await mkdirAsync(join(tmpDir, "blog"), { recursive: true });
		const html = `<html><head><script src="/blog.js"></script></head><body></body></html>`;
		const blogPath = join(tmpDir, "blog", "post.html");
		await writeFileAsync(blogPath, html);

		await plugin.finalize({
			outputDir: tmpDir,
			config: { target: "netlify" },
			processedFiles: [blogPath],
		});

		const content = await readFileAsync(join(tmpDir, "_headers"), "utf-8");
		expect(content).toContain("/blog/post.html");
		expect(content).toContain("Link: </blog.js>; rel=preload; as=script");
	});
});
