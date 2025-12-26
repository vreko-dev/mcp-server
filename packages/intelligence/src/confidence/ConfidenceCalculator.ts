/**
 * Confidence Calculator
 *
 * Calculates honest confidence scores based on analyzer results.
 * Follows the principle: "If you can't prove it's safe, don't say it is."
 *
 * Key differences from the old arbitrary 0.95 approach:
 * - Confidence is capped by what was actually analyzed
 * - Critical issues cause dramatic confidence drops
 * - Incomplete analysis means lower confidence ceiling
 *
 * @module confidence/ConfidenceCalculator
 */

import type { AnalyzerResult, ConfidenceResult, CoverageInfo, Severity } from "@snapback/core";

/**
 * Weight assigned to each analyzer for confidence calculation
 */
const ANALYZER_WEIGHTS: Record<string, number> = {
	syntax: 0.15, // Basic parsing is essential
	types: 0.05, // Type safety is nice but not critical for merge decision
	security: 0.25, // Security is high priority
	"eslint-security": 0.1, // Additional security rules
	biome: 0.1, // Lint quality
	"circular-deps": 0.05, // Architecture quality
	"duplicate-code": 0.05, // Code quality
	completeness: 0.1, // Code completeness
	dependencies: 0.1, // Dependency health
	"domain-patterns": 0.05, // Domain-specific patterns
};

/**
 * Penalty applied per issue by severity
 */
const SEVERITY_PENALTIES: Record<Severity, number> = {
	critical: 0.25, // Each critical issue reduces confidence by 25%
	high: 0.1, // High issues are significant
	medium: 0.02, // Medium issues add up
	low: 0.005, // Low issues are minor
	info: 0, // Info doesn't affect confidence
};

/**
 * Maximum confidence based on coverage gaps
 */
const COVERAGE_CAPS = {
	noAST: 0.2, // Without AST parsing, we can only be 20% confident
	noSecurity: 0.5, // Without security analysis, cap at 50%
	noCompleteness: 0.7, // Without completeness check, cap at 70%
	noArchitecture: 0.8, // Without architecture check, cap at 80%
	full: 1.0, // Full analysis can achieve 100%
};

/**
 * Review recommendation type
 */
export type ReviewRecommendation = "manual_review_required" | "review_recommended" | "auto_merge_candidate";

/**
 * Confidence thresholds for recommendations
 */
const RECOMMENDATION_THRESHOLDS = {
	autoMerge: 0.6, // Lowered from 0.95 - honest analysis rarely hits this
	quickReview: 0.3, // Lowered - most code needs review
};

/**
 * Calculates honest confidence scores based on analysis results
 */
export class ConfidenceCalculator {
	/**
	 * Calculate confidence from analyzer results
	 */
	calculate(analyzerResults: AnalyzerResult[], coverage: CoverageInfo): ConfidenceResult {
		let totalWeight = 0;
		let weightedScore = 0;
		const breakdown: Record<string, number> = {};

		// Base confidence from analyzer success/coverage
		for (const result of analyzerResults) {
			const weight = ANALYZER_WEIGHTS[result.analyzer] ?? 0.05;
			totalWeight += weight;

			// Score based on success and coverage
			const score = result.success ? result.coverage : 0;
			weightedScore += weight * score;
			breakdown[result.analyzer] = score;
		}

		// Calculate base confidence
		let confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;

		// Apply penalties for issues
		for (const result of analyzerResults) {
			for (const issue of result.issues) {
				const penalty = SEVERITY_PENALTIES[issue.severity] ?? 0;
				confidence = Math.max(0, confidence - penalty);
			}
		}

		// Cap confidence based on coverage gaps
		const maxPossibleConfidence = this.calculateMaxConfidence(coverage);
		confidence = Math.min(confidence, maxPossibleConfidence);

		// Round to 2 decimal places
		confidence = Math.round(confidence * 100) / 100;

		return {
			confidence,
			breakdown,
			explanation: this.generateExplanation(confidence, coverage, analyzerResults),
			maxPossibleConfidence,
		};
	}

