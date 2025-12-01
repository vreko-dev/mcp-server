// Metrics (was @snapback/analytics)

// Analytics wrapper - Privacy-safe analytics abstraction
export type {
	AnalyticsConfig,
	SafeEventProperties,
} from "./analytics/AnalyticsWrapper.js";
export {
	AnalyticsWrapper,
	createAnalyticsWrapper,
} from "./analytics/AnalyticsWrapper.js";
// Logging (was @snapback/infrastructure)
export * from "./logging/logger.js";
export * from "./metrics/index.js";

// PostHog utilities - Explicit named exports for tsup DTS compatibility
export type {
	AlertConfig,
	AlertNotification,
} from "./posthog/alerts.js";
export {
	createAlert,
	deleteAlert,
	getAlerts,
	KEY_METRIC_ALERTS,
	toggleAlert,
} from "./posthog/alerts.js";
export type {
	Cohort,
	CohortConfig,
} from "./posthog/cohorts.js";
export {
	CORRELATION_COHORTS,
	createCohort,
	deleteCohort,
	getCohort,
	getCohortMembers,
	getCohorts,
	RETENTION_COHORTS,
	updateCohort,
} from "./posthog/cohorts.js";
export type {
	CorrelationAnalysis,
	CorrelationAnalysisConfig,
	CorrelationResult,
} from "./posthog/correlation.js";

export {
	CORRELATION_ANALYSES,
	getCorrelationAnalysis,
	performCorrelationAnalysis,
} from "./posthog/correlation.js";

// Tracing (was @snapback/observability and @snapback/telemetry)
export * from "./tracing/index.js";
