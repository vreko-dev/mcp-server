import { z } from "zod";
// Extend Zod with OpenAPI functionality
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
// Event version constant
export const EVENT_VERSION = "1.0.0";
// Base event schema with version
export const BaseEventSchema = z.object({
    event_version: z.string().default(EVENT_VERSION).openapi({ example: "1.0.0" }),
    timestamp: z.number().default(() => Date.now()).openapi({ example: 1620000000000 }),
});
// 1. save_attempt event
export const SaveAttemptSchema = BaseEventSchema.extend({
    event: z.literal("save_attempt"),
    properties: z.object({
        protection: z.enum(["watch", "warn", "block"]).openapi({ description: "Protection level applied to the file" }),
        severity: z.enum(["low", "medium", "high", "critical"]).openapi({ description: "Severity of the risk detected" }),
        file_kind: z.string().openapi({ description: "Type of file being protected", example: "typescript" }),
        reason: z.string().openapi({ description: "Reason for the save attempt", example: "User tried to save a file with a secret" }),
        ai_present: z.boolean().openapi({ description: "Whether AI was involved in the decision" }),
        ai_burst: z.boolean().openapi({ description: "Whether this was part of an AI burst operation" }),
        outcome: z.enum(["saved", "canceled", "blocked"]).openapi({ description: "Outcome of the save attempt" }),
    }),
}).openapi("SaveAttemptEvent");
// 2. snapshot_created event
export const SnapshotCreatedSchema = BaseEventSchema.extend({
    event: z.literal("snapshot_created"),
    properties: z.object({
        session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
        snapshot_id: z.string().openapi({ description: "Unique identifier for the snapshot", example: "snap_67890" }),
        bytes_original: z.number().openapi({ description: "Original size of the file in bytes", example: 1024 }),
        bytes_stored: z.number().openapi({ description: "Size of the stored snapshot in bytes", example: 512 }),
        dedup_hit: z.boolean().openapi({ description: "Whether deduplication was applied" }),
        latency_ms: z.number().openapi({ description: "Time taken to create the snapshot in milliseconds", example: 45 }),
    }),
}).openapi("SnapshotCreatedEvent");
// 3. session_finalized event
export const SessionFinalizedSchema = BaseEventSchema.extend({
    event: z.literal("session_finalized"),
    properties: z.object({
        session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
        files: z.array(z.string()).openapi({ description: "List of files in the session", example: ["src/index.ts", "package.json"] }),
        triggers: z.array(z.string()).openapi({ description: "List of triggers that activated during the session", example: ["save_attempt", "risk_detected"] }),
        duration_ms: z.number().openapi({ description: "Duration of the session in milliseconds", example: 120000 }),
        ai_present: z.boolean().openapi({ description: "Whether AI was involved in the session" }),
        ai_burst: z.boolean().openapi({ description: "Whether this was part of an AI burst operation" }),
        highest_severity: z.enum(["low", "medium", "high", "critical"]).openapi({ description: "Highest severity of issues in the session" }),
    }),
}).openapi("SessionFinalizedEvent");
// 4. issue_created event
export const IssueCreatedSchema = BaseEventSchema.extend({
    event: z.literal("issue_created"),
    properties: z.object({
        issue_id: z.string().openapi({ description: "Unique identifier for the issue", example: "issue_12345" }),
        session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
        file_kind: z.string().openapi({ description: "Type of file where the issue was detected", example: "typescript" }),
        type: z.enum(["secret", "mock", "phantom"]).openapi({ description: "Type of issue detected" }),
        severity: z.enum(["low", "medium", "high", "critical"]).openapi({ description: "Severity of the issue" }),
        recommendation: z.string().openapi({ description: "Recommendation for resolving the issue", example: "Remove the secret from the file" }),
    }),
}).openapi("IssueCreatedEvent");
// 5. issue_resolved event
export const IssueResolvedSchema = BaseEventSchema.extend({
    event: z.literal("issue_resolved"),
    properties: z.object({
        issue_id: z.string().openapi({ description: "Unique identifier for the issue", example: "issue_12345" }),
        resolution: z.enum(["fixed", "ignored", "allowlisted"]).openapi({ description: "How the issue was resolved" }),
    }),
}).openapi("IssueResolvedEvent");
// 6. session_restored event
export const SessionRestoredSchema = BaseEventSchema.extend({
    event: z.literal("session_restored"),
    properties: z.object({
        session_id: z.string().openapi({ description: "Unique identifier for the session", example: "sess_12345" }),
        files_restored: z.array(z.string()).openapi({ description: "List of files that were restored", example: ["src/index.ts", "package.json"] }),
        time_to_restore_ms: z.number().openapi({ description: "Time taken to restore the session in milliseconds", example: 2500 }),
        reason: z.string().openapi({ description: "Reason for the session restoration", example: "User requested rollback" }),
    }),
}).openapi("SessionRestoredEvent");
// 7. policy_changed event
export const PolicyChangedSchema = BaseEventSchema.extend({
    event: z.literal("policy_changed"),
    properties: z.object({
        pattern: z.string().openapi({ description: "File pattern that the policy applies to", example: "*.env" }),
        from: z.enum(["watch", "warn", "block", "unprotected"]).openapi({ description: "Previous protection level" }),
        to: z.enum(["watch", "warn", "block", "unprotected"]).openapi({ description: "New protection level" }),
        source: z.string().openapi({ description: "Source of the policy change", example: "dashboard" }),
    }),
}).openapi("PolicyChangedEvent");
// Zod schema for validating any core event
export const CoreEventSchema = z.discriminatedUnion("event", [
    SaveAttemptSchema,
    SnapshotCreatedSchema,
    SessionFinalizedSchema,
    IssueCreatedSchema,
    IssueResolvedSchema,
    SessionRestoredSchema,
    PolicyChangedSchema,
]);
// Event name enum for compile-time checking
export const CORE_TELEMETRY_EVENTS = {
    SAVE_ATTEMPT: "save_attempt",
    SNAPSHOT_CREATED: "snapshot_created",
    SESSION_FINALIZED: "session_finalized",
    ISSUE_CREATED: "issue_created",
    ISSUE_RESOLVED: "issue_resolved",
    SESSION_RESTORED: "session_restored",
    POLICY_CHANGED: "policy_changed",
};
// Helper function to validate core telemetry events
export function validateCoreTelemetryEvent(event) {
    const result = CoreEventSchema.safeParse(event);
    return result.success;
}
// Helper function to get validation errors
export function getCoreEventValidationError(event) {
    const result = CoreEventSchema.safeParse(event);
    if (result.success) {
        return null;
    }
    return result.error.message;
}
