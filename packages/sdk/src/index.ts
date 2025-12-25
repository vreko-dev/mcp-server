/**
 * @snapback/sdk - Pro SDK
 *
 * Re-exports the entire OSS SDK plus Pro-only features.
 *
 * Pro-Only Features:
 * - Risk Factor Descriptions (analytics)
 * - Protection Decision Engine (commercial feature)
 * - Dashboard Metrics Client (SaaS integration)
 * - Diff Calculator (restore previews)
 * - Token/Rate Limiting (infrastructure)
 */

// ============================================================================
// RE-EXPORT ENTIRE OSS SDK
// ============================================================================
export * from "@snapback-oss/sdk";

// ============================================================================
// PRO-ONLY: Risk Factor Descriptions (Analytics)
// ============================================================================
export {
	describeRiskFactor,
	describeRiskFactors,
	getStandardRiskFactors,
	isKnownRiskFactor,
	RISK_FACTOR_DESCRIPTIONS,
} from "./analysis/riskFactorDescriptions";
// ============================================================================
// PRO-ONLY: Dashboard Metrics Client (SaaS Integration)
// ============================================================================
export {
	createDashboardMetricsClient,
	type DashboardMetricsClient,
	type ORPCClient,
} from "./dashboard/metrics-client";
// ============================================================================
// PRO-ONLY: Protection Decision Engine (Commercial Feature)
// ============================================================================
export {
	type AIDetectionContext,
	type ChangeMetrics,
	DefaultRiskAnalyzer,
	type EvaluationContext,
	type IRiskAnalyzer,
	type ProtectionDecision,
	ProtectionDecisionEngine,
} from "./protection/ProtectionDecisionEngine";

// ============================================================================
// PRO-ONLY: Diff Calculator (Restore Previews)
// ============================================================================
export {
	DiffCalculator,
	type DiffPreview,
	type FileDiff,
} from "./snapshot/DiffCalculator";

// ============================================================================
// PRO-ONLY: Token/Rate Limiting (Infrastructure)
// ============================================================================
export * from "./token/index";
