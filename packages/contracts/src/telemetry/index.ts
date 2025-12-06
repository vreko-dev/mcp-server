// Import core event types from canonical source
export type {
	AuthApprovalReceivedEvent,
	AuthBrowserOpenedEvent,
	AuthCodeEntryEvent,
	// Diagnostic events types
	AuthProviderSelectedEvent,
	CoreTelemetryEvent,
	CoreTelemetryEventName,
	IssueCreatedEvent,
	IssueResolvedEvent,
	PolicyChangedEvent,
	SaveAttemptEvent,
	SessionFinalizedEvent,
	SessionRestoredEvent,
	SnapshotCreatedEvent,
	WelcomeActionTriggeredEvent,
	WelcomeFeatureViewedEvent,
} from "../events/core";
export {
	AuthApprovalReceivedSchema,
	AuthBrowserOpenedSchema,
	AuthCodeEntrySchema,
	// Diagnostic event schemas
	AuthProviderSelectedSchema,
	CORE_TELEMETRY_EVENTS,
	CoreEventSchema,
	// Core event schemas
	IssueCreatedSchema,
	IssueResolvedSchema,
	PolicyChangedSchema,
	SaveAttemptSchema,
	SessionFinalizedSchema,
	SessionRestoredSchema,
	SnapshotCreatedSchema,
	validateCoreTelemetryEvent,
	WelcomeActionTriggeredSchema,
	WelcomeFeatureViewedSchema,
} from "../events/core";
export * from "./diagnostic-events";
export * from "./event-mapper";
export * from "./events";
export * from "./migrate-events";
