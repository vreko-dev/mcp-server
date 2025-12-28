/**
 * ConsoleLogRule Tests
 *
 * Tests for advisory rule that detects console.log in production code.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Generates suggestions when console.log detected
 * - Sad: No suggestions when no console statements
 * - Edge: Multiple console types, different file patterns
 * - Error: Handles edge cases gracefully
 */

import { describe, expect, it } from "vitest";
import { ConsoleLogRule } from "../../../src/advisory/rules/ConsoleLogRule";
import type { AdvisoryTriggerContext } from "../../../src/types/advisory";

type TestContext = AdvisoryTriggerContext & { code?: string };

function createBaseContext(files: string[], code?: string): TestContext {
	return {
		files,
		session: {
			riskLevel: "low",
			toolCallCount: 1,
			filesModified: 1,
			loopsDetected: 0,
			consecutiveFileModifications: new Map(),
		},
		fragility: new Map(),
		recentViolations: [],
		...(code && { code }),
	};
}

describe("ConsoleLogRule", () => {
	// ============================================================================
	// RULE METADATA
	// ============================================================================

	describe("Rule Metadata", () => {
		it("should have correct id", () => {
			expect(ConsoleLogRule.id).toBe("console-log-in-production");
		});

		it("should have priority of 3", () => {
			expect(ConsoleLogRule.priority).toBe(3);
		});
	});

	// ============================================================================
	// TRIGGER
	// ============================================================================

	describe("Trigger", () => {
		it("should trigger for .ts files", () => {
			const context = createBaseContext(["src/auth.ts"]);
			expect(ConsoleLogRule.trigger(context)).toBe(true);
		});

		it("should trigger for .tsx files", () => {
			const context = createBaseContext(["src/Component.tsx"]);
			expect(ConsoleLogRule.trigger(context)).toBe(true);
		});

		it("should trigger for .js files", () => {
			const context = createBaseContext(["src/utils.js"]);
			expect(ConsoleLogRule.trigger(context)).toBe(true);
		});

		it("should trigger for .jsx files", () => {
			const context = createBaseContext(["src/Component.jsx"]);
			expect(ConsoleLogRule.trigger(context)).toBe(true);
		});

		it("should NOT trigger for test files", () => {
			const context = createBaseContext(["auth.test.ts", "utils.spec.js"]);
			expect(ConsoleLogRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for __tests__ directory", () => {
			const context = createBaseContext(["src/__tests__/auth.ts"]);
			expect(ConsoleLogRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for config files", () => {
			const context = createBaseContext(["vite.config.ts", "vitest.config.js"]);
			expect(ConsoleLogRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for non-JS/TS files", () => {
			const context = createBaseContext(["styles.css", "data.json"]);
			expect(ConsoleLogRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for empty files array", () => {
			const context = createBaseContext([]);
			expect(ConsoleLogRule.trigger(context)).toBe(false);
		});
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should generate suggestion when console.log detected", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function login() {
					console.log("User logged in");
					return true;
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toBeDefined();
			expect(result.suggestions?.length).toBeGreaterThan(0);
			expect(result.suggestions?.[0].category).toBe("validation");
			expect(result.suggestions?.[0].text).toContain("console.log");
		});

		it("should detect console.debug", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function debug() {
					console.debug("Debug info");
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should detect console.info", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function info() {
					console.info("Info message");
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should include file reference in suggestion", () => {
			const context = createBaseContext(["src/auth.ts"], `console.log("test");`);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.[0].files).toContain("src/auth.ts");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty suggestions when no console statements", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function login() {
					return true;
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should NOT detect console.error (intentional)", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function handleError() {
					console.error("Error occurred");
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should NOT detect console.warn (intentional)", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function handleWarning() {
					console.warn("Warning");
				}`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should return empty suggestions when no code provided", () => {
			const context = createBaseContext(["src/auth.ts"]);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should ignore console.log in comments", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`// console.log("commented out");
				/* console.log("also commented"); */
				function clean() { return true; }`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should handle multiple console statements", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`console.log("one");
				console.log("two");
				console.debug("three");
				console.info("four");`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.[0].text).toContain("4");
		});

		it("should set higher priority for many console statements", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`console.log("1");
				console.log("2");
				console.log("3");
				console.log("4");
				console.log("5");`,
			);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(2); // Higher priority
		});

		it("should set lower priority for few console statements", () => {
			const context = createBaseContext(["src/auth.ts"], `console.log("just one");`);

			const result = ConsoleLogRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(3); // Lower priority
		});
	});
});
