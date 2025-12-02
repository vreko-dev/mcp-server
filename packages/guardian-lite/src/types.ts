/**
 * Risk level classification for analyzed code
 * @see AnalysisResult.riskLevel
 */
export type RiskLevel = "none" | "low" | "medium" | "high";

/**
 * Severity level of a detected issue
 * @see Issue.severity
 */
export type Severity = "low" | "medium" | "high";

/**
 * Category of detected issue
 * @see Issue.type
 */
export type IssueType = "secret" | "mock" | "dependency";

/**
 * A detected issue in the analyzed code
 */
export interface Issue {
	/**
	 * Category of the issue: secret (credentials), mock (test code), or dependency (missing imports)
	 */
	type: IssueType;

	/**
	 * Severity level: low (minor), medium (notable), high (critical)
	 */
	severity: Severity;

	/**
	 * Human-readable description of the issue
	 * Format: "Detected {PATTERN_NAME}"
	 */
	message: string;

	/**
	 * Pattern identifier that matched (e.g., "AWS_KEY", "JEST_MOCK")
	 */
	pattern: string;

	/**
	 * Line number where issue was detected (1-indexed, optional)
	 */
	line?: number;
}

/**
 * Result of analyzing code with GuardianLite
 */
export interface AnalysisResult {
	/**
	 * Overall risk classification based on detected issues
	 * - 'none': No issues detected
	 * - 'low': Low-severity issues only
	 * - 'medium': Mix of low/medium issues or multiple issues
	 * - 'high': High-severity issues present
	 */
	riskLevel: RiskLevel;

	/**
	 * Confidence score for the analysis (0-1)
	 * - 1.0: Very confident (clear AWS key, etc)
	 * - 0.95: No issues detected (high confidence in clean code)
	 * - 0.85: Issues detected with good confidence
	 * - 0.60: Many issues (suggests Pro tier for ML analysis)
	 */
	confidence: number;

	/**
	 * Array of detected issues
	 */
	issues: Issue[];

	/**
	 * Time taken to analyze in milliseconds
	 */
	executionTime: number;

	/**
	 * Whether to show upgrade prompt to user
	 * Triggered when: >2 issues OR any high-severity issue
	 */
	upgradePrompt: boolean;

	/**
	 * Actionable recommendations for the user
	 * Generated based on detected issue types
	 */
	recommendations: string[];
}
