// Metrics (was @snapback/analytics)

// Analytics wrapper - Privacy-safe analytics abstraction
export type {
	AnalyticsConfig,
	SafeEventProperties,
} from "./analytics/AnalyticsWrapper";
export {
	AnalyticsWrapper,
	createAnalyticsWrapper,
} from "./analytics/AnalyticsWrapper";
// Logging (was @snapback/infrastructure)
export * from "./logging/logger";
export * from "./metrics/index";

// PostHog utilities - Explicit named exports for tsup DTS compatibility
export type {
	AlertConfig,
	AlertNotification,
} from "./posthog/alerts";
export {
	createAlert,
	deleteAlert,
	getAlerts,
	KEY_METRIC_ALERTS,
	toggleAlert,
} from "./posthog/alerts";
export type {
	Cohort,
	CohortConfig,
} from "./posthog/cohorts";
export {
	CORRELATION_COHORTS,
	createCohort,
	deleteCohort,
	getCohort,
	getCohortMembers,
	getCohorts,
	RETENTION_COHORTS,
	updateCohort,
} from "./posthog/cohorts";
export type {
	CorrelationAnalysis,
	CorrelationAnalysisConfig,
	CorrelationResult,
} from "./posthog/correlation";

export {
	CORRELATION_ANALYSES,
	getCorrelationAnalysis,
	performCorrelationAnalysis,
} from "./posthog/correlation";
// Sentry Error Tracking
export {
	addSentryBreadcrumb,
	captureError,
	captureMessage,
	clearSentryUser,
	flushSentry,
	initSentry,
	setSentryUser,
	startSentryTransaction,
} from "./sentry/index";
// Tracing (was @snapback/observability and @snapback/telemetry)
export * from "./tracing/index";
