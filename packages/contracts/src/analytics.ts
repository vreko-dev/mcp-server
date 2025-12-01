/**
 * Analytics Event Contracts - Strict Schema for Product Analytics
 *
 * All events MUST use the analytics-client wrapper for sanitization
 * Direct PostHog calls are FORBIDDEN and will fail CI guards
 *
 * Session Analytics Privacy Guarantees:
 * - ❌ No file paths (absolute or relative)
 * - ❌ No path hashes (re-identification risk)
 * - ❌ No filenames or file stems
 * - ❌ No workspace identifiers (hashed or unhashed)
 * - ❌ No session labels or names
 * - ❌ No token_counts (client name leakage risk)
 * - ✅ changeCount (integer)
 * - ✅ durationMs (integer)
 * - ✅ tier ('free' | 'solo')
 * - ✅ ext_counts (Solo tier only, consent required, ≥3 changes for k-anonymity)
 */

import type { Tier } from "./tiers.js";

/**
 * Base event structure
 */
interface BaseAnalyticsEvent {
	userId: string;
	timestamp?: number; // Auto-added if not provided
}

/**
 * Event metadata interfaces
 */
interface SnapshotCreatedMeta {
	fileCount: number;
	trigger: "manual" | "auto" | "pre-commit" | "window-blur";
	cloud: boolean;
	sizeBytes?: number;
}

interface SnapshotRestoredMeta {
	filesRestored: number;
	source: "ui" | "cli" | "mcp";
	snapshotAge?: number; // days since snapshot created
}

interface PolicyViolationMeta {
	severity: "low" | "medium" | "high" | "critical";
	action: "watch" | "warn" | "block";
	ruleId: string;
	path?: string; // Will be normalized/scrubbed
}

interface AISuggestionShownMeta {
	type: "fix" | "refactor" | "security";
	riskScore?: number; // 0-10
	suggestionId: string;
}

interface AISuggestionAcceptedMeta {
	suggestionId: string;
	timeToAcceptMs: number;
}

interface AISuggestionDismissedMeta {
	suggestionId: string;
	reason: "irrelevant" | "incorrect" | "too-complex" | "other";
}

interface LoginMeta {
	method: "email" | "oauth";
	provider?: string; // e.g., 'google', 'github'
	twoFactorEnabled?: boolean;
}

interface UpgradeIntentMeta {
	targetTier: Tier;
	source: "pricing" | "paywall" | "docs" | "banner";
	currentTier: Tier;
}

interface CloudBackupMeta {
	status: "started" | "completed" | "failed";
	sizeBytes?: number;
	durationMs?: number;
	error?: string;
}

interface PolicyCheckMeta {
	detector: "secrets" | "mocks" | "phantom-deps";
	findingsCount: number;
	durationMs: number;
}

/**
 * Session Analytics Event Metadata
 *
 * Privacy-Safe Session Events (Alpha)
 * Tracks session lifecycle without exposing workspace, file paths, or user content.
 */
interface SessionStartedMeta {
	changeCount: 0; // Always 0 at session start
	durationMs?: number; // Optional: time since last session ended
	tier: "free" | "solo";
}

interface SessionFinalizedMeta {
	changeCount: number; // Total file changes in session
	durationMs: number; // Session duration in milliseconds
	tier: "free" | "solo";
	ext_counts?: Record<string, number>; // Solo only, consent required, ≥3 changes
}

/**
 * Discriminated union of all product analytics events
 * Renamed to ProductAnalyticsEvent to avoid conflict with infrastructure AnalyticsEvent
 */
