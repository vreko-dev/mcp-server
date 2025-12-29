/**
 * Impact Analysis Module
 *
 * Exports the ChangeImpactAnalyzer and related types for
 * predicting the impact of code changes across a codebase.
 *
 * @module analysis/impact
 */

export {
	type BreakingChange,
	ChangeImpactAnalyzer,
	type ChangeImpactResult,
	type ChangeType,
	createChangeImpactAnalyzer,
	type ImpactedItem,
	type ImpactLevel,
	type PerformanceImpact,
} from "./ChangeImpactAnalyzer.js";
