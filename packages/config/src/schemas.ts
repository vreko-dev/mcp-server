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
 * Privacy and consent settings for VS Code Extension
 */
export const PrivacySettingsSchema = z
	.object({
		consent: z.boolean().default(false).describe("User has given privacy consent"),
		clipboard: z.boolean().default(false).describe("Allow clipboard monitoring"),
		watcher: z.boolean().default(false).describe("Allow file watcher"),
		gitWrapper: z.boolean().default(false).describe("Allow git wrapper integration"),
		lastReminded: z.string().optional().describe("ISO timestamp of last consent reminder"),
	})
	.default({});
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

/**
 * Notification settings
 */
export const NotificationsSettingsSchema = z
	.object({
		enabled: z.boolean().default(true),
		quietHours: z
			.object({
				start: z.string().default("22:00"),
				end: z.string().default("08:00"),
			})
			.default({ start: "22:00", end: "08:00" }),
		rateLimit: z.number().int().min(1).default(5).describe("Max notifications per minute"),
	})
	.default({});
export type NotificationsSettings = z.infer<typeof NotificationsSettingsSchema>;

/**
 * Snapshot settings
 */
export const SnapshotSettingsSchema = z
	.object({
		enabled: z.boolean().default(true),
		autoCreate: z.boolean().default(true),
		retentionDays: z.number().int().min(1).default(30),
	})
	.default({});
export type SnapshotSettings = z.infer<typeof SnapshotSettingsSchema>;

/**
 * AI features settings
 */
export const AISettingsSchema = z
	.object({
		enabled: z.boolean().default(true),
		context: z.boolean().default(true).describe("Include code context in AI analysis"),
		copilot: z.boolean().default(true).describe("Integrate with GitHub Copilot"),
	})
	.default({});
export type AISettings = z.infer<typeof AISettingsSchema>;

/**
 * Guardian plugin settings
 */
export const GuardianPluginsSchema = z
	.object({
		secretDetection: z.boolean().default(true),
		mockReplacement: z.boolean().default(true),
		phantomDependency: z.boolean().default(true),
	})
	.default({});

export const GuardianThresholdsSchema = z
	.object({
		warn: z.number().int().min(0).default(6),
		block: z.number().int().min(0).default(8),
	})
	.default({ warn: 6, block: 8 });

export const GuardianSettingsSchema = z
	.object({
		enabled: z.boolean().default(true),
		warnThreshold: z.number().int().min(0).max(100).default(5),
		blockThreshold: z.number().int().min(0).max(100).default(8),
		protectionLevel: ProtectionLevelSchema.default("warn"),
		plugins: GuardianPluginsSchema,
		thresholds: GuardianThresholdsSchema,
	})
	.default({});
export type GuardianSettings = z.infer<typeof GuardianSettingsSchema>;

/**
 * Auto-decision engine settings
 */
export const AutoDecisionSettingsSchema = z
	.object({
		riskThreshold: z
			.number()
			.int()
			.min(0)
			.max(100)
			.default(60)
			.describe("Risk score threshold (0-100) for automatic snapshot creation"),
		notifyThreshold: z
			.number()
			.int()
			.min(0)
			.max(100)
			.default(40)
			.describe("Risk score threshold (0-100) for user notifications"),
		minFilesForBurst: z
			.number()
			.int()
			.min(1)
			.default(3)
			.describe("Minimum files changed simultaneously to trigger burst detection"),
		maxSnapshotsPerMinute: z
			.number()
			.int()
			.min(1)
			.default(4)
			.describe("Maximum snapshots allowed per minute (rate limiting)"),
	})
	.default({});
export type AutoDecisionSettings = z.infer<typeof AutoDecisionSettingsSchema>;

/**
 * MCP Server configuration
 */
export const MCPSettingsSchema = z
	.object({
		performanceBudgets: z
			.record(z.number().int().min(0))
			.default({ analyze_risk: 200, create_snapshot: 500 })
			.describe("Performance budgets (ms) for MCP operations"),
		context7: z
			.object({
				apiKey: z.string().optional(),
				apiUrl: z.string().url().default("https://context7.com/api"),
				cacheTtlSearch: z.number().int().min(0).default(3600),
				cacheTtlDocs: z.number().int().min(0).default(86400),
			})
			.default({}),
		api: z
			.object({
				apiKey: z.string().optional(),
				baseUrl: z.string().url().default("https://api.snapback.dev"),
			})
			.default({}),
		http: z
			.object({
				allowedOrigins: z.array(z.string()).default(["*"]),
				apiUrl: z.string().url().default("http://api:8080"),
			})
			.default({}),
	})
	.default({});
export type MCPSettings = z.infer<typeof MCPSettingsSchema>;

/**
 * Unified settings for AI detection and behavior
 */
export const SettingsSchema = z
	.object({
		defaultProtectionLevel: ProtectionLevelSchema.default("watch"),
		requireSnapshotMessage: z.boolean().default(true),
		maxSnapshots: z.number().int().min(1).default(100),
		aiDetectionEnabled: z.boolean().default(true),
		autoRestoreOnDetection: z.boolean().default(false),
		privacy: PrivacySettingsSchema,
		notifications: NotificationsSettingsSchema,
		snapshots: SnapshotSettingsSchema,
		ai: AISettingsSchema,
		guardian: GuardianSettingsSchema,
		autoDecision: AutoDecisionSettingsSchema,
		webBaseUrl: z.string().url().default("https://app.snapback.dev"),
		apiBaseUrl: z.string().url().optional(),
		mcp: MCPSettingsSchema,
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
	mcp: MCPSettingsSchema.optional(),
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
		privacy: {
			consent: false,
			clipboard: false,
			watcher: false,
			gitWrapper: false,
		},
		notifications: {
			enabled: true,
			quietHours: { start: "22:00", end: "08:00" },
			rateLimit: 5,
		},
		snapshots: {
			enabled: true,
			autoCreate: true,
			retentionDays: 30,
		},
		ai: {
			enabled: true,
			context: true,
			copilot: true,
		},
		guardian: {
			enabled: true,
			warnThreshold: 5,
			blockThreshold: 8,
			protectionLevel: "warn",
			plugins: {
				secretDetection: true,
				mockReplacement: true,
				phantomDependency: true,
			},
			thresholds: {
				warn: 6,
				block: 8,
			},
		},
		autoDecision: {
			riskThreshold: 60,
			notifyThreshold: 40,
			minFilesForBurst: 3,
			maxSnapshotsPerMinute: 4,
		},
		webBaseUrl: "https://app.snapback.dev",
		mcp: {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: { apiUrl: "https://context7.com/api", cacheTtlSearch: 3600, cacheTtlDocs: 86400 },
			api: { baseUrl: "https://api.snapback.dev" },
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		},
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
