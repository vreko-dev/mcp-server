import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager, type SessionManagerOptions } from "../../src/session/SessionManager";
import { FsBlobStore } from "../../src/storage/FsBlobStore";

// Performance budgets (p95 latencies)
const PERF_BUDGETS = {
	SESSION_TRACK_P95_MS: 50, // Session tracking must be <50ms (critical user-facing operation)
	SESSION_FINALIZE_P95_MS: 500, // Session finalization <500ms (batch hash computation)
	SESSION_START_P95_MS: 100, // Session start <100ms (database insert + timer setup)
	BLOB_PUT_P95_MS: 50, // Blob storage <50ms (compression + write)
	BLOB_GET_P95_MS: 30, // Blob retrieval <30ms (read + decompression)
} as const;

/**
 * Calculate percentile from sorted array of values
 */
function calculatePercentile(values: number[], percentile: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil((percentile / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Generate realistic file paths for testing
 */
function generateFilePaths(count: number, workspaceRoot: string): string[] {
	const paths: string[] = [];
	const extensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md"];
	const directories = ["src", "src/components", "src/hooks", "src/utils", "src/pages", "tests", "docs"];

	for (let i = 0; i < count; i++) {
		const dir = directories[i % directories.length];
		const ext = extensions[i % extensions.length];
		const filename = `file${i}${ext}`;
		paths.push(join(workspaceRoot, dir, filename));
	}

	return paths;
}

describe("Session Performance", () => {
	let sessionManager: SessionManager;
	let blobStore: FsBlobStore;
	let testWorkspaceRoot: string;
	let testDb: Database.Database;

	const ITERATIONS = 100; // Number of measured iterations
	const WARMUP_ITERATIONS = 10; // Warmup runs to stabilize JIT

	beforeEach(async () => {
		// Create temp workspace
		testWorkspaceRoot = join(tmpdir(), `snapback-perf-${Date.now()}`);
		mkdirSync(testWorkspaceRoot, { recursive: true });

		// Create test directories
		const srcDir = join(testWorkspaceRoot, "src");
		mkdirSync(join(srcDir, "components"), { recursive: true });
		mkdirSync(join(srcDir, "hooks"), { recursive: true });
		mkdirSync(join(srcDir, "utils"), { recursive: true });
		mkdirSync(join(srcDir, "pages"), { recursive: true });
		mkdirSync(join(testWorkspaceRoot, "tests"), { recursive: true });
		mkdirSync(join(testWorkspaceRoot, "docs"), { recursive: true });

		// Create blob store
		const blobRoot = join(testWorkspaceRoot, ".snapback", "blobs");
		blobStore = new FsBlobStore(blobRoot);
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
		// Cleanup
		try {
			await sessionManager.finalize();
		} catch {
			// Ignore if no active session
		}

		if (testDb) {
			testDb.close();
		}

		await blobStore.close();

		try {
			rmSync(testWorkspaceRoot, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Session Tracking Performance", () => {
		it("should track single file change within p95 budget (<50ms)", async () => {
			const timings: number[] = [];
			const testFile = join(testWorkspaceRoot, "src", "app.ts");

			// Create test file
			writeFileSync(testFile, 'const app = "test";', "utf-8");

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await sessionManager.start();
				sessionManager.track(testFile, "modified");
				await sessionManager.finalize();
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				await sessionManager.start();

				const start = performance.now();
				sessionManager.track(testFile, "modified");
				const end = performance.now();

				timings.push(end - start);

				await sessionManager.finalize();
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);
			const p99 = calculatePercentile(timings, 99);

			console.log(
				`track() single file: p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms`,
			);

			expect(p95).toBeLessThan(PERF_BUDGETS.SESSION_TRACK_P95_MS);
		});

		it("should track 10 file changes within p95 budget (<50ms total)", async () => {
			const timings: number[] = [];
			const testFiles = generateFilePaths(10, testWorkspaceRoot);

			// Create test files
			for (const file of testFiles) {
				writeFileSync(file, "test content", "utf-8");
			}

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await sessionManager.start();
				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}
				await sessionManager.finalize();
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				await sessionManager.start();

				const start = performance.now();
				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}
				const end = performance.now();

				timings.push(end - start);

				await sessionManager.finalize();
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);

			console.log(`track() 10 files: p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);

			expect(p95).toBeLessThan(PERF_BUDGETS.SESSION_TRACK_P95_MS);
		});

		it("should demonstrate lazy hash computation (deferred until finalize)", async () => {
			const trackTimings: number[] = [];
			const finalizeTimings: number[] = [];
			const testFiles = generateFilePaths(50, testWorkspaceRoot);

			// Create test files with realistic content
			for (const file of testFiles) {
				const content = `// File: ${file}\nexport const data = ${JSON.stringify({ test: true })};\n`;
				writeFileSync(file, content, "utf-8");
			}

			// Measure track() vs finalize() timing
			for (let i = 0; i < 20; i++) {
				await sessionManager.start();

				// Measure track (should be fast - no hashing)
				const trackStart = performance.now();
				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}
				const trackEnd = performance.now();
				trackTimings.push(trackEnd - trackStart);

				// Measure finalize (should be slower - hash computation)
				const finalizeStart = performance.now();
				await sessionManager.finalize();
				const finalizeEnd = performance.now();
				finalizeTimings.push(finalizeEnd - finalizeStart);
			}

			const trackP95 = calculatePercentile(trackTimings, 95);
			const finalizeP95 = calculatePercentile(finalizeTimings, 95);

			console.log(
				`Lazy hashing: track() p95=${trackP95.toFixed(2)}ms, finalize() p95=${finalizeP95.toFixed(2)}ms`,
			);

			// track() should be fast (lazy hashing)
			expect(trackP95).toBeLessThan(PERF_BUDGETS.SESSION_TRACK_P95_MS);

			// finalize() can be slower (hash computation)
			expect(finalizeP95).toBeLessThan(PERF_BUDGETS.SESSION_FINALIZE_P95_MS);

			// Verify lazy hashing: track() should be significantly faster than finalize()
			expect(trackP95).toBeLessThan(finalizeP95 / 2);
		});
	});

	describe("Session Start Performance", () => {
		it("should start session within p95 budget (<100ms)", async () => {
			const timings: number[] = [];

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await sessionManager.start();
				await sessionManager.finalize();
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				const start = performance.now();
				await sessionManager.start();
				const end = performance.now();

				timings.push(end - start);

				await sessionManager.finalize();
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);

			console.log(`start(): p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);

			expect(p95).toBeLessThan(PERF_BUDGETS.SESSION_START_P95_MS);
		});
	});

	describe("Session Finalize Performance", () => {
		it("should finalize session with 50 changes within p95 budget (<500ms)", async () => {
			const timings: number[] = [];
			const testFiles = generateFilePaths(50, testWorkspaceRoot);

			// Create test files
			for (const file of testFiles) {
				writeFileSync(file, "test content for finalize", "utf-8");
			}

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await sessionManager.start();
				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}
				await sessionManager.finalize();
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				await sessionManager.start();

				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}

				const start = performance.now();
				await sessionManager.finalize();
				const end = performance.now();

				timings.push(end - start);
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);

			console.log(
				`finalize() 50 changes: p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`,
			);

			expect(p95).toBeLessThan(PERF_BUDGETS.SESSION_FINALIZE_P95_MS);
		});

		it("should finalize empty session within budget", async () => {
			const timings: number[] = [];

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await sessionManager.start();
				await sessionManager.finalize();
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				await sessionManager.start();

				const start = performance.now();
				await sessionManager.finalize();
				const end = performance.now();

				timings.push(end - start);
			}

			const p95 = calculatePercentile(timings, 95);

			console.log(`finalize() empty session: p95=${p95.toFixed(2)}ms`);

			// Empty session should be very fast
			expect(p95).toBeLessThan(100);
		});
	});

	describe("BlobStore Performance", () => {
		it("should put blob within p95 budget (<50ms)", async () => {
			const timings: number[] = [];
			const content = new TextEncoder().encode("A".repeat(1000)); // 1KB content

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await blobStore.put(content);
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				const start = performance.now();
				await blobStore.put(content);
				const end = performance.now();

				timings.push(end - start);
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);

			console.log(`BlobStore.put(): p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);

			expect(p95).toBeLessThan(PERF_BUDGETS.BLOB_PUT_P95_MS);
		});

		it("should get blob within p95 budget (<30ms)", async () => {
			const timings: number[] = [];
			const content = new TextEncoder().encode("A".repeat(1000)); // 1KB content

			// Store blob
			const putResult = await blobStore.put(content);
			expect(putResult.ok).toBe(true);

			if (!putResult.ok) {
				return;
			}

			const hash = putResult.value;

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await blobStore.get(hash);
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				const start = performance.now();
				await blobStore.get(hash);
				const end = performance.now();

				timings.push(end - start);
			}

			const p50 = calculatePercentile(timings, 50);
			const p90 = calculatePercentile(timings, 90);
			const p95 = calculatePercentile(timings, 95);

			console.log(`BlobStore.get(): p50=${p50.toFixed(2)}ms, p90=${p90.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);

			expect(p95).toBeLessThan(PERF_BUDGETS.BLOB_GET_P95_MS);
		});

		it("should handle large blob (10KB) within budget", async () => {
			const timings: number[] = [];
			const largeContent = new TextEncoder().encode("A".repeat(10_000)); // 10KB content

			// Warmup
			for (let i = 0; i < WARMUP_ITERATIONS; i++) {
				await blobStore.put(largeContent);
			}

			// Measure
			for (let i = 0; i < ITERATIONS; i++) {
				const start = performance.now();
				await blobStore.put(largeContent);
				const end = performance.now();

				timings.push(end - start);
			}

			const p95 = calculatePercentile(timings, 95);

			console.log(`BlobStore.put() 10KB: p95=${p95.toFixed(2)}ms`);

			// Large blobs may take longer but should still be reasonable
			expect(p95).toBeLessThan(100);
		});
	});

	describe("Batch Operations Performance", () => {
		it("should handle batch flush of 50 changes efficiently", async () => {
			const timings: number[] = [];
			const testFiles = generateFilePaths(50, testWorkspaceRoot);

			// Create test files
			for (const file of testFiles) {
				writeFileSync(file, "batch test", "utf-8");
			}

			// Measure full batch cycle
			for (let i = 0; i < 20; i++) {
				await sessionManager.start();

				const start = performance.now();

				// Track all files (should trigger auto-flush at 50)
				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}

				const end = performance.now();
				timings.push(end - start);

				await sessionManager.finalize();
			}

			const p95 = calculatePercentile(timings, 95);

			console.log(`Batch flush 50 changes: p95=${p95.toFixed(2)}ms`);

			// Batch operations should still be fast
			expect(p95).toBeLessThan(200);
		});
	});

	describe("Memory Efficiency", () => {
		it("should not leak memory during repeated sessions", async () => {
			const testFiles = generateFilePaths(20, testWorkspaceRoot);

			// Create test files
			for (const file of testFiles) {
				writeFileSync(file, "memory test", "utf-8");
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const memBefore = process.memoryUsage().heapUsed;

			// Run many sessions
			for (let i = 0; i < 100; i++) {
				await sessionManager.start();

				for (const file of testFiles) {
					sessionManager.track(file, "modified");
				}

				await sessionManager.finalize();
			}

			// Force garbage collection
			if (global.gc) {
				global.gc();
			}

			const memAfter = process.memoryUsage().heapUsed;
			const memGrowth = (memAfter - memBefore) / 1024 / 1024; // MB

			console.log(`Memory growth after 100 sessions: ${memGrowth.toFixed(2)} MB`);

			// Memory growth should be minimal (<10MB)
			expect(memGrowth).toBeLessThan(10);
		});
	});
});
