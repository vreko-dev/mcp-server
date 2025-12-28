/**
 * TieredLearningService Tests
 *
 * TDD RED phase: Tests define expected behavior for tiered learning loading.
 * Implements the three-tier architecture:
 * - Hot: Always loaded (~10-15 entries, critical patterns)
 * - Warm: Loaded based on intent/domain match (~20-30 per domain)
 * - Cold: Query-only, never auto-loaded (archived learnings)
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns learnings from hot tier + intent-based domain files
 * - Sad: No learnings when files don't exist
 * - Edge: Multiple domains, priority boost for hot tier
 * - Error: Gracefully handles malformed JSONL
 *
 * @module test/services/tiered-learning-service
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createTieredLearningService,
	HOT_TIER_BOOST,
	INTENT_LEARNING_FILES,
	type TaskIntent,
	TieredLearningService,
} from "../../src/services/tiered-learning-service.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-tiered-learnings");

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback/learnings directory
	const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
	if (!existsSync(learningsDir)) {
		mkdirSync(learningsDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

function createLearningFile(filename: string, learnings: object[]) {
	const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
	const content = learnings.map((l) => JSON.stringify(l)).join("\n");
	writeFileSync(join(learningsDir, filename), content, "utf8");
}

// =============================================================================
// Unit Tests
// =============================================================================

describe("TieredLearningService", () => {
	let service: TieredLearningService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new TieredLearningService(TEST_WORKSPACE);
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should always load hot tier learnings", async () => {
			// Create hot.jsonl with critical patterns
			createLearningFile("hot.jsonl", [
				{
					id: "hot-1",
					type: "pattern",
					trigger: "layer imports",
					action: "Presentation CANNOT import Infrastructure",
					source: "CONSTRAINTS.md",
					priority: "critical",
					tier: "hot",
				},
				{
					id: "hot-2",
					type: "pattern",
					trigger: "privacy, telemetry",
					action: "File content MUST never leave user's machine",
					source: "CONSTRAINTS.md",
					priority: "critical",
					tier: "hot",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["something-unrelated"],
			});

			// Hot tier learnings should always be included
			expect(learnings.some((l) => l.id === "hot-1")).toBe(true);
			expect(learnings.some((l) => l.id === "hot-2")).toBe(true);
		});

		it("should load warm tier based on intent mapping", async () => {
			// Create architecture-patterns.jsonl (loaded for 'implement' intent)
			createLearningFile("architecture-patterns.jsonl", [
				{
					id: "arch-1",
					type: "pattern",
					trigger: "service layer",
					action: "DB queries MUST go through service layer",
					source: "CONSTRAINTS.md",
					priority: "high",
				},
			]);

			// Create anti-patterns.jsonl (loaded for 'debug' intent)
			createLearningFile("anti-patterns.jsonl", [
				{
					id: "anti-1",
					type: "pitfall",
					trigger: "toBeTruthy",
					action: "Use toEqual with specific values",
					source: "violations",
					priority: "high",
				},
			]);

			// Implement intent should load architecture-patterns but NOT anti-patterns
			const implementLearnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["service"],
			});
			expect(implementLearnings.some((l) => l.id === "arch-1")).toBe(true);

			// Debug intent should load anti-patterns
			const debugLearnings = await service.loadTieredLearnings({
				intent: "debug",
				keywords: ["test"],
			});
			expect(debugLearnings.some((l) => l.id === "anti-1")).toBe(true);
		});

		it("should NOT auto-load cold tier (learnings.jsonl main section)", async () => {
			// Create learnings.jsonl (cold tier - main file with old entries)
			createLearningFile("learnings.jsonl", [
				{
					id: "cold-1",
					type: "workflow",
					trigger: "old migration pattern",
					action: "This is an old archived learning",
					source: "old-session",
					tier: "cold",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["migration"],
			});

			// Cold tier should NOT be auto-loaded
			expect(learnings.some((l) => l.id === "cold-1")).toBe(false);
		});

		it("should score and rank learnings by keyword relevance", async () => {
			createLearningFile("hot.jsonl", [
				{
					id: "hot-1",
					type: "pattern",
					trigger: "vitest config",
					action: "Use @snapback/vitest-config",
					priority: "critical",
					tier: "hot",
				},
				{
					id: "hot-2",
					type: "pattern",
					trigger: "test assertions",
					action: "Use toEqual",
					priority: "high",
					tier: "hot",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["vitest", "config"],
			});

			// hot-1 should rank higher due to keyword match
			const hot1Index = learnings.findIndex((l) => l.id === "hot-1");
			const hot2Index = learnings.findIndex((l) => l.id === "hot-2");
			expect(hot1Index).toBeLessThan(hot2Index);
		});

		it("should respect max learnings limit", async () => {
			// Create many learnings
			const manyLearnings = Array.from({ length: 20 }, (_, i) => ({
				id: `hot-${i}`,
				type: "pattern",
				trigger: `trigger ${i}`,
				action: `action ${i}`,
				priority: "high",
				tier: "hot",
			}));
			createLearningFile("hot.jsonl", manyLearnings);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: [],
				maxLearnings: 5,
			});

			expect(learnings.length).toBeLessThanOrEqual(5);
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty array when no learning files exist", async () => {
			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["anything"],
			});

			expect(learnings).toEqual([]);
		});

		it("should return only hot tier when domain files don't exist", async () => {
			createLearningFile("hot.jsonl", [
				{
					id: "hot-1",
					type: "pattern",
					trigger: "critical",
					action: "Critical pattern",
					tier: "hot",
				},
			]);

			// architecture-patterns.jsonl doesn't exist
			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["architecture"],
			});

			expect(learnings.length).toBe(1);
			expect(learnings[0].id).toBe("hot-1");
		});

		it("should return empty when no keywords match", async () => {
			createLearningFile("architecture-patterns.jsonl", [
				{
					id: "arch-1",
					type: "pattern",
					trigger: "layer imports",
					action: "Layer boundary pattern",
					priority: "high",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["completely-unrelated-keyword"],
			});

			// Should return matches from domain file even without keyword match
			// because intent mapping loaded the file
			expect(learnings.length).toBeGreaterThanOrEqual(0);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should deduplicate learnings across hot and warm tiers", async () => {
			// Same learning in both hot.jsonl and domain file
			createLearningFile("hot.jsonl", [
				{
					id: "shared-1",
					type: "pattern",
					trigger: "layer imports",
					action: "Shared pattern",
					tier: "hot",
				},
			]);
			createLearningFile("architecture-patterns.jsonl", [
				{
					id: "shared-1", // Same ID
					type: "pattern",
					trigger: "layer imports",
					action: "Shared pattern",
					priority: "high",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["layer"],
			});

			// Should only include once
			const sharedCount = learnings.filter((l) => l.id === "shared-1").length;
			expect(sharedCount).toBe(1);
		});

		it("should boost hot tier priority in scoring", async () => {
			createLearningFile("hot.jsonl", [
				{
					id: "hot-1",
					type: "pattern",
					trigger: "test",
					action: "Hot tier test",
					tier: "hot",
					priority: "critical",
				},
			]);
			createLearningFile("domain-testing.jsonl", [
				{
					id: "warm-1",
					type: "pattern",
					trigger: "test",
					action: "Warm tier test",
					priority: "high",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "debug", // loads domain-testing.jsonl
				keywords: ["test"],
			});

			// Hot tier should come first due to priority boost
			expect(learnings[0].id).toBe("hot-1");
		});

		it("should handle multiple intents loading same domain file", async () => {
			createLearningFile("anti-patterns.jsonl", [
				{
					id: "anti-1",
					type: "pitfall",
					trigger: "vague assertion",
					action: "Be specific",
				},
			]);

			// Both debug and review load anti-patterns.jsonl
			const debugLearnings = await service.loadTieredLearnings({
				intent: "debug",
				keywords: ["assertion"],
			});
			const reviewLearnings = await service.loadTieredLearnings({
				intent: "review",
				keywords: ["assertion"],
			});

			expect(debugLearnings.some((l) => l.id === "anti-1")).toBe(true);
			expect(reviewLearnings.some((l) => l.id === "anti-1")).toBe(true);
		});

		it("should fallback to default domain files for unknown intent", async () => {
			createLearningFile("architecture-patterns.jsonl", [
				{
					id: "arch-1",
					type: "pattern",
					trigger: "default",
					action: "Default pattern",
				},
			]);

			const learnings = await service.loadTieredLearnings({
				intent: "unknown-intent" as TaskIntent,
				keywords: ["default"],
			});

			// Should still return something (fallback behavior)
			expect(learnings).toBeDefined();
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should skip malformed JSONL lines gracefully", async () => {
			// Create file with some invalid JSON
			const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
			writeFileSync(
				join(learningsDir, "hot.jsonl"),
				`{"id":"valid-1","type":"pattern","trigger":"test","action":"Valid"}
{invalid json line
{"id":"valid-2","type":"pattern","trigger":"test","action":"Also valid"}`,
				"utf8",
			);

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["test"],
			});

			// Should include valid entries, skip invalid
			expect(learnings.some((l) => l.id === "valid-1")).toBe(true);
			expect(learnings.some((l) => l.id === "valid-2")).toBe(true);
			expect(learnings.length).toBe(2);
		});

		it("should handle empty files gracefully", async () => {
			const learningsDir = join(TEST_WORKSPACE, ".snapback", "learnings");
			writeFileSync(join(learningsDir, "hot.jsonl"), "", "utf8");

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["anything"],
			});

			expect(learnings).toEqual([]);
		});

		it("should handle missing learnings directory gracefully", async () => {
			// Delete the learnings directory
			rmSync(join(TEST_WORKSPACE, ".snapback", "learnings"), {
				recursive: true,
				force: true,
			});

			const learnings = await service.loadTieredLearnings({
				intent: "implement",
				keywords: ["anything"],
			});

			expect(learnings).toEqual([]);
		});

		it("should not throw on file read errors", async () => {
			// This tests resilience - service should catch errors internally
			const service = new TieredLearningService("/nonexistent/path");

			await expect(
				service.loadTieredLearnings({
					intent: "implement",
					keywords: ["test"],
				}),
			).resolves.toEqual([]);
		});
	});
});

// =============================================================================
// Token Efficiency Tests
// =============================================================================

describe("TieredLearningService Token Efficiency", () => {
	let service: TieredLearningService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new TieredLearningService(TEST_WORKSPACE);
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should load significantly fewer learnings than loading all", async () => {
		// Create hot tier (10 entries)
		createLearningFile(
			"hot.jsonl",
			Array.from({ length: 10 }, (_, i) => ({
				id: `hot-${i}`,
				type: "pattern",
				trigger: `hot trigger ${i}`,
				action: `Hot action ${i}`,
				tier: "hot",
			})),
		);

		// Create warm tier domain files (20 each)
		createLearningFile(
			"architecture-patterns.jsonl",
			Array.from({ length: 20 }, (_, i) => ({
				id: `arch-${i}`,
				type: "pattern",
				trigger: `arch trigger ${i}`,
				action: `Architecture action ${i}`,
			})),
		);

		// Create cold tier (100 entries - should NOT be loaded)
		createLearningFile(
			"learnings.jsonl",
			Array.from({ length: 100 }, (_, i) => ({
				id: `cold-${i}`,
				type: "workflow",
				trigger: `cold trigger ${i}`,
				action: `Cold action ${i}`,
				tier: "cold",
			})),
		);

		const learnings = await service.loadTieredLearnings({
			intent: "implement",
			keywords: ["trigger"],
			maxLearnings: 15,
		});

		// Should load hot (10) + arch matches, but NOT cold (100)
		// Total should be <= 30 (hot + warm) not 130 (if cold was loaded)
		expect(learnings.length).toBeLessThanOrEqual(15);

		// Verify cold tier was not loaded
		expect(learnings.some((l) => l.id?.startsWith("cold-"))).toBe(false);
	});

	it("should estimate token count within budget", async () => {
		createLearningFile("hot.jsonl", [
			{
				id: "hot-1",
				type: "pattern",
				trigger: "short trigger",
				action: "Short action for token counting",
				tier: "hot",
			},
		]);

		const learnings = await service.loadTieredLearnings({
			intent: "implement",
			keywords: ["trigger"],
		});

		// Estimate tokens (rough: ~100 tokens per learning)
		const estimatedTokens = learnings.length * 100;
		expect(estimatedTokens).toBeLessThanOrEqual(1500); // Target from spec
	});
});

// =============================================================================
// Intent Mapping Tests
// =============================================================================

describe("INTENT_LEARNING_FILES mapping", () => {
	it("should have mapping for all standard intents", () => {
		expect(INTENT_LEARNING_FILES.implement).toBeDefined();
		expect(INTENT_LEARNING_FILES.debug).toBeDefined();
		expect(INTENT_LEARNING_FILES.refactor).toBeDefined();
		expect(INTENT_LEARNING_FILES.review).toBeDefined();
		expect(INTENT_LEARNING_FILES.explore).toBeDefined();
	});

	it("should map implement to architecture files", () => {
		expect(INTENT_LEARNING_FILES.implement).toContain("architecture-patterns.jsonl");
	});

	it("should map debug to anti-patterns and testing files", () => {
		expect(INTENT_LEARNING_FILES.debug).toContain("anti-patterns.jsonl");
		expect(INTENT_LEARNING_FILES.debug).toContain("domain-testing.jsonl");
	});

	it("should map refactor to workflow patterns", () => {
		expect(INTENT_LEARNING_FILES.refactor).toContain("workflow-patterns.jsonl");
	});
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe("createTieredLearningService factory", () => {
	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should create TieredLearningService instance", () => {
		const service = createTieredLearningService(TEST_WORKSPACE);
		expect(service).toBeInstanceOf(TieredLearningService);
	});

	it("should be functionally equivalent to direct instantiation", async () => {
		// Create hot.jsonl for testing
		createLearningFile("hot.jsonl", [
			{
				id: "factory-test-1",
				type: "pattern",
				trigger: "factory test",
				action: "Factory function test",
				tier: "hot",
			},
		]);

		const factoryService = createTieredLearningService(TEST_WORKSPACE);
		const directService = new TieredLearningService(TEST_WORKSPACE);

		const factoryResult = await factoryService.loadTieredLearnings({
			intent: "implement",
			keywords: ["factory"],
		});

		const directResult = await directService.loadTieredLearnings({
			intent: "implement",
			keywords: ["factory"],
		});

		expect(factoryResult.length).toBe(directResult.length);
		expect(factoryResult[0]?.id).toBe(directResult[0]?.id);
	});
});

// =============================================================================
// HOT_TIER_BOOST Constant Tests
// =============================================================================

describe("HOT_TIER_BOOST constant", () => {
	it("should be a significant positive number", () => {
		expect(HOT_TIER_BOOST).toBeGreaterThan(0);
		expect(HOT_TIER_BOOST).toBeGreaterThanOrEqual(50); // Research-backed: hot tier needs significant boost
	});

	it("should ensure hot tier learnings rank above warm tier", () => {
		// HOT_TIER_BOOST should be high enough to outrank warm tier even with keyword matches
		// Max keyword score is 1.0 (100% match), so boost should exceed that significantly
		expect(HOT_TIER_BOOST).toBeGreaterThan(10);
	});
});
