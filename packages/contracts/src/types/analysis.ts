/**
 * Analysis Types
 *
 * Common type definitions for code analysis across SnapBack packages.
 * Used by @snapback/core, @snapback/intelligence, and other analysis tools.
 *
 * @module types/analysis
 */

import { z } from "zod";

/**
 * Issue severity levels (comprehensive) - Zod schema
 * - critical: Security vulnerabilities, data loss risks
 * - high: Significant bugs, performance issues
 * - medium: Code quality issues, potential bugs
 * - low: Minor issues, style violations
 * - info: Informational messages, suggestions
 */
export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);

/**
 * Issue severity levels (comprehensive) - TypeScript type
 */
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Risk/Urgency severity (4-level, action-oriented) - Zod schema
 * Used for risk scores, urgency levels, and event severity where "info" doesn't apply.
 * Order: critical > high > medium > low
 */
export const RiskSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

/**
 * Risk/Urgency severity - TypeScript type
 */
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

/**
 * Simplified severity for validation contexts - Zod schema
 * Maps to Severity: critical->critical, warning->medium, info->info
 */
export const ValidationSeveritySchema = z.enum(["critical", "warning", "info"]);

/**
 * Simplified severity for validation contexts - TypeScript type
 */
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

/**
 * Convert ValidationSeverity to Severity
 */
export function toSeverity(validationSeverity: ValidationSeverity): Severity {
	switch (validationSeverity) {
		case "critical":
			return "critical";
		case "warning":
			return "medium";
		case "info":
			return "info";
	}
}

/**
 * Convert Severity to ValidationSeverity
 */
export function toValidationSeverity(severity: Severity): ValidationSeverity {
	switch (severity) {
		case "critical":
		case "high":
			return "critical";
		case "medium":
		case "low":
			return "warning";
		case "info":
			return "info";
	}
}

/**
 * Base issue schema for all analysis/validation contexts
 */
export const BaseIssueSchema = z.object({
	/** Severity level */
	severity: z.union([SeveritySchema, ValidationSeveritySchema]),
	/** Issue type code (e.g., UNSAFE_EVAL, PATH_TRAVERSAL) */
	type: z.string(),
	/** Human-readable message */
	message: z.string(),
	/** Line number (1-indexed) */
	line: z.number().optional(),
	/** Suggested fix */
	fix: z.string().optional(),
});

/**
 * Base issue type for all analysis/validation contexts
 */
export type BaseIssue = z.infer<typeof BaseIssueSchema>;

/**
 * Issue detected during validation (simple form) - Zod schema
 * Used by intelligence package validation layers
 */
export const ValidationIssueSchema = BaseIssueSchema.extend({
	severity: ValidationSeveritySchema,
});

/**
 * Issue detected during validation (simple form) - TypeScript type
 */
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/**
 * Issue detected during analysis (detailed form) - Zod schema
 * Used by core package analyzers
 */
export const AnalysisIssueSchema = BaseIssueSchema.extend({
	/** Unique identifier for deduplication: analyzer/type/file/line */
	id: z.string(),
	/** Severity level */
	severity: SeveritySchema,
	/** File path where issue was found */
	file: z.string().optional(),
	/** Column number (1-indexed) */
	column: z.number().optional(),
	/** Code snippet showing the issue */
	snippet: z.string().optional(),
	/** Rule ID if from a lint tool */
	rule: z.string().optional(),
});

/**
 * Issue detected during analysis (detailed form) - TypeScript type
 */
export type AnalysisIssue = z.infer<typeof AnalysisIssueSchema>;

/**
 * Basic validation result - Zod schema
 */
export const ValidationResultSchema = z.object({
	/** Whether validation passed */
	passed: z.boolean(),
	/** Issues found */
	issues: z.array(BaseIssueSchema),
	/** Duration in milliseconds */
	duration: z.number().optional(),
});

/**
 * Basic validation result - TypeScript type
 */
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Circuit breaker state enum - Zod schema
 */
export const CircuitBreakerStateEnumSchema = z.enum(["closed", "open", "half-open"]);

/**
 * Circuit breaker state - Zod schema
 * Used for resilience patterns across packages
 */
export const CircuitBreakerStateSchema = z.object({
	/** Current state */
	state: CircuitBreakerStateEnumSchema,
	/** Failure count */
	failures: z.number(),
	/** Failure threshold */
	threshold: z.number(),
	/** Last failure timestamp */
	lastFailure: z.number().optional(),
	/** Cooldown period in ms */
	cooldownMs: z.number(),
});

/**
 * Circuit breaker state - TypeScript type
 */
export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;
