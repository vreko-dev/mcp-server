/**
 * Validation Pipeline
 *
 * Runs 7 validation layers in parallel for fast code validation.
 * Returns confidence score and review recommendation.
 *
 * Performance:
 * - Without pipeline: 24 min (manual review)
 * - With pipeline: <1 sec (automated)
 *
 * @module ValidationPipeline
 */

import type { Issue, ValidationLayer } from "../types/config.js";
import type { PipelineResult, ReviewRecommendation, ValidationResult } from "../types/validation.js";
import { CONFIDENCE_THRESHOLDS, ISSUE_THRESHOLDS } from "../types/validation.js";

// =============================================================================
// RESULT TYPE (inline to avoid circular deps)
// =============================================================================

type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

function ok<T>(value: T): Result<T, never> {
	return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

/** Base validation error */
export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly layer?: string,
		public readonly issues?: Issue[],
	) {
		super(message);
		this.name = "ValidationError";
	}
}

/** Critical issues found - requires immediate attention */
export class CriticalValidationError extends ValidationError {
	constructor(
		message: string,
		public readonly criticalIssues: Issue[],
	) {
		super(message, "CRITICAL_ISSUES", undefined, criticalIssues);
		this.name = "CriticalValidationError";
	}
}

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
	 * Result-based validation - returns Result<PipelineResult, CriticalValidationError>
	 *
	 * This is the recommended API for new code. Use validateSafe() when you want
	 * to handle validation failures without exceptions.
	 *
	 * @example
	 * ```typescript
	 * const result = await pipeline.validateSafe(code, filePath);
	 * if (!result.success) {
	 *   console.error('Critical issues:', result.error.criticalIssues);
	 *   return;
	 * }
	 * console.log('Confidence:', result.value.overall.confidence);
	 * ```
	 */
	async validateSafe(
		code: string,
		filePath: string,
		options?: { failFast?: boolean },
	): Promise<Result<PipelineResult, CriticalValidationError>> {
		const result = await this.validate(code, filePath);

		// If failFast is enabled and there are critical issues, return error
		if (options?.failFast) {
			const criticalIssues = ValidationPipeline.getIssuesBySeverity(result, "critical");
			if (criticalIssues.length > 0) {
				return err(
					new CriticalValidationError(
						`Validation failed: ${criticalIssues.length} critical issues`,
						criticalIssues,
					),
				);
			}
		}

		// Return success with the pipeline result
		return ok(result);
	}

	/**
	 * Validate with fail-fast on critical issues
	 *
	 * Runs layers in sequence and stops immediately when a critical issue is found.
	 * Use this for pre-commit hooks where early failure is desired.
	 */
	async validateFailFast(code: string, filePath: string): Promise<Result<PipelineResult, CriticalValidationError>> {
		const layerResults: Array<{
			layer: string;
			passed: boolean;
			issues: Issue[];
			duration: number;
		}> = [];

		// Run layers sequentially for fail-fast behavior
		for (const layer of this.layers) {
			const start = Date.now();
			const result = await layer.validate(code, filePath);
			const layerResult = {
				layer: layer.name,
				passed: result.issues.length === 0,
				issues: result.issues,
				duration: Date.now() - start,
			};
			layerResults.push(layerResult);

			// Fail fast on critical issues
			const criticalIssues = result.issues.filter((i) => i.severity === "critical");
			if (criticalIssues.length > 0) {
				return err(
					new CriticalValidationError(
						`Validation failed in ${layer.name}: ${criticalIssues.length} critical issues`,
						criticalIssues,
					),
				);
			}
		}

		// All layers passed - calculate full result
		const totalIssues = layerResults.reduce((sum, r) => sum + r.issues.length, 0);
		const confidence = this.calculateConfidence(totalIssues, 0);
		const recommendation = this.getRecommendation(confidence, []);

		return ok({
			overall: {
				passed: true,
				confidence,
				totalIssues,
			},
			layers: layerResults,
			recommendation,
			focusPoints: [],
		});
	}

	/**
	 * Validate multiple files with aggregated results
	 */
	async validateFiles(
		files: Array<{ path: string; content: string }>,
	): Promise<Result<PipelineResult[], CriticalValidationError>> {
		const results: PipelineResult[] = [];
		const allCriticalIssues: Issue[] = [];

		for (const file of files) {
			const result = await this.validate(file.content, file.path);
			results.push(result);

			// Collect critical issues
			const criticalIssues = ValidationPipeline.getIssuesBySeverity(result, "critical");
			if (criticalIssues.length > 0) {
				allCriticalIssues.push(
					...criticalIssues.map((issue) => ({
						...issue,
						message: `[${file.path}] ${issue.message}`,
					})),
				);
			}
		}

		// Return error if any critical issues found
		if (allCriticalIssues.length > 0) {
			return err(
				new CriticalValidationError(
					`Validation failed: ${allCriticalIssues.length} critical issues across ${files.length} files`,
					allCriticalIssues,
				),
			);
		}

		return ok(results);
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
