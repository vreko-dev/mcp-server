/**
 * Response Utilities for MCP Facades
 *
 * Provides:
 * - Response compression for tier-aware output sizing
 * - Smart next_actions with confidence and conditions
 * - Peer coaching tone generation
 * - Snapshot deduplication helpers
 *
 * @module facades/response-utils
 */

import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hashContent } from "@snapback-oss/sdk";

// ============================================================================
// Types
// ============================================================================

export interface ResponseConfig {
	tier: "pro" | "local" | "free";
	maxBytes: number;
}

export interface SmartAction {
	tool: string;
	priority: 1 | 2 | 3 | 4 | 5;
	confidence: number; // 0-1
	reason: string;
	condition?: string; // "if you're about to commit"
	skipIf?: string[]; // conditions to skip this action
}

export interface CoachingContext {
	lastAction?: string;
	taskPhase?: "starting" | "working" | "finishing";
	violationCount?: number;
	snapshotAge?: number; // minutes
}

export interface FileHash {
	path: string;
	hash: string;
	size: number;
}

// ============================================================================
// Response Compression
// ============================================================================

const TIER_LIMITS: Record<string, ResponseConfig> = {
	pro: { tier: "pro", maxBytes: 50 * 1024 }, // 50KB
	local: { tier: "local", maxBytes: 15 * 1024 }, // 15KB
	free: { tier: "free", maxBytes: 8 * 1024 }, // 8KB
};

/**
 * Get response config for a tier
 */
export function getResponseConfig(tier: string): ResponseConfig {
	return TIER_LIMITS[tier] || TIER_LIMITS.local;
}

/**
 * Compress a response object to fit within tier limits
 *
 * Progressive compression strategy:
 * 1. Truncate arrays (learnings, violations, snapshots)
 * 2. Remove verbose fields (formatted, fullDiagnosis)
 * 3. Summarize instead of enumerate
 */
export function compressResponse<T extends Record<string, unknown>>(data: T, config: ResponseConfig): T {
	const full = JSON.stringify(data);

	// If within limits, return as-is
	if (full.length <= config.maxBytes) {
		return data;
	}

	// Clone for modification
	const compressed = JSON.parse(full) as Record<string, unknown>;

	// Phase 1: Truncate arrays
	const arrayFields = ["learnings", "relevantLearnings", "violations", "recentViolations", "snapshots", "files"];
	const maxArrayItems = config.tier === "pro" ? 10 : config.tier === "local" ? 5 : 3;

	for (const field of arrayFields) {
		if (Array.isArray(compressed[field]) && (compressed[field] as unknown[]).length > maxArrayItems) {
			const arr = compressed[field] as unknown[];
			const truncated = arr.slice(0, maxArrayItems);
			compressed[field] = truncated;
			compressed[`${field}Truncated`] = true;
			compressed[`${field}Total`] = arr.length;
		}
	}

	// Check size after phase 1
	if (JSON.stringify(compressed).length <= config.maxBytes) {
		return compressed as T;
	}

	// Phase 2: Remove verbose fields
	const verboseFields = ["formatted", "fullDiagnosis", "stackTrace", "rawOutput", "fullPath", "absolutePath"];
	for (const field of verboseFields) {
		if (field in compressed) {
			delete compressed[field];
		}
	}

	// Recursively remove from nested objects
	function removeVerboseNested(obj: Record<string, unknown>): void {
		for (const key of Object.keys(obj)) {
			if (verboseFields.includes(key)) {
				delete obj[key];
			} else if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
				removeVerboseNested(obj[key] as Record<string, unknown>);
			}
		}
	}
	removeVerboseNested(compressed);

	// Check size after phase 2
	if (JSON.stringify(compressed).length <= config.maxBytes) {
		return compressed as T;
	}

	// Phase 3: Summarize long strings
	function truncateStrings(obj: Record<string, unknown>, maxLen: number): void {
		for (const key of Object.keys(obj)) {
			const val = obj[key];
			if (typeof val === "string" && val.length > maxLen) {
				obj[key] = val.slice(0, maxLen) + "...";
			} else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
				truncateStrings(val as Record<string, unknown>, maxLen);
			}
		}
	}

	const maxStringLen = config.tier === "pro" ? 500 : config.tier === "local" ? 200 : 100;
	truncateStrings(compressed, maxStringLen);

	// Phase 4: Add compression notice
	compressed._compressed = true;
	compressed._originalSize = full.length;
	compressed._tier = config.tier;

	return compressed as T;
}

// ============================================================================
// Smart Next Actions
// ============================================================================

/**
 * Build smart next_actions based on context
 */
