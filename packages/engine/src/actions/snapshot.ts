#!/usr/bin/env npx tsx
/**
 * Snapshot Action - Create a snapshot of files
 *
 * STATUS: 📝 TODO - Needs runtime/storage.ts integration
 *
 * This action creates a manual snapshot of the specified files.
 *
 * INPUTS (positional args or SNAPBACK_FILES env):
 * - List of file paths to snapshot
 *
 * OUTPUTS (JSON to stdout):
 * {
 *   "action": "snapshot",
 *   "success": true,
 *   "result": {
 *     "id": "snap_abc123",
 *     "files": ["src/foo.ts"],
 *     "bytes": 1024
 *   }
 * }
 *
 * TARGET: ~60 LOC
 */

import { readFileSync } from "node:fs";
import { storage } from "../runtime/storage.js";

// =============================================================================
// TYPES
// =============================================================================

interface ActionOutput {
	action: "snapshot";
	success: boolean;
	result?: {
		id: string;
		files: string[];
		bytes: number;
	};
	error?: string;
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

function parseArgs(): string[] {
	// Check positional args
	const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
	if (args.length > 0) {
		return args;
	}

	// Check --files argument
	const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
	if (filesArg) {
		return filesArg.replace("--files=", "").split(",").filter(Boolean);
	}

	// Check env
	return (process.env.SNAPBACK_FILES ?? "").split(",").filter(Boolean);
}

async function main(): Promise<void> {
	const files = parseArgs();

	if (files.length === 0) {
		const output: ActionOutput = {
			action: "snapshot",
			success: false,
			error: "No files specified. Usage: npx tsx snapshot.ts <file1> [file2] ...",
		};
		console.log(JSON.stringify(output));
		process.exit(1);
		return;
	}

	try {
		// Read file contents
		const fileContents = files.map((path) => ({
			path,
			content: readFileSync(path, "utf8"),
		}));

		// Create snapshot
		const snapshot = await storage.createSnapshot(fileContents, {
			trigger: "manual",
		});

		const output: ActionOutput = {
			action: "snapshot",
			success: true,
			result: {
				id: snapshot.id,
				files: snapshot.files.map((f) => f.path),
				bytes: snapshot.totalSize,
			},
		};

		console.log(JSON.stringify(output));
	} catch (error) {
		const output: ActionOutput = {
			action: "snapshot",
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
		console.log(JSON.stringify(output));
		process.exit(1);
	}
}

main();
