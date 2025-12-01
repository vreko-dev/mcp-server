import type { Logger } from "@snapback/contracts";
import { createSilentLogger } from "@snapback/contracts";
import type { AnalysisResult } from "../../guardian.js";
import { FusedScanner } from "../scanner/FusedScanner.js";
import type { DetectionPlugin } from "../types.js";
import { isTestFile } from "../utils/ast-helpers.js";
import { calculateCombinedEntropy } from "../utils/entropy.js";

/**
 * Secret Detection Plugin
 * Detects when AI coding assistants make potentially problematic changes related to secrets
 */
export class SecretDetectionPlugin implements DetectionPlugin {
	readonly name = "SecretDetectionPlugin";

	private scanner = new FusedScanner();
	private logger: Logger;

	/**
	 * Creates a new SecretDetectionPlugin
	 *
	 * @param logger - Logger for debug/info messages (optional)
	 */
	constructor(logger?: Logger) {
		this.logger = logger || createSilentLogger();
		// Register secret patterns
		this.scanner.register({
			id: "aws_key",
			regex: /AKIA[A-Z0-9]{16}/g,
		});
		this.scanner.register({
			id: "github_token",
			regex: /ghp_[a-zA-Z0-9]{36}/g,
		});
		this.scanner.register({
			id: "github_oauth_token",
			regex: /gho_[a-zA-Z0-9]{36}/g,
		});
		this.scanner.register({
			id: "openai_key",
			regex: /sk-[a-zA-Z0-9]{32,}/g,
		});
		this.scanner.register({
			id: "stripe_key",
			regex: /pk_(live|test)_[a-zA-Z0-9]{24,}/g,
		});
		this.scanner.register({
			id: "google_api_key",
			regex: /AIza[a-zA-Z0-9_-]{35}/g,
		});
		this.scanner.register({
			id: "jwt_token",
			regex: /eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/g,
		});
		this.scanner.register({
			id: "private_key",
			regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
		});
		this.scanner.register({
			id: "postgresql_connection",
			regex: /postgres(ql)?:\/\/[^\s"']+/g,
		});
		this.scanner.register({
			id: "mysql_connection",
			regex: /mysql:\/\/[^\s"']+/g,
		});
		this.scanner.register({
			id: "mongodb_connection",
			regex: /mongodb(\+srv)?:\/\/[^\s"']+/g,
		});
		this.scanner.register({
			id: "base64_secret",
			regex: /[A-Za-z0-9+/]{20,}={0,2}/g,
		});
		this.scanner.register({
			id: "concatenated_string",
			regex: /"[^"]*"\s*\+\s*[^;\n]+/g,
		});
		this.scanner.register({
			id: "template_literal",
			regex: /`([^`]*\$\{[^}]*\})*[^`]*`/g,
		});
	}

