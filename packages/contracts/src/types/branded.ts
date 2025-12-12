/**
 * Branded Types for Type Safety
 *
 * Branded types prevent accidentally mixing semantically different values
 * that share the same primitive type (e.g., userId vs sessionId).
 *
 * @example
 * ```typescript
 * // Without branded types (unsafe):
 * function restoreSnapshot(snapshotId: string, userId: string) { ... }
 * restoreSnapshot(userId, snapshotId); // Wrong order, but compiles!
 *
 * // With branded types (safe):
 * function restoreSnapshot(snapshotId: SnapshotId, userId: UserId) { ... }
 * restoreSnapshot(userId, snapshotId); // Compile error!
 * ```
 */

// ===== ID Types =====

/**
 * User identifier
 * Format: Usually UUIDs or user-specific prefixed IDs
 */
export type UserId = string & { readonly __brand: "UserId" };

/**
 * Session identifier
 * Format: sess-{timestamp}-{random} (from id-generation.ts)
 */
export type SessionId = string & { readonly __brand: "SessionId" };

/**
 * Snapshot identifier
 * Format: snap-{timestamp}-{random} (from id-generation.ts)
 */
export type SnapshotId = string & { readonly __brand: "SnapshotId" };

/**
 * Request identifier for tracking operations
 */
export type RequestId = string & { readonly __brand: "RequestId" };

/**
 * Batch identifier for grouped operations
 */
export type BatchId = string & { readonly __brand: "BatchId" };

/**
 * API key identifier
 */
export type ApiKeyId = string & { readonly __brand: "ApiKeyId" };

// ===== Path Types =====

/**
 * Absolute file path (starts with /)
 */
export type AbsoluteFilePath = string & { readonly __brand: "AbsoluteFilePath" };

/**
 * Relative file path (project-relative)
 */
export type RelativeFilePath = string & { readonly __brand: "RelativeFilePath" };

/**
 * VS Code workspace root path
 */
export type WorkspaceRoot = string & { readonly __brand: "WorkspaceRoot" };

/**
 * Snapshot storage directory path
 */
export type SnapshotDirPath = string & { readonly __brand: "SnapshotDirPath" };

// ===== Temporal Types =====

/**
 * Unix timestamp in milliseconds (Date.now())
 */
export type UnixTimestamp = number & { readonly __brand: "UnixTimestamp" };

/**
 * Duration in milliseconds
 */
export type DurationMs = number & { readonly __brand: "DurationMs" };

/**
 * Cache TTL (time-to-live) in milliseconds
 */
export type CacheTTL = DurationMs;

// ===== Position Types =====

/**
 * Line number in a file (typically 1-indexed)
 */
export type LineNumber = number & { readonly __brand: "LineNumber" };

/**
 * Character index in a line (0-indexed)
 */
export type CharacterIndex = number & { readonly __brand: "CharacterIndex" };

/**
 * Pagination offset
 */
export type PageOffset = number & { readonly __brand: "PageOffset" };

/**
 * Pagination limit
 */
export type PageLimit = number & { readonly __brand: "PageLimit" };

// ===== Constructor Functions =====

/**
 * Constructor functions for type-safe casting
 * Use these to convert plain strings/numbers to branded types
 */

// ID constructors
export const UserId = (value: string): UserId => value as UserId;
export const SessionId = (value: string): SessionId => value as SessionId;
export const SnapshotId = (value: string): SnapshotId => value as SnapshotId;
export const RequestId = (value: string): RequestId => value as RequestId;
export const BatchId = (value: string): BatchId => value as BatchId;
export const ApiKeyId = (value: string): ApiKeyId => value as ApiKeyId;

// Path constructors
export const AbsoluteFilePath = (value: string): AbsoluteFilePath => value as AbsoluteFilePath;
export const RelativeFilePath = (value: string): RelativeFilePath => value as RelativeFilePath;
export const WorkspaceRoot = (value: string): WorkspaceRoot => value as WorkspaceRoot;
export const SnapshotDirPath = (value: string): SnapshotDirPath => value as SnapshotDirPath;

// Temporal constructors
export const UnixTimestamp = (value: number): UnixTimestamp => value as UnixTimestamp;
export const DurationMs = (value: number): DurationMs => value as DurationMs;
export const CacheTTL = (value: number): CacheTTL => value as CacheTTL;

// Position constructors
export const LineNumber = (value: number): LineNumber => value as LineNumber;
export const CharacterIndex = (value: number): CharacterIndex => value as CharacterIndex;
export const PageOffset = (value: number): PageOffset => value as PageOffset;
export const PageLimit = (value: number): PageLimit => value as PageLimit;
