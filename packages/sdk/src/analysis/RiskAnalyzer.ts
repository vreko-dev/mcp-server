/**
 * RiskAnalyzer - Platform-agnostic risk analysis for code security
 *
 * This module provides platform-agnostic risk analysis functionality,
 * detecting security issues in code through pattern matching and scoring.
 *
 * Key Features:
 * - Pattern-based security detection
 * - Risk scoring (0-10 scale)
 * - Severity classification (low/medium/high/critical)
 * - Configurable thresholds
 *
 * Thresholds are centralized in config/Thresholds.ts for consistency across
 * all platforms (VSCode, CLI, MCP, Web).
 *
 * @module RiskAnalyzer
 */

import { THRESHOLDS } from "../config/Thresholds.js";

/**
 * Severity levels for risk analysis
 */
export type RiskSeverity = "low" | "medium" | "high" | "critical";

/**
 * Risk factor detected in analysis
 */
export interface RiskFactor {
	/** Type of risk detected */
	type: string;
	/** Human-readable message */
	message: string;
	/** Line number where issue was found (optional) */
	line?: number;
	/** Column number where issue was found (optional) */
	column?: number;
}

/**
 * Result of risk analysis
 */
export interface AnalysisResult {
	/** Risk score (0-10 scale, where 10 is most risky) */
	score: number;
	/** Severity classification */
	severity: RiskSeverity;
	/** Risk factors detected */
	factors: RiskFactor[];
	/** Recommendations for remediation */
	recommendations: string[];
}

/**
 * Configuration for risk analysis thresholds
 */
export interface RiskThresholds {
	/** Score threshold for blocking (default: 8.0) */
	blockingThreshold: number;
	/** Score threshold for critical severity (default: 7.0) */
	criticalThreshold: number;
	/** Score threshold for high severity (default: 5.0) */
	highThreshold: number;
	/** Score threshold for medium severity (default: 3.0) */
	mediumThreshold: number;
}

/**
 * Default risk thresholds based on SnapBack's security model
 *
 * These values are sourced from the centralized THRESHOLDS configuration
 * to ensure consistency across all platforms.
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
	blockingThreshold: THRESHOLDS.risk.blockingThreshold,
	criticalThreshold: THRESHOLDS.risk.criticalThreshold,
	highThreshold: THRESHOLDS.risk.highThreshold,
	mediumThreshold: THRESHOLDS.risk.mediumThreshold,
};

/**
 * Security pattern definition
 */
interface SecurityPattern {
	/** Pattern name */
	name: string;
	/** Regular expression to match */
	pattern: RegExp;
	/** Risk score contribution (0-10) */
	score: number;
	/** Human-readable message */
	message: string;
	/** Recommendation for remediation */
	recommendation: string;
}

/**
 * Built-in security patterns for detection
 *
 * These patterns detect common security anti-patterns. Scores are sourced from
 * centralized THRESHOLDS.securityScores for consistency.
 */
