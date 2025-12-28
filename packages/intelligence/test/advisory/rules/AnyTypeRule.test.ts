/**
 * AnyTypeRule Tests
 *
 * Tests for advisory rule that detects explicit any type usage.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Generates suggestions when any types detected
 * - Sad: No suggestions when no any types
 * - Edge: Various any patterns, different file types
 * - Error: Handles edge cases gracefully
 */

import { describe, expect, it } from "vitest";
import { AnyTypeRule } from "../../../src/advisory/rules/AnyTypeRule";
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

describe("AnyTypeRule", () => {
	// ============================================================================
	// RULE METADATA
	// ============================================================================

	describe("Rule Metadata", () => {
		it("should have correct id", () => {
			expect(AnyTypeRule.id).toBe("any-type-usage");
		});

		it("should have priority of 3", () => {
			expect(AnyTypeRule.priority).toBe(3);
		});
	});

	// ============================================================================
	// TRIGGER
	// ============================================================================

	describe("Trigger", () => {
		it("should trigger for .ts files", () => {
			const context = createBaseContext(["src/auth.ts"]);
			expect(AnyTypeRule.trigger(context)).toBe(true);
		});

		it("should trigger for .tsx files", () => {
			const context = createBaseContext(["src/Component.tsx"]);
			expect(AnyTypeRule.trigger(context)).toBe(true);
		});

		it("should NOT trigger for .js files", () => {
			const context = createBaseContext(["src/utils.js"]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for .d.ts files", () => {
			const context = createBaseContext(["types/global.d.ts"]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for test files", () => {
			const context = createBaseContext(["auth.test.ts", "utils.spec.tsx"]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for __tests__ directory", () => {
			const context = createBaseContext(["src/__tests__/auth.ts"]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for __fixtures__ directory", () => {
			const context = createBaseContext(["src/__fixtures__/data.ts"]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});

		it("should NOT trigger for empty files array", () => {
			const context = createBaseContext([]);
			expect(AnyTypeRule.trigger(context)).toBe(false);
		});
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should generate suggestion when type annotation any detected", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function process(data: any) {
					return data;
				}`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toBeDefined();
			expect(result.suggestions?.length).toBeGreaterThan(0);
			expect(result.suggestions?.[0].category).toBe("validation");
			expect(result.suggestions?.[0].text).toContain("any");
		});

		it("should detect as any assertion", () => {
			const context = createBaseContext(["src/auth.ts"], "const value = something as any;");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should detect any array type", () => {
			const context = createBaseContext(["src/auth.ts"], "const items: any[] = [];");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should detect any in union type", () => {
			const context = createBaseContext(["src/auth.ts"], "type Mixed = string | any;");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should detect any in generic", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				"const promise = new Promise<any>((resolve) => resolve(1));",
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.length).toBeGreaterThan(0);
		});

		it("should include file reference in suggestion", () => {
			const context = createBaseContext(["src/auth.ts"], "const x: any = 1;");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].files).toContain("src/auth.ts");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty suggestions when no any types", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function process(data: string): number {
					return data.length;
				}`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should return empty suggestions when using unknown", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`function process(data: unknown) {
					if (typeof data === "string") return data;
				}`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should return empty suggestions when no code provided", () => {
			const context = createBaseContext(["src/auth.ts"]);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should ignore any in comments", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`// This uses any type for flexibility
				/* any is fine here */
				function clean(): string { return "clean"; }`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should ignore any with eslint-disable", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const x: any = 1;`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should ignore any with ts-ignore", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`// @ts-ignore
				const x: any = 1;`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions).toEqual([]);
		});

		it("should handle multiple any types", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				`const a: any = 1;
				const b: any = 2;
				const c: any = 3;`,
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].text).toContain("3");
		});

		it("should set high priority for many any types", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				Array(12)
					.fill(null)
					.map((_, i) => `const v${i}: any = ${i};`)
					.join("\n"),
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(1); // High priority
		});

		it("should set medium priority for 5-9 any types", () => {
			const context = createBaseContext(
				["src/auth.ts"],
				Array(7)
					.fill(null)
					.map((_, i) => `const v${i}: any = ${i};`)
					.join("\n"),
			);

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(2); // Medium priority
		});

		it("should set low priority for 1-4 any types", () => {
			const context = createBaseContext(["src/auth.ts"], "const x: any = 1;");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].priority).toBe(3); // Low priority
		});

		it("should suggest using unknown", () => {
			const context = createBaseContext(["src/auth.ts"], "const x: any = 1;");

			const result = AnyTypeRule.generate(context);

			expect(result.suggestions?.[0].text).toContain("unknown");
		});
	});
});
