/**
 * SessionRollback and SessionRecovery Tests
 *
 * Minimal but meaningful tests for crash safety and rollback functionality
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SessionManifestV1 } from "@snapback-oss/contracts/session";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionRecovery } from "../src/session/SessionRecovery";
import { SessionRollback } from "../src/session/SessionRollback";
import type { BlobStore, BlobStoreError, Result } from "../src/storage/BlobStore";

// ============================================================================
// Mock BlobStore
// ============================================================================

class MockBlobStore implements BlobStore {
	private blobs = new Map<string, Uint8Array>();

	async put(buf: Uint8Array): Promise<Result<string, BlobStoreError>> {
		const hash = createHash("sha256").update(buf).digest("hex");
		this.blobs.set(hash, buf);
		return { ok: true, value: hash };
	}

	async get(hash: string): Promise<Result<Uint8Array | null, BlobStoreError>> {
		const value = this.blobs.get(hash) ?? null;
		return { ok: true, value };
	}

	async has(hash: string): Promise<boolean> {
		return this.blobs.has(hash);
	}

	async delete(hash: string): Promise<Result<void, BlobStoreError>> {
		this.blobs.delete(hash);
		return { ok: true, value: undefined };
	}

	async size(): Promise<number> {
		let total = 0;
		for (const buf of this.blobs.values()) {
			total += buf.length;
		}
		return total;
	}

	async initialize(): Promise<Result<void, BlobStoreError>> {
		return { ok: true, value: undefined };
	}

	async close(): Promise<Result<void, BlobStoreError>> {
		return { ok: true, value: undefined };
	}
}

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempWorkspace(): Promise<string> {
	const tmpDir = path.join(process.cwd(), ".tmp-test-workspace");
	await fs.mkdir(tmpDir, { recursive: true });
	return tmpDir;
}

async function cleanupTempWorkspace(workspaceRoot: string): Promise<void> {
	try {
		await fs.rm(workspaceRoot, { recursive: true, force: true });
	} catch (_err) {
		// Ignore cleanup errors
	}
}

async function writeFile(workspaceRoot: string, relPath: string, content: string): Promise<void> {
	const absPath = path.join(workspaceRoot, relPath);
	await fs.mkdir(path.dirname(absPath), { recursive: true });
	await fs.writeFile(absPath, content, "utf-8");
}

async function readFile(workspaceRoot: string, relPath: string): Promise<string> {
	const absPath = path.join(workspaceRoot, relPath);
	return fs.readFile(absPath, "utf-8");
}

function _hashContent(content: string): string {
	return createHash("sha256").update(content, "utf-8").digest("hex");
}

// ============================================================================
// SessionRollback Tests
// ============================================================================

describe("SessionRollback", () => {
	let workspaceRoot: string;
	let blobStore: MockBlobStore;

	beforeEach(async () => {
		workspaceRoot = await createTempWorkspace();
		blobStore = new MockBlobStore();
	});

	afterEach(async () => {
		await cleanupTempWorkspace(workspaceRoot);
	});

	it("should rollback a simple modified file", async () => {
		const rollback = new SessionRollback(workspaceRoot, blobStore);

		// Setup: Create initial file
		const oldContent = "Hello, World!";
		const newContent = "Hello, SnapBack!";
		await writeFile(workspaceRoot, "test.txt", newContent);

		// Store old version in blobStore
		const oldResult = await blobStore.put(Buffer.from(oldContent, "utf-8"));
		const newResult = await blobStore.put(Buffer.from(newContent, "utf-8"));

		if (!oldResult.ok || !newResult.ok) {
			throw new Error("Failed to store blobs");
		}

		const oldHash = oldResult.value;
		const newHash = newResult.value;

		// Create manifest (session recorded: test.txt was modified from oldContent to newContent)
		const manifest: SessionManifestV1 = {
			schema: "sb.session.v1",
			sessionId: "test-session-1",
			workspaceUri: `file://${workspaceRoot}`,
			startedAt: new Date().toISOString(),
			endedAt: new Date().toISOString(),
			triggers: ["manual"],
			changeCount: 1,
			filesChanged: [
				{
					p: "test.txt",
					op: "modified",
					hOld: oldHash,
					hNew: newHash,
					sizeBefore: oldContent.length,
					sizeAfter: newContent.length,
				},
			],
		};

		// Rollback
		const result = await rollback.rollback(manifest);

		// Verify: File should be restored to oldContent
		expect(result.success).toBe(true);
		expect(result.filesReverted).toContain("test.txt");
		expect(result.errors).toHaveLength(0);

		const restoredContent = await readFile(workspaceRoot, "test.txt");
		expect(restoredContent).toBe(oldContent);
	});

	it("should rollback a created file by deleting it", async () => {
		const rollback = new SessionRollback(workspaceRoot, blobStore);

		// Setup: Create file (simulates session recording "created" operation)
		const content = "New file content";
		await writeFile(workspaceRoot, "new-file.txt", content);

		const blobResult = await blobStore.put(Buffer.from(content, "utf-8"));
		if (!blobResult.ok) {
			throw new Error("Failed to store blob");
		}
		const hash = blobResult.value;

		// Manifest: File was created during session
		const manifest: SessionManifestV1 = {
			schema: "sb.session.v1",
			sessionId: "test-session-2",
			workspaceUri: `file://${workspaceRoot}`,
			startedAt: new Date().toISOString(),
			endedAt: new Date().toISOString(),
			triggers: ["manual"],
			changeCount: 1,
			filesChanged: [
				{
					p: "new-file.txt",
					op: "created",
					hNew: hash,
					sizeAfter: content.length,
				},
			],
		};

		// Rollback (inverse: delete the created file)
		const rollbackResult = await rollback.rollback(manifest);

		// Verify: File should be deleted
		expect(rollbackResult.success).toBe(true);
		expect(rollbackResult.filesReverted).toContain("new-file.txt");

		const fileExists = existsSync(path.join(workspaceRoot, "new-file.txt"));
		expect(fileExists).toBe(false);
	});

	it("should handle dry run mode without modifying files", async () => {
		const rollback = new SessionRollback(workspaceRoot, blobStore);

		// Setup
		const oldContent = "Old";
		const newContent = "New";
		await writeFile(workspaceRoot, "test.txt", newContent);

		const oldResult = await blobStore.put(Buffer.from(oldContent, "utf-8"));
		const newResult = await blobStore.put(Buffer.from(newContent, "utf-8"));

		if (!oldResult.ok || !newResult.ok) {
			throw new Error("Failed to store blobs");
		}

		const oldHash = oldResult.value;
		const newHash = newResult.value;

		const manifest: SessionManifestV1 = {
			schema: "sb.session.v1",
			sessionId: "test-session-3",
			workspaceUri: `file://${workspaceRoot}`,
			startedAt: new Date().toISOString(),
			endedAt: new Date().toISOString(),
			triggers: ["manual"],
			changeCount: 1,
			filesChanged: [
				{
					p: "test.txt",
					op: "modified",
					hOld: oldHash,
					hNew: newHash,
				},
			],
		};

		// Dry run
		const result = await rollback.rollback(manifest, { dryRun: true });

		// Verify: Success but file unchanged
		expect(result.success).toBe(true);
		expect(result.filesReverted).toContain("test.txt");

		const content = await readFile(workspaceRoot, "test.txt");
		expect(content).toBe(newContent); // Unchanged
	});
});

// ============================================================================
// SessionRecovery Tests
// ============================================================================

describe("SessionRecovery", () => {
	let workspaceRoot: string;

	beforeEach(async () => {
		workspaceRoot = await createTempWorkspace();
	});

	afterEach(async () => {
		await cleanupTempWorkspace(workspaceRoot);
	});

	it("should recover from pending journal and restore backup files", async () => {
		const recovery = new SessionRecovery(workspaceRoot);

		// Setup: Simulate interrupted rollback
		const originalContent = "Original content";
		const modifiedContent = "Modified content";

		// Create modified file
		await writeFile(workspaceRoot, "test.txt", modifiedContent);

		// Create backup file (simulates what rollback would create)
		const backupPath = path.join(workspaceRoot, "test.txt.bak-test-session-4");
		await fs.writeFile(backupPath, originalContent, "utf-8");

		// Create pending journal
		const journalDir = path.join(workspaceRoot, ".sb_journal", "pending");
		await fs.mkdir(journalDir, { recursive: true });

		const journal = {
			sessionId: "test-session-4",
			timestamp: Date.now(),
			workspaceRoot,
			changes: [
				{
					p: "test.txt",
					op: "modified",
				},
			],
			backups: [
				{
					original: path.join(workspaceRoot, "test.txt"),
					backup: backupPath,
				},
			],
			status: "pending",
		};

		await fs.writeFile(path.join(journalDir, "test-session-4.json"), JSON.stringify(journal, null, 2));

		// Run recovery
		const results = await recovery.recoverAll();

		// Verify: File restored from backup
		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("recovered");
		expect(results[0].filesRestored).toBe(1);

		const restoredContent = await readFile(workspaceRoot, "test.txt");
		expect(restoredContent).toBe(originalContent);

		// Verify: Backup file cleaned up
		const backupExists = existsSync(backupPath);
		expect(backupExists).toBe(false);

		// Verify: Journal deleted
		const journalExists = existsSync(path.join(journalDir, "test-session-4.json"));
		expect(journalExists).toBe(false);
	});

	it("should skip recovery if no pending journals exist", async () => {
		const recovery = new SessionRecovery(workspaceRoot);

		// No journals created

		const results = await recovery.recoverAll();

		// Verify: Empty results
		expect(results).toHaveLength(0);
	});

	it("should handle missing backup files gracefully", async () => {
		const recovery = new SessionRecovery(workspaceRoot);

		// Create pending journal WITHOUT backup files
		const journalDir = path.join(workspaceRoot, ".sb_journal", "pending");
		await fs.mkdir(journalDir, { recursive: true });

		const journal = {
			sessionId: "test-session-5",
			timestamp: Date.now(),
			workspaceRoot,
			changes: [],
			backups: [],
			status: "pending",
		};

		await fs.writeFile(path.join(journalDir, "test-session-5.json"), JSON.stringify(journal, null, 2));

		// Run recovery
		const results = await recovery.recoverAll();

		// Verify: Journal cleaned up (no backups = transaction never started)
		expect(results).toHaveLength(1);
		expect(results[0].status).toBe("cleaned");
		expect(results[0].filesRestored).toBe(0);

		const journalExists = existsSync(path.join(journalDir, "test-session-5.json"));
		expect(journalExists).toBe(false);
	});
});
