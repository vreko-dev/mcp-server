import type { AnalysisResult, Issue, RiskLevel } from "./types";

/**
 * Pattern definition for detection
 */
interface Pattern {
	name: string;
	regex: RegExp;
	type: Issue["type"];
	severity: Issue["severity"];
}

/**
 * GuardianLite - Lightweight local code analysis engine
 *
 * Provides 15 industry-standard detection patterns for:
 * - 5 secret patterns (AWS keys, API keys, JWT, private keys, DB connections)
 * - 5 mock patterns (Jest, Vitest, Sinon, TestDouble, Axios mocking)
 * - 5 dependency patterns (phantom imports, missing dependencies)
 *
 * @example
 * ```typescript
 * const guardian = new GuardianLite();
 * const result = guardian.analyze(code);
 *
 * if (result.riskLevel === 'high') {
 *   console.warn('High risk detected:', result.issues);
 * }
 * ```
 */
export class GuardianLite {
	private readonly patterns: Pattern[] = [
		// Secrets: Credentials and API keys
		{
			name: "AWS_KEY",
			regex: /AKIA[0-9A-Z]{16}/,
			type: "secret",
			severity: "high",
		},
		{
			name: "GOOGLE_API_KEY",
			regex: /AIza[0-9A-Za-z\-_]{35}/,
			type: "secret",
			severity: "high",
		},
		{
			name: "GITHUB_TOKEN",
			regex: /(ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{82}/,
			type: "secret",
			severity: "high",
		},
		{
			name: "STRIPE_SECRET_KEY",
			regex: /sk_(live|test)_[0-9a-zA-Z]{24,}/,
			type: "secret",
			severity: "high",
		},
		{
			name: "SLACK_TOKEN",
			regex: /xox[bapsr]-[0-9A-Za-z-]{10,}/,
			type: "secret",
			severity: "high",
		},
		{
			name: "BEARER_TOKEN",
			regex: /Authorization:\s*Bearer\s+[A-Za-z0-9\-_.]{20,}/i,
			type: "secret",
			severity: "high",
		},
		{
			name: "GENERIC_API_KEY",
			regex: /api[_-]?key[\s:=]*["']?([a-z0-9]{32,})/i,
			type: "secret",
			severity: "medium",
		},
		{
			name: "JWT",
			regex: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/,
			type: "secret",
			severity: "low",
		},
		{
			name: "GENERIC_PRIVATE_KEY",
			regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
			type: "secret",
			severity: "high",
		},
		{
			name: "DB_CONNECTION",
			regex: /(postgres|mysql|mongodb|redis):\/\/[^\s]+/,
			type: "secret",
			severity: "high",
		},
		{
			name: "ENV_SECRET_ASSIGNMENT",
			regex: /^[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PWD|PASS|API_KEY)[A-Z0-9_]*\s*=\s*.+$/i,
			type: "secret",
			severity: "medium",
		},
		{
			name: "NPM_AUTH_TOKEN",
			regex: /\/\/registry\.npmjs\.org\/.*:_authToken=\s*[A-Za-z0-9\-_]+/,
			type: "secret",
			severity: "high",
		},
		{
			name: "INTERNAL_ENV_URL",
			regex: /https?:\/\/[a-z0-9.-]*(dev|staging|qa|test|internal)[.-][^/\s'"]+/i,
			type: "secret",
			severity: "medium",
		},
		// Mocks: Test framework artifacts
		{
			name: "JEST_MOCK",
			regex: /jest\.mock\(/,
			type: "mock",
			severity: "medium",
		},
		{
			name: "VITEST_MOCK",
			regex: /vi\.mock\(/,
			type: "mock",
			severity: "medium",
		},
		{
			name: "SINON_STUB",
			regex: /sinon\.(stub|spy|mock)\(/,
			type: "mock",
			severity: "medium",
		},
		{
			name: "TEST_DOUBLE",
			regex: /td\.(replace|when|verify)\(/,
			type: "mock",
			severity: "low",
		},
		{
			name: "MOCK_AXIOS",
			regex: /(MockAdapter|mock\.on(Get|Post|Put|Delete|Patch))/,
			type: "mock",
			severity: "low",
		},
		// Dependencies: Import and require statements
		{
			name: "PHANTOM_IMPORT",
			regex: /import\s+.+\s+from\s+["'](?!\.|\/|@snapback)([^"']+)["']/,
			type: "dependency",
			severity: "medium",
		},
		{
			name: "REQUIRE_EXTERNAL",
			regex: /require\(["'](?!\.|\/|@snapback)([^"']+)["']\)/,
			type: "dependency",
			severity: "medium",
		},
	];

	/**
	 * Analyze code string for security and quality issues
	 *
	 * @param code - Source code to analyze (can be any text)
	 * @returns AnalysisResult with risk classification and detected issues
	 *
	 * @performance
	 * - Target: <50ms for 1000 lines
	 * - Typical: 10-20ms for most files
	 * - Memory: ~5MB
	 */
	analyze(code: string): AnalysisResult {
		const startTime = performance.now();

		// Validate input
		if (!code || typeof code !== "string") {
			return {
				riskLevel: "none",
				confidence: 1.0,
				issues: [],
				executionTime: performance.now() - startTime,
				upgradePrompt: false,
				recommendations: [],
			};
		}

		const issues: Issue[] = [];

		// Find matches for all patterns
		for (const pattern of this.patterns) {
			const matches = this.findMatches(code, pattern.regex);
			for (const match of matches) {
				issues.push({
					type: pattern.type,
					severity: pattern.severity,
					message: `Detected ${pattern.name}`,
					pattern: pattern.name,
					line: match.line,
				});
			}
		}

		const executionTime = performance.now() - startTime;
		const riskLevel = this.calculateRiskLevel(issues);
		const confidence = this.calculateConfidence(issues, code.split("\n").length);
		const upgradePrompt = issues.length > 2 || issues.some((i) => i.severity === "high");
		const recommendations = this.generateRecommendations(issues);

		return {
			riskLevel,
			confidence,
			issues,
			executionTime,
			upgradePrompt,
			recommendations,
		};
	}

	/**
	 * Find all matches of a regex pattern in code
	 * Returns line numbers (1-indexed) with matches
	 * Note: Detects multiple matches per line using global regex
	 */
	private findMatches(code: string, regex: RegExp): Array<{ line: number; match: string }> {
		const matches: Array<{ line: number; match: string }> = [];
		const lines = code.split("\n");

		// Convert to global regex to find all matches per line
		const globalRegex = new RegExp(regex.source, "g");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			let match;

			// Use exec() in loop to find all matches on this line
			while ((match = globalRegex.exec(line)) !== null) {
				matches.push({
					line: i + 1, // 1-indexed
					match: match[0],
				});
			}

			// Reset regex lastIndex for next line
			globalRegex.lastIndex = 0;
		}

		return matches;
	}

	/**
	 * Calculate overall risk level from issues
	 */
	private calculateRiskLevel(issues: Issue[]): RiskLevel {
		if (issues.length === 0) {
			return "none";
		}
		if (issues.some((i) => i.severity === "high")) {
			return "high";
		}
		if (issues.some((i) => i.severity === "medium")) {
			return "medium";
		}
		return "low";
	}

	/**
	 * Calculate confidence score (0-1)
	 * Based on issue count and code length
	 */
	private calculateConfidence(issues: Issue[], lineCount: number): number {
		let base: number;

		if (issues.length === 0) {
			base = 0.95; // High confidence in clean code
		} else if (issues.length <= 2) {
			base = 0.85; // Good confidence with few issues
		} else if (issues.length <= 5) {
			base = 0.75; // Medium confidence
		} else {
			base = 0.6; // Lower confidence, suggest Pro tier
		}

		// Adjust confidence based on file size
		// Large files with no issues might still have hidden issues
		if (lineCount > 800) {
			return Math.max(0, base - 0.1);
		}
		if (lineCount > 200) {
			return Math.max(0, base - 0.05);
		}

		return base;
	}

	/**
	 * Generate actionable recommendations based on issues
	 */
	private generateRecommendations(issues: Issue[]): string[] {
		const recommendations: string[] = [];
		const issueTypes = new Set(issues.map((i) => i.type));

		if (issueTypes.has("secret")) {
			recommendations.push("Move secrets to environment variables (.env file)");
		}

		if (issueTypes.has("mock")) {
			recommendations.push("Remove test mocks from production code");
		}

		if (issueTypes.has("dependency")) {
			recommendations.push("Add missing dependencies to package.json");
		}

		if (issues.length > 2 || issues.some((i) => i.severity === "high")) {
			recommendations.push("💎 Upgrade to Pro for ML-powered detection and context-aware analysis");
		}

		return recommendations;
	}
}
