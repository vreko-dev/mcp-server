/**
 * Server-only exports from @snapback/config
 *
 * These should ONLY be imported in server components, API routes, etc.
 * Note: This file does NOT use "server-only" package because:
 * - It's only useful in Next.js to prevent client-side bundling
 * - Node.js servers (API, MCP) don't need this guard
 * - Importing it in Node.js causes a runtime error
 */

// Re-export everything from client (server can use all)
export * from "./client";
// Full config object
export { config } from "./config";
// Server-only: Env (reads process.env extensively)
export { type Env, env } from "./env";
// Server-only: Migrations
export {
	isV1Config,
	type MigrationResult,
	migrateV1ToV2,
	type V1ConfigSchema,
	type V1EngineConfig,
	type V1ProtectionEntry,
} from "./migrations/v1-to-v2";
// Server-only: Config store (may have file system access)
export {
	type ConfigChangeCallback,
	ConfigStore,
	type ConfigStoreV2Options,
	type FeatureFlagMetadata,
	getConfigStore,
	resetConfigStore,
} from "./store";
// Server-only: Feature flags (uses logger, PostHog)
export {
	getFeatureFlag,
	isFeatureEnabled,
	shutdownFeatureFlags,
	trackFeatureFlag,
} from "./utils/feature-flags";
