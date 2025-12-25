/**
 * @snapback/intelligence - Validation
 *
 * 7-layer validation pipeline for code quality checks.
 */

// Export individual layers for customization
export {
	ArchitectureLayer,
	DependencyLayer,
	PerformanceLayer,
	SecurityLayer,
	SyntaxLayer,
	TestLayer,
	TypeLayer,
} from "./layers/index.js";

// Export pipeline and types
export type { PipelineResult, ReviewRecommendation, ValidationResult } from "./ValidationPipeline.js";
export {
	CriticalValidationError,
	ValidationError,
	ValidationPipeline,
} from "./ValidationPipeline.js";
