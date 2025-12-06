export * from "./event-mapper";
export * from "./events";
export type {
	CoreTelemetryEventName,
	CoreTelemetryEventV1,
	IssueCreatedEventV1,
	IssueResolvedEventV1,
	PolicyChangedEventV1,
	SaveAttemptEventV1,
	SessionFinalizedEventV1,
	SessionRestoredEventV1,
	SnapshotCreatedEventV1,
} from "./events.v1";
export {
	CORE_TELEMETRY_EVENTS,
	CoreEventSchema,
	getCoreEventValidationError,
	IssueCreatedSchema,
	IssueResolvedSchema,
	PolicyChangedSchema,
	// Export v1 events with distinct names
	SaveAttemptSchema,
	SessionFinalizedSchema,
	SessionRestoredSchema,
	SnapshotCreatedSchemaV1 as SnapshotCreatedSchema,
	validateCoreTelemetryEvent,
} from "./events.v1";
export * from "./migrate-events";
