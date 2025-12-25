/**
 * Gap Analyzer
 *
 * Analyzes gaps between expected patterns and detected patterns.
 * Provides recommendations for improving workspace quality.
 *
 * @module patterns/GapAnalyzer
 */

import type {
	ExpectedPattern,
	FrameworkConfig,
	OnboardingRecommendation,
	PatternGap,
	WorkspaceProfile,
} from "../knowledge/types.js";
import type { FoundPattern, PatternDetectionResult } from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the gap analyzer
 */
export interface GapAnalyzerConfig {
	/** Minimum coverage threshold for patterns (0-1) */
	coverageThreshold?: number;
	/** Whether to include optional patterns in analysis */
	includeOptional?: boolean;
	/** Framework configuration for expected patterns */
	frameworkConfig?: FrameworkConfig;
}

/**
 * Result from gap analysis
 */
export interface GapAnalysisResult {
	/** Gaps between expected and detected patterns */
	gaps: PatternGap[];
	/** Patterns that are well-implemented */
	strengths: FoundPattern[];
	/** Anti-patterns detected */
	antiPatterns: FoundPattern[];
	/** Overall score (0-100) */
	score: number;
	/** Recommendations for improvement */
	recommendations: OnboardingRecommendation[];
	/** Summary statistics */
	summary: GapAnalysisSummary;
}

/**
 * Summary statistics for gap analysis
 */
export interface GapAnalysisSummary {
	/** Total expected patterns */
	totalExpected: number;
	/** Patterns found */
	patternsFound: number;
	/** Patterns missing */
	patternsMissing: number;
	/** Anti-patterns found */
	antiPatternsFound: number;
	/** Critical gaps */
	criticalGaps: number;
	/** Recommended gaps */
	recommendedGaps: number;
	/** Optional gaps */
	optionalGaps: number;
}

// =============================================================================
// GAP ANALYZER
// =============================================================================

/**
 * Gap Analyzer - compares detected patterns against expectations
 *
 * @example
 * ```typescript
 * const analyzer = new GapAnalyzer({
 *   frameworkConfig: nextjsConfig,
 * });
 *
 * const result = await analyzer.analyze(detectionResult);
 * console.log(result.gaps);
 * ```
 */
export class GapAnalyzer {
	private readonly config: Required<GapAnalyzerConfig>;

	constructor(config: GapAnalyzerConfig = {}) {
		this.config = {
			coverageThreshold: config.coverageThreshold ?? 0.3,
			includeOptional: config.includeOptional ?? false,
			frameworkConfig: config.frameworkConfig as FrameworkConfig,
		};
	}

	/**
	 * Analyze gaps between detected and expected patterns
	 */
	analyze(detectionResult: PatternDetectionResult, expectedPatterns?: ExpectedPattern[]): GapAnalysisResult {
		// Use framework patterns or provided patterns
		const expected = expectedPatterns || this.config.frameworkConfig?.expectedPatterns || [];

		// Filter by importance if not including optional
		const relevantExpected = this.config.includeOptional
			? expected
			: expected.filter((p) => p.importance !== "optional");

		// Identify gaps
		const gaps = this.identifyGaps(detectionResult, relevantExpected);

		// Identify strengths
		const strengths = detectionResult.foundPatterns.filter(
			(p) => p.isPositive && p.strength >= this.config.coverageThreshold,
		);

		// Identify anti-patterns
		const antiPatterns = detectionResult.foundPatterns.filter((p) => !p.isPositive);

		// Calculate score
		const score = this.calculateScore(relevantExpected, strengths, gaps, antiPatterns);

		// Generate recommendations
		const recommendations = this.generateRecommendations(gaps, antiPatterns);

		// Create summary
		const summary: GapAnalysisSummary = {
			totalExpected: relevantExpected.length,
			patternsFound: strengths.length,
			patternsMissing: gaps.length,
			antiPatternsFound: antiPatterns.length,
			criticalGaps: gaps.filter((g) => g.severity === "critical").length,
			recommendedGaps: gaps.filter((g) => g.severity === "high").length,
			optionalGaps: gaps.filter((g) => g.severity === "medium" || g.severity === "low").length,
		};

		return {
			gaps,
			strengths,
			antiPatterns,
			score,
			recommendations,
			summary,
		};
	}

	/**
	 * Analyze a workspace profile for gaps
	 */
	analyzeWorkspace(profile: WorkspaceProfile, frameworkConfig?: FrameworkConfig): GapAnalysisResult {
		const config = frameworkConfig || this.config.frameworkConfig;

		if (!config) {
			return {
				gaps: [],
				strengths: [],
				antiPatterns: [],
				score: 0,
				recommendations: [],
				summary: {
					totalExpected: 0,
					patternsFound: 0,
					patternsMissing: 0,
					antiPatternsFound: 0,
					criticalGaps: 0,
					recommendedGaps: 0,
					optionalGaps: 0,
				},
			};
		}

		// Convert workspace profile to detection result format
		const detectionResult: PatternDetectionResult = {
			foundPatterns: profile.detectedPatterns.map((p) => ({
				id: p.id,
				name: p.name,
				category: p.category,
				locations: p.locations.map((loc) => ({
					file: loc.file,
					line: loc.line ?? 0,
					column: loc.column,
					snippet: loc.snippet ?? "",
					confidence: 1.0,
				})),
				strength: p.strength,
				isPositive: true, // Assume positive unless we know otherwise
			})),
			missingPatterns: [],
			scannedFiles: profile.structure.totalFiles,
			duration: 0,
			errors: [],
		};

		return this.analyze(detectionResult, config.expectedPatterns);
	}

