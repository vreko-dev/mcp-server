import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager, type SessionManagerOptions } from "../../../src/session/SessionManager";
import { FilesystemBlobStore } from "../../../src/storage/BlobStore.fs";

describe("SessionManager", () => {
	let sessionManager: SessionManager;
	let blobStore: FilesystemBlobStore;
	let testWorkspaceRoot: string;
	let testDb: Database.Database;
	let mockTimers: ReturnType<typeof vi.useFakeTimers>;

	beforeEach(async () => {
		// Create temp workspace
		testWorkspaceRoot = join(tmpdir(), `snapback-test-${Date.now()}`);
		mkdirSync(testWorkspaceRoot, { recursive: true });
		mkdirSync(join(testWorkspaceRoot, "src"), { recursive: true });

		// Create blob store
		const blobRoot = join(testWorkspaceRoot, ".snapback", "blobs");
		blobStore = new FilesystemBlobStore(blobRoot);
		await blobStore.initialize();

		// Create database
		const dbDir = join(testWorkspaceRoot, ".snapback");
		mkdirSync(dbDir, { recursive: true });
		const dbPath = join(dbDir, "sessions.db");

		testDb = new Database(dbPath);
		testDb.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        workspace_uri TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        name TEXT,
        triggers INTEGER NOT NULL,
        change_count INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS session_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        rel_path TEXT NOT NULL,
        op TEXT NOT NULL,
        from_path TEXT,
        size_after INTEGER,
        mtime_after INTEGER,
        mode_after INTEGER,
        h_old TEXT,
        h_new TEXT,
        eol_after TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
      
      CREATE TABLE IF NOT EXISTS session_snapshots (
        session_id TEXT NOT NULL,
        snapshot_id TEXT NOT NULL,
        PRIMARY KEY (session_id, snapshot_id)
      );
    `);

		// Create database wrapper
		const dbWrapper = {
			run: (sql: string, params: any[]) => testDb.prepare(sql).run(...params),
			get: (sql: string, params: any[]) => testDb.prepare(sql).get(...params),
			all: (sql: string, params: any[]) => testDb.prepare(sql).all(...params),
			prepare: (sql: string) => testDb.prepare(sql),
		};

		// Use fake timers
		mockTimers = vi.useFakeTimers();

		// Initialize SessionManager
		const options: SessionManagerOptions = {
			workspaceUri: `file://${testWorkspaceRoot}`,
			workspaceRoot: testWorkspaceRoot,
			blobStore,
			idleMs: 15 * 60_000,
			flushBatchSize: 50,
			db: dbWrapper,
		};

		sessionManager = new SessionManager(options);
	});

	afterEach(async () => {
		// Cleanup timers
		mockTimers.clearAllTimers();
		vi.useRealTimers();

		// Close session manager
		try {
			await sessionManager.finalize();
		} catch {
			// Ignore if no active session
		}

		// Close database
		if (testDb) {
			testDb.close();
		}

		// Close blob store
		await blobStore.close();

		// Remove temp directory
		try {
			rmSync(testWorkspaceRoot, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("start()", () => {
		it("should start a new session", async () => {
			const result = await sessionManager.start();

			expect(result.sessionId).toBeDefined();
			expect(typeof result.sessionId).toBe("string");
			expect(result.sessionId.length).toBeGreaterThan(0);
		});

		it("should set current session after start", async () => {
			const result = await sessionManager.start();

			const current = sessionManager.current();
			expect(current.sessionId).toBe(result.sessionId);
			expect(current.changeCount).toBe(0);
		});

		it("should initialize idle timer on start", async () => {
			await sessionManager.start();

			// Should have active timers (idle + flush)
			expect(vi.getTimerCount()).toBeGreaterThan(0);
		});

		it("should auto-finalize existing session when starting new one", async () => {
			const firstResult = await sessionManager.start();
			expect(firstResult.sessionId).toBeDefined();

			// Starting another session should auto-finalize the first
			const secondResult = await sessionManager.start();
			expect(secondResult.sessionId).toBeDefined();
			expect(secondResult.sessionId).not.toBe(firstResult.sessionId);
		});
	});

	describe("track()", () => {
		beforeEach(async () => {
			await sessionManager.start();
		});

		it("should track file change", () => {
			const filePath = join(testWorkspaceRoot, "src", "app.ts");
			writeFileSync(filePath, "test content", "utf-8");

			expect(() => {
				sessionManager.track(filePath, "created");
			}).not.toThrow();

			const current = sessionManager.current();
			expect(current.changeCount).toBe(1);
		});

		it("should track multiple changes", () => {
			const file1 = join(testWorkspaceRoot, "src", "file1.ts");
			const file2 = join(testWorkspaceRoot, "src", "file2.ts");
			const file3 = join(testWorkspaceRoot, "src", "file3.ts");

			writeFileSync(file1, "content1", "utf-8");
			writeFileSync(file2, "content2", "utf-8");
			writeFileSync(file3, "content3", "utf-8");

			sessionManager.track(file1, "created");
			sessionManager.track(file2, "modified");
			sessionManager.track(file3, "deleted");

			const current = sessionManager.current();
			expect(current.changeCount).toBe(3);
		});

		it("should reset idle timer on track", () => {
			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "content", "utf-8");

			const initialTimerCount = vi.getTimerCount();

			sessionManager.track(filePath, "created");

			// Timer should still be active (reset)
			expect(vi.getTimerCount()).toBeGreaterThan(0);
		});

		it("should track all change operations", () => {
			const ops: Array<"created" | "modified" | "deleted"> = ["created", "modified", "deleted"];

			ops.forEach((op, index) => {
				const filePath = join(testWorkspaceRoot, "src", `file${index}.ts`);
				writeFileSync(filePath, `content${index}`, "utf-8");
				sessionManager.track(filePath, op);
			});

			const current = sessionManager.current();
			expect(current.changeCount).toBe(3);
		});

		it("should handle rapid sequential tracks", () => {
			for (let i = 0; i < 100; i++) {
				const filePath = join(testWorkspaceRoot, "src", `file${i}.ts`);
				writeFileSync(filePath, `content${i}`, "utf-8");
				sessionManager.track(filePath, "created");
			}

			const current = sessionManager.current();
			expect(current.changeCount).toBe(100);
		});

		it("should throw error if no active session", () => {
			const manager = new SessionManager({
				workspaceUri: `file://${testWorkspaceRoot}`,
				workspaceRoot: testWorkspaceRoot,
				blobStore,
			});

			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "content", "utf-8");

			expect(() => {
				manager.track(filePath, "created");
			}).toThrow(/no active session/i);
		});
	});

	describe("finalize()", () => {
		beforeEach(async () => {
			await sessionManager.start();
		});

		it("should finalize session with changes", async () => {
			const file1 = join(testWorkspaceRoot, "src", "file1.ts");
			const file2 = join(testWorkspaceRoot, "src", "file2.ts");

			writeFileSync(file1, "content1", "utf-8");
			writeFileSync(file2, "content2", "utf-8");

			sessionManager.track(file1, "created");
			sessionManager.track(file2, "modified");

			const result = await sessionManager.finalize();

			expect(result.sessionId).toBeDefined();
			expect(result.changeCount).toBe(2);
		});

		it("should finalize empty session", async () => {
			const result = await sessionManager.finalize();

			expect(result.sessionId).toBeDefined();
			expect(result.changeCount).toBe(0);
		});

		it("should clear active session after finalize", async () => {
			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "content", "utf-8");

			sessionManager.track(filePath, "created");
			await sessionManager.finalize();

			const current = sessionManager.current();
			expect(current.sessionId).toBeNull();
			expect(current.changeCount).toBe(0);
		});

		it("should clear idle timer after finalize", async () => {
			await sessionManager.finalize();

			// All timers should be cleared
			expect(vi.getTimerCount()).toBe(0);
		});

		it("should throw error if no active session", async () => {
			// Finalize once (should succeed)
			await sessionManager.finalize();

			// Finalize again (should throw)
			await expect(sessionManager.finalize()).rejects.toThrow(/no active session/i);
		});
	});

	describe("current()", () => {
		it("should return null sessionId when no session active", () => {
			const current = sessionManager.current();

			expect(current.sessionId).toBeNull();
			expect(current.changeCount).toBe(0);
		});

		it("should return sessionId when session active", async () => {
			const startResult = await sessionManager.start();

			const current = sessionManager.current();
			expect(current.sessionId).toBe(startResult.sessionId);
		});

		it("should return correct change count", async () => {
			await sessionManager.start();

			const file1 = join(testWorkspaceRoot, "src", "file1.ts");
			const file2 = join(testWorkspaceRoot, "src", "file2.ts");

			writeFileSync(file1, "content1", "utf-8");
			writeFileSync(file2, "content2", "utf-8");

			sessionManager.track(file1, "created");
			sessionManager.track(file2, "modified");

			const current = sessionManager.current();
			expect(current.changeCount).toBe(2);
		});
	});

	describe("list()", () => {
		it("should return empty array when no sessions exist", async () => {
			const sessions = await sessionManager.list();
			expect(sessions).toEqual([]);
		});

		it("should list finalized sessions", async () => {
			// Create and finalize first session
			await sessionManager.start();
			const file1 = join(testWorkspaceRoot, "src", "file1.ts");
			writeFileSync(file1, "content1", "utf-8");
			sessionManager.track(file1, "created");
			await sessionManager.finalize();

			// Create and finalize second session
			await sessionManager.start();
			const file2 = join(testWorkspaceRoot, "src", "file2.ts");
			writeFileSync(file2, "content2", "utf-8");
			sessionManager.track(file2, "modified");
			await sessionManager.finalize();

			const sessions = await sessionManager.list();

			expect(sessions).toHaveLength(2);
			expect(sessions[0].sessionId).toBeDefined();
			expect(sessions[0].changeCount).toBeGreaterThan(0);
		});

		it("should respect limit parameter", async () => {
			// Create 5 sessions
			for (let i = 0; i < 5; i++) {
				await sessionManager.start();
				const filePath = join(testWorkspaceRoot, "src", `file${i}.ts`);
				writeFileSync(filePath, `content${i}`, "utf-8");
				sessionManager.track(filePath, "created");
				await sessionManager.finalize();
			}

			const sessions = await sessionManager.list(3);
			expect(sessions).toHaveLength(3);
		});
	});

	describe("getManifest()", () => {
		it("should return manifest for finalized session", async () => {
			await sessionManager.start();

			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "manifest test content", "utf-8");

			sessionManager.track(filePath, "created");
			const finalizeResult = await sessionManager.finalize();

			const manifest = await sessionManager.getManifest(finalizeResult.sessionId);

			expect(manifest.sessionId).toBe(finalizeResult.sessionId);
			expect(manifest.filesChanged).toHaveLength(1);
			expect(manifest.filesChanged[0].op).toBe("created");
		});

		it("should throw error for non-existent session", async () => {
			await expect(sessionManager.getManifest("non-existent-session-id")).rejects.toThrow(/not found/i);
		});

		it("should include all session metadata", async () => {
			await sessionManager.start();

			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "metadata test", "utf-8");

			sessionManager.track(filePath, "created");
			const finalizeResult = await sessionManager.finalize();

			const manifest = await sessionManager.getManifest(finalizeResult.sessionId);

			expect(manifest.sessionId).toBeDefined();
			expect(manifest.startedAt).toBeDefined();
			expect(manifest.endedAt).toBeDefined();
			expect(manifest.filesChanged).toBeDefined();
			expect(Array.isArray(manifest.filesChanged)).toBe(true);
		});
	});

	describe("rollback()", () => {
		it("should rollback session changes", async () => {
			// Create a test file
			const testFile = join(testWorkspaceRoot, "src", "test.ts");
			writeFileSync(testFile, "original content", "utf-8");

			// Start session and track modification
			await sessionManager.start();
			sessionManager.track(testFile, "modified");
			const finalizeResult = await sessionManager.finalize();

			// Rollback (dry run to avoid filesystem changes in test)
			const rollbackResult = await sessionManager.rollback(finalizeResult.sessionId, {
				dryRun: true,
			});

			expect(rollbackResult.success).toBe(true);
		});

		it("should support dry-run mode", async () => {
			const testFile = join(testWorkspaceRoot, "src", "test.ts");
			writeFileSync(testFile, "content", "utf-8");

			await sessionManager.start();
			sessionManager.track(testFile, "created");
			const finalizeResult = await sessionManager.finalize();

			const rollbackResult = await sessionManager.rollback(finalizeResult.sessionId, {
				dryRun: true,
			});

			expect(rollbackResult.success).toBe(true);
		});

		it("should throw error for non-existent session", async () => {
			await expect(sessionManager.rollback("non-existent-session")).rejects.toThrow();
		});
	});

	describe("idle timeout", () => {
		it("should auto-finalize session after idle timeout", async () => {
			await sessionManager.start();

			const filePath = join(testWorkspaceRoot, "src", "file.ts");
			writeFileSync(filePath, "idle test", "utf-8");

			sessionManager.track(filePath, "created");

			const beforeCurrent = sessionManager.current();
			expect(beforeCurrent.sessionId).not.toBeNull();

			// Fast-forward past idle timeout (15 minutes + buffer)
			await vi.advanceTimersByTimeAsync(16 * 60_000);

			const afterCurrent = sessionManager.current();
			expect(afterCurrent.sessionId).toBeNull();
		});

		it("should not auto-finalize if activity continues", async () => {
			await sessionManager.start();

			// Track changes every 5 minutes for 30 minutes
			for (let i = 0; i < 6; i++) {
				const filePath = join(testWorkspaceRoot, "src", `file${i}.ts`);
				writeFileSync(filePath, `content${i}`, "utf-8");
				sessionManager.track(filePath, "created");
				await vi.advanceTimersByTimeAsync(5 * 60_000);
			}

			const current = sessionManager.current();
			expect(current.sessionId).not.toBeNull();
			expect(current.changeCount).toBe(6);
		});
	});

	describe("path normalization", () => {
		it("should normalize absolute paths to relative", async () => {
			await sessionManager.start();

			const absolutePath = join(testWorkspaceRoot, "src", "components", "Button.tsx");
			mkdirSync(join(testWorkspaceRoot, "src", "components"), { recursive: true });
			writeFileSync(absolutePath, "button content", "utf-8");

			sessionManager.track(absolutePath, "created");

			const finalizeResult = await sessionManager.finalize();
			const manifest = await sessionManager.getManifest(finalizeResult.sessionId);

			const change = manifest.filesChanged[0];
			// Path should be relative and use forward slashes
			expect(change.p).not.toContain(testWorkspaceRoot);
			expect(change.p.includes("\\")).toBe(false);
		});
	});
});
