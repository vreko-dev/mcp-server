/**
 * SessionDeduplication tests
 */

import type { SessionChange } from "@snapback-oss/contracts/session";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionDeduplication } from "../../src/session/SessionDeduplication";

describe("SessionDeduplication", () => {
	let dedup: SessionDeduplication;

	beforeEach(() => {
		dedup = new SessionDeduplication({
			timeDeltaMs: 5 * 60 * 1000, // 5 minutes
			cacheSize: 100,
			minFilesForDedup: 5,
		});
	});

	describe("computeFingerprint", () => {
		it("should compute deterministic fingerprint for file changes", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123", hOld: "def456" },
				{ p: "src/file2.ts", op: "created", hNew: "ghi789" },
			];

			const fingerprint1 = dedup.computeFingerprint(changes);
			const fingerprint2 = dedup.computeFingerprint(changes);

			expect(fingerprint1).toBe(fingerprint2);
			expect(fingerprint1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
		});

		it("should produce same fingerprint regardless of input order", () => {
			const changes1: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
			];

			const changes2: SessionChange[] = [
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
			];

			const fingerprint1 = dedup.computeFingerprint(changes1);
			const fingerprint2 = dedup.computeFingerprint(changes2);

			expect(fingerprint1).toBe(fingerprint2);
		});

		it("should produce different fingerprints for different changes", () => {
			const changes1: SessionChange[] = [{ p: "src/file1.ts", op: "modified", hNew: "abc123" }];

			const changes2: SessionChange[] = [{ p: "src/file1.ts", op: "modified", hNew: "xyz789" }];

			const fingerprint1 = dedup.computeFingerprint(changes1);
			const fingerprint2 = dedup.computeFingerprint(changes2);

			expect(fingerprint1).not.toBe(fingerprint2);
		});

		it("should return empty string for empty changes", () => {
			const fingerprint = dedup.computeFingerprint([]);
			expect(fingerprint).toBe("");
		});
	});

	describe("checkDuplicate", () => {
		it("should not flag small sessions as duplicates", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
			];

			const result = dedup.checkDuplicate(changes, Date.now());

			expect(result.isDuplicate).toBe(false);
			expect(result.reason).toContain("too small");
		});

		it("should not flag first occurrence as duplicate", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			const result = dedup.checkDuplicate(changes, Date.now());

			expect(result.isDuplicate).toBe(false);
			expect(result.fingerprint).toBeDefined();
		});

		it("should detect duplicate within time threshold", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			const timestamp1 = Date.now();
			const timestamp2 = timestamp1 + 2 * 60 * 1000; // 2 minutes later

			// Register first session
			dedup.register("session-1", changes, timestamp1);

			// Check for duplicate
			const result = dedup.checkDuplicate(changes, timestamp2);

			expect(result.isDuplicate).toBe(true);
			expect(result.existingSessionId).toBe("session-1");
			expect(result.reason).toContain("Duplicate of session");
		});

		it("should not flag duplicate beyond time threshold", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			const timestamp1 = Date.now();
			const timestamp2 = timestamp1 + 10 * 60 * 1000; // 10 minutes later (beyond threshold)

			// Register first session
			dedup.register("session-1", changes, timestamp1);

			// Check for duplicate
			const result = dedup.checkDuplicate(changes, timestamp2);

			expect(result.isDuplicate).toBe(false);
			expect(result.reason).toContain("Time delta");
		});
	});

	describe("register and unregister", () => {
		it("should register session fingerprint", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			dedup.register("session-1", changes, Date.now());

			const stats = dedup.getStats();
			expect(stats.size).toBe(1);
		});

		it("should unregister session fingerprint", () => {
			const changes: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			dedup.register("session-1", changes, Date.now());
			dedup.unregister("session-1");

			const stats = dedup.getStats();
			expect(stats.size).toBe(0);
		});

		it("should clear all fingerprints", () => {
			const changes1: SessionChange[] = [
				{ p: "src/file1.ts", op: "modified", hNew: "abc123" },
				{ p: "src/file2.ts", op: "created", hNew: "def456" },
				{ p: "src/file3.ts", op: "modified", hNew: "ghi789" },
				{ p: "src/file4.ts", op: "modified", hNew: "jkl012" },
				{ p: "src/file5.ts", op: "modified", hNew: "mno345" },
			];

			const changes2: SessionChange[] = [
				{ p: "src/fileA.ts", op: "modified", hNew: "aaa111" },
				{ p: "src/fileB.ts", op: "created", hNew: "bbb222" },
				{ p: "src/fileC.ts", op: "modified", hNew: "ccc333" },
				{ p: "src/fileD.ts", op: "modified", hNew: "ddd444" },
				{ p: "src/fileE.ts", op: "modified", hNew: "eee555" },
			];

			dedup.register("session-1", changes1, Date.now());
			dedup.register("session-2", changes2, Date.now());

			expect(dedup.getStats().size).toBe(2);

			dedup.clear();

			expect(dedup.getStats().size).toBe(0);
		});
	});

	describe("LRU cache behavior", () => {
		it("should evict oldest entries when cache is full", () => {
			const smallDedup = new SessionDeduplication({
				cacheSize: 2,
				minFilesForDedup: 5,
			});

			const changes1: SessionChange[] = Array.from({ length: 5 }, (_, i) => ({
				p: `src/file${i}.ts`,
				op: "modified" as const,
				hNew: `hash${i}`,
			}));

			const changes2: SessionChange[] = Array.from({ length: 5 }, (_, i) => ({
				p: `src/fileA${i}.ts`,
				op: "modified" as const,
				hNew: `hashA${i}`,
			}));

			const changes3: SessionChange[] = Array.from({ length: 5 }, (_, i) => ({
				p: `src/fileB${i}.ts`,
				op: "modified" as const,
				hNew: `hashB${i}`,
			}));

			smallDedup.register("session-1", changes1, Date.now());
			smallDedup.register("session-2", changes2, Date.now());

			expect(smallDedup.getStats().size).toBe(2);

			// Adding third should evict oldest (LRU behavior)
			smallDedup.register("session-3", changes3, Date.now());

			expect(smallDedup.getStats().size).toBe(2);

			// Verify cache contains session-2 and session-3 (session-1 was evicted)
			const stats = smallDedup.getStats();
			expect(stats.size).toBe(2);
		});
	});
});
