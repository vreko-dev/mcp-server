import type { AnalysisPlugin, AnalysisResult } from "@snapback/core";

/**
 * Advanced secrets detection plugin
 * Detects AWS access keys, JWT tokens, and other high-entropy secrets
 * while ignoring placeholders and comments
 */
export class AdvancedSecretsPlugin implements AnalysisPlugin {
	name = "advanced-secrets";

	async analyze(content: string, _filePath?: string, _metadata?: any): Promise<AnalysisResult> {
		const factors: string[] = [];
		const recommendations: string[] = [];

		// Split content into lines for analysis
		const lines = content.split("\n");

		// Detect various types of secrets
		const awsKeys = this.detectAWSKeys(lines);
		const jwtTokens = this.detectJWT(lines);
		const highEntropySecrets = this.detectHighEntropySecrets(lines);

		// Combine all findings
		const allFindings = [...awsKeys, ...jwtTokens, ...highEntropySecrets];

		if (allFindings.length > 0) {
			factors.push(`Advanced secrets detected: ${allFindings.length} potential secrets found`);

			// Add specific recommendations based on findings
			if (awsKeys.length > 0) {
				recommendations.push("Remove AWS keys from code and use environment variables or secure vault");
			}
			if (jwtTokens.length > 0) {
				recommendations.push("Remove JWT tokens from code and use secure token management");
			}
			if (highEntropySecrets.length > 0) {
				recommendations.push("Review high-entropy strings and remove potential secrets");
			}
		}

		// Calculate severity based on number of findings
		const severity = allFindings.length > 5 ? "high" : allFindings.length > 0 ? "medium" : "low";
		const score = Math.min(10, allFindings.length * 2); // 2 points per finding, max 10

		return {
			score,
			factors,
			recommendations,
			severity,
		};
	}

	/**
	 * Detect AWS access keys (AKIA pattern)
	 * Ignores placeholders and comments
	 */
	private detectAWSKeys(lines: string[]): string[] {
		const findings: string[] = [];
		// AWS key pattern: AKIA followed by 16 alphanumeric characters
		const awsKeyPattern = /(AKIA[A-Z0-9]{16})/g;

		for (const line of lines) {
			// Skip comments and placeholders
			if (this.isCommentOrPlaceholder(line)) {
				continue;
			}

			let match: RegExpExecArray | null = awsKeyPattern.exec(line);
			while (match !== null) {
				const key = match[1];
				// Additional validation to reduce false positives
				if (this.isValidAWSKey(key)) {
					findings.push(key);
				}
				match = awsKeyPattern.exec(line);
			}
		}

		return findings;
	}

