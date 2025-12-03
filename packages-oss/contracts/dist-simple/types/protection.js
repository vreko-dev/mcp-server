import { z } from "zod";
/**
 * Protection levels for files
 * - watch: Silent auto-snapshot on save (green)
 * - warn: Show notification before save (yellow/orange)
 * - block: Require explicit snapshot or override (red)
 */
export const ProtectionLevelSchema = z.enum(["watch", "warn", "block"]);
/**
 * UI metadata for protection levels
 */
export const ProtectionLevelMetadataSchema = z.object({
	level: ProtectionLevelSchema,
	icon: z.string(),
	label: z.string(),
	description: z.string(),
	color: z.string(),
	themeColor: z.string().optional(),
});
/**
 * Protection level configurations with UI metadata
 */
export const PROTECTION_LEVELS = {
	watch: {
		level: "watch",
		icon: "🟢",
		label: "Watch",
		description: "Silent auto-snapshot on save",
		color: "#10B981",
		themeColor: "charts.green",
	},
	warn: {
		level: "warn",
		icon: "🟡",
		label: "Warn",
		description: "Notify before save with options",
		color: "#FF6B35",
		themeColor: "charts.orange",
	},
	block: {
		level: "block",
		icon: "🔴",
		label: "Block",
		description: "Require snapshot or explicit override",
		color: "#EF4444",
		themeColor: "charts.red",
	},
};
/**
 * Protected file entry
 */
export const ProtectedFileSchema = z.object({
	path: z.string(),
	level: ProtectionLevelSchema,
	reason: z.string().optional(),
	addedAt: z.date(),
	pattern: z.string().optional(), // If added via pattern match
});
/**
 * Pattern rule for automatic protection
 */
export const PatternRuleSchema = z.object({
	pattern: z.string(),
	level: ProtectionLevelSchema,
	reason: z.string().optional(),
	enabled: z.boolean().default(true),
});
/**
 * Protection configuration
 */
export const ProtectionConfigSchema = z.object({
	patterns: z.array(PatternRuleSchema).default([]),
	defaultLevel: ProtectionLevelSchema.default("watch"),
	enabled: z.boolean().default(true),
	autoProtectConfigs: z.boolean().default(true),
});
/**
 * Protection manager options
 */
export const ProtectionManagerOptionsSchema = z.object({
	config: ProtectionConfigSchema.optional(),
	persistRegistry: z.boolean().default(true),
	registryPath: z.string().optional(),
});
/**
 * Protection check result
 */
export const ProtectionCheckResultSchema = z.object({
	isProtected: z.boolean(),
	level: ProtectionLevelSchema.optional(),
	reason: z.string().optional(),
	file: ProtectedFileSchema.optional(),
});
