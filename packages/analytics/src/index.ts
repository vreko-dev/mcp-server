// Analytics Client (Phase 0 - Alpha)
export {
	AnalyticsClient,
	type AnalyticsClientConfig,
	getAnalyticsClient,
	initAnalyticsClient,
	trackEvent,
} from "./client";

export { type Clock, SystemClock } from "./clock";
export { type AnalyticsEvent, AnalyticsEvents, type EmptyEventProperties, type EventProperties } from "./events";
export { FilterBuilder, type FilterResult } from "./query/filters";
export { redactObject, redactString } from "./redaction";
export { type RetentionJobConfig, RetentionService } from "./retention";

// Canonical Telemetry Service - single source of truth
export {
	CanonicalTelemetryService,
	getTelemetry,
	initTelemetry,
	type TelemetryConfig,
	trackEvent as trackTelemetryEvent,
} from "./telemetry-service";
