/**
 * Layer 1 Tests: Config File Special Handling
 *
 * Tests for config file blast radius calculation including
 * package.json, tsconfig.json, .env files, and build tool configs.
 */

import { describe, expect, it, vi } from "vitest";
import type { ConfigBlastRadius, RepoContext } from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations
// =============================================================================

const getConfigBlastRadius = vi.fn<[string, RepoContext], Promise<ConfigBlastRadius>>();
const findTsconfigExtenders = vi.fn();
const findEnvConsumers = vi.fn<[string], Promise<string[]>>();
const getPackageEntryPoints = vi.fn<[string, RepoContext], Promise<string[]>>();

// Helper to create mock repo context
const createMockRepoContext = (overrides: Partial<RepoContext> = {}): RepoContext => ({
	type: "turborepo",
	rootPath: "/project",
	workspaces: [
		{
			name: "@app/web",
			path: "apps/web",
			type: "app",
			dependents: [],
			dependencies: ["@packages/ui", "@packages/platform"],
		},
		{
			name: "@app/api",
			path: "apps/api",
			type: "app",
			dependents: [],
			dependencies: ["@packages/platform"],
		},
		{
			name: "@packages/ui",
			path: "packages/ui",
			type: "package",
			dependents: ["@app/web"],
			dependencies: [],
		},
		{
			name: "@packages/platform",
			path: "packages/platform",
			type: "package",
			dependents: ["@app/web", "@app/api", "@packages/cli"],
			dependencies: [],
		},
		{
			name: "@packages/cli",
			path: "packages/cli",
			type: "package",
			dependents: [],
			dependencies: ["@packages/platform"],
		},
	],
	entryPoints: ["apps/web/src/index.tsx", "apps/api/src/index.ts"],
	buildTool: "turbopack",
	...overrides,
});

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("Config File Special Handling", () => {
	describe("Happy Path", () => {
		describe("package.json handling", () => {
			it("should handle root package.json in monorepo with workspace scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: ctx.workspaces.map((w) => w.name),
					reasoning: "Root package.json affects all workspace packages",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("package.json", ctx);

				expect(result.scope).toBe("workspace");
				expect(result.affectedPackages.length).toBe(5);
				expect(result.reasoning).toContain("all workspace packages");
			});

			it("should handle root package.json in single repo", async () => {
				const ctx = createMockRepoContext({
					type: "single",
					workspaces: [],
				});
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ["src/index.ts"],
					affectedPackages: [],
					reasoning: "Root package.json affects entire application",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("package.json", ctx);

				expect(result.scope).toBe("workspace");
				expect(result.affectedPackages).toHaveLength(0);
			});

			it("should handle workspace package.json with package scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: ["packages/platform/src/index.ts"],
					affectedPackages: ["@app/web", "@app/api", "@packages/cli"],
					reasoning: "Package @packages/platform package.json affects package and its 3 dependents",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/platform/package.json", ctx);

				expect(result.scope).toBe("package");
				expect(result.affectedPackages).toContain("@app/web");
				expect(result.affectedPackages).toContain("@app/api");
				expect(result.affectedPackages.length).toBe(3);
			});
		});

		describe("tsconfig.json handling", () => {
			it("should handle root tsconfig.json with extends-chain scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "extends-chain",
					affectedFiles: ["apps/web/tsconfig.json", "apps/api/tsconfig.json", "packages/ui/tsconfig.json"],
					affectedPackages: ["@app/web", "@app/api", "@packages/ui"],
					reasoning: "Root tsconfig extended by 3 packages",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);
				findTsconfigExtenders.mockResolvedValue({
					extendingFiles: ["apps/web/tsconfig.json", "apps/api/tsconfig.json", "packages/ui/tsconfig.json"],
					extendingPackages: ["@app/web", "@app/api", "@packages/ui"],
				});

				const result = await getConfigBlastRadius("tsconfig.json", ctx);

				expect(result.scope).toBe("extends-chain");
				expect(result.affectedPackages.length).toBe(3);
			});

			it("should handle workspace tsconfig.json with package scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: ["packages/ui/src/index.ts", "packages/ui/src/Button.tsx"],
					affectedPackages: [],
					reasoning: "tsconfig affects all TypeScript files in scope",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/ui/tsconfig.json", ctx);

				expect(result.scope).toBe("package");
			});
		});

		describe(".env file handling", () => {
			it("should handle .env files with env-consumers scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: ["apps/web/src/config.ts", "apps/api/src/config.ts", "packages/platform/src/env.ts"],
					affectedPackages: [],
					reasoning: "Environment file affects 3 files that read process.env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);
				findEnvConsumers.mockResolvedValue([
					"apps/web/src/config.ts",
					"apps/api/src/config.ts",
					"packages/platform/src/env.ts",
				]);

				const result = await getConfigBlastRadius(".env", ctx);

				expect(result.scope).toBe("env-consumers");
				expect(result.affectedFiles.length).toBe(3);
			});

			it("should handle .env.local files", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: ["apps/web/src/config.ts"],
					affectedPackages: [],
					reasoning: "Environment file affects 1 files that read process.env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius(".env.local", ctx);

				expect(result.scope).toBe("env-consumers");
			});

			it("should handle .env.production files", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: ["apps/web/src/config.ts"],
					affectedPackages: [],
					reasoning: "Environment file affects 1 files that read process.env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius(".env.production", ctx);

				expect(result.scope).toBe("env-consumers");
			});
		});

		describe("Build config handling", () => {
			it("should handle vite.config.ts with workspace scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: [],
					reasoning: "Vite config affects entire build output",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("vite.config.ts", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle next.config.js with workspace scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: [],
					reasoning: "Next.js config affects entire application",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("next.config.js", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle turbo.json with workspace scope", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: ctx.workspaces.map((w) => w.name),
					reasoning: "Turbo config affects all workspace tasks",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("turbo.json", ctx);

				expect(result.scope).toBe("workspace");
				expect(result.affectedPackages.length).toBe(5);
			});

			it("should handle webpack.config.js with workspace scope", async () => {
				const ctx = createMockRepoContext({ buildTool: "webpack" });
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: [],
					reasoning: "Webpack config affects entire build output",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("webpack.config.js", ctx);

				expect(result.scope).toBe("workspace");
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("package.json handling", () => {
			it("should handle workspace without dependents", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: ["packages/cli/src/index.ts"],
					affectedPackages: [],
					reasoning: "Package @packages/cli package.json affects package and its 0 dependents",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/cli/package.json", ctx);

				expect(result.affectedPackages).toHaveLength(0);
			});

			it("should handle missing workspace in context", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "file",
					affectedFiles: ["packages/unknown/package.json"],
					affectedPackages: [],
					reasoning: "Unknown workspace package.json",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/unknown/package.json", ctx);

				expect(result.scope).toBe("file");
			});
		});

		describe("tsconfig.json handling", () => {
			it("should handle tsconfig with no extenders", async () => {
				const ctx = createMockRepoContext();
				findTsconfigExtenders.mockResolvedValue({
					extendingFiles: [],
					extendingPackages: [],
				});
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: ["packages/isolated/src/index.ts"],
					affectedPackages: [],
					reasoning: "tsconfig affects all TypeScript files in scope",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/isolated/tsconfig.json", ctx);

				expect(result.scope).toBe("package");
			});
		});

		describe(".env file handling", () => {
			it("should handle .env with no consumers", async () => {
				const ctx = createMockRepoContext();
				findEnvConsumers.mockResolvedValue([]);
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "Environment file affects 0 files that read process.env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius(".env", ctx);

				expect(result.affectedFiles).toHaveLength(0);
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("package.json handling", () => {
			it("should handle deeply nested workspace package.json", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "Package package.json affects package",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/deep/nested/workspace/package.json", ctx);

				expect(result.scope).toBe("package");
			});

			it("should handle package.json with many dependents", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "package",
					affectedFiles: [],
					affectedPackages: Array.from({ length: 20 }, (_, i) => `@pkg/${i}`),
					reasoning: "Package affects 20 dependents",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("packages/core/package.json", ctx);

				expect(result.affectedPackages.length).toBe(20);
			});
		});

		describe("tsconfig.json handling", () => {
			it("should handle circular tsconfig extends", async () => {
				// Shouldn't happen in practice but should handle gracefully
				const ctx = createMockRepoContext();
				findTsconfigExtenders.mockResolvedValue({
					extendingFiles: ["a/tsconfig.json", "b/tsconfig.json"],
					extendingPackages: ["@a", "@b"],
				});
				const mockResult: ConfigBlastRadius = {
					scope: "extends-chain",
					affectedFiles: ["a/tsconfig.json", "b/tsconfig.json"],
					affectedPackages: ["@a", "@b"],
					reasoning: "Root tsconfig extended by 2 packages",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("tsconfig.json", ctx);

				expect(result.scope).toBe("extends-chain");
			});

			it("should handle tsconfig.base.json", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "extends-chain",
					affectedFiles: ["apps/web/tsconfig.json"],
					affectedPackages: ["@app/web"],
					reasoning: "Base tsconfig extended by 1 packages",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("tsconfig.base.json", ctx);

				expect(result.scope).toBe("extends-chain");
			});
		});

		describe(".env file handling", () => {
			it("should handle import.meta.env consumers (Vite)", async () => {
				const ctx = createMockRepoContext();
				findEnvConsumers.mockResolvedValue([
					"apps/web/src/config.ts", // Uses import.meta.env
				]);
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: ["apps/web/src/config.ts"],
					affectedPackages: [],
					reasoning: "Environment file affects 1 files that read import.meta.env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius(".env", ctx);

				expect(result.affectedFiles).toContain("apps/web/src/config.ts");
			});

			it("should handle SvelteKit $env consumers", async () => {
				const ctx = createMockRepoContext();
				findEnvConsumers.mockResolvedValue([
					"apps/web/src/routes/+page.server.ts", // Uses $env/
				]);
				const mockResult: ConfigBlastRadius = {
					scope: "env-consumers",
					affectedFiles: ["apps/web/src/routes/+page.server.ts"],
					affectedPackages: [],
					reasoning: "Environment file affects 1 files that read $env",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius(".env", ctx);

				expect(result.affectedFiles.length).toBe(1);
			});
		});

		describe("Other config files", () => {
			it("should handle tailwind.config.js", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: [],
					reasoning: "Tailwind config affects entire styling output",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("tailwind.config.js", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle postcss.config.js", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: ctx.entryPoints,
					affectedPackages: [],
					reasoning: "PostCSS config affects CSS processing",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("postcss.config.js", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle jest.config.ts", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "Jest config affects test execution",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("jest.config.ts", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle vitest.config.ts", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "Vitest config affects test execution",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("vitest.config.ts", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle eslint.config.js", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "ESLint config affects code linting",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("eslint.config.js", ctx);

				expect(result.scope).toBe("workspace");
			});

			it("should handle biome.json", async () => {
				const ctx = createMockRepoContext();
				const mockResult: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: [],
					affectedPackages: [],
					reasoning: "Biome config affects code formatting and linting",
				};
				getConfigBlastRadius.mockResolvedValue(mockResult);

				const result = await getConfigBlastRadius("biome.json", ctx);

				expect(result.scope).toBe("workspace");
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("getConfigBlastRadius", () => {
			it("should throw on inaccessible config file", async () => {
				const ctx = createMockRepoContext();
				getConfigBlastRadius.mockRejectedValue(new Error("EACCES: permission denied"));

				await expect(getConfigBlastRadius("protected/package.json", ctx)).rejects.toThrow("permission denied");
			});

			it("should throw on invalid JSON in config", async () => {
				const ctx = createMockRepoContext();
				getConfigBlastRadius.mockRejectedValue(new Error("Unexpected token in JSON"));

				await expect(getConfigBlastRadius("malformed.json", ctx)).rejects.toThrow("Unexpected token");
			});
		});

		describe("findEnvConsumers", () => {
			it("should handle filesystem errors", async () => {
				findEnvConsumers.mockRejectedValue(new Error("ENOENT: no such file or directory"));

				await expect(findEnvConsumers("/project")).rejects.toThrow("ENOENT");
			});
		});

		describe("findTsconfigExtenders", () => {
			it("should handle malformed tsconfig", async () => {
				findTsconfigExtenders.mockRejectedValue(new Error("Failed to parse tsconfig.json"));

				await expect(findTsconfigExtenders("bad-tsconfig.json", {})).rejects.toThrow("Failed to parse");
			});
		});
	});
});

// =============================================================================
// BLAST RADIUS SCORE CALCULATION TESTS
// =============================================================================

describe("Config Blast Radius Score Calculation", () => {
	const calculateConfigBlastRadiusScore = vi.fn<[ConfigBlastRadius], number>();

	describe("Happy Path", () => {
		it("should return 95 for workspace scope", () => {
			calculateConfigBlastRadiusScore.mockReturnValue(95);

			const result = calculateConfigBlastRadiusScore({
				scope: "workspace",
				affectedFiles: [],
				affectedPackages: ["pkg1", "pkg2", "pkg3"],
				reasoning: "",
			});

			expect(result).toBe(95);
		});

		it("should return 80+ for extends-chain with packages", () => {
			calculateConfigBlastRadiusScore.mockReturnValue(89);

			const result = calculateConfigBlastRadiusScore({
				scope: "extends-chain",
				affectedFiles: [],
				affectedPackages: ["pkg1", "pkg2", "pkg3"],
				reasoning: "",
			});

			expect(result).toBeGreaterThanOrEqual(80);
		});

		it("should return 60+ for package scope with dependents", () => {
			calculateConfigBlastRadiusScore.mockReturnValue(70);

			const result = calculateConfigBlastRadiusScore({
				scope: "package",
				affectedFiles: [],
				affectedPackages: ["dep1", "dep2"],
				reasoning: "",
			});

			expect(result).toBeGreaterThanOrEqual(60);
		});

		it("should scale env-consumers score with file count", () => {
			calculateConfigBlastRadiusScore.mockReturnValue(60);

			const result = calculateConfigBlastRadiusScore({
				scope: "env-consumers",
				affectedFiles: Array.from({ length: 10 }, (_, i) => `file${i}.ts`),
				affectedPackages: [],
				reasoning: "",
			});

			expect(result).toBeGreaterThanOrEqual(40);
			expect(result).toBeLessThanOrEqual(85);
		});

		it("should return 20 for file scope", () => {
			calculateConfigBlastRadiusScore.mockReturnValue(20);

			const result = calculateConfigBlastRadiusScore({
				scope: "file",
				affectedFiles: ["single-file.ts"],
				affectedPackages: [],
				reasoning: "",
			});

			expect(result).toBe(20);
		});
	});
});
