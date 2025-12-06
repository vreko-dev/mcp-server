import type { Logger } from "@snapback/contracts";
import { createSilentLogger } from "@snapback/contracts";
import type { AnalysisResult } from "../../guardian";
import type { DetectionPlugin } from "../types";
import { isTestFile } from "../utils/ast-helpers";

/**
 * Mock Replacement Plugin
 * Detects when AI coding assistants make potentially problematic changes related to mocks in production
 */
export class MockReplacementPlugin implements DetectionPlugin {
	readonly name = "MockReplacementPlugin";

	private logger: Logger;

	/**
	 * Creates a new MockReplacementPlugin
	 *
	 * @param logger - Logger for debug/info messages (optional)
	 */
	constructor(logger?: Logger) {
		this.logger = logger || createSilentLogger();
	}

	/**
	 * Analyze content for potential mock usage in production code
	 *
	 * @param content - File content to analyze
	 * @param filePath - Optional file path for context
	 * @returns Analysis result with score, factors, and recommendations
	 */
	async analyze(content: string, filePath?: string): Promise<AnalysisResult> {
		// Early exits for safe contexts
		if (!content || content.length === 0) {
			return this.createEmptyResult();
		}

		// Skip test files
		if (filePath && isTestFile(filePath)) {
			return this.createEmptyResult();
		}

		let score = 0;
		const factors: string[] = [];
		const recommendations: string[] = [];
		let severity: "low" | "medium" | "high" | "critical" = "low";

		// Check for test framework mock functions in production code
		const mockPatterns = [
			{ pattern: /\bjest\.mock\b/g, name: "jest.mock()", weight: 0.8 },
			{ pattern: /\bvi\.mock\b/g, name: "vi.mock()", weight: 0.8 },
			{ pattern: /\bsinon\.(stub|mock|spy)\b/g, name: "sinon mock functions", weight: 0.7 },
			{ pattern: /\bmock[A-Z][a-zA-Z]*\s*=/g, name: "mock variable assignments", weight: 0.4 },
			{ pattern: /\bcreateMock[A-Z][a-zA-Z]*\s*\(/g, name: "mock factory functions", weight: 0.5 },
			{ pattern: /\bMock[A-Z][a-zA-Z]*\s*{/g, name: "mock class implementations", weight: 0.6 },
			{ pattern: /MOCK_[A-Z_]+\s*=/g, name: "mock constant definitions", weight: 0.45 },
			{ pattern: /\bprocess\.env\.MOCK_/g, name: "mock environment variables", weight: 0.5 },
			{ pattern: /\bmock[A-Za-z]*\s*:/g, name: "mock configuration properties", weight: 0.45 },
			{ pattern: /\bmock[A-Z][a-zA-Z]*\s*\(/g, name: "mock utility functions", weight: 0.3 },
		];

		// Check each pattern
		for (const { pattern, name, weight } of mockPatterns) {
			const matches = content.match(pattern);
			if (matches && matches.length > 0) {
				// Use moderated scaling for match counts to prevent score explosion while maintaining reasonable scores
				const scaledWeight = this.moderatedScaling(matches.length, weight);
				const currentScore = Math.min(1.0, scaledWeight);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(`Potential ${name} detected in production code (${matches.length} occurrences)`);

				if (currentScore >= 0.8) {
					severity = "high";
				} else if (currentScore >= 0.5 && severity !== "high") {
					severity = "medium";
				}
			}
		}

		// Check for testing library imports in production code
		const testingLibraryImports = [
			"@testing-library/react",
			"@testing-library/jest-dom",
			"@testing-library/user-event",
			"react-test-renderer",
			"@vue/test-utils",
			"enzyme",
		];

		for (const lib of testingLibraryImports) {
			const importPattern = new RegExp(`from\\s+["']${lib}["']`, "g");
			const importMatches = content.match(importPattern);
			if (importMatches && importMatches.length > 0) {
				// Use moderated scaling for match counts
				const scaledWeight = this.moderatedScaling(importMatches.length, 0.7);
				const currentScore = Math.min(1.0, scaledWeight);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(
					`Testing library import (${lib}) in production code (${importMatches.length} occurrences)`,
				);
				if (severity === "low") {
					severity = "medium";
				}
			}
		}

		// Check for inline mock objects
		const inlineMockPatterns = [
			{ pattern: /{\s*[a-zA-Z_$][a-zA-Z0-9_$]*:\s*jest\.fn\(\)/g, name: "inline jest.fn() mocks", weight: 0.6 },
			{ pattern: /{\s*[a-zA-Z_$][a-zA-Z0-9_$]*:\s*vi\.fn\(\)/g, name: "inline vi.fn() mocks", weight: 0.6 },
			{
				pattern: /{\s*[a-zA-Z_$][a-zA-Z0-9_$]*:\s*sinon\.[a-zA-Z]+\(\)/g,
				name: "inline sinon mocks",
				weight: 0.6,
			},
			{
				pattern: /=\s*{\s*[a-zA-Z_$][a-zA-Z0-9_$]*:\s*jest\.fn\(\)/g,
				name: "inline mock objects",
				weight: 0.7,
			},
			{
				pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*:\s*jest\.fn\(\)/g,
				name: "inline jest.fn() methods",
				weight: 0.3,
			},
		];

		for (const { pattern, name, weight } of inlineMockPatterns) {
			const matches = content.match(pattern);
			if (matches && matches.length > 0) {
				// Use moderated scaling for match counts
				const scaledWeight = this.moderatedScaling(matches.length, weight);
				const currentScore = Math.min(1.0, scaledWeight);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(`Potential ${name} detected (${matches.length} occurrences)`);

				if (currentScore >= 0.6) {
					severity = "medium";
				}
			}
		}

		// Check for mock return values in production code
		const mockReturnPatterns = [
			{
				pattern: /return\s*{[^}]*status:\s*["'](success|error)["'][^}]*}/g,
				name: "mock return values",
				weight: 0.35,
			},
			{ pattern: /return\s*\[\s*\]/g, name: "empty array mocks", weight: 0.2 },
			{ pattern: /return\s*{\s*}/g, name: "empty object mocks", weight: 0.2 },
			{ pattern: /return\s*{\s*status:\s*["']success["']/g, name: "mock return values", weight: 0.35 },
			{
				pattern: /return\s*{\s*status:\s*["'](success|error)["'][^}]*}/g,
				name: "mock return values",
				weight: 0.35,
			},
		];

		for (const { pattern, name, weight } of mockReturnPatterns) {
			const matches = content.match(pattern);
			if (matches && matches.length > 0) {
				// Use moderated scaling for match counts
				const scaledWeight = this.moderatedScaling(matches.length, weight);
				const currentScore = Math.min(1.0, scaledWeight);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(`Potential ${name} detected (${matches.length} occurrences)`);
			}
		}

		// Check for conditional mocking
		const conditionalMockPattern = /process\.env\.NODE_ENV\s*===?\s*["'](?:test|development)["']/g;
		const conditionalMockMatches = content.match(conditionalMockPattern);
		if (conditionalMockMatches && conditionalMockMatches.length > 0) {
			// Use moderated scaling for match counts
			const scaledWeight = this.moderatedScaling(conditionalMockMatches.length, 0.4);
			const currentScore = Math.min(1.0, scaledWeight);
			if (currentScore > score) {
				score = currentScore;
			}
			factors.push(`Conditional mocking based on NODE_ENV (${conditionalMockMatches.length} occurrences)`);
		}

		// Check for mock function calls
		const mockFunctionPattern = /\bmock[A-Z][a-zA-Z]*\.[a-zA-Z]/g;
		const mockFunctionMatches = content.match(mockFunctionPattern);
		if (mockFunctionMatches && mockFunctionMatches.length > 0) {
			// Use moderated scaling for match counts
			const scaledWeight = this.moderatedScaling(mockFunctionMatches.length, 0.35);
			const currentScore = Math.min(1.0, scaledWeight);
			if (currentScore > score) {
				score = currentScore;
			}
			factors.push(`Mock function calls detected (${mockFunctionMatches.length} occurrences)`);
		}

		// Recommendations
		if (score > 0.3) {
			recommendations.push("Move mocks to test files only");
			recommendations.push("Use proper dependency injection for testability");
			recommendations.push("Implement proper factory patterns instead of mocks in production");
		}

		// Cap score at 1.0
		score = Math.min(score, 1.0);

		// Log for debugging
		if (score > 0.3) {
			this.logger.info("Mock replacement detection found potential issues", {
				filePath,
				score,
				factors,
				severity,
			});
		}

		return {
			score,
			factors,
			recommendations,
			severity,
		};
	}

	/**
	 * Create an empty analysis result
	 *
	 * @returns Empty analysis result
	 */
	private createEmptyResult(): AnalysisResult {
		return {
			score: 0,
			factors: [],
			recommendations: [],
		};
	}

	/**
	 * Apply moderated scaling to prevent score explosion while maintaining reasonable scores
	 *
	 * @param count - Number of matches
	 * @param baseWeight - Base weight for the pattern
	 * @returns Scaled weight that increases slowly with count
	 */
	private moderatedScaling(count: number, baseWeight: number): number {
		if (count === 0) {
			return 0;
		}
		if (count === 1) {
			return baseWeight;
		}
		// Use a moderated logarithmic scaling: baseWeight * (1 + 0.3 * log10(count))
		// This allows for slight increases with multiple matches while preventing explosion
		return baseWeight * (1 + 0.3 * Math.log10(count));
	}
}