export type ProductAnalyticsEvent =
	| (BaseAnalyticsEvent & { name: "SNAPSHOT_CREATED"; meta: SnapshotCreatedMeta })
	| (BaseAnalyticsEvent & { name: "SNAPSHOT_RESTORED"; meta: SnapshotRestoredMeta })
	| (BaseAnalyticsEvent & { name: "POLICY_VIOLATION"; meta: PolicyViolationMeta })
	| (BaseAnalyticsEvent & { name: "AI_SUGGESTION_SHOWN"; meta: AISuggestionShownMeta })
	| (BaseAnalyticsEvent & { name: "AI_SUGGESTION_ACCEPTED"; meta: AISuggestionAcceptedMeta })
	| (BaseAnalyticsEvent & { name: "AI_SUGGESTION_DISMISSED"; meta: AISuggestionDismissedMeta })
	| (BaseAnalyticsEvent & { name: "LOGIN"; meta: LoginMeta })
	| (BaseAnalyticsEvent & { name: "UPGRADE_INTENT"; meta: UpgradeIntentMeta })
	| (BaseAnalyticsEvent & { name: "CLOUD_BACKUP"; meta: CloudBackupMeta })
	| (BaseAnalyticsEvent & { name: "POLICY_CHECK"; meta: PolicyCheckMeta })
	| (BaseAnalyticsEvent & { name: "SESSION_STARTED"; meta: SessionStartedMeta })
	| (BaseAnalyticsEvent & { name: "SESSION_FINALIZED"; meta: SessionFinalizedMeta });

/**
 * Batch structure for efficient transmission
 */
export interface AnalyticsBatch {
	events: ProductAnalyticsEvent[];
	sentAt: number; // Unix timestamp
	batchId?: string; // For deduplication
}

/**
 * Analytics response from ingest endpoint
 */
export interface AnalyticsIngestResponse {
	success: boolean;
	eventCount: number;
	eventIds?: string[];
	errors?: Array<{ index: number; error: string }>;
}

/**
 * Type guards for event names
 */
export function isSnapshotEvent(
	event: ProductAnalyticsEvent,
): event is Extract<ProductAnalyticsEvent, { name: "SNAPSHOT_CREATED" | "SNAPSHOT_RESTORED" }> {
	return event.name === "SNAPSHOT_CREATED" || event.name === "SNAPSHOT_RESTORED";
}

export function isPolicyEvent(
	event: ProductAnalyticsEvent,
): event is Extract<ProductAnalyticsEvent, { name: "POLICY_VIOLATION" | "POLICY_CHECK" }> {
	return event.name === "POLICY_VIOLATION" || event.name === "POLICY_CHECK";
}

export function isAISuggestionEvent(
	event: ProductAnalyticsEvent,
): event is Extract<
	ProductAnalyticsEvent,
	{ name: "AI_SUGGESTION_SHOWN" | "AI_SUGGESTION_ACCEPTED" | "AI_SUGGESTION_DISMISSED" }
> {
	return (
		event.name === "AI_SUGGESTION_SHOWN" ||
		event.name === "AI_SUGGESTION_ACCEPTED" ||
		event.name === "AI_SUGGESTION_DISMISSED"
	);
}

export function isSessionEvent(
	event: ProductAnalyticsEvent,
): event is Extract<ProductAnalyticsEvent, { name: "SESSION_STARTED" | "SESSION_FINALIZED" }> {
	return event.name === "SESSION_STARTED" || event.name === "SESSION_FINALIZED";
}

/**
 * Event name constants (for type-safe event creation)
 */
export const ANALYTICS_EVENTS = {
	SNAPSHOT_CREATED: "SNAPSHOT_CREATED",
	SNAPSHOT_RESTORED: "SNAPSHOT_RESTORED",
	POLICY_VIOLATION: "POLICY_VIOLATION",
	AI_SUGGESTION_SHOWN: "AI_SUGGESTION_SHOWN",
	AI_SUGGESTION_ACCEPTED: "AI_SUGGESTION_ACCEPTED",
	AI_SUGGESTION_DISMISSED: "AI_SUGGESTION_DISMISSED",
	LOGIN: "LOGIN",
	UPGRADE_INTENT: "UPGRADE_INTENT",
	CLOUD_BACKUP: "CLOUD_BACKUP",
	POLICY_CHECK: "POLICY_CHECK",
	SESSION_STARTED: "SESSION_STARTED",
	SESSION_FINALIZED: "SESSION_FINALIZED",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
