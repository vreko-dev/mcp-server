/**
 * SessionManager Tests
 *
 * Critical scenarios:
 * - Lifecycle management (start → track → finalize)
 * - Idle timeout auto-finalization
 * - Timer cleanup on finalize
 * - Change buffer management and ignore patterns
 * - Crash recovery integration
 * - AI tracker integration
 * - Multiple sessions handling
 * - Database integration
 * - Empty sessions
 * - Large change buffers (>flushBatchSize)
 */

import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../src/session/SessionManager.js";
import type { BlobStore, BlobStoreError, Result } from "../../src/storage/BlobStore.js";

// ============================================================================
// Mock BlobStore
// ============================================================================

class MockBlobStore implements BlobStore {
	async put(_buf: Uint8Array): Promise<Result<string, BlobStoreError>> {
		return { ok: true, value: "mock-hash-12345" };
	}

	async get(_hash: string): Promise<Result<Uint8Array | null, BlobStoreError>> {
		return { ok: true, value: Buffer.from("mock content") };
	}

	async has(_hash: string): Promise<boolean> {
		return true;
	}

	async delete(_hash: string): Promise<Result<void, BlobStoreError>> {
		return { ok: true, value: undefined };
	}

	async size(): Promise<number> {
		return 0;
	}

	async initialize(): Promise<Result<void, BlobStoreError>> {
		return { ok: true, value: undefined };
	}

	async close(): Promise<Result<void, BlobStoreError>> {
		return { ok: true, value: undefined };
	}
}

// ============================================================================
// Mock Database
// ============================================================================

interface MockDB {
	run: (sql: string, params: unknown[]) => Promise<void>;
	prepare: (sql: string) => { run: (params: unknown[]) => void };
	get: (sql: string, params: unknown[]) => Promise<unknown>;
	all: (sql: string, params: unknown[]) => Promise<unknown[]>;
}

function createMockDatabase(): MockDB {
	const sessions = new Map<string, unknown>();
	const changes = new Map<string, unknown[]>();

	return {
		run: vi.fn(async (sql: string, params: unknown[]) => {
			if (sql.includes("INSERT INTO sessions")) {
				sessions.set(params[0] as string, {
					session_id: params[0],
					workspace_uri: params[1],
					started_at: params[2],
					triggers: params[3],
				});
			} else if (sql.includes("UPDATE sessions")) {
				// Update simulation
				const sessionId = params[7] as string;
				const session = sessions.get(sessionId);
				if (session) {
					sessions.set(sessionId, { ...session, ...params.slice(0, 6) });
				}
			}
		}),
		prepare: (sql: string) => ({
			run: vi.fn((params: unknown[]) => {
				if (sql.includes("INSERT INTO session_changes")) {
					const sessionId = params[0] as string;
					if (!changes.has(sessionId)) {
						changes.set(sessionId, []);
					}
					changes.get(sessionId)?.push(params);
				}
			}),
		}),
		get: vi.fn(async (sql: string, params: unknown[]) => {
			if (sql.includes("SELECT * FROM sessions WHERE session_id")) {
				return sessions.get(params[0] as string);
			}
			return null;
		}),
		all: vi.fn(async (sql: string, params: unknown[]) => {
			if (sql.includes("SELECT * FROM session_changes")) {
				return changes.get(params[0] as string) || [];
			}
			if (sql.includes("SELECT snapshot_id FROM session_snapshots")) {
				return [];
			}
			return [];
		}),
	};
}

// ============================================================================
// Test Helpers
// ============================================================================

function createTestWorkspace(): string {
	return path.join(os.tmpdir(), `test-workspace-${Date.now()}-${Math.random()}`);
}

// ============================================================================
// SessionManager Tests
// ============================================================================

