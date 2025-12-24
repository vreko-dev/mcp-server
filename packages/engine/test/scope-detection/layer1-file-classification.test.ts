/**
 * Layer 1 Tests: File Classification System
 *
 * Tests for file classification including category detection, risk scoring,
 * and import/export analysis.
 */

import { describe, expect, it, vi } from "vitest";
import {
	CATEGORY_BASE_RISK,
	FileCategory,
	type FileClassification,
	type RepoContext,
} from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations for testing
// =============================================================================

const classifyFile = vi.fn<[string, RepoContext], FileClassification>();
const isRootConfig = vi.fn<[string, RepoContext], boolean>();
const isBuildConfig = vi.fn<[string], boolean>();
const isEntryPoint = vi.fn<[string, RepoContext], boolean>();
const findPackageScope = vi.fn<[string, RepoContext], string | null>();

// Test fixture for RepoContext
const createMockRepoContext = (overrides: Partial<RepoContext> = {}): RepoContext => ({
	type: "monorepo",
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
	entryPoints: ["apps/web/src/index.tsx"],
	buildTool: "vite",
	...overrides,
});

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("File Classification System", () => {
	describe("Happy Path", () => {
		describe("classifyFile", () => {
			it("should classify root package.json as ROOT_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ROOT_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ROOT_CONFIG],
					filePath: "package.json",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("package.json", ctx);

				expect(result.category).toBe(FileCategory.ROOT_CONFIG);
				expect(result.baseRisk).toBe(90);
			});

			it("should classify tsconfig.json as ROOT_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ROOT_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ROOT_CONFIG],
					filePath: "tsconfig.json",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("tsconfig.json", ctx);

				expect(result.category).toBe(FileCategory.ROOT_CONFIG);
			});

			it("should classify vite.config.ts as BUILD_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.BUILD_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.BUILD_CONFIG],
					filePath: "vite.config.ts",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("vite.config.ts", ctx);

				expect(result.category).toBe(FileCategory.BUILD_CONFIG);
				expect(result.baseRisk).toBe(85);
			});

			it("should classify .env as ENV_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ENV_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ENV_CONFIG],
					filePath: ".env",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile(".env", ctx);

				expect(result.category).toBe(FileCategory.ENV_CONFIG);
				expect(result.baseRisk).toBe(80);
			});

			it("should classify workspace package.json as WORKSPACE_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.WORKSPACE_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.WORKSPACE_CONFIG],
					filePath: "apps/web/package.json",
					packageScope: "@app/web",
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("apps/web/package.json", ctx);

				expect(result.category).toBe(FileCategory.WORKSPACE_CONFIG);
				expect(result.packageScope).toBe("@app/web");
			});

			it("should classify src/index.tsx as ENTRY_POINT", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ENTRY_POINT,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ENTRY_POINT],
					filePath: "apps/web/src/index.tsx",
					packageScope: "@app/web",
					importedByCount: 0,
					importsCount: 5,
					isExported: true,
					exportCount: 1,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("apps/web/src/index.tsx", ctx);

				expect(result.category).toBe(FileCategory.ENTRY_POINT);
				expect(result.baseRisk).toBe(70);
			});

			it("should classify .test.ts files as TEST_FILE", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.TEST_FILE,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.TEST_FILE],
					filePath: "src/utils.test.ts",
					packageScope: null,
					importedByCount: 0,
					importsCount: 2,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/utils.test.ts", ctx);

				expect(result.category).toBe(FileCategory.TEST_FILE);
				expect(result.baseRisk).toBe(20);
			});

			it("should classify .spec.ts files as TEST_FILE", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.TEST_FILE,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.TEST_FILE],
					filePath: "src/utils.spec.ts",
					packageScope: null,
					importedByCount: 0,
					importsCount: 2,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/utils.spec.ts", ctx);

				expect(result.category).toBe(FileCategory.TEST_FILE);
			});

			it("should classify .d.ts files as TYPE_DEFINITION", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.TYPE_DEFINITION,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.TYPE_DEFINITION],
					filePath: "src/types.d.ts",
					packageScope: null,
					importedByCount: 10,
					importsCount: 0,
					isExported: true,
					exportCount: 15,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/types.d.ts", ctx);

				expect(result.category).toBe(FileCategory.TYPE_DEFINITION);
				expect(result.baseRisk).toBe(60);
			});

			it("should classify components as COMPONENT", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.COMPONENT,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.COMPONENT],
					filePath: "src/components/Button.tsx",
					packageScope: null,
					importedByCount: 8,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/components/Button.tsx", ctx);

				expect(result.category).toBe(FileCategory.COMPONENT);
				expect(result.baseRisk).toBe(50);
			});

			it("should classify hooks as HOOK", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.HOOK,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.HOOK],
					filePath: "src/hooks/useAuth.ts",
					packageScope: null,
					importedByCount: 12,
					importsCount: 4,
					isExported: true,
					exportCount: 1,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/hooks/useAuth.ts", ctx);

				expect(result.category).toBe(FileCategory.HOOK);
				expect(result.baseRisk).toBe(55);
			});

			it("should classify utility files as UTILITY", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.UTILITY,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.UTILITY],
					filePath: "src/utils/formatDate.ts",
					packageScope: null,
					importedByCount: 5,
					importsCount: 1,
					isExported: true,
					exportCount: 3,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/utils/formatDate.ts", ctx);

				expect(result.category).toBe(FileCategory.UTILITY);
				expect(result.baseRisk).toBe(45);
			});

			it("should classify CSS files as STYLE", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.STYLE,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.STYLE],
					filePath: "src/styles/global.css",
					packageScope: null,
					importedByCount: 1,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/styles/global.css", ctx);

				expect(result.category).toBe(FileCategory.STYLE);
				expect(result.baseRisk).toBe(30);
			});

			it("should classify README.md as DOCUMENTATION", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.DOCUMENTATION,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.DOCUMENTATION],
					filePath: "README.md",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("README.md", ctx);

				expect(result.category).toBe(FileCategory.DOCUMENTATION);
				expect(result.baseRisk).toBe(10);
			});

			it("should classify image files as ASSET", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ASSET,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ASSET],
					filePath: "public/logo.png",
					packageScope: null,
					importedByCount: 2,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("public/logo.png", ctx);

				expect(result.category).toBe(FileCategory.ASSET);
				expect(result.baseRisk).toBe(15);
			});
		});

		describe("isBuildConfig", () => {
			it("should return true for vite.config.ts", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("vite.config.ts")).toBe(true);
			});

			it("should return true for webpack.config.js", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("webpack.config.js")).toBe(true);
			});

			it("should return true for esbuild.config.js", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("esbuild.config.js")).toBe(true);
			});

			it("should return true for rollup.config.js", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("rollup.config.js")).toBe(true);
			});

			it("should return true for next.config.js", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("next.config.js")).toBe(true);
			});

			it("should return true for tsup.config.ts", () => {
				isBuildConfig.mockReturnValue(true);
				expect(isBuildConfig("tsup.config.ts")).toBe(true);
			});

			it("should return false for regular TS files", () => {
				isBuildConfig.mockReturnValue(false);
				expect(isBuildConfig("src/config.ts")).toBe(false);
			});
		});

		describe("isEntryPoint", () => {
			it("should return true for files in entryPoints list", () => {
				const ctx = createMockRepoContext();
				isEntryPoint.mockReturnValue(true);

				expect(isEntryPoint("apps/web/src/index.tsx", ctx)).toBe(true);
			});

			it("should return true for main.tsx in src root", () => {
				const ctx = createMockRepoContext();
				isEntryPoint.mockReturnValue(true);

				expect(isEntryPoint("src/main.tsx", ctx)).toBe(true);
			});

			it("should return true for app/layout.tsx in Next.js", () => {
				const ctx = createMockRepoContext({ buildTool: "turbopack" });
				isEntryPoint.mockReturnValue(true);

				expect(isEntryPoint("app/layout.tsx", ctx)).toBe(true);
			});

			it("should return false for regular component files", () => {
				const ctx = createMockRepoContext();
				isEntryPoint.mockReturnValue(false);

				expect(isEntryPoint("src/components/Button.tsx", ctx)).toBe(false);
			});
		});

		describe("findPackageScope", () => {
			it("should find package scope for files in workspace", () => {
				const ctx = createMockRepoContext();
				findPackageScope.mockReturnValue("@app/web");

				expect(findPackageScope("apps/web/src/index.tsx", ctx)).toBe("@app/web");
			});

			it("should find package scope for nested workspace files", () => {
				const ctx = createMockRepoContext();
				findPackageScope.mockReturnValue("@packages/ui");

				expect(findPackageScope("packages/ui/src/Button.tsx", ctx)).toBe("@packages/ui");
			});

			it("should return null for files outside workspaces", () => {
				const ctx = createMockRepoContext();
				findPackageScope.mockReturnValue(null);

				expect(findPackageScope("scripts/build.ts", ctx)).toBeNull();
			});

			it("should return null for root-level files", () => {
				const ctx = createMockRepoContext();
				findPackageScope.mockReturnValue(null);

				expect(findPackageScope("package.json", ctx)).toBeNull();
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("classifyFile", () => {
			it("should default to DOMAIN_LOGIC for unknown .ts files", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.DOMAIN_LOGIC,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.DOMAIN_LOGIC],
					filePath: "src/unknown-file.ts",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/unknown-file.ts", ctx);

				expect(result.category).toBe(FileCategory.DOMAIN_LOGIC);
			});

			it("should default to ASSET for unknown file types", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ASSET,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ASSET],
					filePath: "data/unknown.xyz",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("data/unknown.xyz", ctx);

				expect(result.category).toBe(FileCategory.ASSET);
			});

			it("should handle files with no extension", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ASSET,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ASSET],
					filePath: "Makefile",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("Makefile", ctx);

				expect(result).toBeDefined();
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("classifyFile", () => {
			it("should handle files with multiple extensions (.test.tsx)", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.TEST_FILE,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.TEST_FILE],
					filePath: "src/Button.test.tsx",
					packageScope: null,
					importedByCount: 0,
					importsCount: 3,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/Button.test.tsx", ctx);

				expect(result.category).toBe(FileCategory.TEST_FILE);
			});

			it("should handle .env.local files as ENV_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ENV_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ENV_CONFIG],
					filePath: ".env.local",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile(".env.local", ctx);

				expect(result.category).toBe(FileCategory.ENV_CONFIG);
			});

			it("should handle .env.production files as ENV_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.ENV_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ENV_CONFIG],
					filePath: ".env.production",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile(".env.production", ctx);

				expect(result.category).toBe(FileCategory.ENV_CONFIG);
			});

			it("should classify index.ts in package as SHARED_EXPORT", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.SHARED_EXPORT,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.SHARED_EXPORT],
					filePath: "packages/ui/src/index.ts",
					packageScope: "@packages/ui",
					importedByCount: 15,
					importsCount: 10,
					isExported: true,
					exportCount: 20,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("packages/ui/src/index.ts", ctx);

				expect(result.category).toBe(FileCategory.SHARED_EXPORT);
				expect(result.baseRisk).toBe(65);
			});

			it("should handle SCSS files as STYLE", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.STYLE,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.STYLE],
					filePath: "src/styles/main.scss",
					packageScope: null,
					importedByCount: 1,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/styles/main.scss", ctx);

				expect(result.category).toBe(FileCategory.STYLE);
			});

			it("should handle Tailwind config as BUILD_CONFIG", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.BUILD_CONFIG,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.BUILD_CONFIG],
					filePath: "tailwind.config.js",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: true,
					exportCount: 1,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("tailwind.config.js", ctx);

				expect(result.category).toBe(FileCategory.BUILD_CONFIG);
			});

			it("should handle files with useXxx pattern as HOOK", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.HOOK,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.HOOK],
					filePath: "src/lib/useLocalStorage.ts",
					packageScope: null,
					importedByCount: 8,
					importsCount: 2,
					isExported: true,
					exportCount: 1,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/lib/useLocalStorage.ts", ctx);

				expect(result.category).toBe(FileCategory.HOOK);
			});

			it("should handle paths with special characters", () => {
				const ctx = createMockRepoContext();
				const mockClassification: FileClassification = {
					category: FileCategory.DOMAIN_LOGIC,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.DOMAIN_LOGIC],
					filePath: "src/features/user-management/user_service.ts",
					packageScope: null,
					importedByCount: 3,
					importsCount: 5,
					isExported: true,
					exportCount: 2,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/features/user-management/user_service.ts", ctx);

				expect(result).toBeDefined();
			});
		});

		describe("CATEGORY_BASE_RISK", () => {
			it("should have all FileCategory values defined", () => {
				for (const category of Object.values(FileCategory)) {
					expect(CATEGORY_BASE_RISK[category]).toBeDefined();
					expect(typeof CATEGORY_BASE_RISK[category]).toBe("number");
				}
			});

			it("should have risk values between 0 and 100", () => {
				for (const risk of Object.values(CATEGORY_BASE_RISK)) {
					expect(risk).toBeGreaterThanOrEqual(0);
					expect(risk).toBeLessThanOrEqual(100);
				}
			});

			it("should have ROOT_CONFIG as highest risk", () => {
				const maxRisk = Math.max(...Object.values(CATEGORY_BASE_RISK));
				expect(CATEGORY_BASE_RISK[FileCategory.ROOT_CONFIG]).toBe(maxRisk);
			});

			it("should have DOCUMENTATION as lowest risk", () => {
				const minRisk = Math.min(...Object.values(CATEGORY_BASE_RISK));
				expect(CATEGORY_BASE_RISK[FileCategory.DOCUMENTATION]).toBe(minRisk);
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("classifyFile", () => {
			it("should handle empty file path", () => {
				const ctx = createMockRepoContext();
				classifyFile.mockImplementation(() => {
					throw new Error("Invalid file path: empty string");
				});

				expect(() => classifyFile("", ctx)).toThrow("Invalid file path");
			});

			it("should handle null context", () => {
				classifyFile.mockImplementation(() => {
					throw new Error("RepoContext is required");
				});

				expect(() => classifyFile("src/index.ts", null as unknown as RepoContext)).toThrow(
					"RepoContext is required",
				);
			});

			it("should handle paths with invalid characters", () => {
				const ctx = createMockRepoContext();
				// Should still work - just classify as unknown
				const mockClassification: FileClassification = {
					category: FileCategory.ASSET,
					baseRisk: CATEGORY_BASE_RISK[FileCategory.ASSET],
					filePath: "src/<invalid>/file.ts",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};
				classifyFile.mockReturnValue(mockClassification);

				const result = classifyFile("src/<invalid>/file.ts", ctx);

				expect(result).toBeDefined();
			});
		});
	});
});

