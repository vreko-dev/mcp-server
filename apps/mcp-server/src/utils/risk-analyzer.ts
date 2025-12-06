/**
 * Risk Analysis Utility
 *
 * Analyzes git diffs for security threats and risk patterns.
 * Used by MCP Server analyze-risk tool.
 *
 * @module risk-analyzer
 *
 * Risk Scoring:
 * - 0-30: Low risk (documentation, minor changes)
 * - 30-70: Medium risk (code refactoring, moderate changes)
 * - 70-100: High risk (credentials, API keys, critical config)
 *
 * Confidence Scoring:
 * - 0.0-0.5: Low confidence (ambiguous patterns)
 * - 0.5-0.8: Medium confidence (moderate patterns)
 * - 0.8-1.0: High confidence (clear security threats)
 */

/**
 * Input for risk analysis
 */
export interface RiskAnalysisInput {
	/** Git diff content (unified diff format) */
	diff: string;
	/** Optional file path for context-aware analysis */
	filePath?: string;
	/** Optional user ID for rate limiting */
	userId?: string;
}

/**
 * Risk analysis result with scoring and threats
 */
export interface RiskAnalysisResult {
	/** Risk score from 0-100 */
	riskScore: number;
	/** Confidence in risk assessment (0-1) */
	confidence: number;
	/** Detected threat types */
	threats: string[];
	/** Actionable security recommendations */
	recommendations: string[];
	/** Diff metadata */
	metadata?: {
		linesAdded: number;
		linesRemoved: number;
		affectedFiles: number;
	};
}

/**
 * High-risk patterns with scoring weights
 */
