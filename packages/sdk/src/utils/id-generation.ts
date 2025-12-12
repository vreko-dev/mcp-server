/**
 * Centralized ID Generation
 *
 * Single Source of Truth for all ID generation in the SnapBack platform.
 * SDK owns ID formats - consumers (VSCode, API, etc.) import from SDK.
 *
 * ID Format: <prefix>-<timestamp>-<random>
 * - Sortable by timestamp (embedded in ID)
 * - Filesystem-safe (no special characters)
 * - Parseable for analytics/debugging
 *
 * @module id-generation
 */

import { randomBytes } from "node:crypto";
import type { SessionId, SnapshotId } from "@snapback/contracts";

/**
 * ID prefixes for different entity types
 */
export const ID_PREFIX = {
	SESSION: "sess",
	SNAPSHOT: "snap",
	AUDIT: "audit",
	CHECKPOINT: "cp",
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

/**
 * Generate a cryptographically random alphanumeric suffix
 *
 * @param length - Length of the random suffix (default: 6)
 * @returns Lowercase alphanumeric string
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
 * Generate a session ID with unified format
 *
 * Format: sess-<timestamp>-<random>
 * Example: sess-1733657123456-a1b2c3
 *
 * @returns Session ID (branded type)
 */
export function generateSessionId(): SessionId {
	return `${ID_PREFIX.SESSION}-${Date.now()}-${randomSuffix()}` as SessionId;
}

/**
 * Generate a snapshot ID with unified format
 *
 * Format: snap-<timestamp>-<random>
 * Example: snap-1733657123456-x9y8z7
 *
 * @returns Snapshot ID (branded type)
 */
export function generateSnapshotId(): SnapshotId {
	return `${ID_PREFIX.SNAPSHOT}-${Date.now()}-${randomSuffix()}` as SnapshotId;
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
 * @param id - ID string to parse
 * @returns Timestamp in milliseconds, or null if invalid format
 */
export function parseIdTimestamp(id: string): number | null {
	const match = id.match(/^(?:sess|snap|audit|cp)-(\d+)-/);
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
	const match = id.match(/^(sess|snap|audit|cp)-\d+-/);
	return match ? (match[1] as IdPrefix) : null;
}

/**
 * Validate that an ID matches the expected format
 *
 * @param id - ID string to validate
 * @param expectedPrefix - Expected prefix (optional, validates any if not specified)
 * @returns True if valid, false otherwise
 */
export function isValidId(id: string, expectedPrefix?: IdPrefix): boolean {
	if (expectedPrefix) {
		const regex = new RegExp(`^${expectedPrefix}-\\d+-[a-z0-9]{6}$`);
		return regex.test(id);
	}
	return /^(?:sess|snap|audit|cp)-\d+-[a-z0-9]{6}$/.test(id);
}