	/**
	 * Detect JWT tokens
	 * Ignores placeholders and comments
	 */
	private detectJWT(lines: string[]): string[] {
		const findings: string[] = [];
		// JWT pattern that can be inside quotes: eyJ followed by base64 encoded JSON (header.payload.signature)
		const jwtPattern = /["'`]?(eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*)["'`]?/g;

		for (const line of lines) {
			// Skip comments and placeholders
			if (this.isCommentOrPlaceholder(line)) {
				continue;
			}

			let match: RegExpExecArray | null = jwtPattern.exec(line);
			while (match !== null) {
				const token = match[1];
				// Additional validation to reduce false positives
				if (this.isValidJWT(token)) {
					findings.push(token);
				}
				match = jwtPattern.exec(line);
			}
		}

		return findings;
	}

	/**
	 * Detect high-entropy secrets
	 * Looks for strings with high entropy that might be secrets
	 */
	private detectHighEntropySecrets(lines: string[]): string[] {
		const findings: string[] = [];

		for (const line of lines) {
			// Skip comments and placeholders
			if (this.isCommentOrPlaceholder(line)) {
				continue;
			}

			// Look for potential secrets in the line
			// This pattern looks for strings that are likely to be secrets
			const potentialSecrets = line.match(/["'`]([a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]{16,100})["'`]/g);

			if (potentialSecrets) {
				for (const potential of potentialSecrets) {
					// Extract the actual secret value (remove quotes)
					const secret = potential.substring(1, potential.length - 1);

					// Check if it's a high-entropy string and not a common word
					if (this.isHighEntropy(secret) && !this.isCommonWord(secret)) {
						// Additional checks to reduce false positives
						if (this.isValidSecretCandidate(secret)) {
							findings.push(secret);
						}
					}
				}
			}
		}

		return findings;
	}

	/**
	 * Check if a line is a comment or contains placeholders
	 */
	private isCommentOrPlaceholder(line: string): boolean {
		// Trim whitespace
		const trimmed = line.trim();

		// Check for comments
		if (
			trimmed.startsWith("//") ||
			trimmed.startsWith("#") ||
			trimmed.startsWith("/*") ||
			trimmed.startsWith("*")
		) {
			return true;
		}

		// Check for placeholders - more specific patterns
		const lowerLine = trimmed.toLowerCase();
		if (
			lowerLine.includes("placeholder") ||
			lowerLine.includes("your_key_here") ||
			lowerLine.includes("your_token_here") ||
			lowerLine.includes("your_secret_here")
		) {
			return true;
		}

		// Check for common placeholder patterns
		if (trimmed.includes("XXXXXX") || trimmed.includes("****") || trimmed.includes("____")) {
			return true;
		}

		return false;
	}

	/**
	 * Validate AWS key format
	 */
	private isValidAWSKey(key: string): boolean {
		// AWS keys should be 20 characters starting with AKIA
		if (!key.startsWith("AKIA") || key.length !== 20) {
			return false;
		}

		// Check that it contains only valid characters
		if (!/^[A-Z0-9]+$/.test(key)) {
			return false;
		}

		return true;
	}

	/**
	 * Validate JWT token
	 */
	private isValidJWT(token: string): boolean {
		// JWT should have 3 parts separated by dots
		const parts = token.split(".");
		if (parts.length !== 3) {
			return false;
		}

		// Each part should be base64url encoded
		for (const part of parts) {
			if (!/^[A-Za-z0-9-_]+$/.test(part)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if a string has high entropy (indicating it might be a secret)
	 */
	private isHighEntropy(str: string): boolean {
		// Too short strings are not considered
		if (str.length < 8) {
			return false;
		}

		// Calculate Shannon entropy
		const len = str.length;
		const freq: { [key: string]: number } = {};

		for (const char of str) {
			freq[char] = (freq[char] || 0) + 1;
		}

		let entropy = 0;
		for (const char in freq) {
			const p = freq[char] / len;
			entropy -= p * Math.log2(p);
		}

		// Consider it high entropy if > 2.5 (adjustable threshold)
		return entropy > 2.5;
	}

	/**
	 * Check if a string is a common word (to reduce false positives)
	 */
	private isCommonWord(str: string): boolean {
		const commonWords = [
			"password",
			"secret",
			"token",
			"key",
			"apikey",
			"api_key",
			"access_token",
			"authorization",
			"authentication",
			"credential",
			"config",
			"setting",
			"example",
			"placeholder",
			"your_key_here",
			"your_token_here",
		];

		const lowerStr = str.toLowerCase();
		return commonWords.some((word) => lowerStr.includes(word));
	}

	/**
	 * Additional validation for secret candidates
	 */
	private isValidSecretCandidate(str: string): boolean {
		// Should not be too short or too long
		if (str.length < 16 || str.length > 200) {
			return false;
		}

		// Should contain a mix of characters
		const hasLetters = /[a-zA-Z]/.test(str);
		const hasNumbers = /[0-9]/.test(str);
		const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(str);

		// Should have at least two types of characters
		const charTypes = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;
		if (charTypes < 2) {
			return false;
		}

		return true;
	}
}
