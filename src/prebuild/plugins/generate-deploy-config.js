import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";

// Matches useHash: true inside any inline <script> block.
const USEHASH_RE = /useHash\s*:\s*true/;

export default {
	name: "generate-deploy-config",
	description:
		"Generate SPA fallback deployment configs for Netlify, Vercel, Apache, or nginx",

	async process(html, { filePath }) {
		if (this._useHashDetected) return html;

		const { document: doc } = parseHTML(html);
		for (const script of doc.querySelectorAll("script:not([src])")) {
			if (USEHASH_RE.test(script.textContent || "")) {
				this._useHashDetected = true;
				console.warn(
					`[generate-deploy-config] warn: useHash: true detected in ${filePath} — ` +
						"SPA fallback configs are ineffective in hash mode",
				);
				break;
			}
		}

		return html;
	},

	async finalize({ outputDir, config }) {
		const useHashDetected = !!this._useHashDetected;
		this._useHashDetected = false;

		const targets = Array.isArray(config.targets)
			? config.targets
			: ["netlify"];
		const base =
			typeof config.base === "string"
				? config.base.replace(/\/+$/, "") || "/"
				: "/";

		for (const target of targets) {
			switch (target) {
				case "netlify":
					await writeNetlify(outputDir, base, useHashDetected);
					break;
				case "vercel":
					await writeVercel(outputDir, base, useHashDetected);
					break;
				case "apache":
					await writeApache(outputDir, base, useHashDetected);
					break;
				case "nginx":
					await writeNginx(outputDir, base, useHashDetected);
					break;
				default:
					console.warn(
						`[generate-deploy-config] unknown target "${target}" — skipped`,
					);
			}
		}
	},
};

async function writeNetlify(outputDir, base, useHashDetected) {
	const prefix = base === "/" ? "" : base;
	const content = `${prefix}/* ${prefix}/index.html 200\n`;
	const dest = join(outputDir, "_redirects");
	await writeFile(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected — may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Netlify SPA fallback written${note}`,
	);
}

async function writeVercel(outputDir, base, useHashDetected) {
	const source = base === "/" ? "/(.*)" : `${base}/(.*)`;
	const destination = base === "/" ? "/index.html" : `${base}/index.html`;
	const content = `${JSON.stringify({ rewrites: [{ source, destination }] }, null, 2)}\n`;
	const dest = join(outputDir, "vercel.json");
	await writeFile(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected — may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Vercel SPA fallback written${note}`,
	);
}

async function writeApache(outputDir, base, useHashDetected) {
	const rewriteBase = base === "/" ? "/" : `${base}/`;
	const content = [
		"<IfModule mod_rewrite.c>",
		"  RewriteEngine On",
		`  RewriteBase ${rewriteBase}`,
		"  RewriteRule ^index\\.html$ - [L]",
		"  RewriteCond %{REQUEST_FILENAME} !-f",
		"  RewriteCond %{REQUEST_FILENAME} !-d",
		"  RewriteRule . /index.html [L]",
		"</IfModule>",
		"",
	].join("\n");
	const dest = join(outputDir, ".htaccess");
	await writeFile(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected — may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: Apache SPA fallback written${note}`,
	);
}

async function writeNginx(outputDir, base, useHashDetected) {
	const location = base === "/" ? "/" : `${base}/`;
	const fallback = base === "/" ? "/index.html" : `${base}/index.html`;
	const content = [
		`location ${location} {`,
		`  try_files $uri $uri/ ${fallback};`,
		"}",
		"",
	].join("\n");
	const dest = join(outputDir, "nginx.conf");
	await writeFile(dest, content, "utf-8");
	const note = useHashDetected
		? " (note: useHash mode detected — may not be needed)"
		: "";
	console.log(
		`[generate-deploy-config] ${dest}: nginx SPA fallback written${note}`,
	);
}
