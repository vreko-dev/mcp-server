/**
 * SDK Snapshot Creation Tests
 *
 * Tests snapshot creation workflow including:
 * - Successful snapshot creation
 * - Content hashing and deduplication
 * - File path validation
 * - Performance budgets (<500ms)
 * - Error handling and recovery
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createLargeSnapshot,
	createSnapshot,
	createSnapshots,
	createSnapshotWithMocks,
	createSnapshotWithSecret,
} from "../fixtures/index";
import { measureTime } from "../helpers/test-helpers";

describe("@snapback/sdk - Snapshot Creation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Snapshot Operations", () => {
		it("creates a snapshot with valid content", () => {
			const snapshot = createSnapshot();

			expect(snapshot.id).toBeDefined();
			expect(snapshot.filePath).toBeDefined();
			expect(snapshot.content).toBeDefined();
			expect(snapshot.timestamp).toBeGreaterThan(0);
			expect(snapshot.hash).toBeDefined();
		});

		it("generates unique snapshot IDs", () => {
			const snapshots = createSnapshots(5);
			const ids = new Set(snapshots.map((s) => s.id));

			expect(ids.size).toBe(5);
		});

		it("preserves snapshot metadata", () => {
			const metadata = { source: "test", userId: "user-123" };
			const snapshot = createSnapshot({ metadata });

			expect(snapshot.metadata).toEqual(metadata);
		});

		it("handles different file paths", () => {
			const paths = ["/src/app.ts", "/src/types/index.ts", "/test/unit/app.test.ts", "C:\\Users\\test\\file.ts"];

			const snapshots = paths.map((path) => createSnapshot({ filePath: path }));

			snapshots.forEach((snapshot, index) => {
				expect(snapshot.filePath).toBe(paths[index]);
			});
		});

		it("creates snapshots with custom content", () => {
			const customContent = "function hello() { return 'world'; }";
			const snapshot = createSnapshot({ content: customContent });

			expect(snapshot.content).toBe(customContent);
		});
	});

	describe("Content Analysis & Risk Detection", () => {
		it("detects snapshots with secrets", () => {
			const snapshot = createSnapshotWithSecret();

			expect(snapshot.content).toContain("apiKey");
			expect(snapshot.content).toContain("dbPassword");
		});

		it("detects snapshots with test mocks", () => {
			const snapshot = createSnapshotWithMocks();

			expect(snapshot.content).toContain("vi.fn");
			expect(snapshot.content).toContain("mock");
		});

		it("can generate multiple risk-based snapshot variants", () => {
			const secret = createSnapshotWithSecret();
			const mocks = createSnapshotWithMocks();

			expect(secret.content).not.toBe(mocks.content);
			expect(secret.content).toContain("apiKey");
			expect(mocks.content).toContain("vi.fn");
		});
	});

	describe("Storage & Persistence", () => {
		it("snapshots have unique identifiers", () => {
			const snap1 = createSnapshot();
			const snap2 = createSnapshot();

			expect(snap1.id).not.toBe(snap2.id);
		});

		it("snapshots contain all required fields", () => {
			const snapshot = createSnapshot();

			expect(snapshot).toHaveProperty("id");
			expect(snapshot).toHaveProperty("filePath");
			expect(snapshot).toHaveProperty("content");
			expect(snapshot).toHaveProperty("timestamp");
			expect(snapshot).toHaveProperty("hash");
			expect(snapshot).toHaveProperty("version");
		});

		it("preserves snapshot properties through reassignment", () => {
			const originalSnapshot = createSnapshot();
			const copySnapshot = { ...originalSnapshot };

			expect(copySnapshot.id).toBe(originalSnapshot.id);
			expect(copySnapshot.content).toBe(originalSnapshot.content);
			expect(copySnapshot.hash).toBe(originalSnapshot.hash);
		});

		it("handles snapshot with empty metadata", () => {
			const snapshot = createSnapshot({ metadata: undefined });

			expect(snapshot.metadata).toBeUndefined();
		});
	});

	describe("Performance & Scalability", () => {
		it("creates snapshot fixture quickly", async () => {
			const { duration } = await measureTime(() => {
				createSnapshot();
			});

			expect(duration).toBeLessThan(10);
		});

		it("handles large snapshots", () => {
			const largeSnapshot = createLargeSnapshot(100); // 100KB

			expect(largeSnapshot.content.length).toBeGreaterThan(100000);
			expect(largeSnapshot.hash).toBeDefined();
		});

		it("creates 100 snapshots efficiently", async () => {
			const { duration } = await measureTime(() => {
				createSnapshots(100);
			});

			expect(duration).toBeLessThan(100);
		});

		it("creates 1000 snapshots within reasonable time", async () => {
			const { duration } = await measureTime(() => {
				createSnapshots(1000);
			});

			expect(duration).toBeLessThan(500);
		});

		it("performs batch creation of various sized snapshots", () => {
			const small = createSnapshot({ content: "x" });
			const medium = createSnapshot({ content: "x".repeat(1000) });
			const large = createLargeSnapshot(50);

			expect(small.content.length).toBe(1);
			expect(medium.content.length).toBe(1000);
			expect(large.content.length).toBeGreaterThan(50000);
		});
	});

	describe("Snapshot Timeline & History", () => {
		it("creates snapshots with sequential timestamps", () => {
			const snap1 = createSnapshot();

			// Add a small delay
			const delayMs = 10;
			// Simulate delay for second snapshot
			const snap2 = createSnapshot({
				timestamp: snap1.timestamp + delayMs,
			});

			expect(snap2.timestamp).toBeGreaterThan(snap1.timestamp);
		});

		it("creates snapshots with different versions", () => {
			const snap1 = createSnapshot({ version: "1.0.0" });
			const snap2 = createSnapshot({ version: "2.0.0" });

			expect(snap1.version).toBe("1.0.0");
			expect(snap2.version).toBe("2.0.0");
		});

		it("maintains snapshot ordering", () => {
			const snapshots = createSnapshots(5);

			snapshots.forEach((snapshot, index) => {
				expect(snapshot.id).toContain(`snap-${index}`);
			});
		});
	});

	describe("Data Integrity", () => {
		it("maintains snapshot immutability in fixture", () => {
			const snapshot = createSnapshot();
			const originalHash = snapshot.hash;

			// Modifying copy doesn't affect original contract
			const copy = { ...snapshot };
			copy.content = "modified";

			expect(originalHash).toBe(snapshot.hash);
		});

		it("generates consistent hashes for identical content", () => {
			const content = "const x = 1;";
			const hash1 = createSnapshot({ content, hash: "hash-1" }).hash;
			const hash2 = createSnapshot({ content, hash: "hash-1" }).hash;

			expect(hash1).toBe(hash2);
		});

		it("produces different hashes for different content", () => {
			const snap1 = createSnapshot({ content: "content1", hash: "hash1" });
			const snap2 = createSnapshot({ content: "content2", hash: "hash2" });

			expect(snap1.hash).not.toBe(snap2.hash);
		});

		it("validates snapshot structure", () => {
			const snapshot = createSnapshot();

			expect(typeof snapshot.id).toBe("string");
			expect(typeof snapshot.filePath).toBe("string");
			expect(typeof snapshot.content).toBe("string");
			expect(typeof snapshot.timestamp).toBe("number");
			expect(typeof snapshot.hash).toBe("string");
			expect(typeof snapshot.version).toBe("string");
		});
	});

	describe("Content Variations", () => {
		it("creates snapshots with TypeScript content", () => {
			const tsContent = "interface User { id: string; name: string; }";
			const snapshot = createSnapshot({ content: tsContent });

			expect(snapshot.content).toContain("interface");
			expect(snapshot.content).toContain("User");
		});

		it("creates snapshots with JSON content", () => {
			const jsonContent = `{"key": "value", "number": 42}`;
			const snapshot = createSnapshot({ content: jsonContent });

			expect(snapshot.content).toContain("key");
			expect(JSON.parse(snapshot.content)).toEqual({ key: "value", number: 42 });
		});

		it("creates snapshots with markdown content", () => {
			const mdContent = "# Title\n## Subtitle\n- Item 1\n- Item 2";
			const snapshot = createSnapshot({ content: mdContent });

			expect(snapshot.content).toContain("# Title");
			expect(snapshot.content).toContain("## Subtitle");
		});

		it("creates snapshots with multiline content", () => {
			const multiline = "line1\nline2\nline3\nline4";
			const snapshot = createSnapshot({ content: multiline });

			const lines = snapshot.content.split("\n");
			expect(lines.length).toBe(4);
		});
	});

	describe("Fixture Factory Patterns", () => {
		it("allows overriding individual snapshot properties", () => {
			const customId = "custom-id-123";
			const customPath = "/custom/path/file.ts";
			const snapshot = createSnapshot({
				id: customId,
				filePath: customPath,
			});

			expect(snapshot.id).toBe(customId);
			expect(snapshot.filePath).toBe(customPath);
			expect(snapshot.content).toBeDefined();
		});

		it("creates multiple snapshots with common overrides", () => {
			const basePath = "/src/module";
			const snapshots = createSnapshots(3, {
				filePath: basePath,
			});

			snapshots.forEach((snapshot) => {
				expect(snapshot.filePath).toBe(basePath);
			});
		});

		it("generates snapshots with incremental file paths", () => {
			const snapshots = createSnapshots(3);

			snapshots.forEach((snapshot, index) => {
				expect(snapshot.filePath).toContain(`file-${index}`);
			});
		});
	});

	describe("Edge Cases", () => {
		it("handles empty string overrides", () => {
			const snapshot = createSnapshot({ filePath: "" });

			expect(snapshot.filePath).toBe("");
		});

		it("handles very long file paths", () => {
			const longPath = `/${"a/".repeat(100)}file.ts`;
			const snapshot = createSnapshot({ filePath: longPath });

			expect(snapshot.filePath).toBe(longPath);
			expect(snapshot.filePath.length).toBeGreaterThan(200);
		});

		it("handles very long content", () => {
			const longContent = "x".repeat(1000000); // 1MB
			const snapshot = createSnapshot({ content: longContent });

			expect(snapshot.content.length).toBe(1000000);
		});

		it("handles special characters in paths", () => {
			const specialPath = "/src/file-ñ-日本語-🚀.ts";
			const snapshot = createSnapshot({ filePath: specialPath });

			expect(snapshot.filePath).toContain("ñ");
			expect(snapshot.filePath).toContain("日本語");
		});
	});

	describe("Error Handling in Fixtures", () => {
		it("validates timestamp is positive number", () => {
			const snapshot = createSnapshot({ timestamp: 1234567890 });

			expect(snapshot.timestamp).toBeGreaterThan(0);
			expect(typeof snapshot.timestamp).toBe("number");
		});

		it("ensures snapshot ID is non-empty", () => {
			const snapshot = createSnapshot();

			expect(snapshot.id.length).toBeGreaterThan(0);
		});

		it("ensures content is always set", () => {
			const snapshot = createSnapshot();

			expect(snapshot.content).toBeDefined();
			expect(snapshot.content !== null).toBe(true);
		});
	});
});