	// =========================================================================
	// PRIVATE METHODS
	// =========================================================================

	private identifyGaps(detection: PatternDetectionResult, expected: ExpectedPattern[]): PatternGap[] {
		const foundIds = new Set(detection.foundPatterns.map((p) => p.id));
		const gaps: PatternGap[] = [];

		for (const pattern of expected) {
			const found = detection.foundPatterns.find((p) => p.id === pattern.id);

			if (!found) {
				// Pattern completely missing
				gaps.push({
					patternId: pattern.id,
					patternName: pattern.name,
					type: "missing",
					severity: this.importanceToSeverity(pattern.importance),
					description: `Missing ${pattern.name}: ${pattern.description}`,
					recommendation: this.getRecommendation(pattern),
					effort: this.estimateEffort(pattern),
					autoFixable: false,
				});
			} else if (found.strength < this.config.coverageThreshold) {
				// Pattern present but weak
				gaps.push({
					patternId: pattern.id,
					patternName: pattern.name,
					type: "incomplete",
					severity: this.importanceToSeverity(pattern.importance),
					description: `Incomplete ${pattern.name}: Only ${Math.round(found.strength * 100)}% coverage`,
					recommendation: `Improve coverage of ${pattern.name}`,
					effort: "small",
					affectedFiles: found.locations.map((l) => l.file),
					autoFixable: false,
				});
			}
		}

		return gaps;
	}

	private importanceToSeverity(importance: ExpectedPattern["importance"]): PatternGap["severity"] {
		switch (importance) {
			case "critical":
				return "critical";
			case "recommended":
				return "high";
			case "optional":
				return "low";
		}
	}

	private getRecommendation(pattern: ExpectedPattern): string {
		switch (pattern.category) {
			case "error-handling":
				return `Add ${pattern.name} to handle errors gracefully`;
			case "security":
				return `Implement ${pattern.name} to improve security`;
			case "testing":
				return `Add ${pattern.name} for better test coverage`;
			case "performance":
				return `Optimize with ${pattern.name}`;
			default:
				return `Implement ${pattern.name}`;
		}
	}

	private estimateEffort(pattern: ExpectedPattern): PatternGap["effort"] {
		// Heuristic based on pattern type
		switch (pattern.importance) {
			case "critical":
				return "medium";
			case "recommended":
				return "small";
			case "optional":
				return "trivial";
		}
	}

	private calculateScore(
		expected: ExpectedPattern[],
		strengths: FoundPattern[],
		gaps: PatternGap[],
		antiPatterns: FoundPattern[],
	): number {
		if (expected.length === 0) return 100;

		// Base score from pattern coverage
		const coverageScore = (strengths.length / expected.length) * 100;

		// Penalty for critical gaps
		const criticalPenalty = gaps.filter((g) => g.severity === "critical").length * 10;

		// Penalty for high gaps
		const highPenalty = gaps.filter((g) => g.severity === "high").length * 5;

		// Penalty for anti-patterns
		const antiPatternPenalty = antiPatterns.length * 8;

		// Calculate final score
		const score = Math.max(0, Math.min(100, coverageScore - criticalPenalty - highPenalty - antiPatternPenalty));

		return Math.round(score);
	}

	private generateRecommendations(gaps: PatternGap[], antiPatterns: FoundPattern[]): OnboardingRecommendation[] {
		const recommendations: OnboardingRecommendation[] = [];
		let priority = 1;

		// Critical gaps first
		for (const gap of gaps.filter((g) => g.severity === "critical")) {
			recommendations.push({
				id: `gap-${gap.patternId}`,
				category: this.patternCategoryToRecommendationCategory(gap),
				priority: priority++,
				title: `Add ${gap.patternName}`,
				description: gap.description,
				actions: [
					{
						type: "add-pattern",
						target: gap.patternId,
						description: gap.recommendation,
						autoApply: gap.autoFixable,
					},
				],
				estimatedTime: this.effortToTime(gap.effort),
				healthImpact: 15,
			});
		}

		// Anti-patterns
		for (const antiPattern of antiPatterns) {
			recommendations.push({
				id: `fix-${antiPattern.id}`,
				category: "pattern",
				priority: priority++,
				title: `Fix ${antiPattern.name}`,
				description: `Found ${antiPattern.locations.length} instances of ${antiPattern.name}`,
				actions: antiPattern.locations.slice(0, 5).map((loc) => ({
					type: "update-file" as const,
					target: loc.file,
					description: `Fix at line ${loc.line}`,
					autoApply: false,
				})),
				estimatedTime: `${antiPattern.locations.length * 5} minutes`,
				healthImpact: 10,
			});
		}

		// High gaps
		for (const gap of gaps.filter((g) => g.severity === "high")) {
			recommendations.push({
				id: `gap-${gap.patternId}`,
				category: this.patternCategoryToRecommendationCategory(gap),
				priority: priority++,
				title: `Add ${gap.patternName}`,
				description: gap.description,
				actions: [
					{
						type: "add-pattern",
						target: gap.patternId,
						description: gap.recommendation,
						autoApply: gap.autoFixable,
					},
				],
				estimatedTime: this.effortToTime(gap.effort),
				healthImpact: 8,
			});
		}

		return recommendations;
	}

	private patternCategoryToRecommendationCategory(_gap: PatternGap): OnboardingRecommendation["category"] {
		// This is a simplified mapping - in practice would need access to pattern category
		return "pattern";
	}

	private effortToTime(effort: PatternGap["effort"]): string {
		switch (effort) {
			case "trivial":
				return "5 minutes";
			case "small":
				return "15 minutes";
			case "medium":
				return "1 hour";
			case "large":
				return "4 hours";
		}
	}
}
