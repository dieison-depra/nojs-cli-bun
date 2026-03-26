import { describe, expect, it } from "bun:test";
import { validateFiles } from "../src/validate/rules.js";

describe("nojs validate", () => {
	it('detects missing "as" on get directive', () => {
		const issues = validateFiles(
			'<html><body><div get="/api/users"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "fetch-missing-as",
					severity: "error",
				}),
			]),
		);
	});

	it('passes when "as" is present on get', () => {
		const issues = validateFiles(
			'<html><body><div get="/api/users" as="users"></div></body></html>',
			"test.html",
		);
		const fetchIssues = issues.filter((i) => i.rule === "fetch-missing-as");
		expect(fetchIssues).toHaveLength(0);
	});

	it('detects each without "in" keyword', () => {
		const issues = validateFiles(
			'<html><body><div each="items"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ rule: "each-missing-in", severity: "error" }),
			]),
		);
	});

	it('passes when each has "in" keyword', () => {
		const issues = validateFiles(
			'<html><body><div each="item in items"></div></body></html>',
			"test.html",
		);
		const eachIssues = issues.filter((i) => i.rule === "each-missing-in");
		expect(eachIssues).toHaveLength(0);
	});

	it('detects foreach without "from" attribute', () => {
		const issues = validateFiles(
			'<html><body><div foreach="item"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "foreach-missing-from",
					severity: "error",
				}),
			]),
		);
	});

	it("detects model on non-form element", () => {
		const issues = validateFiles(
			'<html><body><div model="name"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "model-non-form-element",
					severity: "warning",
				}),
			]),
		);
	});

	it("passes model on input element", () => {
		const issues = validateFiles(
			'<html><body><input model="name"></body></html>',
			"test.html",
		);
		const modelIssues = issues.filter(
			(i) => i.rule === "model-non-form-element",
		);
		expect(modelIssues).toHaveLength(0);
	});

	it("warns on bind-html usage", () => {
		const issues = validateFiles(
			'<html><body><div bind-html="content"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "bind-html-warning",
					severity: "warning",
				}),
			]),
		);
	});

	it("detects route templates without route-view", () => {
		const issues = validateFiles(
			'<html><body><template route="/"></template></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "route-without-route-view",
					severity: "warning",
				}),
			]),
		);
	});

	it("passes when route-view is present", () => {
		const issues = validateFiles(
			'<html><body><template route="/"></template><main route-view></main></body></html>',
			"test.html",
		);
		const routeIssues = issues.filter(
			(i) => i.rule === "route-without-route-view",
		);
		expect(routeIssues).toHaveLength(0);
	});

	it("detects empty event handler", () => {
		const issues = validateFiles(
			'<html><body><button on:click=""></button></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "event-empty-handler",
					severity: "error",
				}),
			]),
		);
	});

	it("warns on loop without key", () => {
		const issues = validateFiles(
			'<html><body><div each="item in items"></div></body></html>',
			"test.html",
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "loop-missing-key",
					severity: "warning",
				}),
			]),
		);
	});

	it("no issues on valid template", () => {
		const html = `<html><body>
      <div get="/api/users" as="users">
        <div each="user in users" key="user.id">
          <span bind="user.name"></span>
        </div>
      </div>
    </body></html>`;
		const issues = validateFiles(html, "test.html");
		const errors = issues.filter((i) => i.severity === "error");
		expect(errors).toHaveLength(0);
	});
});
