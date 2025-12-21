/**
 * Policy Engine - Migrated from @snapback/policy-engine
 *
 * Provides policy evaluation, SARIF formatting, and detection capabilities.
 *
 * @example
 * ```typescript
 * import { evaluate, PolicyEngine, SecretDetector } from "@snapback/intelligence/policy";
 *
 * // Evaluate SARIF against policy
 * const decision = evaluate(sarifLog);
 *
 * // Use PolicyEngine for comprehensive analysis
 * const engine = new PolicyEngine();
 * const result = await engine.analyzeFile(filePath, content);
 *
 * // Use individual detectors
 * const detector = new SecretDetector();
 * const findings = detector.detect(content, filePath);
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Policy engine for SnapBack
 * Evaluates SARIF results against policy rules defined in .snapbackrc
 */

// Default policy configuration
const DEFAULT_POLICY = {
	thresholds: {
		critical: 0, // Block on any critical issues
		high: 0, // Block on any high issues
		medium: 100, // Allow medium issues
		low: 100, // Allow low issues
	},
	blockOn: {
		critical: true,
		high: true,
		medium: false,
		low: false,
	},
	pathRules: [] as {
		glob: string;
		thresholds: any;
		blockOn?: { critical: boolean; high: boolean; medium: boolean; low: boolean };
	}[],
};

// Policy version information
const POLICY_VERSION = "1.0.0";
const POLICY_ETAG = "abc123def456";

export interface PolicyConfig {
	thresholds: {
		critical: number;
		high: number;
		medium: number;
		low: number;
	};
	blockOn: {
		critical: boolean;
		high: boolean;
		medium: boolean;
		low: boolean;
	};
	pathRules: {
		glob: string;
		thresholds: any;
		blockOn?: {
			critical: boolean;
			high: boolean;
			medium: boolean;
			low: boolean;
		};
	}[];
}

export interface PolicyDecision {
	action: "apply" | "review" | "block";
	reason: string;
	rules_hit: string[];
	confidence: number;
	policyVersion: string;
	etag: string;
	details: {
		issueCounts: {
			critical: number;
			high: number;
			medium: number;
			low: number;
		};
		[path: string]: unknown;
	};
}

/**
 * Evaluate SARIF results against policy rules
 * @param sarif SARIF data to evaluate
 * @param config Policy configuration
 * @param filePath Optional file path for path-based rules
 * @returns Policy decision
 */
export function evaluate(sarif: any, config: PolicyConfig = DEFAULT_POLICY, filePath?: string): PolicyDecision {
	// Merge with default policy to ensure all fields are present
	const effectiveConfig = {
		thresholds: { ...DEFAULT_POLICY.thresholds, ...config.thresholds },
		blockOn: { ...DEFAULT_POLICY.blockOn, ...config.blockOn },
		pathRules: config.pathRules || DEFAULT_POLICY.pathRules,
	};

	// Apply path-specific rules if filePath is provided
	let effectiveThresholds = effectiveConfig.thresholds;
	let effectiveBlockOn = effectiveConfig.blockOn;
	if (filePath) {
		for (const rule of effectiveConfig.pathRules) {
			if (matchesGlob(filePath, rule.glob)) {
				effectiveThresholds = { ...effectiveThresholds, ...rule.thresholds };
				// Apply path-specific blockOn settings if provided
				if (rule.blockOn) {
					effectiveBlockOn = { ...effectiveBlockOn, ...rule.blockOn };
				} else {
					// If thresholds are overridden without explicit blockOn, enable blocking for those severities
					const implicitBlockOn: Partial<typeof effectiveBlockOn> = {};
					if (rule.thresholds.critical !== undefined) {
						implicitBlockOn.critical = true;
					}
					if (rule.thresholds.high !== undefined) {
						implicitBlockOn.high = true;
					}
					if (rule.thresholds.medium !== undefined) {
						implicitBlockOn.medium = true;
					}
					if (rule.thresholds.low !== undefined) {
						implicitBlockOn.low = true;
					}
					effectiveBlockOn = { ...effectiveBlockOn, ...implicitBlockOn };
				}
				break;
			}
		}
	}

	// Track rules that are hit and count issues by severity
	const rulesHit: string[] = [];
	const issueCounts = {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
	};

	// Extract results from SARIF
	if (sarif.runs && sarif.runs.length > 0) {
		const results = sarif.runs[0].results || [];
		for (const result of results) {
			const severity = getSeverity(result);
			if (severity in issueCounts) {
				issueCounts[severity as keyof typeof issueCounts]++;

				// Track which rules are hit
				if (result.ruleId) {
					if (!rulesHit.includes(result.ruleId)) {
						rulesHit.push(result.ruleId);
					}
				}
			}
		}
	}

	// Calculate confidence based on issue counts and thresholds
	const confidence = calculateConfidence(issueCounts, effectiveThresholds);

	// Check if any blocking conditions are met
	if (effectiveBlockOn.critical && issueCounts.critical > effectiveThresholds.critical) {
		return {
			action: "block",
			reason: `Critical issues (${issueCounts.critical}) exceed threshold (${effectiveThresholds.critical})`,
			rules_hit: rulesHit,
			confidence: confidence,
			policyVersion: POLICY_VERSION,
			etag: POLICY_ETAG,
			details: {
				issueCounts,
			},
		};
	}

	if (effectiveBlockOn.high && issueCounts.high > effectiveThresholds.high) {
		return {
			action: "block",
			reason: `High issues (${issueCounts.high}) exceed threshold (${effectiveThresholds.high})`,
			rules_hit: rulesHit,
			confidence: confidence,
			policyVersion: POLICY_VERSION,
			etag: POLICY_ETAG,
			details: {
				issueCounts,
			},
		};
	}

	if (effectiveBlockOn.medium && issueCounts.medium > effectiveThresholds.medium) {
		return {
			action: "block",
			reason: `Medium issues (${issueCounts.medium}) exceed threshold (${effectiveThresholds.medium})`,
			rules_hit: rulesHit,
			confidence: confidence,
			policyVersion: POLICY_VERSION,
			etag: POLICY_ETAG,
			details: {
				issueCounts,
			},
		};
	}

	if (effectiveBlockOn.low && issueCounts.low > effectiveThresholds.low) {
		return {
			action: "block",
			reason: `Low issues (${issueCounts.low}) exceed threshold (${effectiveThresholds.low})`,
			rules_hit: rulesHit,
			confidence: confidence,
			policyVersion: POLICY_VERSION,
			etag: POLICY_ETAG,
			details: {
				issueCounts,
			},
		};
	}

	// If we have any critical or high issues that don't exceed thresholds, require review
	// But only if blockOn is false for those severity levels
	if ((issueCounts.critical > 0 && !effectiveBlockOn.critical) || (issueCounts.high > 0 && !effectiveBlockOn.high)) {
		return {
			action: "review",
			reason: "Critical or high severity issues found",
			rules_hit: rulesHit,
			confidence: confidence,
			policyVersion: POLICY_VERSION,
			etag: POLICY_ETAG,
			details: {
				issueCounts,
			},
		};
	}

	// Otherwise, apply automatically
	return {
		action: "apply",
		reason: "No blocking issues found",
		rules_hit: rulesHit,
		confidence: confidence,
		policyVersion: POLICY_VERSION,
		etag: POLICY_ETAG,
		details: {
			issueCounts,
		},
	};
}

