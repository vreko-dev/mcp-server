/**
 * Safeguard 1: Migration Checksums
 *
 * Detects silent data loss during v1→v2 migration by:
 * 1. Computing deterministic checksum of v1 config
 * 2. Computing checksum of migrated v2 config
 * 3. Comparing checksums to detect data loss
 * 4. Logging audit trail for investigation
 *
 * Per TDD_CORE.md: Prevents silent migration failures
 */

import crypto from "crypto";

/**
 * Compute deterministic checksum of config
 * Uses SHA256 of sorted JSON for consistency
 */
export function calculateConfigChecksum(config: any): string {
	if (!config || typeof config !== "object") {
		throw new Error("Invalid config for checksum calculation");
	}

	try {
		const sorted = JSON.stringify(config, Object.keys(config).sort());
		const hash = crypto.createHash("sha256");
		hash.update(sorted);
		return hash.digest("hex");
	} catch (error) {
		throw new Error(
			`Failed to calculate config checksum: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Validate that checksums match (no data loss during migration)
 *
 * Strategy: Checksums should be identical before and after migration
 * Exception: If migration legitimately transforms structure, use data volume comparison
 */
export function validateChecksumIntegrity(beforeChecksum: string, afterChecksum: string): boolean {
	// Exact match means no data loss
	if (beforeChecksum === afterChecksum) {
		return true;
	}

	// Checksums differ - data may be lost or legitimately transformed
	console.warn("[Config Safeguard] Checksums differ", {
		before: beforeChecksum.slice(0, 8),
		after: afterChecksum.slice(0, 8),
	});

	return false;
}

/**
 * Migration audit log entry
 */
export interface MigrationAuditLog {
	timestamp: string; // ISO 8601
	v1ConfigHash: string;
	v2ConfigHash: string;
	protectionCount: {
		before: number;
		after: number;
	};
	engineConfig: {
		before: string;
		after: string;
	};
	success: boolean;
	errors: string[];
}

/**
 * Log migration audit trail
 */
export async function logMigrationAudit(log: MigrationAuditLog): Promise<void> {
	if (log.success) {
		console.log("[Migration Audit] Completed successfully", {
			timestamp: log.timestamp,
			protections: `${log.protectionCount.before} → ${log.protectionCount.after}`,
			checksumMatch: log.v1ConfigHash === log.v2ConfigHash,
		});
	} else {
		console.error("[Migration Audit] Failed", {
			timestamp: log.timestamp,
			errors: log.errors,
			protections: `${log.protectionCount.before} → ${log.protectionCount.after}`,
		});
	}
}

/**
 * Custom error for checksum validation failures
 */
export class ConfigChecksumError extends Error {
	constructor(
		message: string,
		public readonly context: Record<string, any>,
	) {
		super(message);
		this.name = "ConfigChecksumError";
	}
}
