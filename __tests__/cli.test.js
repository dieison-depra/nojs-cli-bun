import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";

const BIN = resolve(import.meta.dirname, "..", "bin", "nojs.js");

function run(args) {
	const argv = args.trim() ? args.trim().split(/\s+/) : [];
	const result = Bun.spawnSync(["bun", BIN, ...argv], { stderr: "pipe" });
	return {
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
		exitCode: result.exitCode,
	};
}

describe("nojs CLI", () => {
	it("shows help with --help", () => {
		const { stdout } = run("--help");
		expect(stdout).toContain("nojs — Official CLI");
		expect(stdout).toContain("init");
		expect(stdout).toContain("prebuild");
		expect(stdout).toContain("dev");
		expect(stdout).toContain("validate");
		expect(stdout).toContain("plugin");
	});

	it("shows help with no arguments", () => {
		const { stdout } = run("");
		expect(stdout).toContain("nojs — Official CLI");
	});

	it("shows version with --version", () => {
		const { stdout } = run("--version");
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("shows error for unknown command", () => {
		const { stderr, exitCode } = run("foobar");
		expect(stderr).toContain("Unknown command");
		expect(exitCode).not.toBe(0);
	});

	it("shows subcommand help for init --help", () => {
		const { stdout } = run("init --help");
		expect(stdout).toContain("nojs init");
		expect(stdout).toContain("wizard");
	});

	it("shows subcommand help for prebuild --help", () => {
		const { stdout } = run("prebuild --help");
		expect(stdout).toContain("nojs prebuild");
	});

	it("shows subcommand help for dev --help", () => {
		const { stdout } = run("dev --help");
		expect(stdout).toContain("nojs dev");
	});

	it("shows subcommand help for validate --help", () => {
		const { stdout } = run("validate --help");
		expect(stdout).toContain("nojs validate");
	});

	it("shows subcommand help for plugin --help", () => {
		const { stdout } = run("plugin --help");
		expect(stdout).toContain("nojs plugin");
	});

	it("lists prebuild plugins with prebuild --list", () => {
		const { stdout } = run("prebuild --list");
		expect(stdout).toContain("inject-resource-hints");
		expect(stdout).toContain("inject-head-attrs");
		expect(stdout).toContain("inject-speculation-rules");
		expect(stdout).toContain("inject-og-twitter");
		expect(stdout).toContain("generate-sitemap");
		expect(stdout).toContain("optimize-images");
	});
});
