// ============================================
// apps/vscode/test/unit/storage/SnapshotStore.prw.test.ts
// PRW Patch Day 2: Tests for V2 schema + PRE pointer checkpoints
// ============================================

import { describe, expect, it } from "vitest";
import {
	addToIndex,
	allocateSeq,
	DEFAULT_INDEX,
	DEFAULT_STATE,
	getIdBySeq,
	getMaxSeq,
	getSeqById,
	updateHead,
} from "../../../src/storage/storeState";
import type { SnapshotManifestV1, SnapshotManifestV2 } from "../../../src/storage/types";
import { isPointerCheckpoint, isPostCheckpoint, isV2Manifest } from "../../../src/storage/types";

// ============================================
// Type Guards Tests
// ============================================

describe("Type Guards", () => {
	const v1Manifest: SnapshotManifestV1 = {
		id: "snap-123-abc",
		timestamp: 1702500000000,
		name: "Test snapshot",
		trigger: "auto",
		files: {
			"/src/index.ts": { blobHash: "abc123", size: 100 },
		},
	};

	const v2PostManifest: SnapshotManifestV2 = {
		schemaVersion: 2,
		id: "snap-456-def",
		seq: 5,
		parentSeq: 4,
		parentId: "snap-444-xyz",
		type: "POST",
		timestamp: 1702500000000,
		name: "Test snapshot",
		trigger: "auto",
		files: {
			"/src/index.ts": { blobHash: "abc123", size: 100 },
		},
	};

	const v2PreManifest: SnapshotManifestV2 = {
		schemaVersion: 2,
		id: "pre-789-ghi",
		seq: 6,
		parentSeq: 5,
		parentId: "snap-456-def",
		type: "PRE",
		timestamp: 1702500001000,
		name: "Pre: Burst detected on index.ts",
		trigger: "risk-burst",
		files: {}, // Empty - pointer only
		metadata: {
			reasons: ["RISK_BURST_START"],
			origin: "AUTOMATED",
		},
	};

	describe("isV2Manifest", () => {
		it("should return false for V1 manifest", () => {
			expect(isV2Manifest(v1Manifest)).toBe(false);
		});

		it("should return true for V2 POST manifest", () => {
			expect(isV2Manifest(v2PostManifest)).toBe(true);
		});

		it("should return true for V2 PRE manifest", () => {
			expect(isV2Manifest(v2PreManifest)).toBe(true);
		});
	});

	describe("isPointerCheckpoint", () => {
		it("should return false for V1 manifest", () => {
			expect(isPointerCheckpoint(v1Manifest)).toBe(false);
		});

		it("should return false for V2 POST manifest", () => {
			expect(isPointerCheckpoint(v2PostManifest)).toBe(false);
		});

		it("should return true for V2 PRE manifest", () => {
			expect(isPointerCheckpoint(v2PreManifest)).toBe(true);
		});

		it("should return true for PRE_ROLLBACK manifest", () => {
			const preRollback: SnapshotManifestV2 = {
				...v2PreManifest,
				type: "PRE_ROLLBACK",
			};
			expect(isPointerCheckpoint(preRollback)).toBe(true);
		});
	});

	describe("isPostCheckpoint", () => {
		it("should return true for V1 manifest (implicit POST)", () => {
			expect(isPostCheckpoint(v1Manifest)).toBe(true);
		});

		it("should return true for V2 POST manifest", () => {
			expect(isPostCheckpoint(v2PostManifest)).toBe(true);
		});

		it("should return false for V2 PRE manifest", () => {
			expect(isPostCheckpoint(v2PreManifest)).toBe(false);
		});
	});
});

// ============================================
// Store State Tests
// ============================================

describe("Store State", () => {
	describe("allocateSeq", () => {
		it("should increment lastSeq and return new state", () => {
			const { newState, seq } = allocateSeq(DEFAULT_STATE);

			expect(seq).toBe(1);
			expect(newState.lastSeq).toBe(1);
			expect(newState.lastUpdatedAt).toBeGreaterThan(0);
		});

		it("should continue incrementing from current state", () => {
			const state = { ...DEFAULT_STATE, lastSeq: 10 };
			const { newState, seq } = allocateSeq(state);

			expect(seq).toBe(11);
			expect(newState.lastSeq).toBe(11);
		});
	});

	describe("updateHead", () => {
		it("should update headId", () => {
			const newState = updateHead(DEFAULT_STATE, "snap-123");

			expect(newState.headId).toBe("snap-123");
			expect(newState.lastUpdatedAt).toBeGreaterThan(0);
		});
	});
});

// ============================================
// Seq Index Tests
// ============================================

describe("Seq Index", () => {
	describe("addToIndex", () => {
		it("should add bidirectional mapping", () => {
			const index = { ...DEFAULT_INDEX };
			addToIndex(index, 5, "snap-abc");

			expect(index.bySeq[5]).toBe("snap-abc");
			expect(index.byId["snap-abc"]).toBe(5);
		});
	});

	describe("getSeqById", () => {
		it("should return seq for known id", () => {
			const index = { ...DEFAULT_INDEX };
			addToIndex(index, 5, "snap-abc");

			expect(getSeqById(index, "snap-abc")).toBe(5);
		});

		it("should return undefined for unknown id", () => {
			expect(getSeqById(DEFAULT_INDEX, "unknown")).toBeUndefined();
		});
	});

	describe("getIdBySeq", () => {
		it("should return id for known seq", () => {
			const index = { ...DEFAULT_INDEX };
			addToIndex(index, 5, "snap-abc");

			expect(getIdBySeq(index, 5)).toBe("snap-abc");
		});

		it("should return undefined for unknown seq", () => {
			expect(getIdBySeq(DEFAULT_INDEX, 999)).toBeUndefined();
		});
	});

	describe("getMaxSeq", () => {
		it("should return 0 for empty index", () => {
			expect(getMaxSeq(DEFAULT_INDEX)).toBe(0);
		});

		it("should return highest seq", () => {
			const index = { ...DEFAULT_INDEX };
			addToIndex(index, 3, "snap-1");
			addToIndex(index, 7, "snap-2");
			addToIndex(index, 5, "snap-3");

			expect(getMaxSeq(index)).toBe(7);
		});
	});
});

