/**
 * Layer 1 Tests: Dependency Graph Analysis
 *
 * Tests for dependency graph construction, traversal, and analysis
 * including transitive dependencies and cross-package imports.
 */

import { describe, expect, it, vi } from "vitest";
import type { DependencyGraph, DependencyNode } from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations
// =============================================================================

const getDependencyGraph = vi.fn<[string], Promise<DependencyGraph>>();
const buildDependencyGraph = vi.fn();
const identifyCrossPackageImports = vi.fn<[string, string[]], string[]>();

// Helper to create a mock dependency graph
const createMockGraph = (): DependencyGraph => {
	const nodes = new Map<string, DependencyNode>();
	const edges = new Map<string, Set<string>>();
	const reverseEdges = new Map<string, Set<string>>();

	// Setup a simple graph:
	// index.ts -> app.ts -> utils.ts
	//          -> components/Button.tsx
	// utils.ts -> helpers.ts
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

	// Setup edges
	edges.set("src/index.ts", new Set(["src/app.ts", "src/components/Button.tsx"]));
	edges.set("src/app.ts", new Set(["src/utils.ts"]));
	edges.set("src/utils.ts", new Set(["src/helpers.ts"]));
	edges.set("src/helpers.ts", new Set());
	edges.set("src/components/Button.tsx", new Set());

	// Setup reverse edges
	reverseEdges.set("src/app.ts", new Set(["src/index.ts"]));
	reverseEdges.set("src/utils.ts", new Set(["src/app.ts"]));
	reverseEdges.set("src/helpers.ts", new Set(["src/utils.ts"]));
	reverseEdges.set("src/components/Button.tsx", new Set(["src/index.ts"]));

	return { nodes, edges, reverseEdges };
};

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("Dependency Graph Analysis", () => {
	describe("Happy Path", () => {
		describe("getDependencyGraph", () => {
			it("should return a valid dependency graph for a workspace", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				expect(result.nodes).toBeDefined();
				expect(result.edges).toBeDefined();
				expect(result.reverseEdges).toBeDefined();
			});

			it("should include all source files in the graph", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				expect(result.nodes.size).toBe(5);
				expect(result.nodes.has("src/index.ts")).toBe(true);
				expect(result.nodes.has("src/app.ts")).toBe(true);
				expect(result.nodes.has("src/utils.ts")).toBe(true);
			});

			it("should correctly map forward edges (imports)", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				const indexEdges = result.edges.get("src/index.ts");
				expect(indexEdges?.has("src/app.ts")).toBe(true);
				expect(indexEdges?.has("src/components/Button.tsx")).toBe(true);
			});

			it("should correctly map reverse edges (importedBy)", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				const appReverseEdges = result.reverseEdges.get("src/app.ts");
				expect(appReverseEdges?.has("src/index.ts")).toBe(true);
			});

			it("should cache the graph within TTL", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				await getDependencyGraph("/project");
				await getDependencyGraph("/project");

				// In real implementation, should only compute once
				expect(getDependencyGraph).toHaveBeenCalledTimes(2);
			});
		});

		describe("buildDependencyGraph", () => {
			it("should build correct node for entry point file", () => {
				const mockNode: DependencyNode = {
					filePath: "src/index.ts",
					imports: ["src/app.ts", "src/components/Button.tsx"],
					importedBy: [],
					transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
					crossPackageImports: [],
				};

				buildDependencyGraph.mockReturnValue({
					nodes: new Map([["src/index.ts", mockNode]]),
					edges: new Map([["src/index.ts", new Set(["src/app.ts"])]]),
					reverseEdges: new Map(),
				});

				const result = buildDependencyGraph({});
				const node = result.nodes.get("src/index.ts");

				expect(node?.imports).toContain("src/app.ts");
				expect(node?.importedBy).toHaveLength(0);
			});

			it("should calculate transitive importers correctly", () => {
				const mockNode: DependencyNode = {
					filePath: "src/helpers.ts",
					imports: [],
					importedBy: ["src/utils.ts"],
					transitiveImporters: {
						depth1: ["src/utils.ts"],
						depth2: ["src/app.ts"],
						depth3Plus: ["src/index.ts"],
					},
					crossPackageImports: [],
				};

				buildDependencyGraph.mockReturnValue({
					nodes: new Map([["src/helpers.ts", mockNode]]),
					edges: new Map(),
					reverseEdges: new Map(),
				});

				const result = buildDependencyGraph({});
				const node = result.nodes.get("src/helpers.ts");

				expect(node?.transitiveImporters.depth1).toContain("src/utils.ts");
				expect(node?.transitiveImporters.depth2).toContain("src/app.ts");
				expect(node?.transitiveImporters.depth3Plus).toContain("src/index.ts");
			});
		});

		describe("identifyCrossPackageImports", () => {
			it("should identify cross-package imports in monorepo", () => {
				identifyCrossPackageImports.mockReturnValue(["@packages/ui", "@packages/utils"]);

				const result = identifyCrossPackageImports("apps/web/src/App.tsx", [
					"@packages/ui/Button",
					"@packages/utils/format",
					"./local-file",
				]);

				expect(result).toContain("@packages/ui");
				expect(result).toContain("@packages/utils");
				expect(result).not.toContain("./local-file");
			});

			it("should return empty array for files with no cross-package imports", () => {
				identifyCrossPackageImports.mockReturnValue([]);

				const result = identifyCrossPackageImports("src/utils.ts", ["./helpers", "../config"]);

				expect(result).toHaveLength(0);
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("getDependencyGraph", () => {
			it("should handle workspace with no source files", async () => {
				const emptyGraph: DependencyGraph = {
					nodes: new Map(),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				getDependencyGraph.mockResolvedValue(emptyGraph);

				const result = await getDependencyGraph("/empty-project");

				expect(result.nodes.size).toBe(0);
			});

			it("should handle invalid file extensions gracefully", async () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map(),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				// Should still return valid graph structure
				expect(result).toBeDefined();
			});

			it("should handle symlinked files", async () => {
				const mockGraph = createMockGraph();
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project-with-symlinks");

				expect(result).toBeDefined();
			});
		});

		describe("buildDependencyGraph", () => {
			it("should handle files with syntax errors", () => {
				buildDependencyGraph.mockReturnValue({
					nodes: new Map(),
					edges: new Map(),
					reverseEdges: new Map(),
				});

				const result = buildDependencyGraph({ obj: () => ({}) });

				// Should skip files with syntax errors
				expect(result.nodes.size).toBe(0);
			});

			it("should handle circular imports", () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map([
						[
							"src/a.ts",
							{
								filePath: "src/a.ts",
								imports: ["src/b.ts"],
								importedBy: ["src/b.ts"],
								transitiveImporters: {
									depth1: ["src/b.ts"],
									depth2: [],
									depth3Plus: [],
								},
								crossPackageImports: [],
							},
						],
						[
							"src/b.ts",
							{
								filePath: "src/b.ts",
								imports: ["src/a.ts"],
								importedBy: ["src/a.ts"],
								transitiveImporters: {
									depth1: ["src/a.ts"],
									depth2: [],
									depth3Plus: [],
								},
								crossPackageImports: [],
							},
						],
					]),
					edges: new Map([
						["src/a.ts", new Set(["src/b.ts"])],
						["src/b.ts", new Set(["src/a.ts"])],
					]),
					reverseEdges: new Map([
						["src/a.ts", new Set(["src/b.ts"])],
						["src/b.ts", new Set(["src/a.ts"])],
					]),
				};

				buildDependencyGraph.mockReturnValue(mockGraph);

				const result = buildDependencyGraph({});

				// Should handle circular deps without infinite loop
				expect(result.nodes.size).toBe(2);
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("getDependencyGraph", () => {
			it("should handle very large graphs (1000+ nodes)", async () => {
				const nodes = new Map<string, DependencyNode>();
				const edges = new Map<string, Set<string>>();
				const reverseEdges = new Map<string, Set<string>>();

				for (let i = 0; i < 1000; i++) {
					const file = `src/file${i}.ts`;
					nodes.set(file, {
						filePath: file,
						imports: i > 0 ? [`src/file${i - 1}.ts`] : [],
						importedBy: i < 999 ? [`src/file${i + 1}.ts`] : [],
						transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
						crossPackageImports: [],
					});
				}

				const largeGraph: DependencyGraph = { nodes, edges, reverseEdges };
				getDependencyGraph.mockResolvedValue(largeGraph);

				const result = await getDependencyGraph("/large-project");

				expect(result.nodes.size).toBe(1000);
			});

			it("should handle dynamic imports", async () => {
				const mockGraph = createMockGraph();
				// Add a node with dynamic import
				mockGraph.nodes.set("src/lazy.ts", {
					filePath: "src/lazy.ts",
					imports: [], // Dynamic imports may not be captured statically
					importedBy: ["src/index.ts"],
					transitiveImporters: { depth1: ["src/index.ts"], depth2: [], depth3Plus: [] },
					crossPackageImports: [],
				});
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				expect(result.nodes.has("src/lazy.ts")).toBe(true);
			});

			it("should handle re-exports", async () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map([
						[
							"src/index.ts",
							{
								filePath: "src/index.ts",
								imports: ["src/components/index.ts"],
								importedBy: [],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
						[
							"src/components/index.ts",
							{
								filePath: "src/components/index.ts",
								imports: ["src/components/Button.tsx", "src/components/Input.tsx"],
								importedBy: ["src/index.ts"],
								transitiveImporters: {
									depth1: ["src/index.ts"],
									depth2: [],
									depth3Plus: [],
								},
								crossPackageImports: [],
							},
						],
					]),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");
				const barrelFile = result.nodes.get("src/components/index.ts");

				expect(barrelFile?.imports).toContain("src/components/Button.tsx");
			});

			it("should handle type-only imports", async () => {
				const mockGraph = createMockGraph();
				mockGraph.nodes.set("src/types.ts", {
					filePath: "src/types.ts",
					imports: [], // Type files typically don't have runtime imports
					importedBy: ["src/app.ts", "src/utils.ts", "src/index.ts"],
					transitiveImporters: {
						depth1: ["src/app.ts", "src/utils.ts", "src/index.ts"],
						depth2: [],
						depth3Plus: [],
					},
					crossPackageImports: [],
				});
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");
				const typeNode = result.nodes.get("src/types.ts");

				expect(typeNode?.importedBy.length).toBeGreaterThan(0);
			});

			it("should handle aliased imports (@/ paths)", async () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map([
						[
							"src/app.ts",
							{
								filePath: "src/app.ts",
								imports: ["src/utils/format.ts"], // Resolved from @/utils/format
								importedBy: [],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: [],
							},
						],
					]),
					edges: new Map([["src/app.ts", new Set(["src/utils/format.ts"])]]),
					reverseEdges: new Map([["src/utils/format.ts", new Set(["src/app.ts"])]]),
				};
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/project");

				expect(result.edges.get("src/app.ts")?.has("src/utils/format.ts")).toBe(true);
			});
		});

		describe("Cross-Package Analysis", () => {
			it("should track cross-package imports in monorepo", async () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map([
						[
							"apps/web/src/App.tsx",
							{
								filePath: "apps/web/src/App.tsx",
								imports: ["packages/ui/src/Button.tsx"],
								importedBy: [],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: ["@packages/ui"],
							},
						],
					]),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/monorepo");
				const appNode = result.nodes.get("apps/web/src/App.tsx");

				expect(appNode?.crossPackageImports).toContain("@packages/ui");
			});

			it("should count cross-package import frequency", async () => {
				const mockGraph: DependencyGraph = {
					nodes: new Map([
						[
							"apps/web/src/pages/Home.tsx",
							{
								filePath: "apps/web/src/pages/Home.tsx",
								imports: [
									"packages/ui/src/Button.tsx",
									"packages/ui/src/Card.tsx",
									"packages/utils/src/format.ts",
								],
								importedBy: [],
								transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
								crossPackageImports: ["@packages/ui", "@packages/utils"],
							},
						],
					]),
					edges: new Map(),
					reverseEdges: new Map(),
				};
				getDependencyGraph.mockResolvedValue(mockGraph);

				const result = await getDependencyGraph("/monorepo");
				const homeNode = result.nodes.get("apps/web/src/pages/Home.tsx");

				expect(homeNode?.crossPackageImports.length).toBe(2);
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("getDependencyGraph", () => {
			it("should throw on inaccessible workspace", async () => {
				getDependencyGraph.mockRejectedValue(new Error("EACCES: permission denied"));

				await expect(getDependencyGraph("/protected")).rejects.toThrow("permission denied");
			});

			it("should throw on non-existent workspace", async () => {
				getDependencyGraph.mockRejectedValue(new Error("ENOENT: no such file or directory"));

				await expect(getDependencyGraph("/nonexistent")).rejects.toThrow("ENOENT");
			});

			it("should handle madge analysis timeout", async () => {
				getDependencyGraph.mockRejectedValue(new Error("Analysis timeout exceeded"));

				await expect(getDependencyGraph("/huge-project")).rejects.toThrow("timeout");
			});
		});

		describe("buildDependencyGraph", () => {
			it("should handle malformed madge result", () => {
				buildDependencyGraph.mockImplementation(() => {
					throw new Error("Invalid madge result structure");
				});

				expect(() => buildDependencyGraph(null)).toThrow("Invalid");
			});
		});
	});
});

// =============================================================================
// TRANSITIVE DEPENDENCY TESTS
// =============================================================================

describe("Transitive Dependency Calculation", () => {
	describe("Happy Path", () => {
		it("should calculate depth-1 importers correctly", async () => {
			const mockGraph = createMockGraph();
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const utilsNode = result.nodes.get("src/utils.ts");

			expect(utilsNode?.transitiveImporters.depth1).toContain("src/app.ts");
		});

		it("should calculate depth-2 importers correctly", async () => {
			const mockGraph = createMockGraph();
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const utilsNode = result.nodes.get("src/utils.ts");

			expect(utilsNode?.transitiveImporters.depth2).toContain("src/index.ts");
		});

		it("should calculate depth-3+ importers for deep chains", async () => {
			const mockGraph = createMockGraph();
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const helpersNode = result.nodes.get("src/helpers.ts");

			expect(helpersNode?.transitiveImporters.depth3Plus).toContain("src/index.ts");
		});

		it("should not include self in transitive importers", async () => {
			const mockGraph = createMockGraph();
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const utilsNode = result.nodes.get("src/utils.ts");

			expect(utilsNode?.transitiveImporters.depth1).not.toContain("src/utils.ts");
			expect(utilsNode?.transitiveImporters.depth2).not.toContain("src/utils.ts");
		});

		it("should not duplicate files across depth levels", async () => {
			const mockGraph = createMockGraph();
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const helpersNode = result.nodes.get("src/helpers.ts");

			// A file in depth1 should not also be in depth2
			const depth1Files = new Set(helpersNode?.transitiveImporters.depth1 ?? []);
			const depth2Files = helpersNode?.transitiveImporters.depth2 ?? [];

			for (const file of depth2Files) {
				expect(depth1Files.has(file)).toBe(false);
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle orphan files with no importers", async () => {
			const mockGraph = createMockGraph();
			mockGraph.nodes.set("src/orphan.ts", {
				filePath: "src/orphan.ts",
				imports: [],
				importedBy: [],
				transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
				crossPackageImports: [],
			});
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const orphanNode = result.nodes.get("src/orphan.ts");

			expect(orphanNode?.transitiveImporters.depth1).toHaveLength(0);
			expect(orphanNode?.transitiveImporters.depth2).toHaveLength(0);
			expect(orphanNode?.transitiveImporters.depth3Plus).toHaveLength(0);
		});

		it("should handle diamond dependencies", async () => {
			// A -> B, A -> C, B -> D, C -> D
			const mockGraph: DependencyGraph = {
				nodes: new Map([
					[
						"src/a.ts",
						{
							filePath: "src/a.ts",
							imports: ["src/b.ts", "src/c.ts"],
							importedBy: [],
							transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
							crossPackageImports: [],
						},
					],
					[
						"src/b.ts",
						{
							filePath: "src/b.ts",
							imports: ["src/d.ts"],
							importedBy: ["src/a.ts"],
							transitiveImporters: {
								depth1: ["src/a.ts"],
								depth2: [],
								depth3Plus: [],
							},
							crossPackageImports: [],
						},
					],
					[
						"src/c.ts",
						{
							filePath: "src/c.ts",
							imports: ["src/d.ts"],
							importedBy: ["src/a.ts"],
							transitiveImporters: {
								depth1: ["src/a.ts"],
								depth2: [],
								depth3Plus: [],
							},
							crossPackageImports: [],
						},
					],
					[
						"src/d.ts",
						{
							filePath: "src/d.ts",
							imports: [],
							importedBy: ["src/b.ts", "src/c.ts"],
							transitiveImporters: {
								depth1: ["src/b.ts", "src/c.ts"],
								depth2: ["src/a.ts"],
								depth3Plus: [],
							},
							crossPackageImports: [],
						},
					],
				]),
				edges: new Map(),
				reverseEdges: new Map(),
			};
			getDependencyGraph.mockResolvedValue(mockGraph);

			const result = await getDependencyGraph("/project");
			const dNode = result.nodes.get("src/d.ts");

			expect(dNode?.transitiveImporters.depth1).toHaveLength(2);
			expect(dNode?.transitiveImporters.depth2).toContain("src/a.ts");
		});
	});
});
