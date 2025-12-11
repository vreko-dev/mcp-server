/**
 * ConfigStore v2 - Unified Zod Schemas
 *
 * Single source of truth for all configuration across:
 * - VS Code Extension
 * - CLI
 * - MCP Server
 *
 * Type-safe with runtime validation. Zero-config defaults included.
 */

import { z } from "zod";

/**
 * Protection levels (canonical)
 */
export const ProtectionLevelSchema = z.enum(["watch", "warn", "block"]);
export type ProtectionLevel = z.infer<typeof ProtectionLevelSchema>;

/**
 * Single protection rule
 */
export const ProtectionRuleSchema = z.object({
	pattern: z.string().describe("Glob pattern (e.g., '*.env*', 'package.json')"),
	level: ProtectionLevelSchema,
	reason: z.string().optional().describe("Why this pattern is protected"),
	precedence: z.number().int().min(0).max(1000).default(0),
});
export type ProtectionRule = z.infer<typeof ProtectionRuleSchema>;

/**
 * Engine configuration
 */
export const EngineConfigSchema = z.object({
	maxDepth: z.number().int().min(0).max(10).default(2).describe("Max dependency tree depth for analysis"),
	burstThreshold: z
		.number()
		.int()
		.min(1)
		.max(100)
		.default(30)
		.describe("Min simultaneous file changes to trigger burst detection"),
	cooldowns: z
		.object({
			block: z.number().int().min(0).default(60000),
			warn: z.number().int().min(0).default(30000),
			watch: z.number().int().min(0).default(0),
		})
		.default({ block: 60000, warn: 30000, watch: 0 })
		.describe("Cooldown durations (ms) between alerts per level"),
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;

/**
 * Ignore patterns
 */
export const IgnorePatternsSchema = z
	.array(z.string())
	.default([])
	.describe("Glob patterns to exclude from protection (e.g., node_modules, .git)");

/**
 * Settings for AI detection and behavior
 */
export const SettingsSchema = z
	.object({
		defaultProtectionLevel: ProtectionLevelSchema.default("watch"),
		requireSnapshotMessage: z.boolean().default(true),
		maxSnapshots: z.number().int().min(1).default(100),
		aiDetectionEnabled: z.boolean().default(true),
		autoRestoreOnDetection: z.boolean().default(false),
	})
	.default({});
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Policy overrides (temporary protection changes)
 */
export const PolicyOverrideSchema = z.object({
	pattern: z.string(),
	level: ProtectionLevelSchema,
	ttl: z.number().optional().describe("Expiration timestamp (ms since epoch)"),
});

export const PoliciesSchema = z
	.object({
		enforceProtectionLevels: z.boolean().default(false),
		allowOverrides: z.boolean().default(true),
		overrides: z.array(PolicyOverrideSchema).default([]),
	})
	.default({});
export type Policies = z.infer<typeof PoliciesSchema>;

/**
 * Main configuration schema - compatible across all systems
 */
export const ConfigStoreV2Schema = z.object({
	version: z.literal(2).default(2),
	protections: z.array(ProtectionRuleSchema).default([]),
	ignore: IgnorePatternsSchema,
	engine: EngineConfigSchema.default({}),
	settings: SettingsSchema,
	policies: PoliciesSchema,
});

export type ConfigStoreV2 = z.infer<typeof ConfigStoreV2Schema>;

/**
 * Default empty config (fully populated with schema defaults)
 */
export const DEFAULT_CONFIG: ConfigStoreV2 = {
	version: 2,
	protections: [],
	ignore: [],
	engine: {
		maxDepth: 2,
		burstThreshold: 30,
		cooldowns: { block: 60000, warn: 30000, watch: 0 },
	},
	settings: {
		defaultProtectionLevel: "watch",
		requireSnapshotMessage: true,
		maxSnapshots: 100,
		aiDetectionEnabled: true,
		autoRestoreOnDetection: false,
	},
	policies: {
		enforceProtectionLevels: false,
		allowOverrides: true,
		overrides: [],
	},
};

/**
 * Zero-config defaults for common patterns
 */
export const ZERO_CONFIG_DEFAULTS: ConfigStoreV2 = {
	...DEFAULT_CONFIG,
	protections: [
		{
			pattern: "*.env*",
			level: "block",
			reason: "Environment files contain sensitive credentials",
			precedence: 100,
		},
		{
			pattern: ".env.local",
			level: "block",
			reason: "Local environment overrides",
			precedence: 100,
		},
		{
			pattern: "**/*.secret*",
			level: "block",
			reason: "Secret files must be protected",
			precedence: 100,
		},
		{
			pattern: "**/credentials*",
			level: "block",
			reason: "Credential files must be protected",
			precedence: 100,
		},
		{
			pattern: "package*.json",
			level: "warn",
			reason: "Package files affect dependencies",
			precedence: 50,
		},
		{
			pattern: "**/migrations/*",
			level: "block",
			reason: "Database migrations are irreversible",
			precedence: 100,
		},
		{
			pattern: ".env",
			level: "block",
			reason: "Environment file",
			precedence: 100,
		},
		{
			pattern: ".git/**",
			level: "watch",
			reason: "Git metadata",
			precedence: 10,
		},
	],
	ignore: ["node_modules/**", ".git/**", "dist/**", "build/**", "*.log"],
};

/**
 * Validate config against schema
 */
export function validateConfig(
	data: unknown,
): { valid: true; data: ConfigStoreV2 } | { valid: false; errors: string[] } {
	try {
		const parsed = ConfigStoreV2Schema.parse(data);
		return { valid: true, data: parsed };
	} catch (err) {
		if (err instanceof z.ZodError) {
			const errors = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
			return { valid: false, errors };
		}
		return { valid: false, errors: ["Unknown validation error"] };
	}
}

/**
 * Parse and validate config from JSON string
 */
export function parseConfig(
	jsonString: string,
): { valid: true; data: ConfigStoreV2 } | { valid: false; errors: string[] } {
	try {
		const data = JSON.parse(jsonString);
		return validateConfig(data);
	} catch (err) {
		return { valid: false, errors: [err instanceof Error ? err.message : "Failed to parse JSON"] };
	}
}
