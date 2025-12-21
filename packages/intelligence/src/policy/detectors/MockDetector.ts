/**
 * Mock Leakage Detector - Identifies test mocks and fixtures in production code
 */

export interface MockFinding {
	type: string;
	line: number;
	snippet: string;
	severity: "low" | "medium" | "high" | "critical";
	ruleId: string;
}

export interface MockDetectionResult {
	findings: MockFinding[];
	riskScore: number;
}

// Test library imports that shouldn't be in production code
const TEST_IMPORTS = [
	"vitest",
	"jest",
	"@testing-library/react",
	"@testing-library/dom",
	"@testing-library/user-event",
	"@jest/globals",
	"mocha",
	"chai",
	"sinon",
	"@vitest/spy",
];

// Mock data patterns - match variable/property names
const MOCK_PATTERNS = [
	/\b(mock|mocked)\w+/gi,
	/\bfake\w+/gi,
	/\bdummy\w+/gi,
	/\b(stub|stubbed)\w+/gi,
	/\btest(?:Data|User|Response|Api)/gi,
];

export class MockDetector {
	/**
	 * Detect mock/test code leakage in production files
	 */
	detect(content: string, filePath: string): MockDetectionResult {
		const findings: MockFinding[] = [];

		// Skip test files and config files
		if (this.isTestOrConfigFile(filePath)) {
			return { findings: [], riskScore: 0 };
		}

		const lines = content.split("\n");

		// Detect test library imports in production code
		this.detectTestImports(lines, findings);

		// Detect mock data patterns
		this.detectMockPatterns(lines, findings);

		// Calculate risk score
		const riskScore = this.calculateRiskScore(findings);

		return { findings, riskScore };
	}

	/**
	 * Detect test library imports
	 */
	private detectTestImports(lines: string[], findings: MockFinding[]): void {
		const importPattern = /(?:import|require)\s*.*?["']([^"']+)["']/g;

		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			const matches = line.matchAll(importPattern);

			for (const match of matches) {
				const importPath = match[1];

				// Check if it's a test library
				for (const testLib of TEST_IMPORTS) {
					if (importPath === testLib || importPath.startsWith(`${testLib}/`)) {
						findings.push({
							type: "Test Library Import",
							line: lineNum + 1,
							snippet: line.trim().substring(0, 80),
							severity: "high",
							ruleId: "mock-detection/test-import",
						});
					}
				}
			}
		}
	}

	/**
	 * Detect mock data patterns
	 */
	private detectMockPatterns(lines: string[], findings: MockFinding[]): void {
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];

			// Skip comments
			if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
				continue;
			}

			for (const pattern of MOCK_PATTERNS) {
				// Reset lastIndex to avoid stateful regex issues
				pattern.lastIndex = 0;
				if (pattern.test(line)) {
					// Check if it's a large data structure (potential fixture)
					const isLargeStructure = line.includes("[") || line.includes("{");

					findings.push({
						type: "Mock Data Pattern",
						line: lineNum + 1,
						snippet: line.trim().substring(0, 80),
						severity: isLargeStructure ? "medium" : "low",
						ruleId: "mock-detection/mock-pattern",
					});

					// Only report once per line
					break;
				}
			}
		}
	}

	/**
	 * Check if file is a test or config file
	 */
	private isTestOrConfigFile(filePath: string): boolean {
		const allowedPatterns = [
			/\.test\.[jt]sx?$/,
			/\.spec\.[jt]sx?$/,
			/__tests__\//,
			/\/test\//,
			/\/tests\//,
			/\.fixture\.[jt]sx?$/,
			/\.seed\.[jt]sx?$/,
			/vitest\.config\.[jt]s$/,
			/jest\.config\.[jt]s$/,
			/playwright\.config\.[jt]s$/,
			/setupTests\.[jt]s$/,
			/test-utils\.[jt]sx?$/,
		];

		return allowedPatterns.some((pattern) => pattern.test(filePath));
	}

	/**
	 * Calculate risk score (0-10)
	 */
	private calculateRiskScore(findings: MockFinding[]): number {
		if (findings.length === 0) {
			return 0;
		}

		const severityWeights = {
			critical: 10,
			high: 7,
			medium: 4,
			low: 2,
		};

		let totalScore = 0;
		for (const finding of findings) {
			totalScore += severityWeights[finding.severity];
		}

		// Cap at 10
		return Math.min(10, totalScore / findings.length);
	}
}
