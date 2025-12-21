/**
 * Secret Detector - Identifies potential secrets in code
 * Uses pattern matching and entropy analysis
 */

export interface SecretPattern {
	name: string;
	pattern: RegExp;
	entropy?: number;
	severity: "low" | "medium" | "high" | "critical";
}

export interface SecretFinding {
	type: string;
	line: number;
	column: number;
	snippet: string;
	severity: "low" | "medium" | "high" | "critical";
	entropy?: number;
	ruleId: string;
}

export interface SecretDetectionResult {
	findings: SecretFinding[];
	riskScore: number;
}

// Known secret patterns
const SECRET_PATTERNS: SecretPattern[] = [
	{
		name: "AWS Access Key",
		pattern: /AKIA[0-9A-Z]{16}/g,
		severity: "critical",
	},
	{
		name: "AWS Secret Key",
		pattern: /aws_secret_access_key\s*=\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
		severity: "critical",
	},
	{
		name: "GitHub Token",
		pattern: /gh[ps]_[a-zA-Z0-9]{36}/g,
		severity: "critical",
	},
	{
		name: "Stripe API Key",
		pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24}/g,
		severity: "critical",
	},
	{
		name: "Generic API Key",
		pattern: /["']?api[_-]?key["']?\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
		severity: "high",
	},
	{
		name: "Private Key Header",
		pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
		severity: "critical",
	},
	{
		name: "Bearer Token",
		pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
		severity: "high",
	},
	{
		name: "Password Assignment",
		pattern: /password\s*[=:]\s*["']([^"']{8,})["']/gi,
		severity: "medium",
	},
	{
		name: "OAuth Token",
		pattern: /oauth[_-]?token\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
		severity: "high",
	},
];

export class SecretDetector {
	/**
	 * Detect secrets in file content
	 */
	detect(content: string, filePath: string): SecretDetectionResult {
		const findings: SecretFinding[] = [];

		// Skip test files to reduce false positives
		if (this.isTestFile(filePath)) {
			return { findings: [], riskScore: 0 };
		}

		// Split content into lines for accurate reporting
		const lines = content.split("\n");

		// Remove multi-line comments first
		const cleanedLines = this.removeMultiLineComments(lines);

		// Check each pattern
		for (const pattern of SECRET_PATTERNS) {
			for (let lineNum = 0; lineNum < cleanedLines.length; lineNum++) {
				const line = cleanedLines[lineNum];
				const originalLine = lines[lineNum]; // Keep for snippet
				const matches = line.matchAll(pattern.pattern);

				for (const match of matches) {
					// Skip if it's in a single-line comment
					if (this.isInSingleLineComment(originalLine, match.index || 0)) {
						continue;
					}

					const snippet = match[0].substring(0, 50); // First 50 chars
					const entropy = this.calculateEntropy(match[1] || match[0]);

					findings.push({
						type: pattern.name,
						line: lineNum + 1,
						column: (match.index || 0) + 1,
						snippet,
						severity: pattern.severity,
						entropy,
						ruleId: `secret-detection/${pattern.name.toLowerCase().replace(/\s+/g, "-")}`,
					});
				}
			}
		}

		// Check for high-entropy strings (potential secrets)
		this.detectHighEntropyStrings(cleanedLines, lines, findings);

		// Calculate risk score (0-10)
		const riskScore = this.calculateRiskScore(findings);

		return { findings, riskScore };
	}

	/**
	 * Calculate Shannon entropy of a string
	 */
	private calculateEntropy(str: string): number {
		if (str.length === 0) {
			return 0;
		}

		const freq: Record<string, number> = {};
		for (const char of str) {
			freq[char] = (freq[char] || 0) + 1;
		}

		let entropy = 0;
		const len = str.length;
		for (const char in freq) {
			const p = freq[char] / len;
			entropy -= p * Math.log2(p);
		}

		return entropy;
	}

	/**
	 * Detect high-entropy strings that might be secrets
	 */
	private detectHighEntropyStrings(
		cleanedLines: string[],
		_originalLines: string[],
		findings: SecretFinding[],
	): void {
		const stringPattern = /["']([a-zA-Z0-9+/=_-]{20,})["']/g;

		for (let lineNum = 0; lineNum < cleanedLines.length; lineNum++) {
			const line = cleanedLines[lineNum];
			const matches = line.matchAll(stringPattern);

			for (const match of matches) {
				const str = match[1];
				const entropy = this.calculateEntropy(str);

				// High entropy threshold: 4.5 (randomness indicator)
				if (entropy > 4.5 && str.length >= 20) {
					findings.push({
						type: "High-Entropy String",
						line: lineNum + 1,
						column: (match.index || 0) + 1,
						snippet: str.substring(0, 50),
						severity: "medium",
						entropy,
						ruleId: "secret-detection/high-entropy-string",
					});
				}
			}
		}
	}

	/**
	 * Check if file is a test file
	 */
	private isTestFile(filePath: string): boolean {
		const testPatterns = [
			/\.test\.[jt]sx?$/,
			/\.spec\.[jt]sx?$/,
			/__tests__\//,
			/\/test\//,
			/\/tests\//,
			/\.fixture\.[jt]sx?$/,
		];

		return testPatterns.some((pattern) => pattern.test(filePath));
	}

	/**
	 * Remove multi-line comments from lines
	 */
	private removeMultiLineComments(lines: string[]): string[] {
		const result: string[] = [];
		let inComment = false;

		for (const line of lines) {
			let cleanedLine = line;

			if (inComment) {
				// Check if comment ends on this line
				const endIndex = line.indexOf("*/");
				if (endIndex !== -1) {
					cleanedLine = line.substring(endIndex + 2);
					inComment = false;
				} else {
					// Entire line is in comment
					cleanedLine = "";
				}
			}

			// Check for comment start
			const startIndex = cleanedLine.indexOf("/*");
			if (startIndex !== -1) {
				const endIndex = cleanedLine.indexOf("*/", startIndex);
				if (endIndex !== -1) {
					// Single-line /* */ comment
					cleanedLine = cleanedLine.substring(0, startIndex) + cleanedLine.substring(endIndex + 2);
				} else {
					// Multi-line comment starts
					cleanedLine = cleanedLine.substring(0, startIndex);
					inComment = true;
				}
			}

			result.push(cleanedLine);
		}

		return result;
	}

	/**
	 * Check if position is in a single-line comment
	 */
	private isInSingleLineComment(line: string, position: number): boolean {
		const beforePosition = line.substring(0, position);
		// Check for // comments
		if (beforePosition.includes("//")) {
			return true;
		}
		return false;
	}

	/**
	 * Calculate overall risk score (0-10)
	 */
	private calculateRiskScore(findings: SecretFinding[]): number {
		if (findings.length === 0) {
			return 0;
		}

		// Weight by severity
		const severityWeights = {
			critical: 10,
			high: 7,
			medium: 4,
			low: 2,
		};

		let totalScore = 0;
		for (const finding of findings) {
			totalScore += severityWeights[finding.severity];
			// Add entropy bonus for high-entropy findings
			if (finding.entropy && finding.entropy > 5) {
				totalScore += 1;
			}
		}

		// Cap at 10
		return Math.min(10, totalScore);
	}
}
