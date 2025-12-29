/**
 * Centralized ID Generation
 *
 * RE-EXPORTS FROM @snapback-oss/contracts - Single Source of Truth
 * SDK provides typed wrappers for convenience.
 *
 * @module id-generation
 */

import { randomBytes } from "node:crypto";
import {
	generateId as contractsGenerateId,
	generateSnapshotId as contractsGenerateSnapshotId,
} from "@snapback-oss/contracts";

// Types (defined locally to avoid circular deps with contracts)
export type SessionId = `sess-${string}`;
export type SnapshotId = `snap-${string}`;

/**
 * ID prefixes for different entity types
 */
export const ID_PREFIX = {
	SESSION: "sess",
	SNAPSHOT: "snap", // Short form, aligned with contracts
	AUDIT: "audit",
	CHECKPOINT: "cp",
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

/**
 * Generate a cryptographically random alphanumeric suffix
 * @internal Used by session/audit/checkpoint IDs
 */
function randomSuffix(length = 6): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
}

/**
 * Generate a session ID
 * Format: sess-<timestamp>-<random>
 */
export function generateSessionId(): SessionId {
	return `${ID_PREFIX.SESSION}-${Date.now()}-${randomSuffix()}` as SessionId;
}

/**
 * Generate a snapshot ID - delegates to @snapback-oss/contracts
 * Format: snapshot-<slug>-<timestamp>-<random> (with description)
 *         snapshot-<timestamp>-<random> (without)
 *
 * @param description - Optional human-readable description
 */
export function generateSnapshotId(description?: string): SnapshotId {
	return contractsGenerateSnapshotId(description) as SnapshotId;
}

/**
 * General purpose ID generation - delegates to @snapback-oss/contracts
 */
export function generateId(prefix?: string): string {
	return contractsGenerateId(prefix);
}

/**
 * Generate an audit entry ID with unified format
 *
 * Format: audit-<timestamp>-<random>
 * Example: audit-1733657123456-d4e5f6
 *
 * @returns Audit ID string
 */
export function generateAuditId(): string {
	return `${ID_PREFIX.AUDIT}-${Date.now()}-${randomSuffix()}`;
}

/**
 * Generate a checkpoint ID with unified format
 *
 * Format: cp-<timestamp>-<random>
 * Example: cp-1733657123456-g7h8i9
 *
 * @returns Checkpoint ID string
 */
export function generateCheckpointId(): string {
	return `${ID_PREFIX.CHECKPOINT}-${Date.now()}-${randomSuffix()}`;
}

/**
 * Generate a random alphanumeric ID string
 *
 * @param length - Length of the ID (default: 6)
 * @returns Lowercase alphanumeric string
 */
export function randomId(length = 6): string {
	return randomSuffix(length);
}

/**
 * Parse timestamp from a generated ID
 *
 * Handles all ID formats:
 * - sess-<timestamp>-<random>
 * - audit-<timestamp>-<random>
 * - cp-<timestamp>-<random>
 * - snap-<timestamp>-<random>
 * - snap-<slug>-<timestamp>-<random>
 * - snapshot-<timestamp>-<random> (legacy)
 * - snapshot-<slug>-<timestamp>-<random> (legacy)
 *
 * @param id - ID string to parse
 * @returns Timestamp in milliseconds, or null if invalid format
 */
export function parseIdTimestamp(id: string): number | null {
	// Validate known prefix (includes legacy "snapshot" for backward compatibility)
	if (!id.match(/^(?:sess|snap|snapshot|audit|cp)-/)) {
		return null;
	}

	// Match 13-digit timestamp before the final random suffix
	// Works for both `prefix-<timestamp>-<random>` and `prefix-<slug>-<timestamp>-<random>`
	const match = id.match(/-(\d{13})-[a-zA-Z0-9_-]+$/);
	if (!match) {
		return null;
	}
	const timestamp = Number.parseInt(match[1], 10);
	return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Extract the prefix from a generated ID
 *
 * @param id - ID string to parse
 * @returns ID prefix or null if invalid format
 */
export function parseIdPrefix(id: string): IdPrefix | null {
	// Handle legacy "snapshot" prefix as "snap"
	if (id.startsWith("snapshot-")) {
		return "snap" as IdPrefix;
	}
	const match = id.match(/^(sess|snap|audit|cp)-/);
	return match ? (match[1] as IdPrefix) : null;
}

/**
 * Validate that an ID matches the expected format
 *
 * Handles formats:
 * - sess/audit/cp-<timestamp>-<6 random chars>
 * - snap-<timestamp>-<9 random chars>
 * - snap-<slug>-<timestamp>-<9 random chars>
 * - snapshot-* (legacy format, also valid)
 *
 * @param id - ID string to validate
 * @param expectedPrefix - Expected prefix (optional, validates any if not specified)
 * @returns True if valid, false otherwise
 */
export function isValidId(id: string, expectedPrefix?: IdPrefix): boolean {
	// Snapshot IDs can have optional slug and use 9-char suffix
	// Also handle legacy "snapshot-" prefix
	const isSnapshotId = id.startsWith("snap-") || id.startsWith("snapshot-");
	if (expectedPrefix === "snap" || (!expectedPrefix && isSnapshotId)) {
		return /^(?:snap|snapshot)-(?:[a-z0-9]+-)?(\d{13})-[a-zA-Z0-9_-]{9}$/.test(id);
	}

	// Non-snapshot IDs use 6-char suffix
	if (expectedPrefix) {
		const regex = new RegExp(`^${expectedPrefix}-\\d{13}-[a-z0-9]{6}$`);
		return regex.test(id);
	}
	return /^(?:sess|audit|cp)-\d{13}-[a-z0-9]{6}$/.test(id);
}
