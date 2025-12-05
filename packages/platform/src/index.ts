// Database (Drizzle schemas, migrations)

// Client (Supabase client)
export * from "./client/client.js";
export * from "./client/middleware.js";
// export * from "./client/server.js"; // Removed: server-only code causes ESM resolution issues in Next.js
export * from "./client/types.js";
export * from "./db/adapters/KeysDb.js";
export * from "./db/adapters/SnapshotStoreDb.js";
// Export adapters
export * from "./db/adapters/TelemetrySinkDb.js";
export type { DatabaseClient } from "./db/client.js";
// Database exports (drizzle)
// Export combinedSchema for auth package
export { combinedSchema, db } from "./db/client.js";
export * from "./db/database-service.js";
export * from "./db/queries/index.js";
export type {
	ExtensionClient,
	ExtensionLinkToken,
	ExtensionSession,
	NewExtensionLinkToken,
	NewExtensionSession,
} from "./db/schema/extension-auth.js";
// Export extension auth schema items
export {
	extensionLinkTokens,
	extensionSessions as extensionSessionsAuth,
} from "./db/schema/extension-auth.js";
// Re-export type exports from postgres schema
export type {
	ApiKey,
	ClientToken,
	Database,
	NewApiKey,
	NewClientToken,
	NewNewsletterSubscriber,
	NewSubscription,
	NewsletterSubscriber,
	Subscription,
} from "./db/schema/postgres.js";
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
	purchase,
	subscriptions,
	usageLimits,
	user,
} from "./db/schema/postgres.js";
export { analysisEvents } from "./db/schema/snapback/analysis-events.js";
// Export the snapbackSchema namespace
export {
	apiKeyMetadata,
	apiKeyUsage,
	apiUsageLogs,
	extensionSessions,
	featureUsage,
	feedback,
	loops,
	orgDailyMetrics,
	policyEvaluations,
	postAcceptOutcomes,
	rateLimitViolations,
	responseCache,
	securityEvents,
	snapbackSchema,
	telemetryEvents,
	waitlistAuditLogs,
} from "./db/schema/snapback/index.js";
export { ruleViolations } from "./db/schema/snapback/rule-violations.js";
export {
	snapshotFiles,
	snapshots,
} from "./db/schema/snapback/snapshots.js";
export { userSafetyProfiles } from "./db/schema/snapback/user-safety-profiles.js";
// Re-export type exports from snapback schema
export type { NewWaitlistAuditLog } from "./db/schema/snapback/waitlist.js";
export {
	waitlist,
	waitlistReferrals,
	waitlistTasks,
} from "./db/schema/snapback/waitlist.js";

export * from "./db/supabase-service.js";
export * from "./db/test-utils.js";
export * from "./db/zod.js";
