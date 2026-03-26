import { discoverFiles, readHtml } from "../prebuild/html.js";
import { validateFiles } from "../validate/rules.js";

const HELP = `
nojs validate — Validate No.JS templates for common mistakes

Usage:
  nojs validate [options] [glob]

Arguments:
  glob                HTML files to validate (default: "**/*.html")

Options:
  --fix               Auto-fix safe issues (e.g., add missing key on loops)
  --format <format>   Output format: "pretty" or "json" (default: "pretty")
  -h, --help          Show this help

Examples:
  nojs validate
  nojs validate "pages/**/*.html"
  nojs validate --format json
`;

export async function run(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(HELP.trim());
		return;
	}

	const args = parseArgs(argv);
	const files = await discoverFiles(args.glob);

	if (files.length === 0) {
		console.log("No HTML files found.");
		return;
	}

	let totalErrors = 0;
	let totalWarnings = 0;
	const allResults = [];

	for (const filePath of files) {
		const html = await readHtml(filePath);
		const issues = validateFiles(html, filePath);

		if (issues.length > 0) {
			allResults.push({ filePath, issues });
			for (const issue of issues) {
				if (issue.severity === "error") totalErrors++;
				else totalWarnings++;
			}
		}
	}

	if (args.format === "json") {
		console.log(JSON.stringify(allResults, null, 2));
	} else {
		if (allResults.length === 0) {
			console.log(`Validated ${files.length} file(s). No issues found.`);
		} else {
			for (const { filePath, issues } of allResults) {
				console.log(`\n${filePath}`);
				for (const issue of issues) {
					const icon = issue.severity === "error" ? "x" : "!";
					console.log(`  ${icon} ${issue.message} [${issue.rule}]`);
				}
			}
			console.log(
				`\n${totalErrors} error(s), ${totalWarnings} warning(s) in ${allResults.length} file(s)`,
			);
		}
	}

	if (totalErrors > 0) process.exit(1);
}

function parseArgs(argv) {
	const args = { glob: "**/*.html", format: "pretty", fix: false };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--format") args.format = argv[++i];
		else if (arg === "--fix") args.fix = true;
		else if (!arg.startsWith("-")) args.glob = arg;
		else
			throw new Error(
				`Unknown option: ${arg}. Run "nojs validate --help" for usage.`,
			);
	}

	return args;
}