export function buildSmartActions(
	baseActions: Array<{ tool: string; reason: string; priority?: number }>,
	context: {
		healthScore?: number;
		hasUnsavedChanges?: boolean;
		lastSnapshotMinutes?: number;
		violationCount?: number;
		isNewTask?: boolean;
		hasCodeChanges?: boolean;
	},
): SmartAction[] {
	const actions: SmartAction[] = [];

	// Convert base actions with enhanced metadata
	for (const base of baseActions) {
		const action: SmartAction = {
			tool: base.tool,
			priority: (base.priority || 2) as 1 | 2 | 3 | 4 | 5,
			confidence: 0.7,
			reason: base.reason,
		};

		// Enhance based on tool type and context
		switch (base.tool) {
			case "snapshot_create":
				action.confidence = context.hasUnsavedChanges ? 0.95 : 0.5;
				action.condition = "Before making risky changes";
				action.skipIf = ["Files unchanged since last snapshot"];
				if ((context.lastSnapshotMinutes ?? 0) < 5) {
					action.confidence = 0.2;
					action.skipIf?.push("Recent snapshot exists");
				}
				break;

			case "check_patterns":
				action.confidence = context.hasCodeChanges ? 0.95 : 0.6;
				action.condition = "Before committing code";
				action.skipIf = ["Already validated this session"];
				break;

			case "get_context":
				action.confidence = context.isNewTask ? 0.95 : 0.4;
				action.condition = "When starting a new task";
				action.skipIf = ["Context already loaded for this task"];
				break;

			case "get_learnings":
				action.confidence = (context.violationCount ?? 0) > 2 ? 0.85 : 0.5;
				action.condition = "When encountering repeated issues";
				break;

			case "report_violation":
				action.confidence = 0.8;
				action.condition = "After catching a mistake";
				break;
		}

		actions.push(action);
	}

	// Sort by priority and confidence
	return actions.sort((a, b) => {
		if (a.priority !== b.priority) return a.priority - b.priority;
		return b.confidence - a.confidence;
	});
}

// ============================================================================
// Peer Coaching Tone
// ============================================================================

const COACHING_TEMPLATES = {
	starting: [
		"Let's get started! I'll keep an eye on things as you work.",
		"Ready to help. Remember: get_context → work → check_patterns → commit.",
		"Starting fresh. I'll remind you about patterns as we go.",
	],
	working: [
		"Looking good so far.",
		"Nice progress! Consider a snapshot checkpoint.",
		"Solid work. I'll flag any patterns I notice.",
	],
	finishing: [
		"Almost there! Don't forget check_patterns before committing.",
		"Wrapping up nicely. Ready for final validation?",
		"Great session! Time to validate and commit.",
	],
	afterSnapshot: [
		"Snapshot saved. You're safe to experiment now.",
		"Got your back with that snapshot. Go ahead and try it.",
		"Checkpoint created. Feel free to be bold.",
	],
	afterViolation: [
		"Noted that for next time. We'll catch it earlier.",
		"Learning recorded. I'll remind you about this pattern.",
		"Good catch. This will help us avoid it in the future.",
	],
	highRisk: [
		"⚠️ Heads up: this is a sensitive area. Snapshot first?",
		"This touches critical files. Let's create a safety net.",
		"High-risk change detected. Consider snapshotting first.",
	],
};

/**
 * Generate a peer coaching hint based on context
 */
export function generateCoachingHint(context: CoachingContext): string | null {
	const { lastAction, taskPhase, violationCount, snapshotAge } = context;

	// After specific actions
	if (lastAction === "snapshot_create") {
		return randomChoice(COACHING_TEMPLATES.afterSnapshot);
	}
	if (lastAction === "report_violation") {
		return randomChoice(COACHING_TEMPLATES.afterViolation);
	}

	// High risk situations
	if ((snapshotAge ?? 0) > 60 && taskPhase === "working") {
		return randomChoice(COACHING_TEMPLATES.highRisk);
	}

	// Based on task phase
	if (taskPhase && COACHING_TEMPLATES[taskPhase]) {
		// Only sometimes add phase-based hints (avoid being chatty)
		if (Math.random() > 0.7) {
			return randomChoice(COACHING_TEMPLATES[taskPhase]);
		}
	}

	// Violation-based coaching
	if ((violationCount ?? 0) > 3) {
		return `I've noticed ${violationCount} violations this session. Want me to pull up relevant learnings?`;
	}

	return null;
}

function randomChoice<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Snapshot Deduplication
// ============================================================================

/**
 * Compute hash for a file's content (truncated for display)
 * @deprecated Use hashContent from @snapback-oss/sdk for full hash
 */
export function hashFileContent(content: string): string {
	return hashContent(content).slice(0, 16);
}

