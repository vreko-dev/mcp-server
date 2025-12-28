/**
 * 🧢 SnapBack Branding System
 *
 * Centralized branding, voice, and messaging for consistent AI agent communication.
 * Follows the SnapBack MCP Agent Instructions specification.
 *
 * @module branding
 */

// =============================================================================
// Brand Identity
// =============================================================================

/** The SnapBack brand prefix for all announcements */
export const BRAND_PREFIX = "🧢 SnapBack:";

/** Compact wire format prefix (for token-efficient responses) */
export const WIRE_PREFIX = "🧢";

/**
 * Internal separator between wire format (agent-only) and user message.
 * Format: [wire format]\n---\n[user message]
 *
 * Agents should:
 * 1. Parse everything BEFORE "---" for structured data
 * 2. Display everything AFTER "---" to the user
 */
export const INTERNAL_SEPARATOR = "\n---\n";

// =============================================================================
// Voice Calibration
// =============================================================================

/**
 * Voice tone guidelines:
 * - Confident but not loud
 * - Helpful, not heroic
 * - Brief and clear
 * - Warm, not corporate
 */

// =============================================================================
// Message Templates by Operation Type
// =============================================================================

export const messages = {
	// -------------------------------------------------------------------------
	// Snapshot/Checkpoint Operations
	// -------------------------------------------------------------------------
	snapshot: {
		/** Default checkpoint created message */
		created: (context?: string) =>
			context
				? `${BRAND_PREFIX} Got it. Checkpoint created before ${context}.`
				: `${BRAND_PREFIX} Checkpoint created.`,

		/** Checkpoint with file count */
		createdWithStats: (files: number, lines: number) =>
			`${BRAND_PREFIX} Created checkpoint. Captured ${files} file${files !== 1 ? "s" : ""}, ${lines.toLocaleString()} lines.`,

		/** Proactive checkpoint before risky operation */
		proactive: (reason: string) => `${BRAND_PREFIX} Creating a checkpoint first—${reason}.`,

		/** Checkpoint reused */
		reused: () => `${BRAND_PREFIX} Recent checkpoint available.`,

		/** Checkpoint skipped */
		skipped: () => `${BRAND_PREFIX} Skipped checkpoint—already protected.`,
	},

	// -------------------------------------------------------------------------
	// Restore Operations
	// -------------------------------------------------------------------------
	restore: {
		/** Single file restored */
		single: (filename: string, timeAgo: string) => `${BRAND_PREFIX} Restored \`${filename}\` to ${timeAgo}.`,

		/** Multiple files restored */
		multiple: (count: number, timeAgo: string) => `${BRAND_PREFIX} Restored ${count} files to ${timeAgo}.`,

		/** Restore with reassurance about saved changes */
		withReassurance: (filename: string, snapshotId: string) =>
			`${BRAND_PREFIX} Restored \`${filename}\`. Your recent changes are saved in snapshot #${snapshotId} if you need them back.`,

		/** Preview mode */
		preview: (count: number) => `${BRAND_PREFIX} Would restore ${count} file${count !== 1 ? "s" : ""}.`,

		/** Can't restore - unsaved changes */
		cantRestoreUnsaved: (filename: string) =>
			`${BRAND_PREFIX} Can't restore \`${filename}\`—you have unsaved changes. Save or discard first?`,

		/** Snapshot not found */
		notFound: () => `${BRAND_PREFIX} No checkpoint found for that file. Want to create one now?`,
	},

	// -------------------------------------------------------------------------
	// Protection Status/Warnings
	// -------------------------------------------------------------------------
	protection: {
		/** Gentle nudge for unprotected changes */
		nudge: (lines: number) =>
			`${BRAND_PREFIX} You've got ${lines.toLocaleString()}+ lines of unprotected changes. Want a checkpoint?`,

		/** Warning before risky operation */
		beforeRisky: (filename: string) =>
			`${BRAND_PREFIX} No recent checkpoint for \`${filename}\`. Should I create one before we continue?`,

		/** All clear status */
		allClear: (minutesAgo: number) =>
			`${BRAND_PREFIX} You're covered. Last checkpoint was ${minutesAgo} minute${minutesAgo !== 1 ? "s" : ""} ago.`,

		/** Files protected count */
		protected: (count: number) => `${BRAND_PREFIX} ${count} file${count !== 1 ? "s" : ""} protected.`,
	},

	// -------------------------------------------------------------------------
	// Session Operations
	// -------------------------------------------------------------------------
	session: {
		/** AI session started */
		started: () => `${BRAND_PREFIX} AI session detected. Auto-protecting changes.`,

		/** Session summary on completion */
		complete: (checkpoints: number, files: number) =>
			`${BRAND_PREFIX} Session complete. ${checkpoints} checkpoint${checkpoints !== 1 ? "s" : ""}, ${files} file${files !== 1 ? "s" : ""} protected.`,

		/** Task started */
		taskStarted: (taskDesc?: string) =>
			taskDesc ? `${BRAND_PREFIX} Got it. Starting: ${taskDesc}` : `${BRAND_PREFIX} Task started.`,
	},

	// -------------------------------------------------------------------------
	// Validation/Check Operations
	// -------------------------------------------------------------------------
	validation: {
		/** All checks passed */
		passed: () => `${BRAND_PREFIX} All clear. Code looks good.`,

		/** Issues found */
		issues: (errors: number, warnings: number) =>
			`${BRAND_PREFIX} Found ${errors} error${errors !== 1 ? "s" : ""}, ${warnings} warning${warnings !== 1 ? "s" : ""}.`,

		/** Quick validation complete */
		quickComplete: () => `${BRAND_PREFIX} Quick check done.`,
	},

	// -------------------------------------------------------------------------
	// Learning Operations
	// -------------------------------------------------------------------------
	learning: {
		/** Learning captured */
		captured: (type: string) => `${BRAND_PREFIX} Got it. ${capitalize(type)} captured for next time.`,

		/** Learning applied */
		applied: (count: number) =>
			`${BRAND_PREFIX} Applied ${count} past learning${count !== 1 ? "s" : ""} to this task.`,
	},

	// -------------------------------------------------------------------------
	// Violation Operations
	// -------------------------------------------------------------------------
	violation: {
		/** Violation recorded */
		recorded: (type: string, count: number) => `${BRAND_PREFIX} Noted: ${type} (occurrence #${count}).`,

		/** Violation promoted to pattern */
		promoted: (type: string) => `${BRAND_PREFIX} Heads up: ${type} is now a tracked pattern—seen 3+ times.`,

		/** Violation marked for automation */
		automate: (type: string) => `${BRAND_PREFIX} ${type} marked for automation—seen 5+ times.`,
	},

	// -------------------------------------------------------------------------
	// Errors & Edge Cases
	// -------------------------------------------------------------------------
	error: {
		/** Generic error */
		generic: (reason: string) => `${BRAND_PREFIX} Couldn't complete—${reason}.`,

		/** Storage issue */
		storage: () => `${BRAND_PREFIX} Heads up—running low on snapshot storage. Older checkpoints will auto-clean.`,

		/** Not found */
		notFound: (what: string) => `${BRAND_PREFIX} ${what} not found.`,
	},

	// -------------------------------------------------------------------------
	// Token Savings (optional, only when meaningful)
	// -------------------------------------------------------------------------
	efficiency: {
		/** Token savings report */
		tokensSaved: (tokens: number) =>
			`${BRAND_PREFIX} Saved you ~${tokens.toLocaleString()} tokens vs. re-prompting.`,

		/** Session savings summary */
		sessionSavings: (restores: number, dollarsSaved: string) =>
			`${BRAND_PREFIX} This session: ${restores} restore${restores !== 1 ? "s" : ""} → ~$${dollarsSaved} in tokens saved.`,
	},
} as const;

