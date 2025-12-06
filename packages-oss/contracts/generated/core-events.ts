/**
 * Generated Core Event Types
 * 
 * This file is auto-generated from Zod schemas. Do not edit manually.
 */

// Save Attempt Event
export type SaveAttemptEvent = {
  event: "save_attempt";
  event_version?: string;
  timestamp: number;
  properties: {
    protection: "watch" | "warn" | "block";
    severity: "low" | "medium" | "high" | "critical";
    file_kind: string;
    reason: string;
    ai_present: boolean;
    ai_burst: boolean;
    outcome: "saved" | "canceled" | "blocked";
  };
};

// Snapshot Created Event
export type SnapshotCreatedEvent = {
  event: "snapshot_created";
  event_version?: string;
  timestamp: number;
  properties: {
    session_id: string;
    snapshot_id: string;
    bytes_original: number;
    bytes_stored: number;
    dedup_hit: boolean;
    latency_ms: number;
  };
};

// Session Finalized Event
export type SessionFinalizedEvent = {
  event: "session_finalized";
  event_version?: string;
  timestamp: number;
  properties: {
    session_id: string;
    files: string[];
    triggers: string[];
    duration_ms: number;
    ai_present: boolean;
    ai_burst: boolean;
    highest_severity: "low" | "medium" | "high" | "critical";
  };
};

// Issue Created Event
export type IssueCreatedEvent = {
  event: "issue_created";
  event_version?: string;
  timestamp: number;
  properties: {
    issue_id: string;
    session_id: string;
    file_kind: string;
    type: "secret" | "mock" | "phantom";
    severity: "low" | "medium" | "high" | "critical";
    recommendation: string;
  };
};

// Issue Resolved Event
export type IssueResolvedEvent = {
  event: "issue_resolved";
  event_version?: string;
  timestamp: number;
  properties: {
    issue_id: string;
    resolution: "fixed" | "ignored" | "allowlisted";
  };
};

// Session Restored Event
export type SessionRestoredEvent = {
  event: "session_restored";
  event_version?: string;
  timestamp: number;
  properties: {
    session_id: string;
    files_restored: string[];
    time_to_restore_ms: number;
    reason: string;
  };
};

// Policy Changed Event
export type PolicyChangedEvent = {
  event: "policy_changed";
  event_version?: string;
  timestamp: number;
  properties: {
    pattern: string;
    from: "watch" | "warn" | "block" | "unprotected";
    to: "watch" | "warn" | "block" | "unprotected";
    source: string;
  };
};

// Union type of all core events
export type CoreTelemetryEvent =
  | SaveAttemptEvent
  | SnapshotCreatedEvent
  | SessionFinalizedEvent
  | IssueCreatedEvent
  | IssueResolvedEvent
  | SessionRestoredEvent
  | PolicyChangedEvent;

