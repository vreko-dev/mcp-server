// SnapBack database schema

import { agentSuggestions } from "./agent-suggestions.js";
import { analysisEvents } from "./analysis-events.js";
// Import all tables and types
import { apiKeyMetadata } from "./api-key-metadata.js";
import { apiKeyUsage } from "./api-key-usage.js";
import { apiKeys } from "./api-keys.js";
import { bypassEvents } from "./bypass-events.js";
import { codeContexts } from "./code-contexts.js";
import { deviceTrials } from "./device-trials.js";
import { errorLogs, errorLogs202510 } from "./error-logs.js";
import { extensionSessions } from "./extension-sessions.js";
import { featureUsage, featureUsage202510 } from "./feature-usage.js";
import { feedback } from "./feedback.js";
import { loops } from "./loops.js";
import { orgDailyMetrics } from "./org-daily-metrics.js";
import { policyEvaluations } from "./policy-evaluations.js";
import { postAcceptOutcomes } from "./post-accept-outcomes.js";
import { quarantineEvents } from "./quarantine-events.js";
import { rateLimitViolations, tokenBuckets } from "./rate-limiting.js";
import { responseCache } from "./response-cache.js";
import { retentionConfig } from "./retention-config.js";
import { ruleViolations } from "./rule-violations.js";
import { securityEvents } from "./security-events.js";
import { snapshotFiles, snapshots } from "./snapshots.js";
import { subscriptions } from "./subscriptions.js";
import { suppressionPatterns } from "./suppression-patterns.js";
import { teamMembers, teams } from "./teams.js";
import { telemetryDailyStats, telemetryEvents, telemetryIdempotencyKeys } from "./telemetry-events.js";
import { apiUsageLogs, apiUsageLogs202510, apiUsageLogs202511, usageStatsDaily } from "./usage-tracking.js";
import { userProfiles } from "./user-profiles.js";
import { userSafetyProfiles } from "./user-safety-profiles.js";
import { waitlist, waitlistReferrals, waitlistTasks } from "./waitlist.js";
import { webhookEvents } from "./webhooks.js";
import { workspaceSettings } from "./workspace-settings.js";

export * from "./agent-suggestions.js";
export * from "./analysis-events.js";
// Re-export all individual items for compatibility
export * from "./api-key-metadata.js";
export * from "./api-key-usage.js";
export * from "./api-keys.js";
export * from "./bypass-events.js";
export * from "./code-contexts.js";
export * from "./device-trials.js";
export * from "./error-logs.js";
export * from "./extension-sessions.js";
export * from "./feature-usage.js";
export * from "./feedback.js";
export * from "./functions.js";
export * from "./loops.js";
export * from "./materialized-views.js";
export * from "./org-daily-metrics.js";
export * from "./policy-evaluations.js";
export * from "./post-accept-outcomes.js";
export * from "./quarantine-events.js";
export * from "./rate-limiting.js";
export * from "./response-cache.js";
export * from "./retention-config.js";
export * from "./rule-violations.js";
export * from "./security-events.js";
export * from "./snapshots.js";
export * from "./subscriptions.js";
// Supabase compatibility helpers
export * from "./supabase-helpers.js";
export * from "./suppression-patterns.js";
export * from "./teams.js";
export * from "./telemetry-events.js";
export * from "./usage-tracking.js";
export * from "./user-profiles.js";
export * from "./user-safety-profiles.js";
export * from "./waitlist.js";
export * from "./webhooks.js";
export * from "./workspace-settings.js";

// Export tables individually for better TypeScript inference
export {
	apiKeyMetadata,
	apiKeys,
	apiKeyUsage,
	agentSuggestions,
	analysisEvents,
	bypassEvents,
	codeContexts,
	deviceTrials,
	errorLogs,
	errorLogs202510,
	extensionSessions,
	featureUsage,
	featureUsage202510,
	feedback,
	loops,
	orgDailyMetrics,
	apiUsageLogs,
	apiUsageLogs202510,
	apiUsageLogs202511,
	usageStatsDaily,
	policyEvaluations,
	postAcceptOutcomes,
	quarantineEvents,
	rateLimitViolations,
	tokenBuckets,
	responseCache,
	retentionConfig,
	ruleViolations,
	securityEvents,
	snapshots,
	snapshotFiles,
	suppressionPatterns,
	subscriptions,
	teams,
	teamMembers,
	telemetryDailyStats,
	telemetryEvents,
	telemetryIdempotencyKeys,
	userProfiles,
	userSafetyProfiles,
	waitlist,
	waitlistReferrals,
	waitlistTasks,
	webhookEvents,
	workspaceSettings,
};

// Export all tables as a namespace object for backward compatibility
export const snapbackSchema = {
	apiKeyMetadata,
	apiKeys,
	apiKeyUsage,
	agentSuggestions,
	analysisEvents,
	bypassEvents,
	codeContexts,
	deviceTrials,
	errorLogs,
	errorLogs202510,
	extensionSessions,
	featureUsage,
	featureUsage202510,
	feedback,
	loops,
	orgDailyMetrics,
	apiUsageLogs,
	apiUsageLogs202510,
	apiUsageLogs202511,
	usageStatsDaily,
	policyEvaluations,
	postAcceptOutcomes,
	quarantineEvents,
	rateLimitViolations,
	tokenBuckets,
	responseCache,
	retentionConfig,
	ruleViolations,
	securityEvents,
	snapshots,
	snapshotFiles,
	suppressionPatterns,
	subscriptions,
	teams,
	teamMembers,
	telemetryDailyStats,
	telemetryEvents,
	telemetryIdempotencyKeys,
	userProfiles,
	userSafetyProfiles,
	waitlist,
	waitlistReferrals,
	waitlistTasks,
	webhookEvents,
	workspaceSettings,
};
