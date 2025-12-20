/**
 * Validation Pipeline
 *
 * Runs 7 validation layers in parallel for fast code validation.
 * Returns confidence score and review recommendation.
 *
 * Performance:
 * - Without pipeline: 24 min (manual review)
 * - With pipeline: <1 sec (automated)
 */

import type { Issue, ValidationLayer } from "../types/config.js";
import type { PipelineResult, ReviewRecommendation, ValidationResult } from "../types/validation.js";
import { CONFIDENCE_THRESHOLDS, ISSUE_THRESHOLDS } from "../types/validation.js";
import {
	ArchitectureLayer,
	DependencyLayer,
	PerformanceLayer,
	SecurityLayer,
	SyntaxLayer,
	TestLayer,
	TypeLayer,
} from "./layers/index.js";

/**
 * Validation Pipeline
 *
 * Runs all validation layers in parallel and aggregates results
 * with confidence-based review routing.
 */
export class ValidationPipeline {
	private layers: ValidationLayer[] = [];

	constructor(customLayers?: ValidationLayer[]) {
		// Register default validation layers
		this.layers = [
			new SyntaxLayer(),
			new TypeLayer(),
			new TestLayer(),
			new ArchitectureLayer(),
			new SecurityLayer(),
			new DependencyLayer(),
			new PerformanceLayer(),
		];

		// Add custom layers if provided
		if (customLayers) {
			this.layers.push(...customLayers);
		}
	}

	/**
	 * Validate code through all layers
	 */
	async validate(code: string, filePath: string): Promise<PipelineResult> {
		// Run all layers in parallel (they're all fast)
		const layerResults = await Promise.all(
			this.layers.map(async (layer) => {
				const start = Date.now();
				const result = await layer.validate(code, filePath);
				return {
					layer: layer.name,
					passed: result.issues.length === 0,
					issues: result.issues,
					duration: Date.now() - start,
				};
			}),
		);

		// Calculate totals
		const totalIssues = layerResults.reduce((sum, r) => sum + r.issues.length, 0);
		const criticalIssues = layerResults.flatMap((r) => r.issues).filter((i) => i.severity === "critical");
		const confidence = this.calculateConfidence(totalIssues, criticalIssues.length);
		const recommendation = this.getRecommendation(confidence, criticalIssues);

		return {
			overall: {
				passed: criticalIssues.length === 0,
				confidence,
				totalIssues,
			},
			layers: layerResults,
			recommendation,
			focusPoints: criticalIssues.map((i) => i.message),
		};
	}

	/**
	 * Quick check - returns true if code passes all critical checks
	 */
	async quickCheck(code: string, filePath: string): Promise<boolean> {
		const result = await this.validate(code, filePath);
		return result.overall.passed;
	}

	/**
	 * Calculate confidence score based on issues
	 *
	 * Confidence thresholds:
	 * - 0 critical issues, 0 total → 95%
	 * - 0 critical issues, ≤2 total → 70%
	 * - 0 critical issues, ≤5 total → 50%
	 * - Any critical issues → 10%
	 * - Else → 20%
	 */
	private calculateConfidence(totalIssues: number, criticalIssues: number): number {
		if (criticalIssues > 0) {
			return 0.1;
		}
		if (totalIssues === 0) {
			return CONFIDENCE_THRESHOLDS.AUTO_MERGE;
		}
		if (totalIssues <= ISSUE_THRESHOLDS.QUICK_REVIEW) {
			return CONFIDENCE_THRESHOLDS.QUICK_REVIEW;
		}
		if (totalIssues <= ISSUE_THRESHOLDS.FULL_REVIEW) {
			return CONFIDENCE_THRESHOLDS.FULL_REVIEW;
		}
		return 0.2;
	}

	/**
	 * Determine review recommendation based on confidence
	 */
	private getRecommendation(confidence: number, criticalIssues: Issue[]): ReviewRecommendation {
		if (criticalIssues.length > 0) {
			return "full_review";
		}
		if (confidence >= 0.85) {
			return "auto_merge";
		}
		if (confidence >= CONFIDENCE_THRESHOLDS.FULL_REVIEW) {
			return "quick_review";
		}
		return "full_review";
	}

	/**
	 * Get layer names
	 */
	getLayerNames(): string[] {
		return this.layers.map((l) => l.name);
	}

	/**
	 * Add a custom validation layer
	 */
	addLayer(layer: ValidationLayer): void {
		this.layers.push(layer);
	}

	/**
	 * Get all issues from a result, flattened
	 */
	static flattenIssues(result: PipelineResult): Issue[] {
		return result.layers.flatMap((l) => l.issues);
	}

	/**
	 * Get issues by severity
	 */
	static getIssuesBySeverity(result: PipelineResult, severity: "critical" | "warning" | "info"): Issue[] {
		return ValidationPipeline.flattenIssues(result).filter((i) => i.severity === severity);
	}
}

// Re-export types for convenience
export type { PipelineResult, ValidationResult, ReviewRecommendation };