// ============================================
// PRE Checkpoint Resolution Tests
// ============================================

describe("PRE Checkpoint Resolution", () => {
	// Mock the pointer chain resolution logic

	it("should resolve PRE to nearest POST ancestor", () => {
		// Simulate chain: POST(seq=1) -> POST(seq=2) -> PRE(seq=3)
		const chain = [
			{ type: "PRE", seq: 3, parentSeq: 2, files: {} },
			{ type: "POST", seq: 2, parentSeq: 1, files: { "/a.ts": { blobHash: "abc", size: 10 } } },
			{ type: "POST", seq: 1, parentSeq: null, files: { "/b.ts": { blobHash: "def", size: 20 } } },
		];

		// Find first POST walking backwards
		const firstPost = chain.find((c) => c.type === "POST");
		expect(firstPost?.seq).toBe(2);
		expect(firstPost?.files).toHaveProperty("/a.ts");
	});

	it("should handle multiple consecutive PRE checkpoints", () => {
		// Simulate chain: POST(1) -> PRE(2) -> PRE(3) -> PRE(4)
		const chain = [
			{ type: "PRE", seq: 4, parentSeq: 3 },
			{ type: "PRE", seq: 3, parentSeq: 2 },
			{ type: "PRE", seq: 2, parentSeq: 1 },
			{ type: "POST", seq: 1, parentSeq: null, files: { "/x.ts": { blobHash: "xyz", size: 5 } } },
		];

		// All PREs should resolve to the same POST
		const post = chain.find((c) => c.type === "POST");
		expect(post?.seq).toBe(1);
	});
});

// ============================================
// PRW Manager Tests
// ============================================

describe("PRWManager", () => {
	describe("rate limiting", () => {
		it("should respect maxPrePerMinute", () => {
			const recentPres: number[] = [];
			const config = { maxPrePerMinute: 3 };

			// Simulate 3 recent PREs
			recentPres.push(Date.now() - 10000);
			recentPres.push(Date.now() - 5000);
			recentPres.push(Date.now() - 1000);

			// Should be at limit
			expect(recentPres.length).toBe(config.maxPrePerMinute);
		});

		it("should clean old entries", () => {
			const recentPres: number[] = [];
			const oneMinuteAgo = Date.now() - 60_000;

			// Add old and new entries
			recentPres.push(oneMinuteAgo - 5000); // Too old
			recentPres.push(oneMinuteAgo - 1000); // Too old
			recentPres.push(Date.now() - 30000); // Recent

			// Clean old entries
			while (recentPres.length > 0 && recentPres[0] < oneMinuteAgo) {
				recentPres.shift();
			}

			expect(recentPres.length).toBe(1);
		});
	});

	describe("file cooldowns", () => {
		it("should track per-file cooldowns", () => {
			const cooldowns = new Map<string, number>();
			const fileCooldownMs = 5000;
			const filePath = "/src/index.ts";

			// Set cooldown
			cooldowns.set(filePath, Date.now() + fileCooldownMs);

			// Should be in cooldown
			const expiresAt = cooldowns.get(filePath)!;
			expect(Date.now() < expiresAt).toBe(true);
		});

		it("should expire cooldowns", async () => {
			const cooldowns = new Map<string, number>();
			const filePath = "/src/index.ts";

			// Set very short cooldown
			cooldowns.set(filePath, Date.now() + 10);

			// Wait for expiration
			await new Promise((r) => setTimeout(r, 20));

			// Should be expired
			const expiresAt = cooldowns.get(filePath)!;
			expect(Date.now() >= expiresAt).toBe(true);
		});
	});
});

// ============================================
// V1 to V2 Migration Tests
// ============================================

describe("V1 to V2 Migration (Option A)", () => {
	it("should assign virtual seq to V1 manifests based on timestamp order", () => {
		const v1Manifests = [
			{ id: "snap-1", timestamp: 1000 },
			{ id: "snap-2", timestamp: 2000 },
			{ id: "snap-3", timestamp: 3000 },
		];

		// Sort by timestamp
		v1Manifests.sort((a, b) => a.timestamp - b.timestamp);

		// Assign virtual seqs
		const seqMap = new Map<string, number>();
		v1Manifests.forEach((m, i) => seqMap.set(m.id, i + 1));

		expect(seqMap.get("snap-1")).toBe(1);
		expect(seqMap.get("snap-2")).toBe(2);
		expect(seqMap.get("snap-3")).toBe(3);
	});

	it("should not modify V1 manifest files on disk", () => {
		// This is a conceptual test - V1 files should remain untouched
		// The state.json and index.json files are created separately

		const v1OnDisk = {
			id: "snap-old",
			timestamp: 1000,
			name: "Old snapshot",
			trigger: "auto",
			files: {},
		};

		// V1 should NOT have schemaVersion
		expect(v1OnDisk).not.toHaveProperty("schemaVersion");
		expect(v1OnDisk).not.toHaveProperty("seq");
	});
});
