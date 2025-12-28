/**
 * Snap Fix Tool
 *
 * Snapshot list/restore/diff operations. Replaces:
 * - snapshot_list
 * - snapshot_restore
 * - compare_snapshots
 *
 * @see stress_test_remediation.md Section "Tool 3: snap.fix"
 * @module tools/consolidated/snap-fix
 */

import { basename } from "node:path";
import { createStorage } from "@snapback/engine";
import {
	getRelativeTime as brandGetRelativeTime,
	getRelativeTimeHuman,
	INTERNAL_SEPARATOR,
	messages,
	WIRE_PREFIX,
} from "../../branding/index.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Snap.fix parameters
 */
export interface SnapFixParams {
	/** Snapshot ID to restore (omit for list) */
	id?: string;
	/** Preview only (dry run) */
	dry?: boolean;
	/** Specific files to restore */
	files?: string[];
	/** Compare with another snapshot */
	diff?: string;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle snap.fix
 */
export const handleSnapFix: ToolHandler = async (args, context) => {
	const params = args as unknown as SnapFixParams;
	const storage = createStorage(context.workspaceRoot);

	// List mode (no id provided)
	if (!params.id) {
		const snapshots = storage.listSnapshots().slice(0, 5);

		if (snapshots.length === 0) {
			const wire = `${WIRE_PREFIX}|R|0|No snapshots available`;
			return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${messages.restore.notFound()}` }] };
		}

		// 🧢|R|5|snap_a:2m:3f|snap_b:1h:5f|snap_c:2h:2f
		const parts = [WIRE_PREFIX, "R", String(snapshots.length)];

		for (const snap of snapshots) {
			const age = brandGetRelativeTime(snap.createdAt);
			parts.push(`${snap.id.slice(0, 8)}:${age}:${snap.files.length}f`);
		}

		return { content: [{ type: "text", text: parts.join("|") }] };
	}

	// Diff mode
	if (params.diff) {
		const snap1 = storage.getSnapshot(params.id);
		const snap2 = storage.getSnapshot(params.diff);

		if (!snap1 || !snap2) {
			const notFoundId = !snap1 ? params.id : params.diff;
			const wire = `${WIRE_PREFIX}|!|Snapshot not found: ${notFoundId}`;
			return {
				content: [
					{
						type: "text",
						text: `${wire}${INTERNAL_SEPARATOR}${messages.error.notFound(`Snapshot ${notFoundId}`)}`,
					},
				],
				isError: true,
			};
		}

		// Simple diff summary
		const files1 = new Set(snap1.files.map((f) => f.path));
		const files2 = new Set(snap2.files.map((f) => f.path));

		const added = [...files2].filter((f) => !files1.has(f)).length;
		const removed = [...files1].filter((f) => !files2.has(f)).length;
		const changed = [...files1].filter((f) => files2.has(f)).length;

		return {
			content: [
				{
					type: "text",
					text: `${WIRE_PREFIX}|D|${params.id.slice(0, 8)}→${params.diff.slice(0, 8)}|+${added}|-${removed}|~${changed}`,
				},
			],
		};
	}

	// Restore mode
	const snapshot = storage.getSnapshot(params.id);

	if (!snapshot) {
		const wire = `${WIRE_PREFIX}|!|Snapshot ${params.id} not found`;
		return {
			content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${messages.restore.notFound()}` }],
			isError: true,
		};
	}

	if (params.dry) {
		// Preview mode
		const filesToRestore = params.files
			? snapshot.files.filter((f) => params.files!.some((p) => f.path.includes(p)))
			: snapshot.files;

		const parts = [WIRE_PREFIX, "R", "DRY", `${filesToRestore.length}f`];
		parts.push(...filesToRestore.slice(0, 5).map((f) => basename(f.path)));
		const wire = parts.join("|");

		return {
			content: [
				{
					type: "text",
					text: `${wire}${INTERNAL_SEPARATOR}${messages.restore.preview(filesToRestore.length)}`,
				},
			],
		};
	}

	// Actual restore
	try {
		const restoredFiles = await storage.restore(params.id);

		if (!restoredFiles || restoredFiles.length === 0) {
			const wire = `${WIRE_PREFIX}|!|Restore failed: No files restored`;
			return {
				content: [
					{
						type: "text",
						text: `${wire}${INTERNAL_SEPARATOR}${messages.error.generic("no files restored")}`,
					},
				],
				isError: true,
			};
		}

		// 🧢|R|OK|3f|auth.ts|api.ts|config.ts
		const parts = [WIRE_PREFIX, "R", "OK", `${restoredFiles.length}f`];
		const fileNames = restoredFiles.slice(0, 5).map((f) => basename(f.path));
		parts.push(...fileNames);
		const wire = parts.join("|");

		// Add human-readable branded message
		const timeAgo = getRelativeTimeHuman(snapshot.createdAt);
		const humanMessage =
			restoredFiles.length === 1
				? messages.restore.single(fileNames[0], timeAgo)
				: messages.restore.multiple(restoredFiles.length, timeAgo);

		return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}` }] };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Restore failed";
		const wire = `${WIRE_PREFIX}|!|${errorMsg}`;
		return {
			content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${messages.error.generic(errorMsg)}` }],
			isError: true,
		};
	}
};

// =============================================================================
// Tool Definition
// =============================================================================

export const snapFixTool: SnapBackTool = {
	name: "snap_fix",
	description: `List/restore snapshots. No params→list. id:X→restore.

**Modes:**
- No params: List recent snapshots
- id: Restore specific snapshot
- id + diff: Compare two snapshots
- dry: Preview restore

**Wire Format:**
- List: R|count|id:age:files|...
- Restore: R|OK|filesF|file1|file2|...
- Diff: D|id1→id2|+added|-removed|~changed`,
	inputSchema: {
		type: "object",
		properties: {
			id: {
				type: "string",
				description: "Snapshot ID to restore",
			},
			dry: {
				type: "boolean",
				description: "Preview only",
			},
			files: {
				type: "array",
				items: { type: "string" },
				description: "Specific files to restore",
			},
			diff: {
				type: "string",
				description: "Compare with this snapshot ID",
			},
		},
	},
	annotations: {
		title: "🧢 SnapBack Fix",
		readOnlyHint: false,
		destructiveHint: true,
		idempotentHint: false,
	},
	tier: "pro",
};