	/**
	 * Get review recommendation based on confidence
	 */
	getRecommendation(confidenceResult: ConfidenceResult, hasCriticalIssues: boolean): ReviewRecommendation {
		// Critical issues always require manual review
		if (hasCriticalIssues) {
			return "manual_review_required";
		}

		const { confidence } = confidenceResult;

		if (confidence >= RECOMMENDATION_THRESHOLDS.autoMerge) {
			return "auto_merge_candidate";
		}

		if (confidence >= RECOMMENDATION_THRESHOLDS.quickReview) {
			return "review_recommended";
		}

		return "manual_review_required";
	}

	/**
	 * Calculate maximum possible confidence based on coverage
	 */
	private calculateMaxConfidence(coverage: CoverageInfo): number {
		// Start with minimum possible
		let maxConfidence = COVERAGE_CAPS.full;

		// If no AST parsing, we can't trust much
		if (!coverage.astParsed) {
			maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noAST);
		}

		// If no security analysis, cap confidence
		if (!coverage.securityChecked) {
			maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noSecurity);
		}

		// If no completeness check, cap confidence
		if (!coverage.completenessChecked) {
			maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noCompleteness);
		}

		// If no architecture check, cap confidence
		if (!coverage.architectureChecked) {
			maxConfidence = Math.min(maxConfidence, COVERAGE_CAPS.noArchitecture);
		}

		// Also cap based on file coverage
		maxConfidence = Math.min(maxConfidence, coverage.filesCoverage);

		return maxConfidence;
	}

	/**
	 * Generate human-readable explanation
	 */
	private generateExplanation(confidence: number, coverage: CoverageInfo, results: AnalyzerResult[]): string {
		const parts: string[] = [];

		// Overall confidence statement
		if (confidence < 0.3) {
			parts.push(`Low confidence (${Math.round(confidence * 100)}%): Manual review required.`);
		} else if (confidence < 0.6) {
			parts.push(`Moderate confidence (${Math.round(confidence * 100)}%): Review recommended.`);
		} else {
			parts.push(`Good confidence (${Math.round(confidence * 100)}%): Auto-merge candidate.`);
		}

		// Coverage gaps
		const gaps: string[] = [];
		if (!coverage.astParsed) gaps.push("AST parsing failed");
		if (!coverage.securityChecked) gaps.push("security not analyzed");
		if (!coverage.completenessChecked) gaps.push("completeness not checked");
		if (!coverage.architectureChecked) gaps.push("architecture not validated");

		if (gaps.length > 0) {
			parts.push(`Coverage gaps: ${gaps.join(", ")}.`);
		}

		// Issue summary
		const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
		const criticalIssues = results.flatMap((r) => r.issues).filter((i) => i.severity === "critical").length;
		const highIssues = results.flatMap((r) => r.issues).filter((i) => i.severity === "high").length;

		if (criticalIssues > 0 || highIssues > 0) {
			parts.push(`Issues: ${criticalIssues} critical, ${highIssues} high, ${totalIssues} total.`);
		} else if (totalIssues > 0) {
			parts.push(`Found ${totalIssues} issues (none critical).`);
		} else {
			parts.push("No issues detected.");
		}

		return parts.join(" ");
	}

	/**
	 * Build coverage info from analyzer results
	 */
	static buildCoverageInfo(results: AnalyzerResult[]): CoverageInfo {
		const analyzerIds = new Set(results.map((r) => r.analyzer));
		const avgCoverage = results.length > 0 ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length : 0;

		return {
			astParsed: analyzerIds.has("syntax") && results.find((r) => r.analyzer === "syntax")?.success === true,
			securityChecked:
				analyzerIds.has("security") && results.find((r) => r.analyzer === "security")?.success === true,
			completenessChecked:
				analyzerIds.has("completeness") && results.find((r) => r.analyzer === "completeness")?.success === true,
			architectureChecked:
				analyzerIds.has("architecture") && results.find((r) => r.analyzer === "architecture")?.success === true,
			filesCoverage: avgCoverage,
		};
	}
}
