import { readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

/** @type {import("../runner.js").Plugin} */
export default {
	name: "generate-bundle-report",
	description:
		"Generate a visual report of the bundle composition and sizes (HTML report)",

	async finalize({ outputDir }) {
		const files = await getFilesRecursively(outputDir);
		const targetFiles = files.filter(
			(f) =>
				f.endsWith(".js") ||
				f.endsWith(".mjs") ||
				f.endsWith(".css") ||
				f.endsWith(".html"),
		);

		const data = [];

		for (const f of targetFiles) {
			const s = await stat(f);
			data.push({
				path: relative(outputDir, f),
				size: s.size,
				type: getFileType(f),
			});
		}

		data.sort((a, b) => b.size - a.size);

		const totalSize = data.reduce((acc, d) => acc + d.size, 0);

		const reportHtml = generateHtml(data, totalSize);
		const reportPath = join(outputDir, "nojs-bundle-report.html");
		await writeFile(reportPath, reportHtml, "utf-8");

		console.log(`[generate-bundle-report] Report generated: ${reportPath}`);
	},
};

async function getFilesRecursively(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((res) => {
			const resPath = join(dir, res.name);
			return res.isDirectory() ? getFilesRecursively(resPath) : resPath;
		}),
	);
	return files.flat();
}

function getFileType(f) {
	if (f.endsWith(".js") || f.endsWith(".mjs")) return "JS";
	if (f.endsWith(".css")) return "CSS";
	if (f.endsWith(".html")) return "HTML";
	return "Other";
}

function formatBytes(bytes) {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function generateHtml(data, totalSize) {
	const rows = data
		.map(
			(d) => `
        <tr>
            <td>${d.path}</td>
            <td><span class="badge ${d.type.toLowerCase()}">${d.type}</span></td>
            <td>${formatBytes(d.size)}</td>
            <td>${((d.size / (totalSize || 1)) * 100).toFixed(2)}%</td>
        </tr>
    `,
		)
		.join("");

	// "Treemap" implementation using CSS flexbox
	const blocks = data
		.filter((d) => d.size > 0)
		.map(
			(d) => `
        <div class="block ${d.type.toLowerCase()}" style="flex-grow: ${d.size}; flex-basis: ${(d.size / (totalSize || 1)) * 100}%;" title="${d.path}: ${formatBytes(d.size)}">
            <span class="label">${d.path.split("/").pop()}</span>
        </div>
    `,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No.JS Bundle Analysis Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; line-height: 1.5; background: #fdfdfd; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-top: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .card { background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .card h2 { margin: 0; font-size: 0.875rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
        .card p { margin: 0.5rem 0 0; font-size: 1.5rem; font-weight: bold; }
        
        .treemap { display: flex; flex-wrap: wrap; gap: 4px; height: 120px; margin-bottom: 2rem; border-radius: 8px; overflow: hidden; background: #eee; }
        .block { display: flex; align-items: center; justify-content: center; overflow: hidden; color: white; padding: 4px; text-align: center; transition: opacity 0.2s; cursor: help; }
        .block:hover { opacity: 0.9; }
        .block.js { background: #f7df1e; color: black; }
        .block.css { background: #264de4; }
        .block.html { background: #e34c26; }
        .block.other { background: #666; }
        .label { font-size: 10px; font-weight: bold; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; padding: 0 4px; }
        
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
        th, td { text-align: left; padding: 1rem; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; font-size: 0.875rem; color: #666; }
        tr:last-child td { border-bottom: none; }
        
        .badge { font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .badge.js { background: #fef9c3; color: #854d0e; }
        .badge.css { background: #dbeafe; color: #1e40af; }
        .badge.html { background: #fee2e2; color: #991b1b; }
        .badge.other { background: #f3f4f6; color: #374151; }
        
        @media (max-width: 600px) {
            body { padding: 1rem; }
            .summary { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <h1>No.JS Bundle Analysis</h1>
    
    <div class="summary">
        <div class="card">
            <h2>Total Size</h2>
            <p>${formatBytes(totalSize)}</p>
        </div>
        <div class="card">
            <h2>Total Files</h2>
            <p>${data.length}</p>
        </div>
    </div>

    <div class="treemap">
        ${blocks}
    </div>

    <table>
        <thead>
            <tr>
                <th>File Path</th>
                <th>Type</th>
                <th>Size</th>
                <th>Proportion</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>`;
}
