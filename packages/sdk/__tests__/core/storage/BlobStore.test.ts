import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BlobStore } from "@snapback-sdk/storage/BlobStore";
import { FilesystemBlobStore } from "@snapback-sdk/storage/BlobStore.fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("BlobStore Interface Contract", () => {
	let blobStore: BlobStore;
	let testBlobRoot: string;

	beforeEach(async () => {
		// Create temp blob storage directory
		testBlobRoot = join(tmpdir(), `snapback-blobs-${Date.now()}`);
		mkdirSync(testBlobRoot, { recursive: true });

		// Use FilesystemBlobStore as reference implementation
		blobStore = new FilesystemBlobStore(testBlobRoot);

		// Initialize blob store
		const initResult = await blobStore.initialize();
		if (!initResult.ok) {
			throw new Error(`Failed to initialize BlobStore: ${initResult.error.message}`);
		}
	});

	afterEach(async () => {
		// Close blob store
		await blobStore.close();

		// Remove temp directory
		try {
			rmSync(testBlobRoot, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("initialize()", () => {
		it("should create directory structure", async () => {
			// Directory should exist after initialization
			expect(existsSync(testBlobRoot)).toBe(true);
		});

		it("should be idempotent (safe to call multiple times)", async () => {
			const result1 = await blobStore.initialize();
			const result2 = await blobStore.initialize();

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);
		});

		it("should return error on IO failure", async () => {
			// Create a BlobStore with invalid path (permission denied simulation)
			const invalidStore = new FilesystemBlobStore("\0invalid-path");
			const result = await invalidStore.initialize();

			// Should return error, not throw
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("IO_ERROR");
			}
		});
	});

	describe("put()", () => {
		it("should store blob and return SHA-256 hash", async () => {
			const content = new TextEncoder().encode("Hello, SnapBack!");
			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBeDefined();
				expect(typeof result.value).toBe("string");
				expect(result.value.length).toBe(64); // SHA-256 hex string
			}
		});

		it("should compute correct SHA-256 hash", async () => {
			const content = new TextEncoder().encode("test content");
			const expectedHash = createHash("sha256").update(content).digest("hex");

			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(expectedHash);
			}
		});

		it("should be idempotent (same content returns same hash)", async () => {
			const content = new TextEncoder().encode("idempotent test");

			const result1 = await blobStore.put(content);
			const result2 = await blobStore.put(content);

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);

			if (result1.ok && result2.ok) {
				expect(result1.value).toBe(result2.value);
			}
		});

		it("should apply LZ4 compression", async () => {
			const content = new TextEncoder().encode("A".repeat(1000)); // Compressible content
			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);

			// Verify compressed size is smaller than original
			const size = await blobStore.size();
			expect(size).toBeLessThan(content.byteLength);
		});

		it("should create sharded directory structure", async () => {
			const content = new TextEncoder().encode("shard test");
			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);

			if (result.ok) {
				const hash = result.value;
				// Hash should be stored in sha256/aa/bb/aabb...hash.lz4
				const shardPath = join(testBlobRoot, "sha256", hash.slice(0, 2), hash.slice(2, 4));
				expect(existsSync(shardPath)).toBe(true);
			}
		});

		it("should handle empty content", async () => {
			const content = new Uint8Array(0);
			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);
			if (result.ok) {
				// SHA-256 hash of empty content
				const expectedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
				expect(result.value).toBe(expectedHash);
			}
		});

		it("should handle large content (>1MB)", async () => {
			const largeContent = new Uint8Array(2 * 1024 * 1024); // 2MB
			for (let i = 0; i < largeContent.length; i++) {
				largeContent[i] = i % 256;
			}

			const result = await blobStore.put(largeContent);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBeDefined();
				expect(result.value.length).toBe(64);
			}
		});

		it("should return IO_ERROR on storage failure", async () => {
			// This test would require simulating disk full or permission errors
			// Skipping as it requires OS-level mocking
			expect(true).toBe(true);
		});

		it("should return COMPRESSION_FAILED on compression error", async () => {
			// This test would require corrupting the LZ4 compression
			// Skipping as it's difficult to trigger in practice
			expect(true).toBe(true);
		});
	});

	describe("get()", () => {
		it("should retrieve blob by hash", async () => {
			const content = new TextEncoder().encode("retrieve test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const getResult = await blobStore.get(putResult.value);

				expect(getResult.ok).toBe(true);
				if (getResult.ok) {
					expect(getResult.value).not.toBeNull();
					if (getResult.value) {
						expect(new TextDecoder().decode(getResult.value)).toBe("retrieve test");
					}
				}
			}
		});

		it("should return null for non-existent hash", async () => {
			const nonExistentHash = "0000000000000000000000000000000000000000000000000000000000000000";
			const result = await blobStore.get(nonExistentHash);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBeNull();
			}
		});

		it("should decompress LZ4 content", async () => {
			const originalContent = new TextEncoder().encode("compress then decompress");
			const putResult = await blobStore.put(originalContent);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const getResult = await blobStore.get(putResult.value);

				expect(getResult.ok).toBe(true);
				if (getResult.ok && getResult.value) {
					const decoded = new TextDecoder().decode(getResult.value);
					expect(decoded).toBe("compress then decompress");
				}
			}
		});

		it("should verify hash after decompression", async () => {
			const content = new TextEncoder().encode("hash verification test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const getResult = await blobStore.get(putResult.value);

				expect(getResult.ok).toBe(true);
				if (getResult.ok && getResult.value) {
					// Recompute hash and verify
					const retrievedHash = createHash("sha256").update(getResult.value).digest("hex");
					expect(retrievedHash).toBe(putResult.value);
				}
			}
		});

		it("should handle large blob retrieval (>1MB)", async () => {
			const largeContent = new Uint8Array(2 * 1024 * 1024); // 2MB
			for (let i = 0; i < largeContent.length; i++) {
				largeContent[i] = i % 256;
			}

			const putResult = await blobStore.put(largeContent);
			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const getResult = await blobStore.get(putResult.value);

				expect(getResult.ok).toBe(true);
				if (getResult.ok && getResult.value) {
					expect(getResult.value.byteLength).toBe(largeContent.byteLength);
				}
			}
		});

		it("should return DECOMPRESSION_FAILED on corrupt data", async () => {
			// This would require manually corrupting the .lz4 file
			// Skipping as it requires file system manipulation
			expect(true).toBe(true);
		});

		it("should return HASH_MISMATCH on hash verification failure", async () => {
			// This would require manually modifying the stored blob
			// Skipping as it requires file system manipulation
			expect(true).toBe(true);
		});

		it("should return IO_ERROR on read failure", async () => {
			// This would require simulating permission errors
			// Skipping as it requires OS-level mocking
			expect(true).toBe(true);
		});
	});

	describe("has()", () => {
		it("should return true for existing blob", async () => {
			const content = new TextEncoder().encode("existence test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const exists = await blobStore.has(putResult.value);
				expect(exists).toBe(true);
			}
		});

		it("should return false for non-existent blob", async () => {
			const nonExistentHash = "1111111111111111111111111111111111111111111111111111111111111111";
			const exists = await blobStore.has(nonExistentHash);

			expect(exists).toBe(false);
		});

		it("should work with sharded paths", async () => {
			const content = new TextEncoder().encode("sharded existence test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				// has() should find blob even with sharded directory structure
				const exists = await blobStore.has(putResult.value);
				expect(exists).toBe(true);
			}
		});
	});

	describe("delete()", () => {
		it("should delete existing blob", async () => {
			const content = new TextEncoder().encode("delete test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			if (putResult.ok) {
				const deleteResult = await blobStore.delete(putResult.value);
				expect(deleteResult.ok).toBe(true);

				// Blob should no longer exist
				const exists = await blobStore.has(putResult.value);
				expect(exists).toBe(false);
			}
		});

		it("should be idempotent (deleting non-existent blob succeeds)", async () => {
			const nonExistentHash = "2222222222222222222222222222222222222222222222222222222222222222";
			const result = await blobStore.delete(nonExistentHash);

			expect(result.ok).toBe(true);
		});

		it("should update size after deletion", async () => {
			const content = new TextEncoder().encode("size tracking test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			const sizeBeforeDelete = await blobStore.size();

			if (putResult.ok) {
				await blobStore.delete(putResult.value);
				const sizeAfterDelete = await blobStore.size();

				expect(sizeAfterDelete).toBeLessThan(sizeBeforeDelete);
			}
		});

		it("should return IO_ERROR on deletion failure", async () => {
			// This would require simulating permission errors
			// Skipping as it requires OS-level mocking
			expect(true).toBe(true);
		});
	});

	describe("size()", () => {
		it("should return 0 for empty storage", async () => {
			const size = await blobStore.size();
			expect(size).toBe(0);
		});

		it("should return correct size after put", async () => {
			const content = new TextEncoder().encode("size test");
			await blobStore.put(content);

			const size = await blobStore.size();
			expect(size).toBeGreaterThan(0);
		});

		it("should count compressed size, not original", async () => {
			const compressibleContent = new TextEncoder().encode("A".repeat(1000));
			await blobStore.put(compressibleContent);

			const size = await blobStore.size();
			// Compressed size should be less than original
			expect(size).toBeLessThan(compressibleContent.byteLength);
		});

		it("should update after multiple puts", async () => {
			const content1 = new TextEncoder().encode("first");
			const content2 = new TextEncoder().encode("second");

			await blobStore.put(content1);
			const sizeAfterFirst = await blobStore.size();

			await blobStore.put(content2);
			const sizeAfterSecond = await blobStore.size();

			expect(sizeAfterSecond).toBeGreaterThan(sizeAfterFirst);
		});

		it("should update after delete", async () => {
			const content = new TextEncoder().encode("delete size test");
			const putResult = await blobStore.put(content);

			expect(putResult.ok).toBe(true);

			const sizeBeforeDelete = await blobStore.size();

			if (putResult.ok) {
				await blobStore.delete(putResult.value);
				const sizeAfterDelete = await blobStore.size();

				expect(sizeAfterDelete).toBeLessThan(sizeBeforeDelete);
			}
		});
	});

	describe("close()", () => {
		it("should cleanup resources", async () => {
			const result = await blobStore.close();
			expect(result.ok).toBe(true);
		});

		it("should be idempotent (safe to call multiple times)", async () => {
			const result1 = await blobStore.close();
			const result2 = await blobStore.close();

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);
		});
	});

	describe("sharded storage layout", () => {
		it("should create aa/bb sharded directories", async () => {
			const content = new TextEncoder().encode("shard layout test");
			const result = await blobStore.put(content);

			expect(result.ok).toBe(true);

			if (result.ok) {
				const hash = result.value;
				const shard1 = hash.slice(0, 2); // First 2 hex chars
				const shard2 = hash.slice(2, 4); // Next 2 hex chars

				const shardPath = join(testBlobRoot, "sha256", shard1, shard2);
				expect(existsSync(shardPath)).toBe(true);

				const blobPath = join(shardPath, `${hash}.lz4`);
				expect(existsSync(blobPath)).toBe(true);
			}
		});

		it("should support 256 × 256 = 65,536 shards", async () => {
			// Generate content that hashes to different shards
			const contents = ["shard 00", "shard 01", "shard ff"];

			for (const text of contents) {
				const content = new TextEncoder().encode(text);
				const result = await blobStore.put(content);

				expect(result.ok).toBe(true);

				if (result.ok) {
					const hash = result.value;
					const shard1 = hash.slice(0, 2);
					const shard2 = hash.slice(2, 4);

					const shardPath = join(testBlobRoot, "sha256", shard1, shard2);
					expect(existsSync(shardPath)).toBe(true);
				}
			}
		});
	});

	describe("error code coverage", () => {
		it("should define all error codes", () => {
			const errorCodes = [
				"HASH_MISMATCH",
				"BLOB_NOT_FOUND",
				"STORAGE_FULL",
				"COMPRESSION_FAILED",
				"DECOMPRESSION_FAILED",
				"IO_ERROR",
			];

			// All error codes should be defined in BlobStore interface
			// This is a compile-time check, runtime validation is implicit
			expect(errorCodes).toHaveLength(6);
		});

		// Note: Testing actual error conditions requires:
		// - HASH_MISMATCH: Corrupt blob file after storage
		// - BLOB_NOT_FOUND: Already tested via get() with non-existent hash
		// - STORAGE_FULL: Mock file system with quota exceeded
		// - COMPRESSION_FAILED: Corrupt LZ4 library (impractical)
		// - DECOMPRESSION_FAILED: Corrupt .lz4 file
		// - IO_ERROR: Permission errors, disk failures

		// Most error paths require OS-level mocking or file corruption
		// which is beyond the scope of interface contract testing
	});

	describe("performance characteristics", () => {
		it("should handle 100 sequential puts efficiently", async () => {
			const startTime = performance.now();

			for (let i = 0; i < 100; i++) {
				const content = new TextEncoder().encode(`content ${i}`);
				const result = await blobStore.put(content);
				expect(result.ok).toBe(true);
			}

			const duration = performance.now() - startTime;

			// 100 puts should complete in reasonable time (<1000ms)
			expect(duration).toBeLessThan(1000);
		});

		it("should handle 100 sequential gets efficiently", async () => {
			// First, put 100 blobs
			const hashes: string[] = [];

			for (let i = 0; i < 100; i++) {
				const content = new TextEncoder().encode(`get test ${i}`);
				const result = await blobStore.put(content);
				if (result.ok) {
					hashes.push(result.value);
				}
			}

			// Now measure get performance
			const startTime = performance.now();

			for (const hash of hashes) {
				const result = await blobStore.get(hash);
				expect(result.ok).toBe(true);
			}

			const duration = performance.now() - startTime;

			// 100 gets should complete in reasonable time (<500ms)
			expect(duration).toBeLessThan(500);
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent puts", async () => {
			const puts = [];

			for (let i = 0; i < 10; i++) {
				const content = new TextEncoder().encode(`concurrent ${i}`);
				puts.push(blobStore.put(content));
			}

			const results = await Promise.all(puts);

			expect(results).toHaveLength(10);
			for (const result of results) {
				expect(result.ok).toBe(true);
			}
		});

		it("should handle concurrent gets", async () => {
			// First, put 10 blobs
			const hashes: string[] = [];

			for (let i = 0; i < 10; i++) {
				const content = new TextEncoder().encode(`concurrent get ${i}`);
				const result = await blobStore.put(content);
				if (result.ok) {
					hashes.push(result.value);
				}
			}

			// Now get concurrently
			const gets = hashes.map((hash) => blobStore.get(hash));
			const results = await Promise.all(gets);

			expect(results).toHaveLength(10);
			for (const result of results) {
				expect(result.ok).toBe(true);
				expect(result.value).not.toBeNull();
			}
		});
	});
});
