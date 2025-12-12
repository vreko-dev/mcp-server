/**
 * V1 to V2 ConfigStore Migration
 *
 * Transforms the legacy v1 ConfigStore schema (object-keyed protections)
 * to the new v2 schema (array-based protections with patterns).
 *
 * V1 Schema:
 * - protections: Record<string, ProtectionEntry>
 * - ProtectionEntry: { level, isAnchor, clusterId?, setAt }
 *
 * V2 Schema:
 * - protections: ProtectionRule[]
 * - ProtectionRule: { pattern, level, reason?, precedence }
 *
 * Transformation Rules:
 * - File path becomes pattern
 * - isAnchor=true → precedence=100, reason includes "Anchor"
 * - clusterId → reason includes "Cluster: {id}"
 * - Add default v2 fields: settings, policies, ignore
 */

import type { ConfigStoreV2, ProtectionLevel, ProtectionRule } from "../schemas";
import { DEFAULT_CONFIG } from "../schemas";

/**
 * V1 Protection Entry (legacy format)
 */
export interface V1ProtectionEntry {
	level: ProtectionLevel;
	isAnchor: boolean;
	clusterId?: string;
	setAt: number;
}

/**
 * V1 Engine Config
 */
export interface V1EngineConfig {
	maxDepth: number;
	burstThreshold: number;
	cooldowns: {
		block: number;
		warn: number;
		watch: number;
	};
}

/**
 * V1 Config Schema (legacy format from apps/vscode/src/storage/ConfigStore.ts)
 */
export interface V1ConfigSchema {
	version: 1;
	protections: Record<string, V1ProtectionEntry>;
	engine: V1EngineConfig;
}

/**
 * Migration result type (Result pattern)
 */
export type MigrationResult = { success: true; data: ConfigStoreV2 } | { success: false; error: string };

/**
 * Type guard: Check if config is v1 format
 */
export function isV1Config(config: unknown): config is V1ConfigSchema {
	if (config === null || config === undefined) {
		return false;
	}

	if (typeof config !== "object" || Array.isArray(config)) {
		return false;
	}

	const obj = config as Record<string, unknown>;

	// Check version is exactly 1
	if (obj.version !== 1) {
		return false;
	}

	// Check protections is an object (not array)
	if (obj.protections !== undefined) {
		if (typeof obj.protections !== "object" || Array.isArray(obj.protections) || obj.protections === null) {
			return false;
		}
	}

	return true;
}

/**
 * Valid protection levels
 */
const VALID_LEVELS = ["watch", "warn", "block"] as const;

/**
 * Check if a value is a valid protection level
 */
function isValidLevel(level: unknown): level is ProtectionLevel {
	return typeof level === "string" && (VALID_LEVELS as readonly string[]).includes(level);
}

/**
 * Build reason string from v1 entry
 */
function buildReason(entry: V1ProtectionEntry): string | undefined {
	const parts: string[] = [];

	if (entry.isAnchor) {
		parts.push("Anchor file");
	}

	if (entry.clusterId) {
		parts.push(`Cluster: ${entry.clusterId}`);
	}

	return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Migrate v1 config to v2 format
 */
export function migrateV1ToV2(v1Config: V1ConfigSchema): MigrationResult {
	// Handle null/undefined/non-object
	if (v1Config === null || v1Config === undefined) {
		return {
			success: false,
			error: "Config is null or undefined",
		};
	}

	if (typeof v1Config !== "object" || Array.isArray(v1Config)) {
		return {
			success: false,
			error: "Config must be an object",
		};
	}

	try {
		// Extract and transform protections
		const v1Protections = v1Config.protections || {};
		const v2Protections: ProtectionRule[] = [];

		for (const [filePath, entry] of Object.entries(v1Protections)) {
			// Skip entries with invalid levels, default to "watch"
			const level = isValidLevel(entry?.level) ? entry.level : "watch";

			const rule: ProtectionRule = {
				pattern: filePath,
				level,
				precedence: entry?.isAnchor ? 100 : 0,
			};

			// Add reason if applicable
			const reason = entry ? buildReason(entry) : undefined;
			if (reason) {
				rule.reason = reason;
			}

			v2Protections.push(rule);
		}

		// Extract engine config with defaults
		const v1Engine = v1Config.engine || DEFAULT_CONFIG.engine;
		const engine = {
			maxDepth: v1Engine.maxDepth ?? DEFAULT_CONFIG.engine.maxDepth,
			burstThreshold: v1Engine.burstThreshold ?? DEFAULT_CONFIG.engine.burstThreshold,
			cooldowns: {
				block: v1Engine.cooldowns?.block ?? DEFAULT_CONFIG.engine.cooldowns.block,
				warn: v1Engine.cooldowns?.warn ?? DEFAULT_CONFIG.engine.cooldowns.warn,
				watch: v1Engine.cooldowns?.watch ?? DEFAULT_CONFIG.engine.cooldowns.watch,
			},
		};

		// Build v2 config with all required fields
		const v2Config: ConfigStoreV2 = {
			version: 2,
			protections: v2Protections,
			ignore: [...DEFAULT_CONFIG.ignore],
			engine,
			settings: { ...DEFAULT_CONFIG.settings },
			policies: { ...DEFAULT_CONFIG.policies },
		};

		return {
			success: true,
			data: v2Config,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown migration error",
		};
	}
}
