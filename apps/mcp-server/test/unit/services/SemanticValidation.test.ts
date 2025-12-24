/**
 * Comprehensive tests for semantic validation features
 * Coverage: Happy, Sad, Edge, Error paths
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @snapback/infrastructure to avoid INT-009 blocker (registerLoggerFactory)
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		child: vi.fn().mockReturnValue({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		}),
	},
}));

import { SemanticPatternValidator } from "../../../src/services/SemanticPatternValidator.js";
import { TypeSignatureAnalyzer } from "../../../src/services/TypeSignatureAnalyzer.js";

/**
 * Helper to create a mock response that the TypeSignatureAnalyzer can parse
 */
function createMockResponse(dts: string) {
	return {
		ok: true,
		text: () => Promise.resolve(dts),
	};
}

function createFailedResponse() {
	return { ok: false, status: 404 };
}

describe("TypeSignatureAnalyzer", () => {
	let analyzer: TypeSignatureAnalyzer;
	let originalFetch: typeof globalThis.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
		analyzer = new TypeSignatureAnalyzer();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe("Happy Path", () => {
		it("should detect removed exports", async () => {
			const oldDts = `
				export function oldFunction(): void;
				export const CONSTANT: string;
			`;

			const newDts = `
				export const CONSTANT: string;
			`;

			mockFetch
				.mockResolvedValueOnce(createMockResponse(oldDts))
				.mockResolvedValueOnce(createMockResponse(newDts));

			const diff = await analyzer.compareVersions("test-package", "1.0.0", "2.0.0");

			expect(diff.removed).toHaveLength(1);
			expect(diff.removed[0]).toMatchObject({
				name: "oldFunction",
				type: "function",
				impact: "breaking",
			});
		});

		it("should detect added exports", async () => {
			const oldDts = "export const OLD: string;";
			const newDts = `
				export const OLD: string;
				export function newFunction(): void;
			`;

			mockFetch
				.mockResolvedValueOnce(createMockResponse(oldDts))
				.mockResolvedValueOnce(createMockResponse(newDts));

			const diff = await analyzer.compareVersions("test-package", "1.0.0", "2.0.0");

			expect(diff.added).toHaveLength(1);
			expect(diff.added[0]).toMatchObject({
				name: "newFunction",
				type: "function",
				impact: "additive",
			});
		});

		it("should detect modified function signatures", async () => {
			const oldDts = "export function doSomething(a: string, b: number): void;";
			const newDts = "export function doSomething(a: string): void;";

			mockFetch
				.mockResolvedValueOnce(createMockResponse(oldDts))
				.mockResolvedValueOnce(createMockResponse(newDts));

			const diff = await analyzer.compareVersions("test-package", "1.0.0", "2.0.0");

			expect(diff.modified).toHaveLength(1);
			expect(diff.modified[0]).toMatchObject({
				name: "doSomething",
				type: "function",
			});
		});

		it("should calculate correct severity levels", async () => {
			const oldDts = `
				export function fn1(): void;
				export function fn2(): void;
				export function fn3(): void;
			`;
			const newDts = "export const NEW: string;";

			mockFetch
				.mockResolvedValueOnce(createMockResponse(oldDts))
				.mockResolvedValueOnce(createMockResponse(newDts));

			const diff = await analyzer.compareVersions("test-package", "1.0.0", "2.0.0");

			expect(diff.severity).toBe("high"); // 3 removed functions
		});
	});

	describe("Sad Path", () => {
		it("should handle missing type definitions gracefully", async () => {
			mockFetch.mockResolvedValue(createFailedResponse());

			const diff = await analyzer.compareVersions("no-types-package", "1.0.0", "2.0.0");

			expect(diff.removed).toHaveLength(0);
			expect(diff.added).toHaveLength(0);
			expect(diff.severity).toBe("low");
		});

		it("should handle malformed type definitions", async () => {
			const malformedDts = "this is not valid typescript !@#$%";

			mockFetch
				.mockResolvedValueOnce(createMockResponse(malformedDts))
				.mockResolvedValueOnce(createMockResponse(malformedDts));

			const diff = await analyzer.compareVersions("test", "1.0.0", "2.0.0");

			// Should not crash, just return empty diff
			expect(diff).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle identical type definitions", async () => {
			const sameDts = "export function unchanged(): void;";

			mockFetch
				.mockResolvedValueOnce(createMockResponse(sameDts))
				.mockResolvedValueOnce(createMockResponse(sameDts));

			const diff = await analyzer.compareVersions("test", "1.0.0", "1.0.1");

			expect(diff.removed).toHaveLength(0);
			expect(diff.added).toHaveLength(0);
			expect(diff.modified).toHaveLength(0);
			expect(diff.severity).toBe("low");
		});

		it("should handle empty type definitions", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse("")).mockResolvedValueOnce(createMockResponse(""));

			const diff = await analyzer.compareVersions("empty-package", "1.0.0", "2.0.0");

			expect(diff.removed).toHaveLength(0);
			expect(diff.added).toHaveLength(0);
		});

		it("should try multiple .d.ts file locations", async () => {
			// First 3 URLs fail, 4th succeeds
			mockFetch
				.mockRejectedValueOnce(new Error("Not found"))
				.mockRejectedValueOnce(new Error("Not found"))
				.mockRejectedValueOnce(new Error("Not found"))
				.mockResolvedValueOnce(createMockResponse("export const A: string;"))
				// For second version fetch - 3 fails then 1 success
				.mockRejectedValueOnce(new Error("Not found"))
				.mockRejectedValueOnce(new Error("Not found"))
				.mockRejectedValueOnce(new Error("Not found"))
				.mockResolvedValueOnce(createMockResponse("export const A: string;"));

			const diff = await analyzer.compareVersions("test", "1.0.0", "2.0.0");

			expect(diff).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors gracefully", async () => {
			mockFetch.mockRejectedValue(new Error("Network failure"));

			const diff = await analyzer.compareVersions("test", "1.0.0", "2.0.0");

			expect(diff.removed).toHaveLength(0);
			expect(diff.severity).toBe("low");
		});

		it("should handle timeout errors", async () => {
			mockFetch.mockImplementation(
				() => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
			);

			const diff = await analyzer.compareVersions("test", "1.0.0", "2.0.0");

			expect(diff).toBeDefined();
		});
	});
});