// =============================================================================
// Wire Format Helpers
// =============================================================================

/**
 * Format a response in compact wire format with 🧢 brand prefix
 * Format: 🧢|TYPE|field1|field2|...
 */
export function formatWire(type: string, ...fields: (string | number)[]): string {
	return [WIRE_PREFIX, type, ...fields.map(String)].join("|");
}

/**
 * Format a human-readable branded message
 */
export function formatMessage(message: string): string {
	// If message already has brand prefix, return as-is
	if (message.startsWith(BRAND_PREFIX) || message.startsWith(WIRE_PREFIX)) {
		return message;
	}
	return `${BRAND_PREFIX} ${message}`;
}

/**
 * Compress a string for wire format (replace spaces, truncate)
 */
export function compress(s: string, maxLength: number): string {
	const clean = s.replace(/\s+/g, "→");
	return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

/**
 * Get relative time string (e.g., "2m", "1h", "3d")
 */
export function getRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d`;
	if (hours > 0) return `${hours}h`;
	if (minutes > 0) return `${minutes}m`;
	return "just now";
}

/**
 * Get human-readable relative time (e.g., "2 minutes ago")
 */
export function getRelativeTimeHuman(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
	if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
	if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
	return "just now";
}

// =============================================================================
// Response Builders
// =============================================================================

export interface WireResponse {
	/** The wire format string */
	wire: string;
	/** Optional human-readable message */
	message?: string;
}

/**
 * Build a start task response
 */
export function buildStartResponse(data: {
	taskId: string;
	snapshotId?: string;
	risk: "L" | "M" | "H";
	protection: number;
	dirty: number;
	snapshotStatus: "created" | "reused" | "skipped";
	learnings?: string[];
	hotspots?: string[];
	taskDescription?: string;
}): WireResponse {
	const wire = formatWire(
		"S",
		data.taskId,
		data.snapshotId || "none",
		data.risk,
		data.protection,
		data.dirty,
		data.snapshotStatus,
		...(data.learnings?.slice(0, 3).map((l) => compress(l, 40)) || []),
		...(data.hotspots?.slice(0, 2) || []),
	);

	const message =
		data.snapshotStatus === "created"
			? messages.snapshot.created(data.taskDescription)
			: data.snapshotStatus === "reused"
				? messages.snapshot.reused()
				: undefined;

	return { wire, message };
}

/**
 * Build a check/validation response
 */
export function buildCheckResponse(data: {
	mode: "S" | "C" | "Q" | "F" | "P";
	status: "OK" | "ERR";
	errors: number;
	warnings: number;
	checked?: { typescript: boolean; lint: boolean; tests: boolean | "skipped" };
	issues?: string[];
}): WireResponse {
	const indicators: string[] = [];
	if (data.checked) {
		if (data.checked.typescript) indicators.push("ts✓");
		if (data.checked.lint) indicators.push("lint✓");
		if (data.checked.tests === true) indicators.push("tests✓");
		else if (data.checked.tests === "skipped") indicators.push("tests⏭️");
	}

	const wire = formatWire(
		data.mode,
		data.status,
		`${data.errors}E`,
		`${data.warnings}W`,
		indicators.join("|") || "none",
		...(data.issues?.slice(0, 3).map((i) => compress(i, 40)) || []),
	);

	const message =
		data.status === "OK" ? messages.validation.passed() : messages.validation.issues(data.errors, data.warnings);

	return { wire, message };
}

/**
 * Build a restore response
 */
export function buildRestoreResponse(data: { files: string[]; snapshotTime: number; isDry?: boolean }): WireResponse {
	const timeAgo = getRelativeTimeHuman(data.snapshotTime);

	if (data.isDry) {
		const wire = formatWire("R", "DRY", `${data.files.length}f`, ...data.files.slice(0, 5));
		return { wire, message: messages.restore.preview(data.files.length) };
	}

	const wire = formatWire("R", "OK", `${data.files.length}f`, ...data.files.slice(0, 5));
	const message =
		data.files.length === 1
			? messages.restore.single(data.files[0], timeAgo)
			: messages.restore.multiple(data.files.length, timeAgo);

	return { wire, message };
}

/**
 * Build a list snapshots response
 */
export function buildListResponse(
	snapshots: Array<{ id: string; createdAt: number; fileCount: number }>,
): WireResponse {
	if (snapshots.length === 0) {
		return {
			wire: formatWire("R", "0", "No snapshots available"),
			message: messages.restore.notFound(),
		};
	}

	const parts = snapshots.slice(0, 5).map((snap) => {
		const age = getRelativeTime(snap.createdAt);
		return `${snap.id.slice(0, 8)}:${age}:${snap.fileCount}f`;
	});

	return {
		wire: formatWire("R", String(snapshots.length), ...parts),
	};
}

/**
 * Build an end task response
 */
export function buildEndResponse(data: {
	success: boolean;
	learningsCount: number;
	filesModified: number;
	linesAdded: number;
	linesRemoved: number;
	learnings?: string[];
	tokensSaved?: number;
	savingsPercent?: number;
	mistakesPrevented?: number;
}): WireResponse {
	const parts = [
		WIRE_PREFIX,
		"E",
		data.success ? "OK" : "FAIL",
		`${data.learningsCount}L`,
		`${data.filesModified}F`,
		`${data.linesAdded}+${data.linesRemoved}-`,
	];

	if (data.learnings?.length) {
		parts.push(...data.learnings.slice(0, 2).map((l) => compress(l, 30)));
	}

	const wire = parts.join("|");

	// Build efficiency stats line
	const statsParts: string[] = [];
	if (data.tokensSaved && data.tokensSaved > 500) {
		statsParts.push(`💰 ~${data.tokensSaved.toLocaleString()} tokens saved (${data.savingsPercent}%)`);
	}
	if (data.mistakesPrevented && data.mistakesPrevented > 0) {
		statsParts.push(`🛡️ ${data.mistakesPrevented} ${data.mistakesPrevented === 1 ? "issue" : "issues"} prevented`);
	}
	if (data.learningsCount > 0) {
		statsParts.push(`📚 ${data.learningsCount} captured`);
	}

	const message = statsParts.length > 0 ? statsParts.join(" | ") : undefined;

	return { wire, message };
}

/**
 * Build a learning response
 */
export function buildLearnResponse(data: { id: string; type: string }): WireResponse {
	const fullType =
		{
			pat: "pattern",
			pit: "pitfall",
			eff: "efficiency",
			disc: "discovery",
			wf: "workflow",
		}[data.type] || data.type;

	return {
		wire: formatWire("L", "OK", data.id, data.type),
		message: messages.learning.captured(fullType),
	};
}

/**
 * Build a violation response
 */
export function buildViolationResponse(data: {
	type: string;
	count: number;
	shouldPromote?: boolean;
	shouldAutomate?: boolean;
}): WireResponse {
	const parts = ["V", "OK", data.type, String(data.count)];
	if (data.shouldPromote) parts.push("PROMOTE");
	if (data.shouldAutomate) parts.push("AUTOMATE");

	const message = data.shouldAutomate
		? messages.violation.automate(data.type)
		: data.shouldPromote
			? messages.violation.promoted(data.type)
			: messages.violation.recorded(data.type, data.count);

	return {
		wire: parts.join("|"),
		message,
	};
}

/**
 * Build an error response
 */
export function buildErrorResponse(reason: string, code?: string): WireResponse {
	return {
		wire: formatWire("!", code || "ERR", reason),
		message: messages.error.generic(reason),
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format tool result with optional human message
 * When humanize=true, includes friendly message after wire format
 */
export function formatToolResult(response: WireResponse, humanize = false): string {
	if (humanize && response.message) {
		return `${response.wire}\n${response.message}`;
	}
	return response.wire;
}