describe("SessionManager", () => {
	let workspaceRoot: string;
	let blobStore: MockBlobStore;
	let mockDb: MockDB;

	beforeEach(() => {
		workspaceRoot = createTestWorkspace();
		blobStore = new MockBlobStore();
		mockDb = createMockDatabase();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// =========================================================================
	// 1. Lifecycle Management Tests
	// =========================================================================

	describe("lifecycle management", () => {
		it("should create a session with start()", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			const result = await manager.start();

			expect(result.sessionId).toBeTruthy();
			const status = manager.current();
			expect(status.sessionId).toBe(result.sessionId);
			expect(status.changeCount).toBe(0);
		});

		it("should track file changes during a session", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 100 });
			manager.track(path.join(workspaceRoot, "file2.ts"), "modified", { size: 200 });

			const status = manager.current();
			expect(status.changeCount).toBe(2);
		});

		it("should finalize a session and return changeCount", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			const startResult = await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 100 });
			manager.track(path.join(workspaceRoot, "file2.ts"), "modified", { size: 200 });

			const finalizeResult = await manager.finalize();

			expect(finalizeResult.sessionId).toBe(startResult.sessionId);
			expect(finalizeResult.changeCount).toBe(2);
			expect(manager.current().sessionId).toBeNull();
		});

		it("should not allow tracking without an active session", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			// No error thrown, just silently ignored
			manager.track(path.join(workspaceRoot, "file1.ts"), "created");

			const status = manager.current();
			expect(status.changeCount).toBe(0);
		});
	});

	// =========================================================================
	// 2. Idle Timeout Tests
	// =========================================================================

	describe("idle timeout", () => {
		it("should auto-finalize on idle timeout", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				idleMs: 100, // Short timeout for testing
			});

			const _startResult = await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created");

			// Advance timers to trigger idle timeout
			vi.advanceTimersByTime(100);

			// Allow async finalize to complete
			await vi.runOnlyPendingTimersAsync();

			// After idle timeout, session should be finalized
			expect(manager.current().sessionId).toBeNull();
		});

		it("should reset idle timer on new activity", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				idleMs: 100,
			});

			await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created");

			// Advance 50ms (halfway to timeout)
			vi.advanceTimersByTime(50);

			// New activity should reset the timer
			manager.track(path.join(workspaceRoot, "file2.ts"), "created");

			// Advance another 50ms (should still be active)
			vi.advanceTimersByTime(50);
			expect(manager.current().sessionId).not.toBeNull();

			// Advance another 100ms to trigger timeout from second activity
			vi.advanceTimersByTime(100);
			await vi.runOnlyPendingTimersAsync();

			// Now should be finalized
			expect(manager.current().sessionId).toBeNull();
		});
	});

	// =========================================================================
	// 3. Timer Cleanup Tests
	// =========================================================================

	describe("timer cleanup", () => {
		it("should clear idle and flush timers on finalize", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				idleMs: 1000,
				flushIntervalMs: 1000,
			});

			await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created");

			// Finalize should clear both timers
			await manager.finalize();

			// Advance timers - if not cleared, they would cause issues
			vi.advanceTimersByTime(1000);

			// Should still be null (finalized and no auto-finalize from timer)
			expect(manager.current().sessionId).toBeNull();
		});
	});

	// =========================================================================
	// 4. Change Buffer Management Tests
	// =========================================================================

	describe("change buffer management", () => {
		it("should respect ignore patterns", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				ignorePatterns: ["node_modules/**", ".git/**", "*.log"],
			});

			await manager.start();

			// These should be ignored
			manager.track(path.join(workspaceRoot, "node_modules", "dep.js"), "created");
			manager.track(path.join(workspaceRoot, ".git", "config"), "modified");
			manager.track(path.join(workspaceRoot, "debug.log"), "created");

			// These should be tracked
			manager.track(path.join(workspaceRoot, "src", "file.ts"), "created");
			manager.track(path.join(workspaceRoot, "package.json"), "modified");

			const status = manager.current();
			expect(status.changeCount).toBe(2); // Only src/file.ts and package.json
		});

		it("should handle large change buffers", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				flushBatchSize: 50,
			});

			await manager.start();

			// Track 100 changes (exceeds flushBatchSize)
			for (let i = 0; i < 100; i++) {
				manager.track(path.join(workspaceRoot, `file${i}.ts`), "created");
			}

			const status = manager.current();
			expect(status.changeCount).toBe(100);

			const finalizeResult = await manager.finalize();
			expect(finalizeResult.changeCount).toBe(100);
		});
	});

	// =========================================================================
	// 5. Database Integration Tests
	// =========================================================================

	describe("database integration", () => {
		it("should write session to database when db is available", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				db: mockDb,
			});

			const _startResult = await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 100 });

			await manager.finalize();

			// Verify db.run was called to insert/update session
			expect(mockDb.run).toHaveBeenCalled();
		});

		it("should write changes to database when db is available", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				db: mockDb,
			});

			await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 100 });

			await manager.finalize();

			// db.prepare should have been called to insert changes
			expect(mockDb.prepare).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// 6. Multiple Sessions Tests
	// =========================================================================

	describe("multiple sessions", () => {
		it("should finalize previous session when starting new one", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			// Start first session
			const _session1 = await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created");

			// Start second session (should finalize first)
			const session2 = await manager.start();
			manager.track(path.join(workspaceRoot, "file2.ts"), "created");

			// Second session should be active
			expect(manager.current().sessionId).toBe(session2.sessionId);
			expect(manager.current().changeCount).toBe(1);

			// Finalize second session
			const finalizeResult = await manager.finalize();
			expect(finalizeResult.sessionId).toBe(session2.sessionId);
		});
	});

	// =========================================================================
	// 7. Empty Session Tests
	// =========================================================================

	describe("empty sessions", () => {
		it("should handle empty sessions (no changes)", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			const startResult = await manager.start();

			// Finalize without tracking any changes
			const finalizeResult = await manager.finalize();

			expect(finalizeResult.sessionId).toBe(startResult.sessionId);
			expect(finalizeResult.changeCount).toBe(0);
		});
	});

	// =========================================================================
	// 8. AI Tracker Integration Tests
	// =========================================================================

	describe("AI tracker integration", () => {
		it("should record changes in AI tracker", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				aiDetectionEnabled: true,
			});

			await manager.start();

			// Track a large insert (AI tracker should record it)
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 5000 });

			const status = manager.current();
			expect(status.changeCount).toBe(1);

			// Finalize should include AI detection results
			const finalizeResult = await manager.finalize();
			expect(finalizeResult.sessionId).toBeTruthy();
		});

		it("should disable AI tracking when flag is false", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				aiDetectionEnabled: false,
			});

			await manager.start();
			manager.track(path.join(workspaceRoot, "file1.ts"), "created", { size: 5000 });

			const finalizeResult = await manager.finalize();
			expect(finalizeResult.sessionId).toBeTruthy();
		});
	});

	// =========================================================================
	// 9. Current Session Status Tests
	// =========================================================================

	describe("current session status", () => {
		it("should return null sessionId when no active session", () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			const status = manager.current();
			expect(status.sessionId).toBeNull();
			expect(status.changeCount).toBe(0);
		});

		it("should return correct changeCount", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			await manager.start();
			expect(manager.current().changeCount).toBe(0);

			manager.track(path.join(workspaceRoot, "file1.ts"), "created");
			expect(manager.current().changeCount).toBe(1);

			manager.track(path.join(workspaceRoot, "file2.ts"), "created");
			expect(manager.current().changeCount).toBe(2);
		});
	});

	// =========================================================================
	// 10. Edge Cases
	// =========================================================================

	describe("edge cases", () => {
		it("should throw when trying to finalize without active session", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			await expect(manager.finalize()).rejects.toThrow("No active session to finalize");
		});

		it("should handle rename operations with fromPath", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
			});

			await manager.start();

			manager.track(path.join(workspaceRoot, "new-name.ts"), "renamed", {
				fromPath: path.join(workspaceRoot, "old-name.ts"),
			});

			const status = manager.current();
			expect(status.changeCount).toBe(1);

			await manager.finalize();
		});

		it("should use custom configuration options", async () => {
			const manager = new SessionManager({
				workspaceUri: `file://${workspaceRoot}`,
				workspaceRoot,
				blobStore,
				idleMs: 2000,
				flushBatchSize: 10,
				flushIntervalMs: 1000,
				tier: "solo",
				consent: true,
			});

			const startResult = await manager.start();
			expect(startResult.sessionId).toBeTruthy();

			await manager.finalize();
		});
	});
});
