/**
 * Client-safe exports from @snapback/config
 *
 * These can be safely imported in browser/React client components.
 * NO imports from contracts/logger, NO server-only dependencies.
 * NO PostHog or dynamic imports.
 */

export type { ConfigPath, PathValue, SafeGet } from "./path-types";

// Safe schemas (pure Zod, no side effects)
export {
	type ConfigStoreV2,
	ConfigStoreV2Schema,
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
	validateConfig,
	ZERO_CONFIG_DEFAULTS,
} from "./schemas";
// Subscription config (pure data)
export { PLAN_PERMISSIONS, type PlanTier } from "./subscription-config";
// Safe types
export type { Config } from "./types";
// Safe utilities
export { getBaseUrl } from "./utils/base-url";
