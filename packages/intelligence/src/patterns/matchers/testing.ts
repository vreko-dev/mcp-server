/**
 * Testing Pattern Matchers
 *
 * Detects testing patterns and anti-patterns in the codebase.
 *
 * @module patterns/matchers/testing
 */

import type { PatternMatch, PatternMatcher } from "../types.js";

/**
 * Create line-based match from regex match
 */
function createMatch(content: string, filePath: string, regexMatch: RegExpExecArray, confidence = 0.9): PatternMatch {
	const beforeMatch = content.slice(0, regexMatch.index);
	const line = (beforeMatch.match(/\n/g) || []).length + 1;
	const lines = content.split("\n");
	const snippet = lines[line - 1]?.trim() || regexMatch[0];

	return {
		file: filePath,
		line,
		snippet: snippet.slice(0, 100),
		confidence,
	};
}

/**
 * Matcher for unit test files
 */
export const unitTestMatcher: PatternMatcher = {
	id: "unit-tests",
	name: "Unit Tests",
	category: "testing",
	files: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "Unit test files with test assertions",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/describe\s*\(/g, /it\s*\(/g, /test\s*\(/g, /expect\s*\(/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for vague assertions (anti-pattern)
 */
export const vagueAssertionMatcher: PatternMatcher = {
	id: "vague-assertions",
	name: "Vague Assertions",
	category: "testing",
	files: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
	isPositive: false,
	importance: "recommended",
	description: "Vague test assertions that don't provide meaningful validation",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/\.toBeTruthy\s*\(\s*\)/g,
			/\.toBeFalsy\s*\(\s*\)/g,
			/\.toBeDefined\s*\(\s*\)/g,
			/\.not\.toBeUndefined\s*\(\s*\)/g,
			/expect\s*\(\s*true\s*\)/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match, 0.8));
			}
		}

		return matches;
	},
};

/**
 * Matcher for integration tests
 */
export const integrationTestMatcher: PatternMatcher = {
	id: "integration-tests",
	name: "Integration Tests",
	category: "testing",
	files: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "**/e2e/**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "Integration tests with API or database interactions",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/supertest/g,
			/request\s*\(\s*app\s*\)/g,
			/createTestClient/g,
			/TestingModule/g,
			/@nestjs\/testing/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for React Testing Library usage
 */
export const reactTestingLibraryMatcher: PatternMatcher = {
	id: "react-testing-library",
	name: "React Testing Library",
	category: "testing",
	files: ["**/*.{test,spec}.{tsx,jsx}", "**/__tests__/**/*.{tsx,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "React component testing with Testing Library",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/@testing-library\/react/g,
			/render\s*\(/g,
			/screen\./g,
			/userEvent\./g,
			/fireEvent\./g,
			/waitFor\s*\(/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for E2E tests
 */
export const e2eTestMatcher: PatternMatcher = {
	id: "e2e-tests",
	name: "E2E Tests",
	category: "testing",
	files: ["**/e2e/**/*.{ts,js}", "**/*.e2e-spec.{ts,js}", "**/playwright/**/*.{ts,js}"],
	isPositive: true,
	importance: "recommended",
	description: "End-to-end tests with Playwright or Cypress",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/@playwright\/test/g, /cypress/g, /page\.(goto|click|fill)/g, /cy\.(visit|get|click)/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for mocking
 */
export const mockingMatcher: PatternMatcher = {
	id: "mocking",
	name: "Test Mocking",
	category: "testing",
	files: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "optional",
	description: "Mocking dependencies in tests",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/vi\.mock\s*\(/g,
			/jest\.mock\s*\(/g,
			/vi\.spyOn\s*\(/g,
			/jest\.spyOn\s*\(/g,
			/mockResolvedValue/g,
			/mockReturnValue/g,
			/msw/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for test coverage configuration
 */
export const coverageConfigMatcher: PatternMatcher = {
	id: "coverage-config",
	name: "Test Coverage Configuration",
	category: "testing",
	files: ["**/vitest.config.{ts,js,mjs}", "**/jest.config.{ts,js,mjs}", "package.json"],
	isPositive: true,
	importance: "recommended",
	description: "Test coverage thresholds and configuration",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/coverage/g, /coverageThreshold/g, /@vitest\/coverage/g, /collectCoverage/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * All testing matchers
 */
export const testingMatchers: PatternMatcher[] = [
	unitTestMatcher,
	vagueAssertionMatcher,
	integrationTestMatcher,
	reactTestingLibraryMatcher,
	e2eTestMatcher,
	mockingMatcher,
	coverageConfigMatcher,
];
