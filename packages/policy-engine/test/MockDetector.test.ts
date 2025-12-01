import { describe, expect, it } from "vitest";
import { MockDetector } from "../src/detectors/MockDetector.js";

describe("MockDetector", () => {
	const detector = new MockDetector();

	describe("Test Library Import Detection", () => {
		it("should detect vitest imports in production code", () => {
			const code = `
				import { describe, it, expect } from 'vitest';
				
				export function myFunction() {
					return 42;
				}
			`;

			const result = detector.detect(code, "src/utils.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings[0].type).toBe("Test Library Import");
			expect(result.findings[0].severity).toBe("high");
		});

		it("should detect jest imports", () => {
			const code = `
				import { jest } from '@jest/globals';
			`;

			const result = detector.detect(code, "src/service.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings[0].type).toBe("Test Library Import");
		});

		it("should detect testing-library imports", () => {
			const code = `
				import { render, screen } from '@testing-library/react';
			`;

			const result = detector.detect(code, "src/component.ts");

			expect(result.findings.length).toBeGreaterThan(0);
		});

		it("should not flag test imports in test files", () => {
			const code = `
				import { describe, it, expect } from 'vitest';
			`;

			const result = detector.detect(code, "src/utils.test.ts");

			expect(result.findings.length).toBe(0);
			expect(result.riskScore).toBe(0);
		});

		it("should not flag test imports in spec files", () => {
			const code = `
				import { jest } from '@jest/globals';
			`;

			const result = detector.detect(code, "src/component.spec.tsx");

			expect(result.findings.length).toBe(0);
		});

		it("should not flag test imports in __tests__ directory", () => {
			const code = `
				import { render } from '@testing-library/react';
			`;

			const result = detector.detect(code, "src/__tests__/component.tsx");

			expect(result.findings.length).toBe(0);
		});
	});

	describe("Mock Pattern Detection", () => {
		it("should detect mockData patterns", () => {
			const code = `
				const mockData = { id: 1, name: 'Test' };
			`;

			const result = detector.detect(code, "src/data.ts");

			expect(result.findings.some((f) => f.type === "Mock Data Pattern")).toBe(true);
		});

		it("should detect fakeUser patterns", () => {
			const code = `
				const fakeUser = { email: 'test@example.com' };
			`;

			const result = detector.detect(code, "src/user.ts");

			expect(result.findings.some((f) => f.type === "Mock Data Pattern")).toBe(true);
		});

		it("should detect dummyResponse patterns", () => {
			const code = `
				const dummyResponse = { status: 200 };
			`;

			const result = detector.detect(code, "src/api.ts");

			expect(result.findings.some((f) => f.type === "Mock Data Pattern")).toBe(true);
		});

		it("should detect stubApi patterns", () => {
			const code = `
				const stubbedApi = () => Promise.resolve({});
			`;

			const result = detector.detect(code, "src/service.ts");

			expect(result.findings.some((f) => f.type === "Mock Data Pattern")).toBe(true);
		});

		it("should detect testData patterns", () => {
			const code = `
				const testData = [1, 2, 3];
			`;

			const result = detector.detect(code, "src/data.ts");

			expect(result.findings.some((f) => f.type === "Mock Data Pattern")).toBe(true);
		});

		it("should assign higher severity to large structures", () => {
			const largeStructure = `
				const mockData = { id: 1, items: [1, 2, 3] };
			`;

			const result = detector.detect(largeStructure, "src/large.ts");

			expect(result.findings[0].severity).toBe("medium");
		});

		it("should assign lower severity to simple patterns", () => {
			const simple = `
				const mockName = "test";
			`;

			const result = detector.detect(simple, "src/simple.ts");

			expect(result.findings[0].severity).toBe("low");
		});
	});

	describe("Comment Filtering", () => {
		it("should skip single-line comments", () => {
			const code = `
				// const mockData = { test: true };
				const realData = { value: 42 };
			`;

			const result = detector.detect(code, "src/data.ts");

			expect(result.findings.length).toBe(0);
		});

		it("should skip multi-line comments", () => {
			const code = `
				/*
				 * const mockData = { test: true };
				 */
				const realData = { value: 42 };
			`;

			const result = detector.detect(code, "src/data.ts");

			expect(result.findings.length).toBe(0);
		});
	});

	describe("Config File Exclusion", () => {
		it("should not flag patterns in vitest config", () => {
			const code = `
				import { defineConfig } from 'vitest';
				const mockData = { test: true };
			`;

			const result = detector.detect(code, "vitest.config.ts");

			expect(result.findings.length).toBe(0);
		});

		it("should not flag patterns in jest config", () => {
			const code = `
				const mockData = { test: true };
			`;

			const result = detector.detect(code, "jest.config.js");

			expect(result.findings.length).toBe(0);
		});

		it("should not flag patterns in test utils", () => {
			const code = `
				export const mockData = { id: 1 };
			`;

			const result = detector.detect(code, "src/test-utils.ts");

			expect(result.findings.length).toBe(0);
		});
	});

	describe("Risk Score Calculation", () => {
		it("should calculate risk score based on findings", () => {
			const code = `
				import { describe } from 'vitest';
				const mockData = { test: true };
			`;

			const result = detector.detect(code, "src/risky.ts");

			expect(result.riskScore).toBeGreaterThan(0);
		});

		it("should weight by severity", () => {
			const highSeverity = `
				import { vitest } from 'vitest';
			`;
			const highResult = detector.detect(highSeverity, "src/high.ts");

			const lowSeverity = `
				const mockName = "test";
			`;
			const lowResult = detector.detect(lowSeverity, "src/low.ts");

			expect(highResult.riskScore).toBeGreaterThan(lowResult.riskScore);
		});

		it("should cap risk score at 10", () => {
			const many = `
				import { vitest } from 'vitest';
				const mockData1 = {};
				const mockData2 = {};
				const mockData3 = {};
				const fakeUser = {};
				const dummyApi = {};
			`;

			const result = detector.detect(many, "src/many.ts");

			expect(result.riskScore).toBeLessThanOrEqual(10);
		});

		it("should return 0 for clean code", () => {
			const clean = `
				const config = { apiUrl: 'https://api.example.com' };
			`;

			const result = detector.detect(clean, "src/config.ts");

			expect(result.riskScore).toBe(0);
		});
	});

	describe("Location Information", () => {
		it("should include line numbers", () => {
			const code = `line 1
line 2
const mockData = { test: true };
line 4`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].line).toBe(3);
		});

		it("should include code snippet", () => {
			const code = `const mockData = { id: 1, name: 'Test User' };`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].snippet).toBeDefined();
			expect(result.findings[0].snippet.length).toBeLessThanOrEqual(80);
		});

		it("should include rule ID", () => {
			const code = "const mockData = {};";

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].ruleId).toBe("mock-detection/mock-pattern");
		});
	});

	describe("Require Syntax Detection", () => {
		it("should detect CommonJS require imports", () => {
			const code = `
				const vitest = require('vitest');
			`;

			const result = detector.detect(code, "src/legacy.js");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings[0].type).toBe("Test Library Import");
		});
	});

	describe("Multiple Findings", () => {
		it("should detect multiple issues in one file", () => {
			const code = `
				import { describe } from 'vitest';
				const mockData = { test: true };
				const fakeUser = { id: 1 };
			`;

			const result = detector.detect(code, "src/mixed.ts");

			expect(result.findings.length).toBeGreaterThanOrEqual(3);
		});

		it("should only report one finding per line", () => {
			const code = `
				const mockData = { mockUser: true, fakeApi: {} };
			`;

			const result = detector.detect(code, "src/single-line.ts");

			// Should only report once per line
			const lineNumbers = result.findings.map((f) => f.line);
			const uniqueLines = [...new Set(lineNumbers)];
			expect(lineNumbers.length).toBe(uniqueLines.length);
		});
	});
});