const SECURITY_PATTERNS: SecurityPattern[] = [
	{
		name: "eval_usage",
		pattern: /\beval\s*\(/g,
		score: THRESHOLDS.securityScores.evalUsage,
		message: "eval() usage detected - high security risk",
		recommendation:
			"Avoid using eval() as it can execute arbitrary code. Use safer alternatives like JSON.parse() for data or explicit function calls.",
	},
	{
		name: "function_constructor",
		pattern: /\bnew\s+Function\s*\(/g,
		score: THRESHOLDS.securityScores.functionConstructor,
		message: "Function constructor usage detected - high security risk",
		recommendation:
			"Avoid using Function constructor as it can execute arbitrary code. Use regular function declarations instead.",
	},
	{
		name: "dangerous_html",
		pattern: /\binnerHTML\s*=/g,
		score: THRESHOLDS.securityScores.dangerousHtml,
		message: "innerHTML usage detected - XSS risk",
		recommendation:
			"Use textContent or safer DOM manipulation methods to prevent XSS attacks. If HTML is necessary, sanitize it first.",
	},
	{
		name: "exec_command",
		pattern: /\bexec\s*\(/g,
		score: THRESHOLDS.securityScores.execCommand,
		message: "exec() usage detected - command injection risk",
		recommendation:
			"Avoid using exec(). If shell commands are necessary, use execFile() with hardcoded command paths and validate all inputs.",
	},
	{
		name: "sql_concat",
		pattern: /SELECT\s+.+\+\s*['"]/gi,
		score: THRESHOLDS.securityScores.sqlConcat,
		message: "Potential SQL injection through string concatenation",
		recommendation: "Use parameterized queries or prepared statements to prevent SQL injection attacks.",
	},
	{
		name: "hardcoded_secrets",
		pattern: /(password|secret|api[_-]?key|token)\s*=\s*['"][^'"]+['"]/gi,
		score: THRESHOLDS.securityScores.hardcodedSecrets,
		message: "Potential hardcoded secret detected",
		recommendation:
			"Store secrets in environment variables or secure secret management systems, never in source code.",
	},
	{
		name: "weak_crypto",
		pattern: /\b(MD5|SHA1)\b/gi,
		score: THRESHOLDS.securityScores.weakCrypto,
		message: "Weak cryptographic algorithm detected",
		recommendation: "Use modern algorithms like SHA-256 or bcrypt for hashing, and AES-256 for encryption.",
	},
];

/**
 * RiskAnalyzer - Analyzes code for security risks
 *
 * This class provides platform-agnostic risk analysis through pattern
 * matching and configurable thresholds. It's designed to work across
 * VSCode, CLI, MCP, and web environments.
 */
export class RiskAnalyzer {
	private thresholds: RiskThresholds;
	private customPatterns: SecurityPattern[] = [];

	/**
	 * Creates a new RiskAnalyzer
	 *
	 * @param thresholds - Custom threshold configuration (optional)
	 */
	constructor(thresholds?: Partial<RiskThresholds>) {
		this.thresholds = {
			...DEFAULT_RISK_THRESHOLDS,
			...thresholds,
		};
	}

	/**
	 * Add a custom security pattern for detection
	 *
	 * @param pattern - Security pattern to add
	 */
	addPattern(pattern: SecurityPattern): void {
		this.customPatterns.push(pattern);
	}

	/**
	 * Analyze content for security risks
	 *
	 * @param content - Code content to analyze
	 * @param filePath - Path to the file (for context, optional)
	 * @returns Analysis result with risk score and factors
	 */
	analyze(content: string, _filePath?: string): AnalysisResult {
		const factors: RiskFactor[] = [];
		const recommendations: string[] = [];
		let totalScore = 0;

		// Combine built-in and custom patterns
		const allPatterns = [...SECURITY_PATTERNS, ...this.customPatterns];

		// Check each pattern against content
		for (const pattern of allPatterns) {
			const matches = content.matchAll(pattern.pattern);
			for (const match of matches) {
				// Add risk factor
				factors.push({
					type: pattern.name,
					message: pattern.message,
					line: this.getLineNumber(content, match.index || 0),
				});

				// Add recommendation (deduplicated)
				if (!recommendations.includes(pattern.recommendation)) {
					recommendations.push(pattern.recommendation);
				}

				// Accumulate score
				totalScore += pattern.score;
			}
		}

		// Cap score at 10
		const cappedScore = Math.min(totalScore, 10);

		// Determine severity based on thresholds
		const severity = this.calculateSeverity(cappedScore);

		return {
			score: cappedScore,
			severity,
			factors,
			recommendations,
		};
	}

	/**
	 * Check if a risk score should block a save operation
	 *
	 * @param score - Risk score to check
	 * @returns True if score exceeds blocking threshold
	 */
	shouldBlock(score: number): boolean {
		return score > this.thresholds.blockingThreshold;
	}

	/**
	 * Calculate severity based on risk score
	 *
	 * @param score - Risk score (0-10)
	 * @returns Severity classification
	 */
	private calculateSeverity(score: number): RiskSeverity {
		if (score >= this.thresholds.criticalThreshold) {
			return "critical";
		}
		if (score >= this.thresholds.highThreshold) {
			return "high";
		}
		if (score >= this.thresholds.mediumThreshold) {
			return "medium";
		}
		return "low";
	}

	/**
	 * Get line number from character index
	 *
	 * @param content - Full content string
	 * @param index - Character index
	 * @returns Line number (1-indexed)
	 */
	private getLineNumber(content: string, index: number): number {
		const lines = content.substring(0, index).split("\n");
		return lines.length;
	}

	/**
	 * Get current thresholds
	 *
	 * @returns Current threshold configuration
	 */
	getThresholds(): RiskThresholds {
		return { ...this.thresholds };
	}

	/**
	 * Update thresholds
	 *
	 * @param thresholds - New threshold values
	 */
	setThresholds(thresholds: Partial<RiskThresholds>): void {
		this.thresholds = {
			...this.thresholds,
			...thresholds,
		};
	}
}
