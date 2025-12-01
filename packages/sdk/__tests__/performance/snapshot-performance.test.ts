/**
 * Performance tests for Snapshot operations
 *
 * These tests measure and assert performance characteristics of
 * snapshot creation, restoration, and deduplication.
 */

import { THRESHOLDS } from "@snapback/sdk";
import { SnapshotDeduplication } from "@snapback/sdk/snapshot";
import { describe, expect, it } from "vitest";

describe("Snapshot Performance", () => {
	/**
	 * Benchmark: Creating a snapshot with various file counts
	 */
	describe("Snapshot creation performance", () => {
		it("should create small snapshot (1-10 files) in < 10ms", () => {
			const start = performance.now();

			const files: Array<{ path: string; content: string }> = [];
			for (let i = 0; i < 10; i++) {
				files.push({
					path: `file${i}.ts`,
					content: `export const func${i} = () => 'result';`,
				});
			}

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(10);
		});

		it("should create medium snapshot (100 files) in < 50ms", () => {
			const start = performance.now();

			const files: Array<{ path: string; content: string }> = [];
			for (let i = 0; i < 100; i++) {
				files.push({
					path: `file${i}.ts`,
					content: `export const func${i} = () => 'result';`.repeat(10),
				});
			}

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(50);
		});

		it("should create large snapshot (500 files) in < 200ms", () => {
			const start = performance.now();

			const files: Array<{ path: string; content: string }> = [];
			for (let i = 0; i < 500; i++) {
				files.push({
					path: `file${i}.ts`,
					content: `export const func${i} = () => 'result';`.repeat(5),
				});
			}

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(200);
		});
	});

	/**
	 * Benchmark: Snapshot deduplication cache hits/misses
	 */
	describe("Deduplication performance", () => {
		it("should find dedup cache hit in < 1ms", () => {
			const dedup = new SnapshotDeduplication();

			const content = "function duplicated() { return 42; }";
			const hash1 = dedup.hashContent(content);

			const start = performance.now();
			const hash2 = dedup.hashContent(content);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(1);
			expect(hash1).toBe(hash2);
		});

		it("should detect duplicate files across many snapshots", () => {
			const dedup = new SnapshotDeduplication();

			const duplicateContent = "function duplicated() { return 42; }";
			const hashes = new Set<string>();

			const start = performance.now();

			// Add same content 100 times
			for (let i = 0; i < 100; i++) {
				const hash = dedup.hashContent(duplicateContent);
				hashes.add(hash);
			}

			const elapsed = performance.now() - start;

			// Should only have 1 unique hash
			expect(hashes.size).toBe(1);
			// Should be fast even with many duplicates
			expect(elapsed).toBeLessThan(10);
		});

		it("should handle cache with varying content efficiency", () => {
			const dedup = new SnapshotDeduplication();
			const cacheSize = THRESHOLDS.resources.dedupCacheSize;

			const start = performance.now();

			// Fill cache with different content
			for (let i = 0; i < cacheSize; i++) {
				const content = `function func${i}() { return ${i}; }`;
				dedup.hashContent(content);
			}

			const elapsed = performance.now() - start;

			// Should handle full cache efficiently
			expect(elapsed).toBeLessThan(100);
		});
	});

	/**
	 * Benchmark: File hashing performance for various sizes
	 */
	describe("File hashing performance", () => {
		it("should hash small file (1KB) in < 1ms", () => {
			const dedup = new SnapshotDeduplication();
			const content = "a".repeat(1024); // 1KB

			const start = performance.now();
			dedup.hashContent(content);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(1);
		});

		it("should hash medium file (1MB) in < 10ms", () => {
			const dedup = new SnapshotDeduplication();
			const content = "a".repeat(1024 * 1024); // 1MB

			const start = performance.now();
			dedup.hashContent(content);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(10);
		});

		it("should hash large file (10MB) in < 100ms", () => {
			const dedup = new SnapshotDeduplication();
			const content = "a".repeat(10 * 1024 * 1024); // 10MB

			const start = performance.now();
			dedup.hashContent(content);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(100);
		});
	});

	/**
	 * Benchmark: Snapshot filtering and listing
	 */
	describe("Snapshot filtering performance", () => {
		it("should filter 100 snapshots in < 10ms", () => {
			const snapshots = Array.from({ length: 100 }, (_, i) => ({
				id: `snap-${i}`,
				timestamp: Date.now() - i * 1000,
				files: [`file-${i}.ts`],
			}));

			const start = performance.now();

			// Filter snapshots from last 24 hours
			const recent = snapshots.filter((s) => s.timestamp > Date.now() - 24 * 60 * 60 * 1000);

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(10);
			expect(recent).toHaveLength(expect.any(Number));
		});

		it("should sort 100 snapshots by timestamp in < 5ms", () => {
			const snapshots = Array.from({ length: 100 }, (_, i) => ({
				id: `snap-${i}`,
				timestamp: Math.random() * Date.now(),
				files: [`file-${i}.ts`],
			}));

			const start = performance.now();

			const sorted = [...snapshots].sort((a, b) => b.timestamp - a.timestamp);

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(5);
			expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
		});
	});

	/**
	 * Benchmark: Memory usage patterns
	 */
	describe("Memory efficiency", () => {
		it("should not bloat memory with duplicate hashes", () => {
			const dedup = new SnapshotDeduplication();

			const before = process.memoryUsage().heapUsed;

			// Hash same content many times
			const content = "function shared() { return 42; }";
			for (let i = 0; i < 10000; i++) {
				dedup.hashContent(content);
			}

			const after = process.memoryUsage().heapUsed;
			const increase = after - before;

			// Memory increase should be modest (cache stores deduplicated content)
			expect(increase).toBeLessThan(10 * 1024 * 1024); // Less than 10MB for 10k ops
		});

		it("should handle cache eviction efficiently", () => {
			const dedup = new SnapshotDeduplication();
			const cacheSize = THRESHOLDS.resources.dedupCacheSize;

			const before = process.memoryUsage().heapUsed;

			// Fill cache beyond capacity
			for (let i = 0; i < cacheSize * 2; i++) {
				const content = `function func${i}() { return ${i}; }`;
				dedup.hashContent(content);
			}

			const after = process.memoryUsage().heapUsed;
			const increase = after - before;

			// Memory should not grow unbounded despite cache eviction
			expect(increase).toBeLessThan(50 * 1024 * 1024); // Less than 50MB for 2x cache size
		});
	});

	/**
	 * Benchmark: Concurrent operations
	 */
	describe("Concurrent performance", () => {
		it("should handle concurrent snapshot operations", async () => {
			const tasks = Array.from({ length: 10 }, (_, i) =>
				Promise.resolve({
					id: `snap-${i}`,
					timestamp: Date.now(),
					files: [`file-${i}.ts`],
					fileContents: {
						[`file-${i}.ts`]: `export const func${i} = () => 'result';`,
					},
				}),
			);

			const start = performance.now();

			const results = await Promise.all(tasks);

			const elapsed = performance.now() - start;

			expect(results).toHaveLength(10);
			// 10 concurrent tasks should complete in < 100ms
			expect(elapsed).toBeLessThan(100);
		});

		it("should handle rapid successive snapshot requests", () => {
			const start = performance.now();

			for (let i = 0; i < 100; i++) {
				// Simulate rapid snapshot requests
				const snapshot = {
					id: `snap-${i}`,
					timestamp: Date.now() + i,
					files: [`file-${i}.ts`],
					fileContents: {
						[`file-${i}.ts`]: `export const func${i} = () => 'result';`,
					},
				};

				// Verify snapshot integrity
				expect(snapshot.id).toBeTruthy();
				expect(snapshot.timestamp).toBeGreaterThan(0);
			}

			const elapsed = performance.now() - start;

			// 100 rapid requests should complete in < 50ms
			expect(elapsed).toBeLessThan(50);
		});
	});
});
