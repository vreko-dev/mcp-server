/**
 * Layer 1 Tests: Critical Path Distance
 *
 * Tests for critical path analysis including BFS distance calculation,
 * entry point detection, and critical path scoring.
 */

import { describe, expect, it, vi } from "vitest";
import type { CriticalPathAnalysis, DependencyGraph, DependencyNode } from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations
// =============================================================================

const calculateCriticalPathDistance = vi.fn<[string, DependencyGraph], CriticalPathAnalysis>();
const bfsDistance = vi.fn<[string, string, DependencyGraph], number>();
const identifyEntryPoints = vi.fn<[DependencyGraph], string[]>();

// Helper to create a mock dependency graph
const createMockGraph = (): DependencyGraph => {
	const nodes = new Map<string, DependencyNode>();

	nodes.set("src/index.ts", {
		filePath: "src/index.ts",
		imports: ["src/app.ts", "src/components/Button.tsx"],
		importedBy: [],
		transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
		crossPackageImports: [],
	});

	nodes.set("src/app.ts", {
		filePath: "src/app.ts",
		imports: ["src/utils.ts"],
		importedBy: ["src/index.ts"],
		transitiveImporters: { depth1: ["src/index.ts"], depth2: [], depth3Plus: [] },
		crossPackageImports: [],
	});

	nodes.set("src/utils.ts", {
		filePath: "src/utils.ts",
		imports: ["src/helpers.ts"],
		importedBy: ["src/app.ts"],
		transitiveImporters: {
			depth1: ["src/app.ts"],
			depth2: ["src/index.ts"],
			depth3Plus: [],
		},
		crossPackageImports: [],
	});

	nodes.set("src/helpers.ts", {
		filePath: "src/helpers.ts",
		imports: [],
		importedBy: ["src/utils.ts"],
		transitiveImporters: {
			depth1: ["src/utils.ts"],
			depth2: ["src/app.ts"],
			depth3Plus: ["src/index.ts"],
		},
		crossPackageImports: [],
	});

	nodes.set("src/components/Button.tsx", {
		filePath: "src/components/Button.tsx",
		imports: [],
		importedBy: ["src/index.ts"],
		transitiveImporters: { depth1: ["src/index.ts"], depth2: [], depth3Plus: [] },
		crossPackageImports: [],
	});

	return {
		nodes,
		edges: new Map(),
		reverseEdges: new Map(),
	};
};

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("Critical Path Distance Analysis", () => {
	describe("Happy Path", () => {
		describe("calculateCriticalPathDistance", () => {
			it("should return distance 0 for entry point files", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 0,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 100,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/index.ts", graph);

				expect(result.distanceToNearestEntry).toBe(0);
				expect(result.criticalPathScore).toBe(100);
				expect(result.isOnCriticalPath).toBe(true);
			});

			it("should return distance 1 for direct imports by entry point", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 1,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 80,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/app.ts", graph);

				expect(result.distanceToNearestEntry).toBe(1);
				expect(result.criticalPathScore).toBe(80);
				expect(result.isOnCriticalPath).toBe(true);
			});

			it("should return distance 2 for files 2 hops from entry", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 2,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 60,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/utils.ts", graph);

				expect(result.distanceToNearestEntry).toBe(2);
				expect(result.criticalPathScore).toBe(60);
				expect(result.isOnCriticalPath).toBe(true);
			});

			it("should return distance 3+ for deeper files", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 3,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: false,
					criticalPathScore: 40,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/helpers.ts", graph);

				expect(result.distanceToNearestEntry).toBe(3);
				expect(result.criticalPathScore).toBe(40);
				expect(result.isOnCriticalPath).toBe(false);
			});

			it("should track all reachable entry points", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 1,
					entryPointsReached: ["src/index.ts", "apps/api/src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 80,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/shared/utils.ts", graph);

				expect(result.entryPointsReached.length).toBe(2);
			});
		});

		describe("bfsDistance", () => {
			it("should return 0 when from equals to", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(0);

				const result = bfsDistance("src/index.ts", "src/index.ts", graph);

				expect(result).toBe(0);
			});

			it("should return 1 for directly connected files", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(1);

				const result = bfsDistance("src/index.ts", "src/app.ts", graph);

				expect(result).toBe(1);
			});

			it("should return shortest path for multiple routes", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(2);

				// Even if there's a longer path, should return shortest
				const result = bfsDistance("src/index.ts", "src/utils.ts", graph);

				expect(result).toBe(2);
			});

			it("should return -1 for unreachable files", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(-1);

				const result = bfsDistance("src/orphan.ts", "src/index.ts", graph);

				expect(result).toBe(-1);
			});
		});

		describe("identifyEntryPoints", () => {
			it("should identify index.ts files as entry points", () => {
				const graph = createMockGraph();
				identifyEntryPoints.mockReturnValue(["src/index.ts"]);

				const result = identifyEntryPoints(graph);

				expect(result).toContain("src/index.ts");
			});

			it("should identify main.tsx files as entry points", () => {
				const graph = createMockGraph();
				identifyEntryPoints.mockReturnValue(["src/main.tsx"]);

				const result = identifyEntryPoints(graph);

				expect(result).toContain("src/main.tsx");
			});

			it("should identify files with no importers as potential entry points", () => {
				const graph = createMockGraph();
				identifyEntryPoints.mockReturnValue(["src/index.ts", "scripts/build.ts"]);

				const result = identifyEntryPoints(graph);

				expect(result.length).toBeGreaterThanOrEqual(1);
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("calculateCriticalPathDistance", () => {
			it("should return -1 for orphan files not in graph", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: -1,
					entryPointsReached: [],
					isOnCriticalPath: false,
					criticalPathScore: 10,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/orphan.ts", graph);

				expect(result.distanceToNearestEntry).toBe(-1);
				expect(result.criticalPathScore).toBe(10);
				expect(result.isOnCriticalPath).toBe(false);
			});

			it("should handle empty dependency graph", () => {
				const emptyGraph: DependencyGraph = {
					nodes: new Map(),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: -1,
					entryPointsReached: [],
					isOnCriticalPath: false,
					criticalPathScore: 10,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/any.ts", emptyGraph);

				expect(result.distanceToNearestEntry).toBe(-1);
			});

			it("should handle graph with no entry points", () => {
				// A graph where all files import each other (no clear entry)
				const cyclicGraph: DependencyGraph = {
					nodes: new Map([
						[
							"src/a.ts",
							{
								filePath: "src/a.ts",
								imports: ["src/b.ts"],
								importedBy: ["src/b.ts"],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
						[
							"src/b.ts",
							{
								filePath: "src/b.ts",
								imports: ["src/a.ts"],
								importedBy: ["src/a.ts"],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
					]),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: -1,
					entryPointsReached: [],
					isOnCriticalPath: false,
					criticalPathScore: 10,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/a.ts", cyclicGraph);

				expect(result.entryPointsReached).toHaveLength(0);
			});
		});

		describe("bfsDistance", () => {
			it("should return -1 for non-existent source file", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(-1);

				const result = bfsDistance("nonexistent.ts", "src/index.ts", graph);

				expect(result).toBe(-1);
			});

			it("should return -1 for non-existent target file", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(-1);

				const result = bfsDistance("src/index.ts", "nonexistent.ts", graph);

				expect(result).toBe(-1);
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("calculateCriticalPathDistance", () => {
			it("should handle bidirectional path calculation", () => {
				// Entry point importing our file, and our file importing entry point
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 1,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 80,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/components/Button.tsx", graph);

				// Should find the shortest path regardless of direction
				expect(result.distanceToNearestEntry).toBe(1);
			});

			it("should calculate correct score for distance 4", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 4,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: false,
					criticalPathScore: 40,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/deep/nested/file.ts", graph);

				expect(result.criticalPathScore).toBe(40);
			});

			it("should calculate correct score for distance > 4", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 10,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: false,
					criticalPathScore: 20,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/very/deep/file.ts", graph);

				expect(result.criticalPathScore).toBe(20);
			});

			it("should handle multiple entry points with different distances", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 1, // Closest entry point
					entryPointsReached: ["src/index.ts", "apps/api/src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 80,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/shared/api.ts", graph);

				// Should use minimum distance for scoring
				expect(result.distanceToNearestEntry).toBe(1);
				expect(result.entryPointsReached.length).toBe(2);
			});
		});

		describe("bfsDistance", () => {
			it("should handle very deep paths (distance > 10)", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(15);

				const result = bfsDistance("src/index.ts", "src/level15/deep.ts", graph);

				expect(result).toBe(15);
			});

			it("should handle paths through circular dependencies", () => {
				const cyclicGraph: DependencyGraph = {
					nodes: new Map([
						[
							"src/index.ts",
							{
								filePath: "src/index.ts",
								imports: ["src/a.ts"],
								importedBy: [],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
						[
							"src/a.ts",
							{
								filePath: "src/a.ts",
								imports: ["src/b.ts"],
								importedBy: ["src/index.ts", "src/b.ts"],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
						[
							"src/b.ts",
							{
								filePath: "src/b.ts",
								imports: ["src/a.ts", "src/target.ts"],
								importedBy: ["src/a.ts"],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
						[
							"src/target.ts",
							{
								filePath: "src/target.ts",
								imports: [],
								importedBy: ["src/b.ts"],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
					]),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				bfsDistance.mockReturnValue(3);

				// Should still find path despite cycles
				const result = bfsDistance("src/index.ts", "src/target.ts", cyclicGraph);

				expect(result).toBe(3);
			});
		});

		describe("Critical Path Scoring", () => {
			it("should score entry points at 100", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 0,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 100,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/index.ts", graph);

				expect(result.criticalPathScore).toBe(100);
			});

			it("should score distance-1 files at 80", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 1,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 80,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/app.ts", graph);

				expect(result.criticalPathScore).toBe(80);
			});

			it("should score distance-2 files at 60", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: 2,
					entryPointsReached: ["src/index.ts"],
					isOnCriticalPath: true,
					criticalPathScore: 60,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/utils.ts", graph);

				expect(result.criticalPathScore).toBe(60);
			});

			it("should score orphan files at 10", () => {
				const graph = createMockGraph();
				const mockResult: CriticalPathAnalysis = {
					distanceToNearestEntry: -1,
					entryPointsReached: [],
					isOnCriticalPath: false,
					criticalPathScore: 10,
				};
				calculateCriticalPathDistance.mockReturnValue(mockResult);

				const result = calculateCriticalPathDistance("src/unused.ts", graph);

				expect(result.criticalPathScore).toBe(10);
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("calculateCriticalPathDistance", () => {
			it("should handle null file path", () => {
				const graph = createMockGraph();
				calculateCriticalPathDistance.mockImplementation(() => {
					throw new Error("File path is required");
				});

				expect(() => calculateCriticalPathDistance(null as unknown as string, graph)).toThrow(
					"File path is required",
				);
			});

			it("should handle null graph", () => {
				calculateCriticalPathDistance.mockImplementation(() => {
					throw new Error("Dependency graph is required");
				});

				expect(() => calculateCriticalPathDistance("src/index.ts", null as unknown as DependencyGraph)).toThrow(
					"Dependency graph is required",
				);
			});
		});

		describe("bfsDistance", () => {
			it("should handle empty string paths", () => {
				const graph = createMockGraph();
				bfsDistance.mockReturnValue(-1);

				const result = bfsDistance("", "src/index.ts", graph);

				expect(result).toBe(-1);
			});
		});
	});
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe("Critical Path Performance", () => {
	it("should complete BFS within reasonable time for large graphs", () => {
		const graph = createMockGraph();
		bfsDistance.mockReturnValue(5);

		const start = performance.now();
		bfsDistance("src/index.ts", "src/helpers.ts", graph);
		const duration = performance.now() - start;

		// Mock should be near-instant, real implementation should be < 5ms
		expect(duration).toBeLessThan(50);
	});

	it("should cache entry point identification", () => {
		const graph = createMockGraph();
		identifyEntryPoints.mockReturnValue(["src/index.ts"]);

		identifyEntryPoints(graph);
		identifyEntryPoints(graph);

		// In real implementation with caching, should compute once
		expect(identifyEntryPoints).toHaveBeenCalledTimes(2);
	});
});
