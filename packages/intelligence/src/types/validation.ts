/**
 * Validation Types
 *
 * Types for the 7-layer validation pipeline.
 */

import type { ValidationSeverity } from "@snapback/contracts";
import type { Issue } from "./config.js";

/**
 * Result from a single validation layer
 */
export interface ValidationResult {
	layer: string;
	passed: boolean;
	issues: Issue[];
	duration: number;
}

/**
 * Overall pipeline result with confidence scoring
 */
export interface PipelineResult {
	overall: {
		passed: boolean;
		confidence: number;
		totalIssues: number;
	};
	layers: ValidationResult[];
	recommendation: ReviewRecommendation;
	focusPoints: string[];
}

/**
 * Review recommendation based on confidence
 */
export type ReviewRecommendation = "auto_merge" | "quick_review" | "full_review";

/**
 * Confidence thresholds for review routing
 */
export const CONFIDENCE_THRESHOLDS = {
	AUTO_MERGE: 0.95,
	QUICK_REVIEW: 0.7,
	FULL_REVIEW: 0.5,
} as const;

/**
 * Issue count thresholds for review routing
 */
export const ISSUE_THRESHOLDS = {
	QUICK_REVIEW: 2,
	FULL_REVIEW: 5,
} as const;

/**
 * Pattern match result from constraint checking
 */
export interface PatternMatch {
	pattern: string;
	file: string;
	line?: number;
	severity: ValidationSeverity;
}

// Re-export Issue for convenience
export type { Issue } from "./config.js";
