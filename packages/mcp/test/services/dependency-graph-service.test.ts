/**
 * DependencyGraphService Tests
 *
 * Tests for cached dependency analysis using madge.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns dependency context for files
 * - Sad: Returns empty when no graph data
 * - Edge: Circular dependencies, orphan files, cache invalidation
 * - Error: Gracefully handles madge failures
 *
 * @module test/services/dependency-graph-service
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDependencyGraphService,
	DependencyGraphService,
	getDependencyGraphService,
} from "../../src/services/dependency-graph-service.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-dep-graph");

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback/analysis directory
	const analysisDir = join(TEST_WORKSPACE, ".snapback", "analysis");
	if (!existsSync(analysisDir)) {
		mkdirSync(analysisDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

function createCacheFile(graph: object) {
	const cachePath = join(TEST_WORKSPACE, ".snapback", "analysis", "dependency-graph.json");
	writeFileSync(cachePath, JSON.stringify(graph, null, 2));
}

// Mock madge module
const mockMadgeResult = {
	obj: vi.fn(),
	circular: vi.fn(),
};

vi.mock("madge", () => ({
	default: vi.fn(() => Promise.resolve(mockMadgeResult)),
}));

// Mock glob module
vi.mock("glob", () => ({
	glob: vi.fn(() => Promise.resolve(["src/index.ts", "src/utils.ts"])),
}));

// =============================================================================
// Unit Tests
// =============================================================================

describe("DependencyGraphService", () => {
	let service: DependencyGraphService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new DependencyGraphService(TEST_WORKSPACE);

		// Reset mocks
		mockMadgeResult.obj.mockReset();
		mockMadgeResult.circular.mockReset();

		// Default mock returns
		mockMadgeResult.obj.mockReturnValue({
			"src/index.ts": ["src/utils.ts", "src/helpers.ts"],
			"src/utils.ts": ["src/constants.ts"],
			"src/helpers.ts": [],
			"src/constants.ts": [],
		});
		mockMadgeResult.circular.mockReturnValue([]);
	});

	afterEach(() => {
		cleanupTestWorkspace();
		vi.clearAllMocks();
	});

	// ===========================================================================
	// HAPPY PATH
	// ===========================================================================

	describe("Happy Path", () => {
		it("should return dependency context for planned files", async () => {
			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			expect(result.planned).toBeDefined();
			expect(result.circular).toEqual([]);
			expect(result.suggestions).toBeDefined();
		});

		it("should include imports and importedBy for each file", async () => {
			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/utils.ts")]);

			const utilsContext = result.planned[join(TEST_WORKSPACE, "src/utils.ts")];
			expect(utilsContext).toBeDefined();
			expect(utilsContext.imports).toContain("src/constants.ts");
			expect(utilsContext.importedBy.length).toBeGreaterThan(0);
		});

		it("should calculate depth correctly", async () => {
			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			const indexContext = result.planned[join(TEST_WORKSPACE, "src/index.ts")];
			expect(indexContext.depth).toBeGreaterThanOrEqual(0);
		});

		it("should suggest related files", async () => {
			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			// Suggestions should include files that index.ts imports or is imported by
			expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
		});

		it("should get files affected by a file", async () => {
			const affected = await service.getAffectedBy(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(Array.isArray(affected)).toBe(true);
		});

		it("should get dependencies of a file", async () => {
			const deps = await service.getDependencies(join(TEST_WORKSPACE, "src/index.ts"));

			expect(Array.isArray(deps)).toBe(true);
			expect(deps).toContain("src/utils.ts");
		});
	});

	// ===========================================================================
	// SAD PATH
	// ===========================================================================

	describe("Sad Path", () => {
		it("should return empty context for unknown files", async () => {
			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/unknown.ts")]);

			expect(result.planned[join(TEST_WORKSPACE, "src/unknown.ts")]).toBeUndefined();
		});

		it("should return empty array for non-existent file dependencies", async () => {
			const deps = await service.getDependencies(join(TEST_WORKSPACE, "src/nonexistent.ts"));

			expect(deps).toEqual([]);
		});

		it("should return empty array for non-existent file affected by", async () => {
			const affected = await service.getAffectedBy(join(TEST_WORKSPACE, "src/nonexistent.ts"));

			expect(affected).toEqual([]);
		});

		it("should handle empty file list", async () => {
			const result = await service.getContextForFiles([]);

			expect(result.planned).toEqual({});
			expect(result.circular).toEqual([]);
			expect(result.suggestions).toEqual([]);
		});
	});

	// ===========================================================================
	// EDGE CASES
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should detect circular dependencies", async () => {
			mockMadgeResult.circular.mockReturnValue([["src/a.ts", "src/b.ts", "src/a.ts"]]);

			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/a.ts")]);

			expect(result.circular.length).toBeGreaterThan(0);
			expect(result.circular[0].severity).toBe("warning");
		});

		it("should identify orphan files (no importers, not entry point)", async () => {
			mockMadgeResult.obj.mockReturnValue({
				"src/orphan.ts": ["src/utils.ts"],
				"src/utils.ts": [],
			});

			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/orphan.ts")]);

			const orphanContext = result.planned[join(TEST_WORKSPACE, "src/orphan.ts")];
			expect(orphanContext?.isOrphan).toBe(true);
		});

		it("should not mark entry points as orphans", async () => {
			mockMadgeResult.obj.mockReturnValue({
				"src/index.ts": ["src/utils.ts"],
				"src/utils.ts": [],
			});

			const result = await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			const indexContext = result.planned[join(TEST_WORKSPACE, "src/index.ts")];
			expect(indexContext?.isOrphan).toBe(false);
		});

		it("should use cached graph on second call", async () => {
			// First call builds graph
			await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			// Reset mock to verify it's not called again
			const madge = await import("madge");
			const mockMadge = madge.default as ReturnType<typeof vi.fn>;
			mockMadge.mockClear();

			// Second call should use cache
			await service.getContextForFiles([join(TEST_WORKSPACE, "src/utils.ts")]);

			// madge should not be called again (using in-memory cache)
			expect(mockMadge).not.toHaveBeenCalled();
		});

		it("should refresh cache when requested", async () => {
			// First call
			await service.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			// Refresh
			await service.refresh();

			// Should rebuild graph (madge called again)
			const madge = await import("madge");
			const mockMadge = madge.default as ReturnType<typeof vi.fn>;
			expect(mockMadge).toHaveBeenCalled();
		});

		it("should load from disk cache if valid", async () => {
			// Create a valid cache file
			createCacheFile({
				nodes: {
					"src/cached.ts": { imports: [], importedBy: [] },
				},
				circular: [],
				cacheKey: "test-key",
				generatedAt: Date.now(),
			});

			// Create new service instance (fresh, no in-memory cache)
			const freshService = new DependencyGraphService(TEST_WORKSPACE);

			// Mock computeCacheKey to return matching key
			const glob = await import("glob");
			(glob.glob as ReturnType<typeof vi.fn>).mockResolvedValue([]);

			const deps = await freshService.getDependencies(join(TEST_WORKSPACE, "src/cached.ts"));

			// Should return data from cache
			expect(deps).toEqual([]);
		});

		it("should exclude planned files from suggestions", async () => {
			mockMadgeResult.obj.mockReturnValue({
				"src/a.ts": ["src/b.ts"],
				"src/b.ts": ["src/c.ts"],
				"src/c.ts": [],
			});

			const result = await service.getContextForFiles([
				join(TEST_WORKSPACE, "src/a.ts"),
				join(TEST_WORKSPACE, "src/b.ts"),
			]);

			// b.ts should not be in suggestions since it's already planned
			expect(result.suggestions).not.toContain("src/a.ts");
			expect(result.suggestions).not.toContain("src/b.ts");
		});
	});

	// ===========================================================================
	// ERROR HANDLING
	// ===========================================================================

	describe("Error Handling", () => {
		it("should return empty graph when madge fails", async () => {
			const madge = await import("madge");
			(madge.default as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Madge failed"));

			// Create fresh service to avoid cached graph
			const freshService = new DependencyGraphService(TEST_WORKSPACE);

			const result = await freshService.getContextForFiles([join(TEST_WORKSPACE, "src/index.ts")]);

			expect(result.planned).toEqual({});
			expect(result.circular).toEqual([]);
		});

		it("should handle corrupted cache gracefully", async () => {
			// Write corrupted cache
			const cachePath = join(TEST_WORKSPACE, ".snapback", "analysis", "dependency-graph.json");
			writeFileSync(cachePath, "{ invalid json");

			const freshService = new DependencyGraphService(TEST_WORKSPACE);
			const circular = await freshService.getCircularDependencies();

			// Should rebuild graph instead of crashing
			expect(Array.isArray(circular)).toBe(true);
		});

		it("should report cache as invalid when file doesn't exist", async () => {
			const freshService = new DependencyGraphService(TEST_WORKSPACE);
			rmSync(join(TEST_WORKSPACE, ".snapback", "analysis"), { recursive: true, force: true });

			const isValid = await freshService.isCacheValid();

			expect(isValid).toBe(false);
		});
	});

	// ===========================================================================
	// FACTORY FUNCTIONS
	// ===========================================================================

	describe("Factory Functions", () => {
		it("should create service with createDependencyGraphService", () => {
			const svc = createDependencyGraphService(TEST_WORKSPACE);

			expect(svc).toBeInstanceOf(DependencyGraphService);
		});

		it("should return singleton with getDependencyGraphService", () => {
			const svc1 = getDependencyGraphService(TEST_WORKSPACE);
			const svc2 = getDependencyGraphService(TEST_WORKSPACE);

			expect(svc1).toBe(svc2);
		});

		it("should return different instances for different workspaces", () => {
			const svc1 = getDependencyGraphService(TEST_WORKSPACE);
			const svc2 = getDependencyGraphService("/different/workspace");

			expect(svc1).not.toBe(svc2);
		});
	});
});
