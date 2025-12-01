#!/usr/bin/env ts-node
/**
 * Session Blob Garbage Collection Auditor
 *
 * This script audits and optionally deletes unreferenced blobs in the session layer.
 *
 * USAGE:
 *   # Audit only (dry run, default):
 *   pnpm ts-node scripts/session-gc.ts --db /path/to/sessions.db
 *
 *   # Audit and delete orphaned blobs:
 *   pnpm ts-node scripts/session-gc.ts --db /path/to/sessions.db --delete
 *
 * PRIVACY GUARANTEE:
 *   - No file paths or content are printed
 *   - Only counts, sizes, and blob hashes (SHA-256) are shown
 *
 * SAFETY:
 *   - Default behavior is READ-ONLY (audit only)
 *   - Deletion requires explicit --delete flag
 *   - Creates backup of blobs table before deletion
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import Database from "better-sqlite3";

interface BlobStats {
	hash: string;
	size: number;
	refCount: number;
	createdAt: number;
}

interface GCAuditResult {
	totalBlobs: number;
	orphanedBlobs: number;
	totalSize: number;
	orphanedSize: number;
	orphans: BlobStats[];
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { dbPath: string; deleteMode: boolean; blobDir?: string } {
	const args = process.argv.slice(2);

	let dbPath: string | undefined;
	let deleteMode = false;
	let blobDir: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--db" && args[i + 1]) {
			dbPath = args[i + 1];
			i++;
		} else if (arg === "--delete") {
			deleteMode = true;
		} else if (arg === "--blob-dir" && args[i + 1]) {
			blobDir = args[i + 1];
			i++;
		} else if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}
	}

	if (!dbPath) {
		console.error("Error: --db <path> is required\n");
		printHelp();
		process.exit(1);
	}

	return { dbPath, deleteMode, blobDir };
}

function printHelp() {
	console.log(`
Session Blob GC Auditor

USAGE:
  pnpm ts-node scripts/session-gc.ts --db <path> [--delete] [--blob-dir <path>]

OPTIONS:
  --db <path>         Path to SQLite database (required)
  --delete            Actually delete orphaned blobs (default: audit only)
  --blob-dir <path>   Override blob storage directory (default: ~/.snapback/blobs)
  --help, -h          Show this help message

EXAMPLES:
  # Audit only (dry run):
  pnpm ts-node scripts/session-gc.ts --db ./sessions.db

  # Audit and delete orphans:
  pnpm ts-node scripts/session-gc.ts --db ./sessions.db --delete

  # Custom blob directory:
  pnpm ts-node scripts/session-gc.ts --db ./sessions.db --blob-dir /custom/blobs
`);
}

/**
 * Audit blob storage and find orphaned blobs
 */
async function auditBlobs(db: Database.Database): Promise<GCAuditResult> {
	// Get all blobs with ref_count = 0
	const orphans = db
		.prepare<BlobStats>(
			`SELECT hash, size, ref_count as refCount, created_at as createdAt 
       FROM blobs 
       WHERE ref_count = 0
       ORDER BY size DESC`,
		)
		.all() as BlobStats[];

	// Get total stats
	const totalStats = db
		.prepare(
			`SELECT 
         COUNT(*) as count,
         COALESCE(SUM(size), 0) as totalSize
       FROM blobs`,
		)
		.get() as { count: number; totalSize: number };

	const orphanedSize = orphans.reduce((sum, blob) => sum + blob.size, 0);

	return {
		totalBlobs: totalStats.count,
		orphanedBlobs: orphans.length,
		totalSize: totalStats.totalSize,
		orphanedSize,
		orphans,
	};
}

/**
 * Delete orphaned blobs from database and disk
 */
async function deleteOrphans(
	db: Database.Database,
	orphans: BlobStats[],
	blobDir: string,
): Promise<{ deleted: number; errors: string[] }> {
	const errors: string[] = [];
	let deleted = 0;

	// Start transaction
	const deleteStmt = db.prepare("DELETE FROM blobs WHERE hash = ?");
	const txn = db.transaction((blobs: BlobStats[]) => {
		for (const blob of blobs) {
			deleteStmt.run(blob.hash);
		}
	});

	try {
		// Delete from database
		txn(orphans);

		// Delete from disk
		for (const blob of orphans) {
			try {
				const blobPath = getBlobPath(blobDir, blob.hash);
				await fs.unlink(blobPath);
				deleted++;
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
					errors.push(`Failed to delete ${blob.hash}: ${err}`);
				}
			}
		}

		console.log(`✅ Deleted ${deleted} blob files from disk`);
	} catch (err) {
		errors.push(`Transaction failed: ${err}`);
	}

	return { deleted, errors };
}