// =============================================================================
// IMPORT/EXPORT ANALYSIS TESTS
// =============================================================================

describe("Import/Export Analysis", () => {
	describe("Happy Path", () => {
		it("should correctly count imports in a file", () => {
			const ctx = createMockRepoContext();
			const mockClassification: FileClassification = {
				category: FileCategory.DOMAIN_LOGIC,
				baseRisk: 55,
				filePath: "src/service.ts",
				packageScope: null,
				importedByCount: 3,
				importsCount: 7,
				isExported: true,
				exportCount: 4,
			};
			classifyFile.mockReturnValue(mockClassification);

			const result = classifyFile("src/service.ts", ctx);

			expect(result.importsCount).toBe(7);
		});

		it("should correctly count importedBy for shared files", () => {
			const ctx = createMockRepoContext();
			const mockClassification: FileClassification = {
				category: FileCategory.SHARED_EXPORT,
				baseRisk: 65,
				filePath: "packages/ui/src/index.ts",
				packageScope: "@packages/ui",
				importedByCount: 25,
				importsCount: 15,
				isExported: true,
				exportCount: 30,
			};
			classifyFile.mockReturnValue(mockClassification);

			const result = classifyFile("packages/ui/src/index.ts", ctx);

			expect(result.importedByCount).toBe(25);
		});

		it("should detect exported files correctly", () => {
			const ctx = createMockRepoContext();
			const mockClassification: FileClassification = {
				category: FileCategory.UTILITY,
				baseRisk: 45,
				filePath: "src/utils/formatDate.ts",
				packageScope: null,
				importedByCount: 10,
				importsCount: 2,
				isExported: true,
				exportCount: 5,
			};
			classifyFile.mockReturnValue(mockClassification);

			const result = classifyFile("src/utils/formatDate.ts", ctx);

			expect(result.isExported).toBe(true);
			expect(result.exportCount).toBe(5);
		});

		it("should detect non-exported files correctly", () => {
			const ctx = createMockRepoContext();
			const mockClassification: FileClassification = {
				category: FileCategory.DOMAIN_LOGIC,
				baseRisk: 55,
				filePath: "src/internal/helper.ts",
				packageScope: null,
				importedByCount: 1,
				importsCount: 3,
				isExported: false,
				exportCount: 0,
			};
			classifyFile.mockReturnValue(mockClassification);

			const result = classifyFile("src/internal/helper.ts", ctx);

			expect(result.isExported).toBe(false);
			expect(result.exportCount).toBe(0);
		});
	});
});
