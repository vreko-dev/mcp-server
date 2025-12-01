import { describe, expect, it } from "vitest";
import { DangerousAPIPlugin } from "../../src/plugins/dangerous-api";

describe("PL1-B: Dangerous API plugin", () => {
	it("pl1-b-001: should detect eval() usage", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			const userInput = "alert('test')";
			eval(userInput);
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("eval() usage detected"))).toBe(true);
		expect(result.recommendations).toContain("Avoid using dangerous APIs that can execute arbitrary code");
	});

	it("pl1-b-002: should detect Function constructor usage", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			const userInput = "alert('test')";
			new Function(userInput)();
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("Function constructor usage detected"))).toBe(true);
	});

	it("pl1-b-003: should detect child_process.exec() usage", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			const { exec } = require('child_process');
			exec('ls -la', (error, stdout, stderr) => {
				console.log(stdout);
			});
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("child_process.exec() usage detected"))).toBe(true);
	});

	it("pl1-b-004: should ignore comments", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			// This is a comment with eval() that should be ignored
			/*
			 * Another comment with Function(userInput)
			 */
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.severity).toBe("low");
	});

	it("pl1-b-005: should respect changedLines metadata for diff-aware analysis", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			const safeCode = "console.log('hello');"; // This line is not changed
			const userInput = "alert('test')"; // This line is not changed
			eval(userInput); // This line is changed
			const moreSafeCode = "console.log('world');"; // This line is not changed
		`;

		// Only analyze line 4 (1-indexed)
		const metadata = {
			changedLines: [4],
		};

		const result = await plugin.analyze(testContent, "test.js", metadata);

		// Should only detect the dangerous API on the changed line
		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("eval() usage detected"))).toBe(true);
	});

	it("pl1-b-006: should not flag safe code samples", async () => {
		const plugin = new DangerousAPIPlugin();

		const testContent = `
			const x = 1;
			const y = 2;
			const sum = x + y;
			console.log('The sum is:', sum);
			
			function calculateArea(width, height) {
				return width * height;
			}
			
			const area = calculateArea(10, 20);
			console.log('The area is:', area);
		`;

		const result = await plugin.analyze(testContent);

		// Safe code should not be flagged
		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.severity).toBe("low");
	});
});