describe("SemanticPatternValidator", () => {
	let validator: SemanticPatternValidator;

	beforeEach(() => {
		validator = new SemanticPatternValidator();
	});

	describe("Happy Path", () => {
		it("should detect ReactDOM.render pattern in React 18 upgrade", async () => {
			const userCode = `
				import ReactDOM from 'react-dom';
				ReactDOM.render(<App />, document.getElementById('root'));
			`;

			const result = await validator.validateCodePatterns("react", "17", "18", userCode);

			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
			expect(result.deprecatedPatterns[0]).toMatchObject({
				pattern: "ReactDOM.render",
				severity: "high",
			});
		});

		it("should provide migration examples for deprecated patterns", async () => {
			const userCode = "ReactDOM.hydrate(<App />, root);";

			const result = await validator.validateCodePatterns("react", "17", "18", userCode);

			const hydratePattern = result.deprecatedPatterns.find((p) => p.pattern === "ReactDOM.hydrate");

			expect(hydratePattern).toBeDefined();
			expect(hydratePattern?.exampleBefore).toContain("ReactDOM.hydrate");
			expect(hydratePattern?.exampleAfter).toContain("hydrateRoot");
		});

		it("should detect Next.js Pages Router patterns", async () => {
			const userCode = `
				export async function getServerSideProps(context) {
					return { props: { data: [] } };
				}
			`;

			const result = await validator.validateCodePatterns("next", "12", "13", userCode);

			expect(result.deprecatedPatterns).toContainEqual(
				expect.objectContaining({
					pattern: "getServerSideProps",
				}),
			);
		});

		it("should calculate migration complexity correctly", async () => {
			const complexCode = `
				ReactDOM.render(<App1 />, root1);
				ReactDOM.render(<App2 />, root2);
				ReactDOM.render(<App3 />, root3);
				ReactDOM.hydrate(<SSR />, ssr);
			`;

			const result = await validator.validateCodePatterns("react", "17", "18", complexCode);

			expect(result.migrationComplexity).toBe("moderate");
		});

		it("should generate migration checklist", async () => {
			const result = await validator.validateCodePatterns("react", "17", "18");

			const checklist = validator.generateMigrationChecklist(result);

			expect(checklist.length).toBeGreaterThan(0);
			expect(checklist.join("\n")).toContain("Migration Checklist");
			expect(checklist.join("\n")).toContain("Migration Steps");
		});
	});

	describe("Sad Path", () => {
		it("should handle unknown package gracefully", async () => {
			const result = await validator.validateCodePatterns("unknown-package", "1.0.0", "2.0.0");

			expect(result.deprecatedPatterns).toHaveLength(0);
			expect(result.migrationComplexity).toBe("simple");
		});

		it("should handle no code provided", async () => {
			const result = await validator.validateCodePatterns("react", "17", "18");

			// Should still return all potential deprecated patterns
			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});

		it("should handle invalid version strings", async () => {
			const result = await validator.validateCodePatterns("react", "invalid", "also-invalid");

			expect(result).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle code with no deprecated patterns", async () => {
			const cleanCode = `
				import { createRoot } from 'react-dom/client';
				const root = createRoot(document.getElementById('root'));
				root.render(<App />);
			`;

			const result = await validator.validateCodePatterns("react", "17", "18", cleanCode);

			// Code already uses new API, no patterns detected
			expect(result.deprecatedPatterns.length).toBe(0);
		});

		it("should handle empty code", async () => {
			const result = await validator.validateCodePatterns("react", "17", "18", "");

			expect(result).toBeDefined();
		});

		it("should handle code with comments", async () => {
			const codeWithComments = `
				// This is old code
				// ReactDOM.render(<App />, root);
				// Commented out
			`;

			const result = await validator.validateCodePatterns("react", "17", "18", codeWithComments);

			// Should still detect pattern in comments (intentional - alerts user)
			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});

		it("should detect patterns on multiple lines", async () => {
			const multilineCode = `
				ReactDOM.render(
					<App />,
					document.getElementById('root')
				);
			`;

			const result = await validator.validateCodePatterns("react", "17", "18", multilineCode);

			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});

		it("should estimate effort for complex migrations", async () => {
			const criticalCode = `
				new Vue({ render: h => h(App) }).$mount('#app');
			`;

			const result = await validator.validateCodePatterns("vue", "2", "3", criticalCode);

			expect(result.estimatedEffort).toContain("hour");
		});
	});

	describe("Error Handling", () => {
		it("should handle JSON parsing errors gracefully", async () => {
			// Force an error by providing invalid input
			const result = await validator.validateCodePatterns("", "", "");

			expect(result).toBeDefined();
			expect(result.deprecatedPatterns).toHaveLength(0);
		});
	});

	describe("Integration - All Libraries", () => {
		it("should support React migration patterns", async () => {
			const result = await validator.validateCodePatterns("react", "17", "18");
			expect(result.newFeatures.length).toBeGreaterThan(0);
		});

		it("should support Next.js migration patterns", async () => {
			const result = await validator.validateCodePatterns("next", "12", "13");
			expect(result.newFeatures.length).toBeGreaterThan(0);
		});

		it("should support React Query migration patterns", async () => {
			const result = await validator.validateCodePatterns("react-query", "3", "4");
			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});

		it("should support Vue migration patterns", async () => {
			const result = await validator.validateCodePatterns("vue", "2", "3");
			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});

		it("should support TypeScript migration patterns", async () => {
			const result = await validator.validateCodePatterns("typescript", "4", "5");
			expect(result.deprecatedPatterns.length).toBeGreaterThan(0);
		});
	});
});