/**
 * Compute full SHA-256 blob ID (matches storage.ts format)
 * Re-exported from @snapback-oss/sdk/utils/hash for convenience.
 *
 * @see {@link hashContent} from @snapback-oss/sdk
 */
export const computeBlobId = hashContent;

/**
 * Get file hashes for comparison (using full blobId format)
 */
export function getFileHashes(filePaths: string[], workspaceRoot: string): FileHash[] {
	const hashes: FileHash[] = [];

	for (const filePath of filePaths) {
		const fullPath = filePath.startsWith("/") ? filePath : `${workspaceRoot}/${filePath}`;
		if (existsSync(fullPath)) {
			const content = readFileSync(fullPath, "utf8");
			hashes.push({
				path: filePath,
				hash: computeBlobId(content), // Use full hash to match blobId
				size: content.length,
			});
		}
	}

	return hashes;
}

/**
 * Check if ALL requested files are unchanged in a snapshot.
 *
 * Fixed logic:
 * - Compares by intersection (handles subset requests)
 * - Uses blobId directly from snapshot (no restore needed)
 * - Returns true only if ALL current files have matching blobId in snapshot
 */
export function filesMatchSnapshot(
	currentHashes: FileHash[],
	snapshotFiles: Array<{ path: string; blobId?: string; hash?: string; content?: string }>,
): boolean {
	// Build map of snapshot file paths to their blob IDs
	const snapshotBlobMap = new Map<string, string>();
	for (const file of snapshotFiles) {
		// Prefer blobId (from snapshot manifest), fall back to hash, then compute from content
		const blobId = file.blobId || file.hash || (file.content ? computeBlobId(file.content) : "");
		if (blobId) {
			snapshotBlobMap.set(file.path, blobId);
		}
	}

	// Check if ALL current files have matching blobId in snapshot
	for (const current of currentHashes) {
		const snapshotBlobId = snapshotBlobMap.get(current.path);
		if (!snapshotBlobId) {
			// File not in snapshot - not a match
			return false;
		}
		if (snapshotBlobId !== current.hash) {
			// File changed since snapshot - not a match
			return false;
		}
	}

	// All requested files match their snapshot versions
	return true;
}

/**
 * Check if files are unchanged across ANY recent snapshot.
 * More efficient than filesMatchSnapshot for checking against multiple snapshots.
 */
export function findMatchingSnapshot(
	currentHashes: FileHash[],
	snapshots: Array<{
		id: string;
		createdAt: number;
		files: Array<{ path: string; blobId: string }>;
	}>,
	maxSnapshotsToCheck = 5,
): { matched: boolean; snapshotId?: string; createdAt?: number } {
	// Check most recent snapshots first
	for (const snapshot of snapshots.slice(0, maxSnapshotsToCheck)) {
		if (filesMatchSnapshot(currentHashes, snapshot.files)) {
			return { matched: true, snapshotId: snapshot.id, createdAt: snapshot.createdAt };
		}
	}
	return { matched: false };
}

// ============================================================================
// Learning Staleness
// ============================================================================

export interface LearningMetadata {
	validUntil?: string; // ISO date
	architectureVersion?: string;
	deprecated?: boolean;
	deprecatedReason?: string;
}

/**
 * Check if a learning is stale
 */
export function isLearningStalel(learning: { timestamp?: string } & LearningMetadata, maxAgeDays = 90): boolean {
	// Explicitly deprecated
	if (learning.deprecated) {
		return true;
	}

	// Past validity date
	if (learning.validUntil && new Date(learning.validUntil) < new Date()) {
		return true;
	}

	// Too old (default 90 days)
	if (learning.timestamp) {
		const age = Date.now() - new Date(learning.timestamp).getTime();
		const ageDays = age / (1000 * 60 * 60 * 24);
		if (ageDays > maxAgeDays) {
			return true;
		}
	}

	return false;
}

/**
 * Filter learnings to exclude stale ones
 */
export function filterStaleLearnings<T extends { timestamp?: string } & LearningMetadata>(
	learnings: T[],
	maxAgeDays = 90,
): { valid: T[]; stale: T[] } {
	const valid: T[] = [];
	const stale: T[] = [];

	for (const learning of learnings) {
		if (isLearningStalel(learning, maxAgeDays)) {
			stale.push(learning);
		} else {
			valid.push(learning);
		}
	}

	return { valid, stale };
}

// ============================================================================
// Session Completion Tracking
// ============================================================================

export interface SessionChecklist {
	tasksStarted: string[];
	tasksCompleted: string[];
	pendingValidations: string[]; // files changed but not validated
	uncommittedChanges: boolean;
	completionPercentage: number;
	prompt?: string;
}

