/**
 * Protection Level Conversion Utilities
 *
 * Provides type-safe conversion between canonical protection levels
 * and legacy VSCode string formats for backward compatibility.
 *
 * Canonical format: "watch" | "warn" | "block"
 * Legacy format: "Watched" | "Warning" | "Protected"
 */

import type { LegacyProtectionLevel, ProtectionLevel } from "./protection.js";

/**
 * Mapping table for legacy to canonical conversion
 */
const LEGACY_TO_CANONICAL: Record<LegacyProtectionLevel, ProtectionLevel> = {
	Watched: "watch",
	Warning: "warn",
	Protected: "block",
} as const;

/**
 * Mapping table for canonical to legacy conversion
 */
const CANONICAL_TO_LEGACY: Record<ProtectionLevel, LegacyProtectionLevel> = {
	watch: "Watched",
	warn: "Warning",
	block: "Protected",
} as const;

/**
 * Valid canonical protection level values
 */
const VALID_LEVELS = ["watch", "warn", "block"] as const;

/**
 * Convert legacy protection level to canonical format
 *
 * @param legacy - Legacy protection level ("Watched" | "Warning" | "Protected")
 * @returns Canonical protection level ("watch" | "warn" | "block")
 *
 * @example
 * ```typescript
 * legacyToCanonical("Watched") // "watch"
 * legacyToCanonical("Warning") // "warn"
 * legacyToCanonical("Protected") // "block"
 * ```
 */
export function legacyToCanonical(legacy: LegacyProtectionLevel): ProtectionLevel {
	return LEGACY_TO_CANONICAL[legacy];
}

/**
 * Convert canonical protection level to legacy format
 *
 * @param canonical - Canonical protection level ("watch" | "warn" | "block")
 * @returns Legacy protection level ("Watched" | "Warning" | "Protected")
 *
 * @example
 * ```typescript
 * canonicalToLegacy("watch") // "Watched"
 * canonicalToLegacy("warn") // "Warning"
 * canonicalToLegacy("block") // "Protected"
 * ```
 */
export function canonicalToLegacy(canonical: ProtectionLevel): LegacyProtectionLevel {
	return CANONICAL_TO_LEGACY[canonical];
}

/**
 * Type guard to check if a value is a valid canonical protection level
 *
 * @param value - Value to check
 * @returns True if value is a canonical protection level
 *
 * @example
 * ```typescript
 * isProtectionLevel("watch") // true
 * isProtectionLevel("Watched") // false (legacy format)
 * isProtectionLevel("invalid") // false
 *
 * // Type narrowing
 * const value: string | undefined = getUserInput();
 * if (isProtectionLevel(value)) {
 *   // value is now typed as ProtectionLevel
 *   setLevel(value);
 * }
 * ```
 */
export function isProtectionLevel(value: unknown): value is ProtectionLevel {
	return typeof value === "string" && (VALID_LEVELS as readonly string[]).includes(value);
}

/**
 * Re-export types for convenience
 */
export type { LegacyProtectionLevel, ProtectionLevel };
