/**
 * Tests for Session Summary Generator
 *
 * This test suite validates the platform-agnostic session summary generation
 * functionality that creates human-readable summaries of sessions.
 */

import type { Snapshot } from "@snapback/contracts";
import { describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../../src/core/session/interfaces.js";
import { SessionSummaryGenerator } from "../../../src/core/session/SessionSummaryGenerator.js";
import type { SessionManifest } from "../../../src/core/session/types.js";

describe("SessionSummaryGenerator", () => {
	describe("Metadata-based summaries", () => {
		it("should generate summary for empty session", async () => {
			const generator = new SessionSummaryGenerator();
			const session: SessionManifest = {
				id: "test-session-1",
				startedAt: Date.now() - 10000,
				endedAt: Date.now(),
				reason: "manual",
				files: [],
			};

			const summary = await generator.generateSummary(session);
			expect(summary).toBe("Empty session");
		});

		it("should generate summary for single file session", async () => {
			const generator = new SessionSummaryGenerator();
			const session: SessionManifest = {
				id: "test-session-2",
				startedAt: Date.now() - 30000, // 30 seconds ago
				endedAt: Date.now(),
				reason: "manual",
				files: [
					{
						uri: "file:///test.ts",
						snapshotId: "snap-1",
					},
				],
			};

			const summary = await generator.generateSummary(session);
			expect(summary).toMatch(/Modified 1 file over 30s/);
		});

		it("should generate summary for multi-file session", async () => {
			const generator = new SessionSummaryGenerator();
			const session: SessionManifest = {
				id: "test-session-3",
				startedAt: Date.now() - 120000, // 120 seconds ago
				endedAt: Date.now(),
				reason: "manual",
				files: [
					{ uri: "file:///test1.ts", snapshotId: "snap-1" },
					{ uri: "file:///test2.ts", snapshotId: "snap-2" },
					{ uri: "file:///test3.ts", snapshotId: "snap-3" },
				],
			};

			const summary = await generator.generateSummary(session);
			expect(summary).toMatch(/Modified 3 files over 120s/);
		});

		it("should include AI prefix when AI tags are present", async () => {
			const generator = new SessionSummaryGenerator();
			const session: SessionManifest = {
				id: "test-session-4",
				startedAt: Date.now() - 60000,
				endedAt: Date.now(),
				reason: "manual",
				files: [{ uri: "file:///test.ts", snapshotId: "snap-1" }],
				tags: ["ai-assisted", "refactoring"],
			};

			const summary = await generator.generateSummary(session);
			expect(summary).toMatch(/^\[AI\] Modified 1 file over 60s/);
		});
	});

	describe("Detailed summaries with snapshot provider", () => {
		it("should generate detailed summary with identifiers", async () => {
			const mockSnapshotProvider = {
				async get(id: string): Promise<Snapshot | null> {
					if (id === "snap-1") {
						return {
							id: "snap-1",
							filePath: "test.ts",
							fileContents: {
								"test.ts": `
									class UserService {
										async createUser(name: string) {
											return { name };
										}
									}
								`,
							},
							createdAt: Date.now(),
							hash: "test-hash",
						} as Snapshot;
					}
					return null;
				},
			};

			const generator = new SessionSummaryGenerator({
				snapshotProvider: mockSnapshotProvider,
			});

			const session: SessionManifest = {
				id: "test-session-5",
				startedAt: Date.now() - 45000,
				endedAt: Date.now(),
				reason: "manual",
				files: [{ uri: "file:///test.ts", snapshotId: "snap-1" }],
			};

			const summary = await generator.generateSummary(session);
			expect(summary).toMatch(/Modified 1 file over 45s/);
			expect(summary).toContain("UserService");
			expect(summary).toContain("createUser");
		});

		it("should handle snapshot retrieval errors gracefully", async () => {
			const mockLogger: ILogger = {
				debug: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
			};

			const mockSnapshotProvider = {
				async get(_id: string): Promise<Snapshot | null> {
					throw new Error("Snapshot retrieval failed");
				},
			};

			const generator = new SessionSummaryGenerator({
				snapshotProvider: mockSnapshotProvider,
				logger: mockLogger,
			});

			const session: SessionManifest = {
				id: "test-session-6",
				startedAt: Date.now() - 30000,
				endedAt: Date.now(),
				reason: "manual",
				files: [{ uri: "file:///test.ts", snapshotId: "snap-1" }],
			};

			const summary = await generator.generateSummary(session);
			// Should fallback to metadata summary
			expect(summary).toMatch(/Modified 1 file over 30s/);
		});
	});

	describe("Identifier extraction", () => {
		it("should extract function names", async () => {
			const generator = new SessionSummaryGenerator();
			const content = `
				function calculateTotal(items) {
					return items.reduce((sum, item) => sum + item.price, 0);
				}
			`;

			const identifiers = await generator.extractTopIdentifiers(content, "test.js");
			expect(identifiers).toContain("calculateTotal");
		});

		it("should extract class names", async () => {
			const generator = new SessionSummaryGenerator();
			const content = `
				class ShoppingCart {
					constructor() {
						this.items = [];
					}
				}
			`;

			const identifiers = await generator.extractTopIdentifiers(content, "test.ts");
			expect(identifiers).toContain("ShoppingCart");
		});

		it("should extract const declarations", async () => {
			const generator = new SessionSummaryGenerator();
			const content = `
				const API_ENDPOINT = 'https://api.example.com';
				const MAX_RETRIES = 3;
			`;

			const identifiers = await generator.extractTopIdentifiers(content, "config.ts");
			expect(identifiers).toContain("API_ENDPOINT");
			expect(identifiers).toContain("MAX_RETRIES");
		});

		it("should filter out common keywords", async () => {
			const generator = new SessionSummaryGenerator();
			const content = `
				const foo = 123;
				const bar = "test";
			`;

			const identifiers = await generator.extractTopIdentifiers(content, "test.ts");
			// Should include foo and bar, but not include "const"
			expect(identifiers).toContain("foo");
			expect(identifiers).toContain("bar");
			expect(identifiers).not.toContain("const");
		});

		it("should limit identifiers to top 5", async () => {
			const generator = new SessionSummaryGenerator();
			const content = `
				const var1 = 1;
				const var2 = 2;
				const var3 = 3;
				const var4 = 4;
				const var5 = 5;
				const var6 = 6;
				const var7 = 7;
			`;

			const identifiers = await generator.extractTopIdentifiers(content, "test.ts");
			expect(identifiers.length).toBeLessThanOrEqual(5);
		});
	});

	describe("Common keyword filtering", () => {
		it("should identify common keywords", () => {
			const generator = new SessionSummaryGenerator();
			expect(generator.isCommonKeyword("function")).toBe(true);
			expect(generator.isCommonKeyword("const")).toBe(true);
			expect(generator.isCommonKeyword("class")).toBe(true);
			expect(generator.isCommonKeyword("Promise")).toBe(true);
		});

		it("should allow meaningful identifiers", () => {
			const generator = new SessionSummaryGenerator();
			expect(generator.isCommonKeyword("UserService")).toBe(false);
			expect(generator.isCommonKeyword("calculateTotal")).toBe(false);
			expect(generator.isCommonKeyword("API_ENDPOINT")).toBe(false);
		});
	});
});
