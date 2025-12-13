/**
 * @snapback/config - Unified Configuration Management
 *
 * Provides a single source of truth for SnapBack configuration across
 * all surfaces (VS Code Extension, CLI, MCP Server).
 *
 * Type-safe with Zod schemas. Zero-config defaults for common patterns.
 * Supports multiple sources with precedence-based merging.
 */

export { config } from "./config";
export { type Env, env } from "./env";
// Re-export migration utilities
export {
	isV1Config,
	type MigrationResult,
	migrateV1ToV2,
	type V1ConfigSchema,
	type V1EngineConfig,
	type V1ProtectionEntry,
} from "./migrations/v1-to-v2";
// Re-export path types for type-safe access
export type { ConfigPath, PathValue, SafeGet } from "./path-types";
export {
	// Schemas
	type ConfigStoreV2,
	// Schemas (for custom validation)
	ConfigStoreV2Schema,
	// Defaults
	DEFAULT_CONFIG,
	type EngineConfig,
	EngineConfigSchema,
	type MCPSettings,
	MCPSettingsSchema,
	type Policies,
	PoliciesSchema,
	type ProtectionLevel,
	ProtectionLevelSchema,
	type ProtectionRule,
	ProtectionRuleSchema,
	parseConfig,
	type Settings,
	SettingsSchema,
	// Validators
	validateConfig,
	ZERO_CONFIG_DEFAULTS,
} from "./schemas";
export {
	type ConfigChangeCallback,
	// Store class
	ConfigStore,
	// Configuration options
	type ConfigStoreV2Options,
	// Feature flag metadata
	type FeatureFlagMetadata,
	// Singleton helper
	getConfigStore,
	resetConfigStore,
} from "./store";
// Re-export subscription config types
export { PLAN_PERMISSIONS, type PlanTier } from "./subscription-config";
// Re-export Config type for backward compatibility
export type { Config } from "./types";
export { getBaseUrl } from "./utils/base-url";
// Re-export feature flags
export { isFeatureEnabled } from "./utils/feature-flags";