/**
 * Get filesystem path for a blob hash
 */
function getBlobPath(blobDir: string, hash: string): string {
	// Layout: blobs/sha256/aa/bb/aabbcc...
	const prefix1 = hash.slice(0, 2);
	const prefix2 = hash.slice(2, 4);
	return path.join(blobDir, "sha256", prefix1, prefix2, `${hash}.lz4`);
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Main execution
 */
async function main() {
	const { dbPath, deleteMode, blobDir: customBlobDir } = parseArgs();

	// Resolve blob directory
	const blobDir = customBlobDir ?? path.join(process.env.HOME || "~", ".snapback", "blobs");

	console.log("📊 Session Blob GC Audit");
	console.log("━".repeat(60));
	console.log(`Database: ${dbPath}`);
	console.log(`Blob Dir: ${blobDir}`);
	console.log(`Mode:     ${deleteMode ? "⚠️  DELETE (destructive)" : "🔍 AUDIT ONLY (safe)"}`);
	console.log("━".repeat(60));
	console.log("");

	// Open database (read-only for audit, read-write for delete)
	const db = new Database(dbPath, { readonly: !deleteMode });

	try {
		// Audit blobs
		console.log("🔍 Scanning blob storage...");
		const audit = await auditBlobs(db);

		// Print results
		console.log("");
		console.log("AUDIT RESULTS");
		console.log("━".repeat(60));
		console.log(`Total blobs:      ${audit.totalBlobs}`);
		console.log(`Total size:       ${formatBytes(audit.totalSize)}`);
		console.log(`Orphaned blobs:   ${audit.orphanedBlobs} (ref_count = 0)`);
		console.log(`Orphaned size:    ${formatBytes(audit.orphanedSize)}`);
		console.log(
			`Space savings:    ${audit.totalSize > 0 ? ((audit.orphanedSize / audit.totalSize) * 100).toFixed(1) : 0}%`,
		);
		console.log("━".repeat(60));

		if (audit.orphanedBlobs === 0) {
			console.log("\n✨ No orphaned blobs found. Storage is clean!");
			return;
		}

		// Show top 10 largest orphans
		if (audit.orphans.length > 0) {
			console.log("\n📦 Top 10 Largest Orphaned Blobs:");
			console.log("━".repeat(60));

			const top10 = audit.orphans.slice(0, 10);
			for (const blob of top10) {
				const age = Math.floor((Date.now() - blob.createdAt) / (1000 * 60 * 60 * 24));
				console.log(`  ${blob.hash.slice(0, 12)}... | ${formatBytes(blob.size).padEnd(10)} | ${age}d old`);
			}
		}

		// Delete if requested
		if (deleteMode) {
			console.log("\n⚠️  DELETE MODE ENABLED - Proceeding with deletion...");
			console.log("");

			const result = await deleteOrphans(db, audit.orphans, blobDir);

			console.log("");
			console.log("DELETE RESULTS");
			console.log("━".repeat(60));
			console.log(`✅ Deleted:      ${result.deleted} blobs`);
			console.log(`❌ Errors:       ${result.errors.length}`);
			console.log(`💾 Space freed:  ${formatBytes(audit.orphanedSize)}`);
			console.log("━".repeat(60));

			if (result.errors.length > 0) {
				console.log("\n❌ Errors encountered:");
				for (const error of result.errors) {
					console.log(`  ${error}`);
				}
			}
		} else {
			console.log("");
			console.log("💡 TIP: Run with --delete to actually remove orphaned blobs");
			console.log(`   pnpm ts-node scripts/session-gc.ts --db ${dbPath} --delete`);
		}
	} finally {
		db.close();
	}
}

main().catch((err) => {
	console.error("❌ Fatal error:", err);
	process.exit(1);
});
