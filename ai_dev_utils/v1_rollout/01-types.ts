// ============================================
// apps/vscode/src/storage/types.ts
// PRW Patch Day 1: V2 Schema with seq/parent/type linkage
// ============================================

// ============================================
// V2 Enums & Types
// ============================================

export type CheckpointType = "POST" | "PRE" | "PRE_ROLLBACK";

export type OriginLabel = "INTERACTIVE" | "AUTOMATED" | "UNKNOWN";

export type ReasonCode =
	| "RISK_BURST_START"
	| "RISK_LARGE_DELETE"
	| "RISK_MULTI_FILE"
	| "AI_DETECTED"
	| "MANUAL_SAVE"
	| "PRE_ROLLBACK"
	| "MANUAL_CHECKPOINT"
	| "CRITICAL_FILE";

export type Trigger = "auto" | "manual" | "ai-detected" | "pre-save" | "risk-burst" | "rollback";

// ============================================
// Snapshot File Reference (unchanged from V1)
// ============================================

export interface SnapshotFileRef {
	/** SHA-256 hash of content (content-addressable storage reference) */
	blobHash: string;
	/** Original file size in bytes */
	size: number;
}

// ============================================
// V1 Manifest (existing - keep for back-compat)
// ============================================

export interface SnapshotManifestV1 {
	/** Unique ID: snap-{timestamp}-{random} */
	id: string;
	/** Unix timestamp (ms) */
	timestamp: number;
	/** Human-readable name */
	name: string;
	/** Trigger reason */
	trigger: "auto" | "manual" | "ai-detected" | "pre-save";
	/** Files in snapshot (path → ref) */
	files: Record<string, SnapshotFileRef>;
	/** Optional metadata */
	metadata?: {
		riskScore?: number;
		aiDetection?: {
			detected: boolean;
			tool?: string;
			confidence?: number;
		};
		sessionId?: string;
	};
}

// ============================================
// V2 Manifest (new - canonical going forward)
// ============================================

export interface SnapshotManifestV2 {
	/** Schema version for migration detection */
	schemaVersion: 2;

	/** Unique ID: snap-{timestamp}-{random} or pre-{timestamp}-{random} */
	id: string;

	/** Monotonic sequence number for ordering */
	seq: number;

	/** Parent checkpoint seq (null if first) */
	parentSeq: number | null;

	/** Parent checkpoint id (null if first) - for integrity */
	parentId: string | null;

	/** Checkpoint type: POST (normal), PRE (pointer), PRE_ROLLBACK (safety) */
	type: CheckpointType;

	/** Unix timestamp (ms) */
	timestamp: number;

	/** Human-readable name */
	name: string;

	/** Trigger reason */
	trigger: Trigger;

	/**
	 * Files in snapshot (path → ref)
	 * For PRE/PRE_ROLLBACK: this is EMPTY {} (pointer only, no blobs written)
	 */
	files: Record<string, SnapshotFileRef>;

	/** Extended metadata */
	metadata?: {
		riskScore?: number;
		/** Normalized origin classification */
		origin?: OriginLabel;
		/** Stable reason codes for explainability */
		reasons?: ReasonCode[];
		/** Legacy AI detection (keep for compatibility) */
		aiDetection?: {
			detected: boolean;
			tool?: string;
			confidence?: number;
		};
		sessionId?: string;
	};
}

// ============================================
// Union type for both versions
// ============================================

export type SnapshotManifest = SnapshotManifestV1 | SnapshotManifestV2;

// ============================================
// Type Guards
// ============================================

/** Type guard to check if manifest is V2 */
export function isV2Manifest(m: SnapshotManifest): m is SnapshotManifestV2 {
	return "schemaVersion" in m && (m as SnapshotManifestV2).schemaVersion === 2;
}

/** Type guard to check if checkpoint is a pointer (PRE - no blobs) */
export function isPointerCheckpoint(m: SnapshotManifest): boolean {
	if (!isV2Manifest(m)) return false;
	return m.type === "PRE" || m.type === "PRE_ROLLBACK";
}

/** Type guard for POST checkpoints (have blob data) */
export function isPostCheckpoint(m: SnapshotManifest): boolean {
	if (!isV2Manifest(m)) return true; // V1 manifests are always POST
	return m.type === "POST";
}

// ============================================
// Snapshot with resolved content
// ============================================

export interface SnapshotWithContent extends SnapshotManifestV2 {
	/** Resolved file contents (path → content) */
	contents: Record<string, string>;
}

// ============================================
// Filters for listing
// ============================================

export interface SnapshotFilters {
	after?: number;
	before?: number;
	trigger?: Trigger;
	type?: CheckpointType;
	limit?: number;
}

// ============================================
// Session Types (unchanged)
// ============================================

export interface SessionFileEntry {
	filePath: string;
	snapshotId: string;
	changeStats: {
		added: number;
		deleted: number;
	};
}

export interface SessionManifest {
	id: string;
	startedAt: number;
	endedAt: number;
	reason: "idle" | "manual" | "window-close" | "timeout";
	files: SessionFileEntry[];
	tags?: string[];
	summary?: string;
}

export interface SessionFilters {
	after?: number;
	before?: number;
	reason?: SessionManifest["reason"];
	limit?: number;
}

// ============================================
// Audit Types (unchanged)
// ============================================

export interface AuditEntry {
	id: string;
	timestamp: number;
	filePath: string;
	protectionLevel: string;
	action:
		| "snapshot_created"
		| "snapshot_restored"
		| "save_blocked"
		| "save_warned"
		| "cooldown_triggered"
		| "ai_detected"
		| "pre_checkpoint_created"; // NEW: for PRE checkpoints
	details?: Record<string, unknown>;
	snapshotId?: string;
}

// ============================================
// Cooldown Types (unchanged)
// ============================================

export interface CooldownEntry {
	filePath: string;
	protectionLevel: string;
	triggeredAt: number;
	expiresAt: number;
	actionTaken: string;
	snapshotId?: string;
}

// ============================================
// Storage Metadata (unchanged)
// ============================================

export interface StorageMetadata {
	version: number;
	createdAt: number;
	lastUpdatedAt: number;
	stats: {
		snapshotCount: number;
		sessionCount: number;
		totalBlobBytes: number;
	};
}
