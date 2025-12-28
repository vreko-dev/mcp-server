/**
 * @snapback/intelligence - Validation
 *
 * 7+ layer validation pipeline for code quality checks.
 * Enhanced mode adds BiomeLayer and TypeScriptCompilerLayer for real tooling.
 */

// Export confidence calculator
export { DynamicConfidenceCalculator, defaultConfidenceCalculator } from "./DynamicConfidenceCalculator.js";
// Export individual layers for customization
export {
	ArchitectureLayer,
	BiomeLayer,
	DependencyLayer,
	PerformanceLayer,
	SecurityLayer,
	SyntaxLayer,
	TestLayer,
	TypeLayer,
	TypeScriptCompilerLayer,
} from "./layers/index.js";
// Export pipeline and types
export type { PipelineOptions, PipelineResult, ReviewRecommendation, ValidationResult } from "./ValidationPipeline.js";
export {
	CriticalValidationError,
	ValidationError,
	ValidationPipeline,
} from "./ValidationPipeline.js";
