import { z } from "zod";
export declare const EVENT_VERSION = "1.0.0";
export declare const BaseEventSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const SaveAttemptSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"save_attempt">;
    properties: z.ZodObject<{
        protection: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
        file_kind: z.ZodString;
        reason: z.ZodString;
        ai_present: z.ZodBoolean;
        ai_burst: z.ZodBoolean;
        outcome: z.ZodEnum<{
            saved: "saved";
            canceled: "canceled";
            blocked: "blocked";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SaveAttemptEventV1 = z.infer<typeof SaveAttemptSchema>;
export declare const SnapshotCreatedSchemaV1: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"snapshot_created">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        snapshot_id: z.ZodString;
        bytes_original: z.ZodNumber;
        bytes_stored: z.ZodNumber;
        dedup_hit: z.ZodBoolean;
        latency_ms: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SnapshotCreatedEventV1 = z.infer<typeof SnapshotCreatedSchemaV1>;
export declare const SessionFinalizedSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"session_finalized">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        files: z.ZodArray<z.ZodString>;
        triggers: z.ZodArray<z.ZodString>;
        duration_ms: z.ZodNumber;
        ai_present: z.ZodBoolean;
        ai_burst: z.ZodBoolean;
        highest_severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SessionFinalizedEventV1 = z.infer<typeof SessionFinalizedSchema>;
export declare const IssueCreatedSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"issue_created">;
    properties: z.ZodObject<{
        issue_id: z.ZodString;
        session_id: z.ZodString;
        file_kind: z.ZodString;
        type: z.ZodEnum<{
            secret: "secret";
            mock: "mock";
            phantom: "phantom";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
        recommendation: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type IssueCreatedEventV1 = z.infer<typeof IssueCreatedSchema>;
export declare const IssueResolvedSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"issue_resolved">;
    properties: z.ZodObject<{
        issue_id: z.ZodString;
        resolution: z.ZodEnum<{
            ignored: "ignored";
            fixed: "fixed";
            allowlisted: "allowlisted";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type IssueResolvedEventV1 = z.infer<typeof IssueResolvedSchema>;
export declare const SessionRestoredSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"session_restored">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        files_restored: z.ZodArray<z.ZodString>;
        time_to_restore_ms: z.ZodNumber;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SessionRestoredEventV1 = z.infer<typeof SessionRestoredSchema>;
export declare const PolicyChangedSchema: z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"policy_changed">;
    properties: z.ZodObject<{
        pattern: z.ZodString;
        from: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
            unprotected: "unprotected";
        }>;
        to: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
            unprotected: "unprotected";
        }>;
        source: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PolicyChangedEventV1 = z.infer<typeof PolicyChangedSchema>;
export type CoreTelemetryEventV1 = SaveAttemptEventV1 | SnapshotCreatedEventV1 | SessionFinalizedEventV1 | IssueCreatedEventV1 | IssueResolvedEventV1 | SessionRestoredEventV1 | PolicyChangedEventV1;
export declare const CoreEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"save_attempt">;
    properties: z.ZodObject<{
        protection: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
        file_kind: z.ZodString;
        reason: z.ZodString;
        ai_present: z.ZodBoolean;
        ai_burst: z.ZodBoolean;
        outcome: z.ZodEnum<{
            saved: "saved";
            canceled: "canceled";
            blocked: "blocked";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"snapshot_created">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        snapshot_id: z.ZodString;
        bytes_original: z.ZodNumber;
        bytes_stored: z.ZodNumber;
        dedup_hit: z.ZodBoolean;
        latency_ms: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"session_finalized">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        files: z.ZodArray<z.ZodString>;
        triggers: z.ZodArray<z.ZodString>;
        duration_ms: z.ZodNumber;
        ai_present: z.ZodBoolean;
        ai_burst: z.ZodBoolean;
        highest_severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"issue_created">;
    properties: z.ZodObject<{
        issue_id: z.ZodString;
        session_id: z.ZodString;
        file_kind: z.ZodString;
        type: z.ZodEnum<{
            secret: "secret";
            mock: "mock";
            phantom: "phantom";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
        recommendation: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"issue_resolved">;
    properties: z.ZodObject<{
        issue_id: z.ZodString;
        resolution: z.ZodEnum<{
            ignored: "ignored";
            fixed: "fixed";
            allowlisted: "allowlisted";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"session_restored">;
    properties: z.ZodObject<{
        session_id: z.ZodString;
        files_restored: z.ZodArray<z.ZodString>;
        time_to_restore_ms: z.ZodNumber;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    event_version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    event: z.ZodLiteral<"policy_changed">;
    properties: z.ZodObject<{
        pattern: z.ZodString;
        from: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
            unprotected: "unprotected";
        }>;
        to: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
            unprotected: "unprotected";
        }>;
        source: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>], "event">;
export declare const CORE_TELEMETRY_EVENTS: {
    readonly SAVE_ATTEMPT: "save_attempt";
    readonly SNAPSHOT_CREATED: "snapshot_created";
    readonly SESSION_FINALIZED: "session_finalized";
    readonly ISSUE_CREATED: "issue_created";
    readonly ISSUE_RESOLVED: "issue_resolved";
    readonly SESSION_RESTORED: "session_restored";
    readonly POLICY_CHANGED: "policy_changed";
};
export type CoreTelemetryEventName = typeof CORE_TELEMETRY_EVENTS[keyof typeof CORE_TELEMETRY_EVENTS];
export declare function validateCoreTelemetryEvent(event: unknown): event is CoreTelemetryEventV1;
export declare function getCoreEventValidationError(event: unknown): string | null;
