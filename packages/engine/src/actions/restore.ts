#!/usr/bin/env npx tsx
/**
 * Restore Action - Restores a snapshot to disk
 *
 * SOURCE: packages/engine/src/runtime/storage.ts (restore method)
 *
 * FEATURES:
 * - Restore files from content-addressable blob storage
 * - Write files to target directory
 * - Dry-run mode for validation
 *
 * CONTRACT:
 * - Input: --id=snapshot_xyz --target=/path/to/restore [--dry-run]
 * - Output: JSON to stdout
 * - Exit: 0 on success, 1 on failure
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { storage } from "../runtime/storage.js";

interface RestoreOptions {
	id: string;
	target: string;
	dryRun?: boolean;
}

interface ActionOutput {
	action: "restore";
	success: boolean;
	result?: {
		restoredFiles: string[];
		target: string;
	};
	error?: string;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): RestoreOptions {
	const idArg = process.argv.find((arg) => arg.startsWith("--id="));
	const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
	const dryRunArg = process.argv.includes("--dry-run");

	if (!idArg) {
		throw new Error("Missing required argument: --id=snapshot_xyz");
	}

	if (!targetArg) {
		throw new Error("Missing required argument: --target=/path/to/restore");
	}

	const id = idArg.replace("--id=", "");
	const target = targetArg.replace("--target=", "");

	return {
		id,
		target,
		dryRun: dryRunArg,
	};
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	const options = parseArgs();

	try {
		// Restore files from storage (already loads content from blobs)
		const files = await storage.restore(options.id);

		if (files.length === 0) {
			const output: ActionOutput = {
				action: "restore",
				success: false,
				error: `No files found in snapshot ${options.id}`,
			};
			console.log(JSON.stringify(output));
			process.exit(1);
		}

		// Dry run mode - validate without writing
		if (options.dryRun) {
			const output: ActionOutput = {
				action: "restore",
				success: true,
				result: {
					restoredFiles: files.map((f) => f.path),
					target: options.target,
				},
			};
			console.log(JSON.stringify(output));
			process.exit(0);
		}

		// Write restored files to target directory
		for (const file of files) {
			const targetFilePath = path.join(options.target, file.path);
			await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
			await fs.writeFile(targetFilePath, file.content, "utf-8");
		}

		const output: ActionOutput = {
			action: "restore",
			success: true,
			result: {
				restoredFiles: files.map((f) => f.path),
				target: options.target,
			},
		};
		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (error) {
		const output: ActionOutput = {
			action: "restore",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
		console.log(JSON.stringify(output));
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	void main();
}
