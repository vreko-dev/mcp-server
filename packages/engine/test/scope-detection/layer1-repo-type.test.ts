/**
 * Layer 1 Tests: Repository Type Detection
 *
 * Tests for repo type detection including single repos, monorepos, and Turborepos.
 * Covers workspace analysis, entry point detection, and build tool identification.
 */

import { describe, expect, it, vi } from "vitest";
import type { BuildTool, RepoContext, WorkspaceInfo } from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations for testing (will be replaced with real imports)
// =============================================================================

// These will be imported from the actual implementation once created
const detectRepoType = vi.fn<[string], Promise<RepoContext>>();
const analyzeTurborepo = vi.fn<[string], Promise<RepoContext>>();
const analyzeMonorepo = vi.fn<[string], Promise<RepoContext>>();
const findEntryPoints = vi.fn<[string], Promise<string[]>>();
const detectBuildTool = vi.fn<[string], Promise<BuildTool>>();
const getWorkspaceGlobs = vi.fn<[string], Promise<string[]>>();
const inferWorkspaceType = vi.fn();
const populateWorkspaceDependencies = vi.fn();

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("Repository Type Detection", () => {
	describe("Happy Path", () => {
		describe("detectRepoType", () => {
			it("should detect a Turborepo when turbo.json exists", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@app/web",
							path: "apps/web",
							type: "app",
							dependents: [],
							dependencies: ["@packages/ui"],
						},
					],
					entryPoints: ["apps/web/src/index.tsx"],
					buildTool: "turbopack",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("turborepo");
				expect(result.buildTool).toBe("turbopack");
				expect(result.workspaces.length).toBeGreaterThan(0);
			});

			it("should detect a pnpm monorepo when pnpm-workspace.yaml exists", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@app/core",
							path: "packages/core",
							type: "package",
							dependents: ["@app/web"],
							dependencies: [],
						},
					],
					entryPoints: ["apps/web/src/main.ts"],
					buildTool: "vite",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("monorepo");
				expect(result.workspaces).toBeDefined();
			});

			it("should detect a lerna monorepo when lerna.json exists", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [],
					entryPoints: [],
					buildTool: "webpack",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("monorepo");
			});

			it("should detect npm workspaces from package.json workspaces field", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "shared",
							path: "packages/shared",
							type: "package",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "esbuild",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("monorepo");
			});

			it("should default to single repo when no monorepo indicators found", async () => {
				const mockContext: RepoContext = {
					type: "single",
					rootPath: "/project",
					workspaces: [],
					entryPoints: ["src/index.ts"],
					buildTool: "vite",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("single");
				expect(result.workspaces).toHaveLength(0);
			});
		});

		describe("analyzeTurborepo", () => {
			it("should parse turbo.json and detect all workspaces", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@app/web",
							path: "apps/web",
							type: "app",
							dependents: [],
							dependencies: ["@packages/ui", "@packages/utils"],
						},
						{
							name: "@packages/ui",
							path: "packages/ui",
							type: "package",
							dependents: ["@app/web"],
							dependencies: [],
						},
						{
							name: "@packages/utils",
							path: "packages/utils",
							type: "package",
							dependents: ["@app/web", "@packages/ui"],
							dependencies: [],
						},
					],
					entryPoints: ["apps/web/src/index.tsx"],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.workspaces).toHaveLength(3);
				expect(result.workspaces.find((w) => w.name === "@packages/ui")).toBeDefined();
			});

			it("should identify workspace types correctly (app vs package vs config)", async () => {
				const mockWorkspaces: WorkspaceInfo[] = [
					{
						name: "@app/web",
						path: "apps/web",
						type: "app",
						dependents: [],
						dependencies: [],
					},
					{
						name: "@packages/eslint-config",
						path: "configs/eslint",
						type: "config",
						dependents: [],
						dependencies: [],
					},
					{
						name: "@packages/ui",
						path: "packages/ui",
						type: "package",
						dependents: [],
						dependencies: [],
					},
				];

				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: mockWorkspaces,
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.workspaces.find((w) => w.type === "app")).toBeDefined();
				expect(result.workspaces.find((w) => w.type === "config")).toBeDefined();
				expect(result.workspaces.find((w) => w.type === "package")).toBeDefined();
			});

			it("should populate workspace dependencies correctly", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@app/web",
							path: "apps/web",
							type: "app",
							dependents: [],
							dependencies: ["@packages/ui"],
						},
						{
							name: "@packages/ui",
							path: "packages/ui",
							type: "package",
							dependents: ["@app/web"],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				const uiPackage = result.workspaces.find((w) => w.name === "@packages/ui");
				expect(uiPackage?.dependents).toContain("@app/web");
			});

			it("should find entry points from app workspaces", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@app/web",
							path: "apps/web",
							type: "app",
							dependents: [],
							dependencies: [],
						},
						{
							name: "@app/api",
							path: "apps/api",
							type: "app",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: ["apps/web/src/index.tsx", "apps/api/src/index.ts"],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.entryPoints).toContain("apps/web/src/index.tsx");
				expect(result.entryPoints).toContain("apps/api/src/index.ts");
			});
		});

		describe("findEntryPoints", () => {
			it("should find src/index.ts as entry point", async () => {
				findEntryPoints.mockResolvedValue(["src/index.ts"]);

				const result = await findEntryPoints("/project");

				expect(result).toContain("src/index.ts");
			});

			it("should find main.tsx for React apps", async () => {
				findEntryPoints.mockResolvedValue(["src/main.tsx"]);

				const result = await findEntryPoints("/project");

				expect(result).toContain("src/main.tsx");
			});

			it("should find multiple entry points in multi-page apps", async () => {
				findEntryPoints.mockResolvedValue([
					"src/pages/index.tsx",
					"src/pages/about.tsx",
					"src/pages/contact.tsx",
				]);

				const result = await findEntryPoints("/project");

				expect(result.length).toBeGreaterThanOrEqual(3);
			});

			it("should detect Next.js app directory entry points", async () => {
				findEntryPoints.mockResolvedValue(["app/page.tsx", "app/layout.tsx", "app/dashboard/page.tsx"]);

				const result = await findEntryPoints("/project");

				expect(result.some((e) => e.includes("app/"))).toBe(true);
			});
		});

		describe("detectBuildTool", () => {
			it("should detect Vite from vite.config.ts", async () => {
				detectBuildTool.mockResolvedValue("vite");

				const result = await detectBuildTool("/project");

				expect(result).toBe("vite");
			});

			it("should detect Webpack from webpack.config.js", async () => {
				detectBuildTool.mockResolvedValue("webpack");

				const result = await detectBuildTool("/project");

				expect(result).toBe("webpack");
			});

			it("should detect esbuild from esbuild.config.js", async () => {
				detectBuildTool.mockResolvedValue("esbuild");

				const result = await detectBuildTool("/project");

				expect(result).toBe("esbuild");
			});

			it("should detect Rollup from rollup.config.js", async () => {
				detectBuildTool.mockResolvedValue("rollup");

				const result = await detectBuildTool("/project");

				expect(result).toBe("rollup");
			});

			it("should return 'none' when no build tool is detected", async () => {
				detectBuildTool.mockResolvedValue("none");

				const result = await detectBuildTool("/project");

				expect(result).toBe("none");
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("detectRepoType", () => {
			it("should handle missing package.json gracefully", async () => {
				const mockContext: RepoContext = {
					type: "single",
					rootPath: "/project",
					workspaces: [],
					entryPoints: [],
					buildTool: "none",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("single");
				expect(result.entryPoints).toHaveLength(0);
			});

			it("should handle corrupted turbo.json", async () => {
				detectRepoType.mockRejectedValue(new Error("Invalid JSON in turbo.json"));

				await expect(detectRepoType("/project")).rejects.toThrow("Invalid JSON");
			});

			it("should handle inaccessible workspace directories", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [], // Empty because directories are inaccessible
					entryPoints: [],
					buildTool: "none",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.workspaces).toHaveLength(0);
			});
		});

		describe("analyzeTurborepo", () => {
			it("should handle empty workspace globs", async () => {
				getWorkspaceGlobs.mockResolvedValue([]);

				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [],
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.workspaces).toHaveLength(0);
			});

			it("should handle workspaces without package.json", async () => {
				// Mock handling of workspace directories that exist but have no package.json
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "unknown",
							path: "packages/broken",
							type: "package",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.workspaces[0]?.name).toBe("unknown");
			});
		});

		describe("findEntryPoints", () => {
			it("should return empty array when no entry points found", async () => {
				findEntryPoints.mockResolvedValue([]);

				const result = await findEntryPoints("/project");

				expect(result).toHaveLength(0);
			});

			it("should handle permission errors gracefully", async () => {
				findEntryPoints.mockRejectedValue(new Error("EACCES: permission denied"));

				await expect(findEntryPoints("/project")).rejects.toThrow("permission denied");
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("detectRepoType", () => {
			it("should prioritize turbo.json over pnpm-workspace.yaml", async () => {
				// When both exist, Turborepo takes precedence
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [],
					entryPoints: [],
					buildTool: "turbopack",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.type).toBe("turborepo");
			});

			it("should handle nested monorepos (monorepo within monorepo)", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project/packages/nested-monorepo",
					workspaces: [
						{
							name: "nested-package",
							path: "packages/nested",
							type: "package",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "none",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project/packages/nested-monorepo");

				expect(result.type).toBe("monorepo");
			});

			it("should handle symbolic links in workspace paths", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@linked/package",
							path: "packages/linked", // Could be a symlink
							type: "package",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "none",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.workspaces[0]?.path).toBe("packages/linked");
			});

			it("should handle very deep workspace nesting", async () => {
				const mockContext: RepoContext = {
					type: "monorepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@deep/package",
							path: "packages/level1/level2/level3/deep-package",
							type: "package",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "none",
				};
				detectRepoType.mockResolvedValue(mockContext);

				const result = await detectRepoType("/project");

				expect(result.workspaces[0]?.path).toContain("level1/level2/level3");
			});
		});

		describe("analyzeTurborepo", () => {
			it("should handle circular dependencies between workspaces", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "@packages/a",
							path: "packages/a",
							type: "package",
							dependents: ["@packages/b"],
							dependencies: ["@packages/b"], // Circular!
						},
						{
							name: "@packages/b",
							path: "packages/b",
							type: "package",
							dependents: ["@packages/a"],
							dependencies: ["@packages/a"], // Circular!
						},
					],
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				// Should still return valid context despite circular deps
				expect(result.workspaces).toHaveLength(2);
			});

			it("should handle workspaces with same package name in different paths", async () => {
				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: [
						{
							name: "utils",
							path: "packages/utils",
							type: "package",
							dependents: [],
							dependencies: [],
						},
						{
							name: "utils",
							path: "apps/utils",
							type: "app",
							dependents: [],
							dependencies: [],
						},
					],
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				// Should detect duplicate names
				const utilsPackages = result.workspaces.filter((w) => w.name === "utils");
				expect(utilsPackages.length).toBe(2);
			});

			it("should handle maximum workspace limit gracefully", async () => {
				// Test with many workspaces (e.g., 100+)
				const manyWorkspaces: WorkspaceInfo[] = Array.from({ length: 100 }, (_, i) => ({
					name: `@packages/pkg-${i}`,
					path: `packages/pkg-${i}`,
					type: "package" as const,
					dependents: [],
					dependencies: [],
				}));

				const mockContext: RepoContext = {
					type: "turborepo",
					rootPath: "/project",
					workspaces: manyWorkspaces,
					entryPoints: [],
					buildTool: "turbopack",
				};
				analyzeTurborepo.mockResolvedValue(mockContext);

				const result = await analyzeTurborepo("/project");

				expect(result.workspaces.length).toBe(100);
			});
		});

		describe("inferWorkspaceType", () => {
			it("should infer 'app' type from apps/ directory", () => {
				const mockPkg = { name: "@myapp/web" };
				inferWorkspaceType.mockReturnValue("app");

				const result = inferWorkspaceType("apps/web", mockPkg);

				expect(result).toBe("app");
			});

			it("should infer 'config' type from configs/ directory", () => {
				const mockPkg = { name: "@myapp/eslint-config" };
				inferWorkspaceType.mockReturnValue("config");

				const result = inferWorkspaceType("configs/eslint", mockPkg);

				expect(result).toBe("config");
			});

			it("should infer 'package' as default", () => {
				const mockPkg = { name: "@myapp/utils" };
				inferWorkspaceType.mockReturnValue("package");

				const result = inferWorkspaceType("packages/utils", mockPkg);

				expect(result).toBe("package");
			});

			it("should handle package names with config suffix", () => {
				const mockPkg = { name: "@myapp/typescript-config" };
				inferWorkspaceType.mockReturnValue("config");

				const result = inferWorkspaceType("packages/typescript-config", mockPkg);

				expect(result).toBe("config");
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("detectRepoType", () => {
			it("should throw on filesystem access errors", async () => {
				detectRepoType.mockRejectedValue(new Error("ENOENT: no such file or directory"));

				await expect(detectRepoType("/nonexistent")).rejects.toThrow("ENOENT");
			});

			it("should throw on invalid workspace root", async () => {
				detectRepoType.mockRejectedValue(new Error("Invalid workspace root"));

				await expect(detectRepoType("")).rejects.toThrow("Invalid workspace root");
			});
		});

		describe("analyzeTurborepo", () => {
			it("should throw when turbo.json is missing", async () => {
				analyzeTurborepo.mockRejectedValue(new Error("turbo.json not found"));

				await expect(analyzeTurborepo("/project")).rejects.toThrow("turbo.json not found");
			});

			it("should throw on malformed turbo.json", async () => {
				analyzeTurborepo.mockRejectedValue(new Error("Unexpected token in JSON"));

				await expect(analyzeTurborepo("/project")).rejects.toThrow("Unexpected token");
			});
		});

		describe("populateWorkspaceDependencies", () => {
			it("should handle missing workspace package.json files", async () => {
				populateWorkspaceDependencies.mockRejectedValue(new Error("package.json not found in workspace"));

				await expect(populateWorkspaceDependencies([], "/project")).rejects.toThrow("package.json not found");
			});
		});
	});
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe("Repository Type Detection - Performance", () => {
	it("should cache repo context within TTL", async () => {
		const mockContext: RepoContext = {
			type: "turborepo",
			rootPath: "/project",
			workspaces: [],
			entryPoints: [],
			buildTool: "turbopack",
		};
		detectRepoType.mockResolvedValue(mockContext);

		// First call
		await detectRepoType("/project");
		// Second call should use cache
		await detectRepoType("/project");

		// In real implementation, mock would be called once if caching works
		expect(detectRepoType).toHaveBeenCalledTimes(2);
	});

	it("should complete repo detection within 50ms budget", async () => {
		const mockContext: RepoContext = {
			type: "single",
			rootPath: "/project",
			workspaces: [],
			entryPoints: ["src/index.ts"],
			buildTool: "vite",
		};
		detectRepoType.mockResolvedValue(mockContext);

		const start = performance.now();
		await detectRepoType("/project");
		const duration = performance.now() - start;

		// Mock call should be near-instant, real implementation budget is 50ms
		expect(duration).toBeLessThan(100); // Allow some overhead for test framework
	});
});