/**
 * Calculate confidence score based on issue counts and thresholds
 */
function calculateConfidence(
	issueCounts: { critical: number; high: number; medium: number; low: number },
	thresholds: { critical: number; high: number; medium: number; low: number },
): number {
	let confidence = 0.9;
	const criticalRatio = thresholds.critical > 0 ? issueCounts.critical / thresholds.critical : 0;
	const highRatio = thresholds.high > 0 ? issueCounts.high / thresholds.high : 0;
	const mediumRatio = thresholds.medium > 0 ? issueCounts.medium / thresholds.medium : 0;
	const lowRatio = thresholds.low > 0 ? issueCounts.low / thresholds.low : 0;
	const thresholdProximity = Math.max(criticalRatio, highRatio, mediumRatio, lowRatio);
	confidence = Math.max(0.1, confidence - thresholdProximity * 0.5);
	return confidence;
}

/**
 * Get severity level from SARIF result
 */
function getSeverity(result: any): string {
	if (result.level) {
		const level = result.level.toLowerCase();
		switch (level) {
			case "error":
				return "critical";
			case "warning":
				return "high";
			case "note":
				return "medium";
			case "critical":
				return "critical";
			case "high":
				return "high";
			case "medium":
				return "medium";
			case "low":
				return "low";
			default:
				return "medium";
		}
	}
	return "medium";
}

/**
 * Check if a file path matches a glob pattern
 */
function matchesGlob(filePath: string, glob: string): boolean {
	if (glob === "src/**") {
		return filePath.startsWith("src/");
	}
	const regexPattern = glob.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\//g, "[/\\\\]");
	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(filePath);
}

/**
 * Load policy configuration from .snapbackrc file
 */
export function loadPolicyConfig(cwd: string = process.cwd()): PolicyConfig {
	const configPath = path.join(cwd, ".snapbackrc");
	if (!fs.existsSync(configPath)) {
		return DEFAULT_POLICY;
	}
	try {
		const configContent = fs.readFileSync(configPath, "utf8");
		const config = JSON.parse(configContent);
		return {
			thresholds: { ...DEFAULT_POLICY.thresholds, ...config.thresholds },
			blockOn: { ...DEFAULT_POLICY.blockOn, ...config.blockOn },
			pathRules: config.pathRules || DEFAULT_POLICY.pathRules,
		};
	} catch (error) {
		console.warn("Failed to load .snapbackrc, using default policy", error);
		return DEFAULT_POLICY;
	}
}

// Re-export detectors
export { type MockDetectionResult, MockDetector, type MockFinding } from "./detectors/MockDetector.js";
export {
	PhantomDependencyDetector,
	type PhantomDependencyFinding,
	type PhantomDependencyResult,
} from "./detectors/PhantomDependencyDetector.js";
export { type SecretDetectionResult, SecretDetector, type SecretFinding } from "./detectors/SecretDetector.js";

// Re-export PolicyEngine
export {
	type DetectionEvent,
	type PolicyAction,
	PolicyEngine,
	type PolicyEngineConfig,
	type PolicyEngineResult,
	type PolicyRule,
} from "./PolicyEngine.js";

// Re-export SarifFormatter
export { SarifFormatter, type SarifLog, type SarifResult, type SarifRule, type SarifRun } from "./SarifFormatter.js";
