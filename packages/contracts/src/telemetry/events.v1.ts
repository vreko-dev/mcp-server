/**
 * Core Telemetry Event Schemas - V1 Compatibility Layer
 *
 * This module re-exports from the canonical source (events/core.ts) and provides
 * backward-compatible V1 type aliases for existing code.
 *
 * CANONICAL SOURCE: ../events/core.ts
 *
 * @deprecated Use imports from '../events/core' or '../telemetry' index directly
 */

// Re-export everything from the canonical source
export {
	// Constants
	EVENT_VERSION,
	CORE_TELEMETRY_EVENTS,
	// Base schema
	BaseEventSchema,
	// Core event schemas (7)
	SaveAttemptSchema,
	SnapshotCreatedSchema,
	SessionFinalizedSchema,
	IssueCreatedSchema,
	IssueResolvedSchema,
	SessionRestoredSchema,
	PolicyChangedSchema,
	// Combined schema
	CoreEventSchema,
	// Validation helpers
	validateCoreTelemetryEvent,
	getCoreEventValidationError,
	// Types (canonical names)
	type SaveAttemptEvent,
	type SnapshotCreatedEvent,
	type SessionFinalizedEvent,
	type IssueCreatedEvent,
	type IssueResolvedEvent,
	type SessionRestoredEvent,
	type PolicyChangedEvent,
	type CoreTelemetryEvent,
	type CoreTelemetryEventName,
} from "../events/core";

// ============================================================================
// V1 Type Aliases for Backward Compatibility
// ============================================================================

import type {
	SaveAttemptEvent,
	SnapshotCreatedEvent,
	SessionFinalizedEvent,
	IssueCreatedEvent,
	IssueResolvedEvent,
	SessionRestoredEvent,
	PolicyChangedEvent,
	CoreTelemetryEvent,
} from "../events/core";

import { SnapshotCreatedSchema as _SnapshotCreatedSchema } from "../events/core";

/**
 * @deprecated Use SaveAttemptEvent from '../events/core'
 */
export type SaveAttemptEventV1 = SaveAttemptEvent;

/**
 * @deprecated Use SnapshotCreatedEvent from '../events/core'
 */
export type SnapshotCreatedEventV1 = SnapshotCreatedEvent;

/**
 * Alias for backward compatibility - some code uses SnapshotCreatedSchemaV1
 * @deprecated Use SnapshotCreatedSchema from '../events/core'
 */
export const SnapshotCreatedSchemaV1 = _SnapshotCreatedSchema;

/**
 * @deprecated Use SessionFinalizedEvent from '../events/core'
 */
export type SessionFinalizedEventV1 = SessionFinalizedEvent;

/**
 * @deprecated Use IssueCreatedEvent from '../events/core'
 */
export type IssueCreatedEventV1 = IssueCreatedEvent;

/**
 * @deprecated Use IssueResolvedEvent from '../events/core'
 */
export type IssueResolvedEventV1 = IssueResolvedEvent;

/**
 * @deprecated Use SessionRestoredEvent from '../events/core'
 */
export type SessionRestoredEventV1 = SessionRestoredEvent;

/**
 * @deprecated Use PolicyChangedEvent from '../events/core'
 */
export type PolicyChangedEventV1 = PolicyChangedEvent;

/**
 * @deprecated Use CoreTelemetryEvent from '../events/core'
 */
export type CoreTelemetryEventV1 = CoreTelemetryEvent;