	/**
	 * Analyze content for potential secrets
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

		// Skip .env.example files
		if (filePath?.includes(".env.example")) {
			return this.createEmptyResult();
		}

		// Skip Git-ignored files (simplified check)
		if (filePath && (filePath.startsWith(".") || filePath.includes("/."))) {
			// But don't skip actual dot files in src
			if (!filePath.includes("/src/")) {
				return this.createEmptyResult();
			}
		}

		let score = 0;
		const factors: string[] = [];
		const recommendations: string[] = [];
		let severity: "low" | "medium" | "high" | "critical" = "low";

		// Process content to remove comments
		const uncommentedContent = this.removeComments(content);

		// Use FusedScanner to check for common secret patterns in a single pass
		const patternMatches = this.scanner.scanGrouped(uncommentedContent);

		// Define pattern configurations
		const patternConfigs = [
			{ id: "aws_key", name: "AWS access key", weight: 0.95 },
			{ id: "github_token", name: "GitHub token", weight: 0.95 },
			{ id: "github_oauth_token", name: "GitHub OAuth token", weight: 0.95 },
			{ id: "openai_key", name: "OpenAI API key", weight: 0.95 },
			{ id: "stripe_key", name: "Stripe secret key", weight: 0.95 },
			{ id: "google_api_key", name: "Google API key", weight: 0.9 },
			{ id: "jwt_token", name: "JWT token", weight: 0.8 },
			{ id: "private_key", name: "private key", weight: 0.95 },
			{ id: "postgresql_connection", name: "database connection string (PostgreSQL)", weight: 0.8 },
			{ id: "mysql_connection", name: "database connection string (MySQL)", weight: 0.8 },
			{ id: "mongodb_connection", name: "database connection string (MongoDB)", weight: 0.8 },
		];

		// Check each pattern
		for (const { id, name, weight } of patternConfigs) {
			const matches = patternMatches.get(id) || [];
			if (matches.length > 0) {
				// Use moderated scaling for match counts to prevent score explosion while maintaining reasonable scores
				const matchCount = matches.length;
				const scaledWeight = this.moderatedScaling(matchCount, weight);
				const currentScore = Math.min(1.0, scaledWeight);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(`Potential ${name} detected (${matchCount} occurrences)`);

				// Update severity based on the highest weight pattern found
				if (weight >= 0.95) {
					severity = "critical";
				} else if (weight >= 0.9 && severity !== "critical") {
					severity = "critical";
				} else if (weight >= 0.8 && severity !== "critical" && severity !== "high") {
					severity = "high";
				} else if (weight >= 0.5 && severity === "low") {
					severity = "medium";
				}
			}
		}

		// Split uncommented content into lines for entropy checking
		const lines = uncommentedContent.split("\n");

		// Check for high entropy strings (potential secrets) in uncommented content
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip lines that are clearly not secrets
			if (
				line.length < 8 ||
				line.includes("uuid") ||
				line.includes("guid") ||
				line.includes("id") ||
				line.includes("placeholder") ||
				line.includes("example") ||
				line.includes("template") ||
				line.includes("...") ||
				this.isLikelyUUID(line) ||
				this.isLikelyPlaceholder(line)
			) {
				// Skip lines with "..." which are placeholders
				continue;
			}

			// Check for high entropy using combined entropy calculation
			const combinedEntropy = calculateCombinedEntropy(line);
			// Convert back to character entropy scale for threshold comparison
			const charEntropy = combinedEntropy * 8;

			if (charEntropy > 4.5) {
				// Additional checks to reduce false positives
				const hasPlaceholder =
					(line.includes("<") && line.includes(">")) || (line.includes("{{") && line.includes("}}"));

				if (!hasPlaceholder) {
					const currentScore = Math.min(0.7, combinedEntropy); // Already normalized to 0-1
					if (currentScore > score) {
						score = currentScore;
					}
					factors.push(`high entropy string detected on line ${i + 1} (entropy: ${charEntropy.toFixed(2)})`);

					if (currentScore >= 0.6 && (severity === "low" || severity === "medium")) {
						severity = "medium";
					}
				}
			}
		}

		// Check for base64 encoded secrets in uncommented content
		const base64Matches = patternMatches.get("base64_secret") || [];
		if (base64Matches.length > 0) {
			let validBase64Matches = 0;
			for (const match of base64Matches) {
				// Try to decode and check if it looks like a secret
				try {
					const decoded = atob(match.match);
					if (
						decoded.length > 10 &&
						(decoded.includes("key") || decoded.includes("secret") || decoded.includes("token"))
					) {
						validBase64Matches++;
					}
				} catch (_e) {
					// Not valid base64, continue
				}
			}

			if (validBase64Matches > 0) {
				// Use moderated scaling for match counts
				const scaledMatches = this.moderatedScaling(validBase64Matches, 1.0);
				const currentScore = Math.min(0.7, 0.7 * scaledMatches);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push(`Base64 encoded secret detected (${validBase64Matches} occurrences)`);
				if (severity === "low") {
					severity = "high";
				}
			}
		}

		// Check for concatenated strings (simple case)
		const concatMatches = patternMatches.get("concatenated_string") || [];
		if (concatMatches.length > 0) {
			// Use moderated scaling for match counts
			const scaledMatches = this.moderatedScaling(concatMatches.length, 1.0);
			const currentScore = Math.min(0.4, 0.4 * scaledMatches);
			if (currentScore > score) {
				score = currentScore;
			}
			factors.push(`Concatenated string detected (${concatMatches.length} occurrences)`);
		}

		// Check for template literals with secret prefixes
		const templateMatches = patternMatches.get("template_literal") || [];
		for (const match of templateMatches) {
			// Check if the template literal starts with a secret prefix
			if (match.match.startsWith("`sk-")) {
				const currentScore = Math.min(0.95, 0.95);
				if (currentScore > score) {
					score = currentScore;
				}
				factors.push("Template literal with secret prefix detected");
				severity = "critical";
			}
		}

		// Recommendations
		if (score > 0.3) {
			recommendations.push("Move secrets to environment variables");
			recommendations.push("Use a secrets management system");
			recommendations.push("Add file to .gitignore if it contains secrets");
		}

		// Cap score at 1.0
		score = Math.min(score, 1.0);

		// Log for debugging
		if (score > 0.3) {
			this.logger.info("Secret detection found potential issues", {
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
	 * Remove comments from content to reduce false positives
	 *
	 * @param content - The content to process
	 * @returns Content with comments removed
	 */
	private removeComments(content: string): string {
		// More sophisticated comment removal that preserves template literals and URLs
		let result = content;

		// Process character by character to properly handle strings and comments
		let inSingleQuote = false;
		let inDoubleQuote = false;
		let inTemplateLiteral = false;
		let inMultiLineComment = false;
		let inSingleLineComment = false;

		let processed = "";
		for (let i = 0; i < result.length; i++) {
			const char = result[i];
			const nextChar = result[i + 1];

			// Handle multi-line comment start
			if (
				!inSingleQuote &&
				!inDoubleQuote &&
				!inTemplateLiteral &&
				char === "/" &&
				nextChar === "*" &&
				!inMultiLineComment &&
				!inSingleLineComment
			) {
				inMultiLineComment = true;
				i++; // Skip the next character (*)
				continue;
			}

			// Handle multi-line comment end
			if (inMultiLineComment && char === "*" && nextChar === "/") {
				inMultiLineComment = false;
				i++; // Skip the next character (/)
				continue;
			}

			// Handle single-line comment start
			if (
				!inSingleQuote &&
				!inDoubleQuote &&
				!inTemplateLiteral &&
				!inMultiLineComment &&
				char === "/" &&
				nextChar === "/" &&
				!inSingleLineComment
			) {
				inSingleLineComment = true;
				i++; // Skip the next character (/)
				continue;
			}

			// Handle new line (ends single-line comments)
			if (inSingleLineComment && (char === "\n" || char === "\r")) {
				inSingleLineComment = false;
				processed += char;
				continue;
			}

			// Handle entering/exiting single quotes
			if (!inDoubleQuote && !inTemplateLiteral && !inMultiLineComment && !inSingleLineComment && char === "'") {
				inSingleQuote = !inSingleQuote;
			}

			// Handle entering/exiting double quotes
			if (!inSingleQuote && !inTemplateLiteral && !inMultiLineComment && !inSingleLineComment && char === '"') {
				inDoubleQuote = !inDoubleQuote;
			}

			// Handle entering/exiting template literals
			if (!inSingleQuote && !inDoubleQuote && !inMultiLineComment && !inSingleLineComment && char === "`") {
				inTemplateLiteral = !inTemplateLiteral;
			}

			// Add character if not in a comment
			if (!inMultiLineComment && !inSingleLineComment) {
				processed += char;
			}
		}

		result = processed;

		// Remove shell-style comments (be careful with URLs) but not inside strings
		let finalResult = "";
		inSingleQuote = false;
		inDoubleQuote = false;
		inTemplateLiteral = false;

		for (let i = 0; i < result.length; i++) {
			const char = result[i];
			const _nextChar = result[i + 1];

			// Handle entering/exiting quotes
			if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
				inDoubleQuote = !inDoubleQuote;
			} else if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
				inSingleQuote = !inSingleQuote;
			} else if (char === "`" && !inSingleQuote && !inDoubleQuote) {
				inTemplateLiteral = !inTemplateLiteral;
			} else if (char === "#" && !inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
				// Check if this is part of a URL
				const beforeHash = result.substring(0, i);
				if (!beforeHash.includes("http://") && !beforeHash.includes("https://")) {
					// This is a shell-style comment, skip to end of line
					while (i < result.length && result[i] !== "\n" && result[i] !== "\r") {
						i++;
					}
					// Add the newline character back
					if (i < result.length) {
						finalResult += result[i];
					}
					continue;
				}
			}

			finalResult += char;
		}

		return finalResult;
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

	/**
	 * Check if a string is likely a UUID
	 *
	 * @param str - String to check
	 * @returns True if string is likely a UUID
	 */
	private isLikelyUUID(str: string): boolean {
		// UUID pattern: 8-4-4-4-12 hex digits
		const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
		return uuidPattern.test(str);
	}

	/**
	 * Check if a string is likely a placeholder
	 *
	 * @param str - String to check
	 * @returns True if string is likely a placeholder
	 */
	private isLikelyPlaceholder(str: string): boolean {
		// Common placeholder patterns
		const placeholderPatterns = [
			/<[^>]+>/, // <PLACEHOLDER>
			/\{\{[^}]+\}\}/, // {{PLACEHOLDER}}
			/\{[^}]+\}/, // {PLACEHOLDER}
			/YOUR_/i, // YOUR_API_KEY
			/REPLACE_?ME/i, // REPLACE_ME or REPLACEME
		];

		return placeholderPatterns.some((pattern) => pattern.test(str));
	}
}