const RISK_PATTERNS = {
	// API Keys and Secrets
	apiKey: {
		pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|sk_live|pk_live)["\s:=]+[\w-]{20,}/gi,
		score: 90,
		confidence: 0.95,
		threat: "api_key_exposure",
		recommendation: "Remove hardcoded API keys. Use environment variables instead.",
	},

	// Credentials
	password: {
		pattern: /(?:password|passwd|pwd)["\s:=]+[^\s]{8,}/gi,
		score: 80,
		confidence: 0.85,
		threat: "credential_exposure",
		recommendation: "Never commit passwords. Use secure credential management.",
	},

	// Database URLs with credentials
	databaseUrl: {
		pattern: /(?:postgres|mysql|mongodb):\/\/[\w]+:[\w]+@/gi,
		score: 85,
		confidence: 0.9,
		threat: "credential_exposure",
		recommendation: "Use connection strings from environment variables.",
	},

	// AWS Credentials
	awsCredentials: {
		pattern: /(?:AKIA[0-9A-Z]{16}|aws_access_key_id|aws_secret_access_key)/gi,
		score: 95,
		confidence: 0.98,
		threat: "api_key_exposure",
		recommendation: "Immediately rotate AWS credentials and use IAM roles.",
	},

	// Malicious script patterns (postinstall hooks, curl pipes)
	maliciousScript: {
		pattern: /(?:postinstall|preinstall).*(?:curl|wget).*(?:\||sh|bash)/gi,
		score: 95,
		confidence: 0.98,
		threat: "config_modification",
		recommendation: "Suspicious script detected. Review package.json scripts carefully.",
	},
};

/**
 * Critical file patterns
 */
const CRITICAL_FILES = [
	{ pattern: /package\.json$/i, score: 70, threat: "config_modification" },
	{ pattern: /\.env/i, score: 75, threat: "config_modification" },
	{ pattern: /tsconfig\.json$/i, score: 50, threat: "config_modification" },
	{ pattern: /webpack\.config/i, score: 50, threat: "config_modification" },
	{ pattern: /\.npmrc$/i, score: 55, threat: "config_modification" },
];

/**
 * Analyze git diff for security risks
 *
 * @param input - Risk analysis input with diff and optional context
 * @returns Risk analysis result with score, threats, and recommendations
 *
 * @example
 * ```typescript
 * const result = await analyzeRisk({
 *   diff: gitDiff,
 *   filePath: "src/config.ts"
 * });
 *
 * if (result.riskScore >= 70) {
 *   console.error("High risk detected!", result.threats);
 * }
 * ```
 */
export async function analyzeRisk(input: RiskAnalysisInput): Promise<RiskAnalysisResult> {
	const { diff, filePath } = input;

	// Handle empty or whitespace-only diffs
	if (!diff || diff.trim().length === 0) {
		return {
			riskScore: 0,
			confidence: 1.0,
			threats: [],
			recommendations: [],
			metadata: {
				linesAdded: 0,
				linesRemoved: 0,
				affectedFiles: 0,
			},
		};
	}

	const threats: string[] = [];
	const recommendations: string[] = [];
	let maxScore = 0;
	let totalConfidence = 0;
	let patternCount = 0;

	// Extract metadata
	const metadata = extractMetadata(diff);

	// Check for high-risk patterns
	for (const [name, config] of Object.entries(RISK_PATTERNS)) {
		const matches = diff.match(config.pattern);
		if (matches) {
			threats.push(config.threat);
			recommendations.push(config.recommendation);
			maxScore = Math.max(maxScore, config.score);
			totalConfidence += config.confidence;
			patternCount++;
		}
	}

	// Check for large deletions (high risk)
	if (metadata.linesRemoved >= 100) {
		threats.push("large_deletion");
		recommendations.push("Review large deletions carefully to prevent data loss.");
		maxScore = Math.max(maxScore, 60);
		totalConfidence += 0.7;
		patternCount++;
	}

	// Check critical file modifications
	if (filePath) {
		for (const criticalFile of CRITICAL_FILES) {
			if (criticalFile.pattern.test(filePath)) {
				threats.push(criticalFile.threat);
				recommendations.push(`Critical file ${filePath} modified. Review changes carefully.`);
				maxScore = Math.max(maxScore, criticalFile.score);
				totalConfidence += 0.75;
				patternCount++;
				break;
			}
		}
	}

	// Calculate final risk score
	let riskScore = maxScore;

	// Boost score for multiple patterns
	if (threats.length > 1) {
		riskScore = Math.min(100, Math.round(riskScore * 1.2));
	}

	// Moderate risk for significant changes without clear patterns
	if (riskScore === 0 && metadata.linesAdded > 50) {
		riskScore = 35; // Medium risk
		totalConfidence += 0.4;
		patternCount++;
	}

	// Medium risk for moderate refactoring (auth/security files)
	if (riskScore === 0 && filePath && /auth|security|login|token|session/i.test(filePath)) {
		if (metadata.linesAdded >= 2 || metadata.linesRemoved >= 2) {
			riskScore = 40; // Medium risk for auth-related changes
			totalConfidence += 0.5;
			patternCount++;
		}
	}

	// Low-medium risk for any non-trivial code changes
	if (riskScore === 0 && metadata.linesAdded >= 3 && metadata.linesRemoved >= 1) {
		riskScore = 30; // Low-medium risk
		totalConfidence += 0.35;
		patternCount++;
	}

	// Calculate average confidence
	const confidence = patternCount > 0 ? Math.min(1, Math.round((totalConfidence / patternCount) * 100) / 100) : 0.3; // Low confidence for no patterns

	// De-duplicate threats and recommendations
	const uniqueThreats = Array.from(new Set(threats));
	const uniqueRecommendations = Array.from(new Set(recommendations));

	return {
		riskScore,
		confidence,
		threats: uniqueThreats,
		recommendations: uniqueRecommendations,
		metadata,
	};
}

/**
 * Extract diff metadata (lines added/removed, affected files)
 *
 * Parses unified diff format to count additions, deletions, and files.
 *
 * @param diff - Git diff in unified format
 * @returns Metadata with line counts and file count
 */
function extractMetadata(diff: string): {
	linesAdded: number;
	linesRemoved: number;
	affectedFiles: number;
} {
	const lines = diff.split("\n");

	let linesAdded = 0;
	let linesRemoved = 0;
	const fileSet = new Set<string>();

	for (const line of lines) {
		// Count additions
		if (line.startsWith("+") && !line.startsWith("+++")) {
			linesAdded++;
		}

		// Count deletions
		if (line.startsWith("-") && !line.startsWith("---")) {
			linesRemoved++;
		}

		// Track affected files
		if (line.startsWith("diff --git")) {
			const match = line.match(/diff --git a\/(.*) b\//);
			if (match) {
				fileSet.add(match[1]);
			}
		}
	}

	return {
		linesAdded,
		linesRemoved,
		affectedFiles: fileSet.size || 1,
	};
}