/**
 * Build session completion status
 */
export function buildSessionChecklist(session: {
	plannedFiles?: string[];
	modifiedFiles?: string[];
	validatedFiles?: string[];
	snapshotCount?: number;
}): SessionChecklist {
	const planned = session.plannedFiles || [];
	const modified = session.modifiedFiles || [];
	const validated = session.validatedFiles || [];

	const pendingValidations = modified.filter((f) => !validated.includes(f));
	const uncommittedChanges = modified.length > 0;

	const totalTasks = planned.length || 1;
	const completedTasks = validated.length;
	const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

	let prompt: string | undefined;
	if (pendingValidations.length > 0) {
		prompt = `⚠️ ${pendingValidations.length} file(s) modified but not validated. Run check_patterns before committing.`;
	} else if (uncommittedChanges && (session.snapshotCount ?? 0) === 0) {
		prompt = "💡 Consider creating a snapshot before ending session.";
	}

	return {
		tasksStarted: planned,
		tasksCompleted: validated,
		pendingValidations,
		uncommittedChanges,
		completionPercentage,
		prompt,
	};
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

export interface CleanupStats {
	found: number;
	stale: number;
	deleted: number;
	bytesReclaimed?: number;
}

export interface CleanupResult {
	snapshots: CleanupStats;
	learnings: CleanupStats;
	sessions: CleanupStats;
	blobs: CleanupStats & { orphaned: number };
	totalBytesReclaimed: number;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Get current architecture version from .ctx or git
 * Used to detect stale learnings after architecture changes
 */
export function getArchitectureVersion(workspaceRoot: string): string | null {
	const ctxPath = `${workspaceRoot}/.snapback/ctx/context.json`;
	try {
		if (existsSync(ctxPath)) {
			const ctx = JSON.parse(readFileSync(ctxPath, "utf8"));
			return ctx.archVersion || ctx.updated_at || null;
		}
	} catch {
		// Ignore parse errors
	}
	return null;
}

/**
 * Clean up stale learnings based on age and architecture version
 */
export function cleanupStaleLearnings(
	learningsPath: string,
	opts: { maxAgeDays?: number; archVersion?: string | null; dryRun?: boolean },
): CleanupStats {
	if (!existsSync(learningsPath)) {
		return { found: 0, stale: 0, deleted: 0 };
	}

	try {
		const content = readFileSync(learningsPath, "utf8");
		const lines = content.split("\n").filter(Boolean);
		const learnings = lines
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		const { valid, stale } = filterStaleLearnings(learnings, opts.maxAgeDays || 90);

		// Also mark as stale if architecture version mismatch
		let archStale: typeof learnings = [];
		if (opts.archVersion) {
			archStale = valid.filter((l) => l.archVersion && l.archVersion !== opts.archVersion);
		}

		const allStale = [...stale, ...archStale];
		const remaining = valid.filter((l) => !archStale.includes(l));

		if (!opts.dryRun && allStale.length > 0) {
			// Write back only valid learnings
			const newContent = remaining.map((l) => JSON.stringify(l)).join("\n") + "\n";
			writeFileSync(learningsPath, newContent);
		}

		return {
			found: learnings.length,
			stale: allStale.length,
			deleted: opts.dryRun ? 0 : allStale.length,
		};
	} catch {
		return { found: 0, stale: 0, deleted: 0 };
	}
}

/**
 * Clean up archived sessions
 */
export function cleanupArchivedSessions(
	sessionArchiveDir: string,
	opts: { maxAgeDays?: number; dryRun?: boolean },
): CleanupStats {
	if (!existsSync(sessionArchiveDir)) {
		return { found: 0, stale: 0, deleted: 0 };
	}

	try {
		const files = readdirSync(sessionArchiveDir).filter((f) => f.endsWith(".json"));
		const cutoff = Date.now() - (opts.maxAgeDays || 30) * 24 * 60 * 60 * 1000;
		const stale: string[] = [];

		for (const file of files) {
			const filePath = `${sessionArchiveDir}/${file}`;
			try {
				const session = JSON.parse(readFileSync(filePath, "utf8"));
				const endedAt = new Date(session.endedAt || session.startedAt).getTime();
				if (endedAt < cutoff) {
					stale.push(filePath);
				}
			} catch {
				// Skip unparseable files
			}
		}

		if (!opts.dryRun) {
			for (const filePath of stale) {
				try {
					unlinkSync(filePath);
				} catch {
					// Ignore delete errors
				}
			}
		}

		return {
			found: files.length,
			stale: stale.length,
			deleted: opts.dryRun ? 0 : stale.length,
		};
	} catch {
		return { found: 0, stale: 0, deleted: 0 };
	}
}
