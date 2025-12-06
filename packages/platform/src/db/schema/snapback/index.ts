// SnapBack database schema

import { analysisEvents } from "./analysis-events";
// Import all tables and types
import { apiKeyMetadata } from "./api-key-metadata";
import { apiKeyUsage } from "./api-key-usage";
import { apiKeys } from "./api-keys";
import { bypassEvents } from "./bypass-events";
import { codeContexts } from "./code-contexts";
import { deviceAuthCodes } from "./device-auth-codes";
import { deviceTrials } from "./device-trials";
import { engagementActions, engagementScores } from "./engagement-tracking";
import { errorLogs, errorLogs202510 } from "./error-logs";
import { extensionSessions } from "./extension-sessions";
import { featureUsage, featureUsage202510 } from "./feature-usage";
import { feedback } from "./feedback";
import { githubInstallations, githubPrAnalyses } from "./github-integrations";
import { loops } from "./loops";
import { nurtureTrack } from "./nurture-track";
import { orgDailyMetrics } from "./org-daily-metrics";
import { patterns } from "./patterns";
import { policyEvaluations } from "./policy-evaluations";
import { postAcceptOutcomes } from "./post-accept-outcomes";
import { predictions } from "./predictions";
import { protectionDecisions } from "./protection-decisions";
import { quarantineEvents } from "./quarantine-events";
import { rateLimitViolations, tokenBuckets } from "./rate-limiting";
import { repoPersonalities } from "./repo-personalities";
import { responseCache } from "./response-cache";
import { retentionConfig } from "./retention-config";
import { ruleViolations } from "./rule-violations";
import { securityEvents } from "./security-events";
import { snapshotFiles, snapshots } from "./snapshots";
import { subscriptions } from "./subscriptions";
import { suppressionPatterns } from "./suppression-patterns";
import { teamMembers, teams } from "./teams";
import { telemetryDailyStats, telemetryEvents, telemetryIdempotencyKeys } from "./telemetry-events";
// Intelligence Layer tables
import { trustScores } from "./trust-scores";
import { apiUsageLogs, apiUsageLogs202510, apiUsageLogs202511, usageStatsDaily } from "./usage-tracking";
import { userAnalyticsIdentities } from "./user-analytics-identities";
import { userDailyMetrics } from "./user-daily-metrics";
import { userLifecycleState } from "./user-lifecycle-state";
import { userProductMetrics } from "./user-product-metrics";
import { userProfiles } from "./user-profiles";
import { userSafetyProfiles } from "./user-safety-profiles";
import { waitlist, waitlistReferrals, waitlistTasks } from "./waitlist";
import { webhookEvents } from "./webhooks";
import { workspaceSettings } from "./workspace-settings";

export * from "./analysis-events";
// Re-export all individual items for compatibility
export * from "./api-key-metadata";
export * from "./api-key-usage";
export * from "./api-keys";
export * from "./bypass-events";
export * from "./code-contexts";
export * from "./device-auth-codes";
export * from "./device-trials";
export * from "./engagement-tracking";
export * from "./error-logs";
export * from "./extension-sessions";
export * from "./feature-usage";
export * from "./feedback";
export * from "./functions";
export * from "./github-integrations";
export * from "./loops";
export * from "./materialized-views";
export * from "./nurture-track";
export * from "./org-daily-metrics";
export * from "./patterns";
export * from "./policy-evaluations";
export * from "./post-accept-outcomes";
export * from "./predictions";
export * from "./protection-decisions";
export * from "./quarantine-events";
export * from "./rate-limiting";
export * from "./repo-personalities";
export * from "./response-cache";
export * from "./retention-config";
export * from "./rule-violations";
export * from "./security-events";
export * from "./snapshots";
export * from "./subscriptions";
// Supabase compatibility helpers
export * from "./supabase-helpers";
export * from "./suppression-patterns";
export * from "./teams";
export * from "./telemetry-events";
// Intelligence Layer
export * from "./trust-scores";
export * from "./usage-tracking";
export * from "./user-analytics-identities";
export * from "./user-daily-metrics";
export * from "./user-lifecycle-state";
export * from "./user-product-metrics";
export * from "./user-profiles";
export * from "./user-safety-profiles";
export * from "./waitlist";
export * from "./webhooks";
export * from "./workspace-settings";

// Export tables individually for better TypeScript inference
export {
	apiKeyMetadata,
	apiKeys,
	apiKeyUsage,
	analysisEvents,
	bypassEvents,
	codeContexts,
	deviceAuthCodes,
	deviceTrials,
	errorLogs,
	errorLogs202510,
	extensionSessions,
	featureUsage,
	featureUsage202510,
	feedback,
	loops,
	nurtureTrack,
	orgDailyMetrics,
	apiUsageLogs,
	apiUsageLogs202510,
	apiUsageLogs202511,
	usageStatsDaily,
	policyEvaluations,
	postAcceptOutcomes,
	protectionDecisions,
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
	userAnalyticsIdentities,
	userDailyMetrics,
	userLifecycleState,
	userProductMetrics,
	userProfiles,
	userSafetyProfiles,
	waitlist,
	waitlistReferrals,
	waitlistTasks,
	webhookEvents,
	workspaceSettings,
	// Intelligence Layer
	trustScores,
	patterns,
	predictions,
	repoPersonalities,
	engagementScores,
	engagementActions,
	githubInstallations,
	githubPrAnalyses,
};

// Export all tables as a namespace object for backward compatibility
export const snapbackSchema = {
	apiKeyMetadata,
	apiKeys,
	apiKeyUsage,

	analysisEvents,
	bypassEvents,
	codeContexts,
	deviceAuthCodes,
	deviceTrials,
	errorLogs,
	errorLogs202510,
	extensionSessions,
	featureUsage,
	featureUsage202510,
	feedback,
	loops,
	nurtureTrack,
	orgDailyMetrics,
	apiUsageLogs,
	apiUsageLogs202510,
	apiUsageLogs202511,
	usageStatsDaily,
	policyEvaluations,
	postAcceptOutcomes,
	protectionDecisions,
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
	userAnalyticsIdentities,
	userDailyMetrics,
	userLifecycleState,
	userProductMetrics,
	userProfiles,
	userSafetyProfiles,
	waitlist,
	waitlistReferrals,
	waitlistTasks,
	webhookEvents,
	workspaceSettings,

	// Intelligence Layer
	trustScores,
	patterns,
	predictions,
	repoPersonalities,
	engagementScores,
	engagementActions,
	githubInstallations,
	githubPrAnalyses,
};
