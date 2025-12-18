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

// Register the infrastructure logger with @snapback/contracts
// This allows contracts to use the enhanced pino logger without a compile-time dependency
import { type LoggerOptions, LogLevel, registerLoggerFactory } from "@snapback/contracts";
import { logger as infrastructureLogger } from "./logging/logger";

registerLoggerFactory((options: LoggerOptions) => {
	// Create child logger with module name for better tracing
	const childLogger = infrastructureLogger.child({ module: options.name });

	// Map log levels if specified
	const shouldLog = (level: LogLevel) => {
		if (options.level === undefined) return true;
		return level >= options.level;
	};

	return {
		debug: (message: string, meta?: Record<string, unknown>) => {
			if (shouldLog(LogLevel.DEBUG)) childLogger.debug(message, meta);
		},
		info: (message: string, meta?: Record<string, unknown>) => {
			if (shouldLog(LogLevel.INFO)) childLogger.info(message, meta);
		},
		warn: (message: string, meta?: Record<string, unknown>) => {
			if (shouldLog(LogLevel.WARN)) childLogger.warn(message, meta);
		},
		error: (message: string, meta?: Record<string, unknown> | Error) => {
			if (shouldLog(LogLevel.ERROR)) {
				if (meta instanceof Error) {
					childLogger.error(message, { error: meta.message, stack: meta.stack });
				} else {
					childLogger.error(message, meta);
				}
			}
		},
	};
});

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
