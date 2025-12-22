// Database (Drizzle schemas, migrations)

// Client (Supabase client)
export * from "./client/client";
export * from "./client/middleware";
// export * from "./client/server"; // Removed: server-only code causes ESM resolution issues in Next.js
export * from "./client/types";
export * from "./db/adapters/KeysDb";
export * from "./db/adapters/SnapshotStoreDb";
// Export adapters
export * from "./db/adapters/TelemetrySinkDb";
export type { DatabaseClient } from "./db/client";
// Database exports (drizzle)
// Export combinedSchema for auth package
export { combinedSchema, db } from "./db/client";
export * from "./db/database-service";
export * from "./db/queries/index";
export type {
	ExtensionClient,
	ExtensionLinkToken,
	ExtensionSession,
	NewExtensionLinkToken,
	NewExtensionSession,
} from "./db/schema/extension-auth";
// Export extension auth schema items
export {
	extensionLinkTokens,
	extensionSessions as extensionSessionsAuth,
} from "./db/schema/extension-auth";
// Re-export type exports from postgres schema
export type {
	ApiKey,
	ClientToken,
	Database,
	NewApiKey,
	NewClientToken,
	NewNewsletterSubscriber,
	NewPioneer,
	NewPioneerAction,
	NewPioneerTierHistory,
	NewSubscription,
	NewsletterSubscriber,
	Pioneer,
	PioneerAction,
	PioneerTierHistory,
	Subscription,
} from "./db/schema/postgres";
// Re-export main schema items (avoid duplicate exports)
// Re-export snapback schema items for analytics
// Add missing exports for apiKeyMetadata and securityEvents
// Add all the other missing exports that are being used in the API service
// Export postgres schema items
export {
	agentSuggestions,
	apiKeys,
	apiUsage,
	clientTokens,
	deviceTrials,
	member,
	newsletterSubscribers,
	organization,
	pioneerActions,
	pioneers,
	pioneerTierHistory,
	purchase,
	subscriptions,
	usageLimits,
	user,
} from "./db/schema/postgres";
export { analysisEvents } from "./db/schema/snapback/analysis-events";
// Export the snapbackSchema namespace
export {
	apiKeyMetadata,
	apiKeyUsage,
	apiUsageLogs,
	extensionSessions,
	featureUsage,
	feedback,
	loops,
	// MCP Server (Phase 4)
	mcpActivityEvents,
	mcpAggregatedLearnings,
	mcpSessions,
	orgDailyMetrics,
	policyEvaluations,
	postAcceptOutcomes,
	rateLimitViolations,
	responseCache,
	retentionConfig,
	securityEvents,
	snapbackSchema,
	telemetryEvents,
	waitlistAuditLogs,
} from "./db/schema/snapback/index";
export { ruleViolations } from "./db/schema/snapback/rule-violations";
export {
	snapshotFiles,
	snapshots,
} from "./db/schema/snapback/snapshots";
export { userSafetyProfiles } from "./db/schema/snapback/user-safety-profiles";
// Re-export type exports from snapback schema
export type { NewWaitlistAuditLog } from "./db/schema/snapback/waitlist";
export {
	waitlist,
	waitlistReferrals,
	waitlistTasks,
} from "./db/schema/snapback/waitlist";

export * from "./db/supabase-service";
export * from "./db/test-utils";
export * from "./db/zod";
