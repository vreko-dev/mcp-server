/**
 * Artifact Fingerprinting
 *
 * Generates stable, privacy-safe artifact identifiers using HMAC.
 * These IDs are:
 * - Deterministic: Same inputs → Same ID
 * - Stable: ID doesn't change if file content changes
 * - Privacy-safe: File paths are not exposed in logs/telemetry
 * - Collision-resistant: Different artifacts get different IDs
 */

import { createHash, createHmac, randomUUID } from "node:crypto";
import type { ArtifactKind, Lane } from "./types.js";

/**
 * Configuration for fingerprinting.
 * The workspace secret is generated once per workspace and stored locally.
 */
export interface FingerprintConfig {
	/** Generated once per workspace, stored locally */
	workspaceSecret: string;
	/** Hash algorithm to use */
	algorithm: "sha256";
	/** Output encoding */
	encoding: "base64url";
}

/**
 * Default fingerprint configuration
 */
export const DEFAULT_FINGERPRINT_CONFIG: Omit<FingerprintConfig, "workspaceSecret"> = {
	algorithm: "sha256",
	encoding: "base64url",
} as const;

/**
 * Generate a new workspace secret.
 * Called once per workspace during initialization.
 *
 * The secret is used to create HMAC-based artifact IDs that:
 * - Are deterministic within the workspace
 * - Cannot be reversed to reveal file paths
 * - Are unique per workspace (different workspaces get different IDs for same paths)
 *
 * @returns A cryptographically secure random secret
 *
 * @example
 * const secret = generateWorkspaceSecret();
 * // Store in .snapback/config or equivalent
 * await writeFile('.snapback/secret', secret);
 */
export function generateWorkspaceSecret(): string {
	// Combine multiple sources of randomness for extra security
	return createHash("sha256")
		.update(randomUUID())
		.update(Date.now().toString())
		.update(Math.random().toString())
		.digest("base64url");
}

/**
 * Input for computing an artifact ID
 */
export interface ArtifactIdInput {
	/** The type of content this artifact contains */
	kind: ArtifactKind;
	/** The lane this artifact belongs to */
	lane: Lane;
	/** Relative path within the workspace (internal only, never logged) */
	relativePath: string;
	/** Chunk index for multi-chunk artifacts (default: 0) */
	chunkIndex?: number;
}

/**
 * Generate a stable artifact ID using HMAC.
 * Safe for logs/telemetry (no paths exposed).
 *
 * The ID is computed as:
 * 1. HMAC the relative path with workspace secret → path fingerprint
 * 2. Combine kind, lane, path fingerprint, chunk index
 * 3. Hash the combination → final ID
 *
 * @param artifact - The artifact properties to fingerprint
 * @param secret - The workspace secret for HMAC
 * @returns A 24-character base64url-encoded ID
 *
 * @example
 * const id = computeArtifactId(
 *   { kind: 'local_diff', lane: 'local', relativePath: 'src/auth.ts', chunkIndex: 0 },
 *   workspaceSecret
 * );
 * // Returns something like: "Xk9mQ2vN8pL3Rm5sYt7uWx"
 */
export function computeArtifactId(artifact: ArtifactIdInput, secret: string): string {
	if (!artifact.relativePath) {
		throw new Error("Artifact relativePath is required for ID generation");
	}
	if (!secret) {
		throw new Error("Workspace secret is required for ID generation");
	}

	// Step 1: Create path fingerprint using HMAC (not reversible)
	const pathFingerprint = createHmac("sha256", secret).update(artifact.relativePath).digest("base64url").slice(0, 12);

	// Step 2: Combine components
	const components = [artifact.kind, artifact.lane, pathFingerprint, (artifact.chunkIndex ?? 0).toString()];

	// Step 3: Hash the combination
	return createHash("sha256").update(components.join(":")).digest("base64url").slice(0, 24);
}

/**
 * Compute a digest of multiple artifact IDs for cache keying.
 * The digest is deterministic regardless of input order.
 *
 * @param artifactIds - Array of artifact IDs
 * @returns A 16-character digest
 */
export function computeArtifactSetDigest(artifactIds: string[]): string {
	// Sort for determinism
	const sorted = [...artifactIds].sort();
	return createHash("sha256").update(sorted.join("|")).digest("base64url").slice(0, 16);
}

/**
 * Compute a deterministic hash of an object for cache keying.
 * Keys are sorted to ensure deterministic output.
 *
 * @param obj - Object to hash
 * @returns A 16-character digest
 */
export function hashObject(obj: Record<string, unknown>): string {
	// Sort keys for determinism
	const normalized = JSON.stringify(obj, Object.keys(obj).sort());
	return createHash("sha256").update(normalized).digest("base64url").slice(0, 16);
}

/**
 * Generate a unique log ID for decision logging
 *
 * @returns A unique ID with timestamp prefix for sorting
 */
export function generateLogId(): string {
	const timestamp = Date.now().toString(36); // Base36 for compact representation
	const random = randomUUID().split("-")[0]; // First segment of UUID
	return `${timestamp}-${random}`;
}

/**
 * Validate that a string looks like a valid artifact ID
 *
 * @param id - String to validate
 * @returns true if the string matches artifact ID format
 */
export function isValidArtifactId(id: string): boolean {
	// Artifact IDs are 24 characters of base64url
	if (!id || id.length !== 24) {
		return false;
	}
	// Base64url alphabet: A-Z, a-z, 0-9, -, _
	return /^[A-Za-z0-9_-]{24}$/.test(id);
}

/**
 * Compute a workspace fingerprint from its path.
 * Used for cache keying across sessions.
 *
 * @param workspacePath - Absolute path to the workspace
 * @returns A 16-character fingerprint
 */
export function computeWorkspaceFingerprint(workspacePath: string): string {
	return createHash("sha256").update(workspacePath).digest("base64url").slice(0, 16);
}

/**
 * Compute a content fingerprint for change detection.
 * Used to invalidate cache when content changes.
 *
 * @param content - Content to fingerprint
 * @returns A 16-character fingerprint
 */
export function computeContentFingerprint(content: string): string {
	return createHash("sha256").update(content).digest("base64url").slice(0, 16);
}
