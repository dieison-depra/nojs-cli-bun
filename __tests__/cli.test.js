import { describe, expect, it, spyOn, beforeEach, afterEach } from "bun:test";
import { run } from "../src/cli.js";
import pkg from "../package.json" with { type: "json" };

describe("nojs CLI", () => {
	let logSpy, errorSpy;

	beforeEach(() => {
		logSpy = spyOn(console, "log").mockImplementation(() => {});
		errorSpy = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	async function runCli(args) {
		const argv = args.trim() ? args.trim().split(/\s+/) : [];
		await run(argv);
		return {
			stdout: logSpy.mock.calls.map(args => args.join(" ")).join("\n"),
			stderr: errorSpy.mock.calls.map(args => args.join(" ")).join("\n"),
		};
	}

	it("shows help with --help", async () => {
		const { stdout } = await runCli("--help");
		expect(stdout).toContain("nojs — Official CLI");
		expect(stdout).toContain("init");
		expect(stdout).toContain("prebuild");
		expect(stdout).toContain("dev");
		expect(stdout).toContain("validate");
		expect(stdout).toContain("plugin");
	});

	it("shows help with no arguments", async () => {
		const { stdout } = await runCli("");
		expect(stdout).toContain("nojs — Official CLI");
	});

	it("shows version with --version", async () => {
		const { stdout } = await runCli("--version");
		expect(stdout.trim()).toBe(pkg.version);
	});

	it("shows error for unknown command", async () => {
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {});
		const { stderr } = await runCli("foobar");
		expect(stderr).toContain("Unknown command");
		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
	});

	// Subcommand help tests rely on the subcommand's run() which might also use console.log
	// Since we are mocking console.log globally in this file, it should work if they use it.

	it("shows subcommand help for init --help", async () => {
		const { stdout } = await runCli("init --help");
		expect(stdout).toContain("nojs init");
		expect(stdout).toContain("wizard");
	});

	it("shows subcommand help for prebuild --help", async () => {
		const { stdout } = await runCli("prebuild --help");
		expect(stdout).toContain("nojs prebuild");
	});

	it("shows subcommand help for dev --help", async () => {
		const { stdout } = await runCli("dev --help");
		expect(stdout).toContain("nojs dev");
	});

	it("shows subcommand help for validate --help", async () => {
		const { stdout } = await runCli("validate --help");
		expect(stdout).toContain("nojs validate");
	});

	it("shows subcommand help for plugin --help", async () => {
		const { stdout } = await runCli("plugin --help");
		expect(stdout).toContain("nojs plugin");
	});

	it("lists prebuild plugins with prebuild --list", async () => {
		const { stdout } = await runCli("prebuild --list");
		expect(stdout).toContain("inject-resource-hints");
		expect(stdout).toContain("inject-head-attrs");
		expect(stdout).toContain("inject-speculation-rules");
		expect(stdout).toContain("inject-og-twitter");
		expect(stdout).toContain("generate-sitemap");
		// check one of our new plugins
		expect(stdout).toContain("generate-import-map");
	});
});
