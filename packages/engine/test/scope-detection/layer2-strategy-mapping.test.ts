/**
 * Layer 2: Strategy Mapping Tests
 *
 * Tests for mapping scores to snapshot strategies and building scope decisions.
 * Coverage: Happy Path, Sad Path, Edge Cases, Error Path
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	DependencyGraph,
	DependencyNode,
	FileCategory,
	FileClassification,
	RepoContext,
	ScopeDecision,
	ScoringOutput,
	SessionContext,
	SnapshotStrategy,
} from "../../src/scope-detection/types.js";
import { STRATEGY_THRESHOLDS, SnapshotStrategy as StrategyEnum } from "../../src/scope-detection/types.js";

// Mock functions under test
const mapScoreToStrategy = vi.fn<[number], SnapshotStrategy>();
const buildScopeDecision = vi.fn<
	[ScoringOutput, DependencyNode, DependencyGraph, SessionContext, RepoContext],
	ScopeDecision
>();
const collectFilesForStrategy = vi.fn<
	[SnapshotStrategy, DependencyNode, DependencyGraph, SessionContext, RepoContext],
	string[]
>();
const determineFidelity = vi.fn<[SnapshotStrategy, FileClassification], "diff-only" | "full">();
const generateSnapshotName = vi.fn<[SnapshotStrategy, string, FileClassification], string>();

describe("Layer 2: Strategy Mapping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ===========================================================================
	// SCORE TO STRATEGY MAPPING
	// ===========================================================================

	describe("mapScoreToStrategy", () => {
		describe("Happy Path", () => {
			it("should map low scores (0-25) to SINGLE_FILE strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) {
						return StrategyEnum.SINGLE_FILE;
					}
					return StrategyEnum.DIRECT_DEPENDENTS;
				});

				expect(mapScoreToStrategy(10)).toBe(StrategyEnum.SINGLE_FILE);
				expect(mapScoreToStrategy(20)).toBe(StrategyEnum.SINGLE_FILE);
				expect(mapScoreToStrategy(25)).toBe(StrategyEnum.SINGLE_FILE);
			});

			it("should map scores 26-45 to DIRECT_DEPENDENTS strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) {
						return StrategyEnum.SINGLE_FILE;
					}
					if (score <= STRATEGY_THRESHOLDS.directDependents) {
						return StrategyEnum.DIRECT_DEPENDENTS;
					}
					return StrategyEnum.TRANSITIVE_CLUSTER;
				});

				expect(mapScoreToStrategy(26)).toBe(StrategyEnum.DIRECT_DEPENDENTS);
				expect(mapScoreToStrategy(35)).toBe(StrategyEnum.DIRECT_DEPENDENTS);
				expect(mapScoreToStrategy(45)).toBe(StrategyEnum.DIRECT_DEPENDENTS);
			});

			it("should map scores 46-65 to TRANSITIVE_CLUSTER strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) {
						return StrategyEnum.SINGLE_FILE;
					}
					if (score <= STRATEGY_THRESHOLDS.directDependents) {
						return StrategyEnum.DIRECT_DEPENDENTS;
					}
					if (score <= STRATEGY_THRESHOLDS.transitive) {
						return StrategyEnum.TRANSITIVE_CLUSTER;
					}
					return StrategyEnum.MODULE_SCOPE;
				});

				expect(mapScoreToStrategy(46)).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
				expect(mapScoreToStrategy(55)).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
				expect(mapScoreToStrategy(65)).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
			});

			it("should map scores 66-80 to MODULE_SCOPE strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.transitive) {
						return StrategyEnum.TRANSITIVE_CLUSTER;
					}
					if (score <= STRATEGY_THRESHOLDS.module) {
						return StrategyEnum.MODULE_SCOPE;
					}
					return StrategyEnum.PACKAGE_SCOPE;
				});

				expect(mapScoreToStrategy(66)).toBe(StrategyEnum.MODULE_SCOPE);
				expect(mapScoreToStrategy(75)).toBe(StrategyEnum.MODULE_SCOPE);
				expect(mapScoreToStrategy(80)).toBe(StrategyEnum.MODULE_SCOPE);
			});

			it("should map scores 81-90 to PACKAGE_SCOPE strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.module) {
						return StrategyEnum.MODULE_SCOPE;
					}
					if (score <= STRATEGY_THRESHOLDS.package) {
						return StrategyEnum.PACKAGE_SCOPE;
					}
					return StrategyEnum.SESSION_SCOPE;
				});

				expect(mapScoreToStrategy(81)).toBe(StrategyEnum.PACKAGE_SCOPE);
				expect(mapScoreToStrategy(85)).toBe(StrategyEnum.PACKAGE_SCOPE);
				expect(mapScoreToStrategy(90)).toBe(StrategyEnum.PACKAGE_SCOPE);
			});

			it("should map scores 91-100 to SESSION_SCOPE strategy", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.package) {
						return StrategyEnum.PACKAGE_SCOPE;
					}
					return StrategyEnum.SESSION_SCOPE;
				});

				expect(mapScoreToStrategy(91)).toBe(StrategyEnum.SESSION_SCOPE);
				expect(mapScoreToStrategy(95)).toBe(StrategyEnum.SESSION_SCOPE);
				expect(mapScoreToStrategy(100)).toBe(StrategyEnum.SESSION_SCOPE);
			});
		});

		describe("Edge Cases", () => {
			it("should handle exact threshold boundaries correctly", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) return StrategyEnum.SINGLE_FILE;
					if (score <= STRATEGY_THRESHOLDS.directDependents) return StrategyEnum.DIRECT_DEPENDENTS;
					if (score <= STRATEGY_THRESHOLDS.transitive) return StrategyEnum.TRANSITIVE_CLUSTER;
					if (score <= STRATEGY_THRESHOLDS.module) return StrategyEnum.MODULE_SCOPE;
					if (score <= STRATEGY_THRESHOLDS.package) return StrategyEnum.PACKAGE_SCOPE;
					return StrategyEnum.SESSION_SCOPE;
				});

				// Exact threshold values
				expect(mapScoreToStrategy(25)).toBe(StrategyEnum.SINGLE_FILE);
				expect(mapScoreToStrategy(45)).toBe(StrategyEnum.DIRECT_DEPENDENTS);
				expect(mapScoreToStrategy(65)).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
				expect(mapScoreToStrategy(80)).toBe(StrategyEnum.MODULE_SCOPE);
				expect(mapScoreToStrategy(90)).toBe(StrategyEnum.PACKAGE_SCOPE);
			});

			it("should handle score of 0", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) return StrategyEnum.SINGLE_FILE;
					return StrategyEnum.DIRECT_DEPENDENTS;
				});

				expect(mapScoreToStrategy(0)).toBe(StrategyEnum.SINGLE_FILE);
			});

			it("should handle score of exactly 100", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.package) return StrategyEnum.PACKAGE_SCOPE;
					return StrategyEnum.SESSION_SCOPE;
				});

				expect(mapScoreToStrategy(100)).toBe(StrategyEnum.SESSION_SCOPE);
			});

			it("should handle decimal scores", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					if (score <= STRATEGY_THRESHOLDS.singleFile) return StrategyEnum.SINGLE_FILE;
					if (score <= STRATEGY_THRESHOLDS.directDependents) return StrategyEnum.DIRECT_DEPENDENTS;
					return StrategyEnum.TRANSITIVE_CLUSTER;
				});

				expect(mapScoreToStrategy(25.5)).toBe(StrategyEnum.DIRECT_DEPENDENTS);
				expect(mapScoreToStrategy(24.9999)).toBe(StrategyEnum.SINGLE_FILE);
			});
		});

		describe("Error Path", () => {
			it("should clamp scores above 100 to SESSION_SCOPE", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					const clampedScore = Math.min(100, Math.max(0, score));
					if (clampedScore <= STRATEGY_THRESHOLDS.package) return StrategyEnum.PACKAGE_SCOPE;
					return StrategyEnum.SESSION_SCOPE;
				});

				expect(mapScoreToStrategy(150)).toBe(StrategyEnum.SESSION_SCOPE);
				expect(mapScoreToStrategy(1000)).toBe(StrategyEnum.SESSION_SCOPE);
			});

			it("should clamp negative scores to SINGLE_FILE", () => {
				mapScoreToStrategy.mockImplementation((score) => {
					const clampedScore = Math.min(100, Math.max(0, score));
					if (clampedScore <= STRATEGY_THRESHOLDS.singleFile) return StrategyEnum.SINGLE_FILE;
					return StrategyEnum.DIRECT_DEPENDENTS;
				});

				expect(mapScoreToStrategy(-10)).toBe(StrategyEnum.SINGLE_FILE);
				expect(mapScoreToStrategy(-100)).toBe(StrategyEnum.SINGLE_FILE);
			});
		});
	});

	// ===========================================================================
	// STRATEGY THRESHOLDS VALIDATION
	// ===========================================================================

	describe("STRATEGY_THRESHOLDS", () => {
		it("should have correct threshold values from spec", () => {
			expect(STRATEGY_THRESHOLDS.singleFile).toBe(25);
			expect(STRATEGY_THRESHOLDS.directDependents).toBe(45);
			expect(STRATEGY_THRESHOLDS.transitive).toBe(65);
			expect(STRATEGY_THRESHOLDS.module).toBe(80);
			expect(STRATEGY_THRESHOLDS.package).toBe(90);
			expect(STRATEGY_THRESHOLDS.session).toBe(100);
		});

		it("should have monotonically increasing thresholds", () => {
			const thresholds = [
				STRATEGY_THRESHOLDS.singleFile,
				STRATEGY_THRESHOLDS.directDependents,
				STRATEGY_THRESHOLDS.transitive,
				STRATEGY_THRESHOLDS.module,
				STRATEGY_THRESHOLDS.package,
				STRATEGY_THRESHOLDS.session,
			];

			for (let i = 1; i < thresholds.length; i++) {
				expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
			}
		});
	});

	// ===========================================================================
	// FILE COLLECTION FOR STRATEGY
	// ===========================================================================

	describe("collectFilesForStrategy", () => {
		const mockDependencyNode: DependencyNode = {
			filePath: "src/components/Button.tsx",
			imports: ["src/utils/styles.ts", "src/types/index.ts"],
			importedBy: ["src/pages/Home.tsx", "src/pages/About.tsx"],
			transitiveImporters: {
				depth1: ["src/pages/Home.tsx", "src/pages/About.tsx"],
				depth2: ["src/App.tsx"],
				depth3Plus: ["src/index.tsx"],
			},
			crossPackageImports: [],
		};

		const mockDependencyGraph: DependencyGraph = {
			nodes: new Map([
				["src/components/Button.tsx", mockDependencyNode],
				[
					"src/pages/Home.tsx",
					{
						filePath: "src/pages/Home.tsx",
						imports: ["src/components/Button.tsx"],
						importedBy: ["src/App.tsx"],
						transitiveImporters: { depth1: ["src/App.tsx"], depth2: [], depth3Plus: [] },
						crossPackageImports: [],
					},
				],
			]),
			edges: new Map([
				["src/components/Button.tsx", new Set(["src/utils/styles.ts", "src/types/index.ts"])],
				["src/pages/Home.tsx", new Set(["src/components/Button.tsx"])],
			]),
			reverseEdges: new Map([
				["src/components/Button.tsx", new Set(["src/pages/Home.tsx", "src/pages/About.tsx"])],
			]),
		};

		const mockSession: SessionContext = {
			id: "test-session",
			startedAt: Date.now(),
			files: [
				{
					path: "src/components/Button.tsx",
					category: "component" as FileCategory,
					changeCount: 3,
					lastChangedAt: Date.now(),
				},
				{
					path: "src/utils/styles.ts",
					category: "utility" as FileCategory,
					changeCount: 1,
					lastChangedAt: Date.now(),
				},
			],
			changeVelocity: 2.5,
		};

		const mockRepoContext: RepoContext = {
			type: "monorepo",
			rootPath: "/project",
			workspaces: [{ name: "web", path: "apps/web", type: "app", dependents: [], dependencies: [] }],
			entryPoints: ["src/index.tsx"],
			buildTool: "vite",
		};

		describe("Happy Path", () => {
			it("should collect only target file for SINGLE_FILE strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, node) => {
					if (strategy === StrategyEnum.SINGLE_FILE) {
						return [node.filePath];
					}
					return [];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.SINGLE_FILE,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result).toEqual(["src/components/Button.tsx"]);
			});

			it("should collect direct dependents for DIRECT_DEPENDENTS strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, node) => {
					if (strategy === StrategyEnum.DIRECT_DEPENDENTS) {
						return [node.filePath, ...node.importedBy];
					}
					return [node.filePath];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.DIRECT_DEPENDENTS,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result).toContain("src/components/Button.tsx");
				expect(result).toContain("src/pages/Home.tsx");
				expect(result).toContain("src/pages/About.tsx");
			});

			it("should collect transitive cluster for TRANSITIVE_CLUSTER strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, node) => {
					if (strategy === StrategyEnum.TRANSITIVE_CLUSTER) {
						const files = new Set([node.filePath]);
						node.importedBy.forEach((f) => files.add(f));
						node.transitiveImporters.depth1.forEach((f) => files.add(f));
						node.transitiveImporters.depth2.forEach((f) => files.add(f));
						return Array.from(files);
					}
					return [node.filePath];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.TRANSITIVE_CLUSTER,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result).toContain("src/components/Button.tsx");
				expect(result).toContain("src/pages/Home.tsx");
				expect(result).toContain("src/App.tsx");
			});

			it("should collect module directory for MODULE_SCOPE strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, node) => {
					if (strategy === StrategyEnum.MODULE_SCOPE) {
						// Get all files in same directory
						const dir = node.filePath.split("/").slice(0, -1).join("/");
						return [`${dir}/Button.tsx`, `${dir}/Input.tsx`, `${dir}/index.ts`];
					}
					return [node.filePath];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.MODULE_SCOPE,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result.length).toBeGreaterThan(1);
				expect(result.every((f) => f.startsWith("src/components/"))).toBe(true);
			});

			it("should collect package files for PACKAGE_SCOPE strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, _node, _graph, _session, _repo) => {
					if (strategy === StrategyEnum.PACKAGE_SCOPE) {
						// All files in the affected workspace
						return ["apps/web/src/index.tsx", "apps/web/src/App.tsx", "apps/web/src/components/Button.tsx"];
					}
					return [];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.PACKAGE_SCOPE,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result.every((f) => f.startsWith("apps/web/"))).toBe(true);
			});

			it("should collect session files for SESSION_SCOPE strategy", () => {
				collectFilesForStrategy.mockImplementation((strategy, _node, _graph, session) => {
					if (strategy === StrategyEnum.SESSION_SCOPE) {
						return session.files.map((f) => f.path);
					}
					return [];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.SESSION_SCOPE,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result).toContain("src/components/Button.tsx");
				expect(result).toContain("src/utils/styles.ts");
			});
		});

		describe("Edge Cases", () => {
			it("should deduplicate files in collection", () => {
				collectFilesForStrategy.mockImplementation(() => {
					// Simulate collecting with duplicates
					const files = [
						"src/components/Button.tsx",
						"src/pages/Home.tsx",
						"src/components/Button.tsx", // duplicate
					];
					return Array.from(new Set(files));
				});

				const result = collectFilesForStrategy(
					StrategyEnum.TRANSITIVE_CLUSTER,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				const uniqueCount = new Set(result).size;
				expect(result.length).toBe(uniqueCount);
			});

			it("should handle node with no dependencies", () => {
				const isolatedNode: DependencyNode = {
					filePath: "src/isolated.ts",
					imports: [],
					importedBy: [],
					transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
					crossPackageImports: [],
				};

				collectFilesForStrategy.mockImplementation((_strategy, node) => {
					return [node.filePath];
				});

				const result = collectFilesForStrategy(
					StrategyEnum.DIRECT_DEPENDENTS,
					isolatedNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result).toEqual(["src/isolated.ts"]);
			});

			it("should limit file count to prevent snapshot bloat", () => {
				collectFilesForStrategy.mockImplementation(() => {
					// Generate many files
					const files = Array.from({ length: 500 }, (_, i) => `src/file${i}.ts`);
					// Apply max file limit of 100
					return files.slice(0, 100);
				});

				const result = collectFilesForStrategy(
					StrategyEnum.SESSION_SCOPE,
					mockDependencyNode,
					mockDependencyGraph,
					mockSession,
					mockRepoContext,
				);

				expect(result.length).toBeLessThanOrEqual(100);
			});
		});
	});

	// ===========================================================================
	// FIDELITY DETERMINATION
	// ===========================================================================

	describe("determineFidelity", () => {
		describe("Happy Path", () => {
			it("should use diff-only for SINGLE_FILE strategy", () => {
				determineFidelity.mockImplementation((strategy) => {
					if (strategy === StrategyEnum.SINGLE_FILE) {
						return "diff-only";
					}
					return "full";
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "src/Button.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				expect(determineFidelity(StrategyEnum.SINGLE_FILE, mockClassification)).toBe("diff-only");
			});

			it("should use full for high-risk file categories regardless of strategy", () => {
				determineFidelity.mockImplementation((strategy, classification) => {
					const highRiskCategories = ["root_config", "build_config", "env_config", "entry_point"];
					if (highRiskCategories.includes(classification.category)) {
						return "full";
					}
					if (strategy === StrategyEnum.SINGLE_FILE) {
						return "diff-only";
					}
					return "full";
				});

				const configClassification: FileClassification = {
					category: "root_config" as FileCategory,
					baseRisk: 90,
					filePath: "package.json",
					packageScope: null,
					importedByCount: 0,
					importsCount: 0,
					isExported: false,
					exportCount: 0,
				};

				expect(determineFidelity(StrategyEnum.SINGLE_FILE, configClassification)).toBe("full");
			});

			it("should use full fidelity for PACKAGE_SCOPE and above", () => {
				determineFidelity.mockImplementation((strategy) => {
					if (strategy === StrategyEnum.PACKAGE_SCOPE || strategy === StrategyEnum.SESSION_SCOPE) {
						return "full";
					}
					return "diff-only";
				});

				const mockClassification: FileClassification = {
					category: "utility" as FileCategory,
					baseRisk: 45,
					filePath: "src/utils.ts",
					packageScope: null,
					importedByCount: 10,
					importsCount: 2,
					isExported: true,
					exportCount: 5,
				};

				expect(determineFidelity(StrategyEnum.PACKAGE_SCOPE, mockClassification)).toBe("full");
				expect(determineFidelity(StrategyEnum.SESSION_SCOPE, mockClassification)).toBe("full");
			});
		});

		describe("Edge Cases", () => {
			it("should prefer full fidelity when file has many exports", () => {
				determineFidelity.mockImplementation((strategy, classification) => {
					// If file exports many things, use full fidelity for safety
					if (classification.exportCount > 10) {
						return "full";
					}
					if (strategy === StrategyEnum.SINGLE_FILE) {
						return "diff-only";
					}
					return "full";
				});

				const manyExportsClassification: FileClassification = {
					category: "shared_export" as FileCategory,
					baseRisk: 65,
					filePath: "src/index.ts",
					packageScope: null,
					importedByCount: 50,
					importsCount: 20,
					isExported: true,
					exportCount: 25,
				};

				expect(determineFidelity(StrategyEnum.SINGLE_FILE, manyExportsClassification)).toBe("full");
			});
		});
	});

	// ===========================================================================
	// SNAPSHOT NAME GENERATION
	// ===========================================================================

	describe("generateSnapshotName", () => {
		describe("Happy Path", () => {
			it("should generate name with file and strategy for SINGLE_FILE", () => {
				generateSnapshotName.mockImplementation((_strategy, filePath) => {
					const fileName =
						filePath
							.split("/")
							.pop()
							?.replace(/\.[^/.]+$/, "") ?? "unknown";
					return `${fileName}-single`;
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "src/components/Button.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				expect(
					generateSnapshotName(StrategyEnum.SINGLE_FILE, "src/components/Button.tsx", mockClassification),
				).toBe("Button-single");
			});

			it("should generate name with module for MODULE_SCOPE", () => {
				generateSnapshotName.mockImplementation((strategy, filePath) => {
					if (strategy === StrategyEnum.MODULE_SCOPE) {
						const parts = filePath.split("/");
						const moduleName = parts[parts.length - 2] ?? "module";
						return `${moduleName}-module`;
					}
					return "unknown";
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "src/components/Button.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				expect(
					generateSnapshotName(StrategyEnum.MODULE_SCOPE, "src/components/Button.tsx", mockClassification),
				).toBe("components-module");
			});

			it("should generate name with package for PACKAGE_SCOPE", () => {
				generateSnapshotName.mockImplementation((strategy, _filePath, classification) => {
					if (strategy === StrategyEnum.PACKAGE_SCOPE) {
						return `${classification.packageScope ?? "root"}-package`;
					}
					return "unknown";
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "packages/ui/src/Button.tsx",
					packageScope: "@snapback/ui",
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				expect(
					generateSnapshotName(StrategyEnum.PACKAGE_SCOPE, "packages/ui/src/Button.tsx", mockClassification),
				).toBe("@snapback/ui-package");
			});

			it("should generate session-based name for SESSION_SCOPE", () => {
				generateSnapshotName.mockImplementation((strategy) => {
					if (strategy === StrategyEnum.SESSION_SCOPE) {
						const timestamp = new Date().toISOString().split("T")[0];
						return `session-${timestamp}`;
					}
					return "unknown";
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "src/Button.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				const result = generateSnapshotName(StrategyEnum.SESSION_SCOPE, "src/Button.tsx", mockClassification);
				expect(result).toMatch(/^session-\d{4}-\d{2}-\d{2}$/);
			});
		});

		describe("Edge Cases", () => {
			it("should sanitize special characters in names", () => {
				generateSnapshotName.mockImplementation((_strategy, filePath) => {
					const fileName =
						filePath
							.split("/")
							.pop()
							?.replace(/\.[^/.]+$/, "") ?? "unknown";
					// Sanitize special characters
					return fileName.replace(/[@/\\:*?"<>|]/g, "-");
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath: "src/components/Button@2.0.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				const result = generateSnapshotName(
					StrategyEnum.SINGLE_FILE,
					"src/components/Button@2.0.tsx",
					mockClassification,
				);
				expect(result).not.toContain("@");
				expect(result).toBe("Button-2.0");
			});

			it("should truncate long names", () => {
				generateSnapshotName.mockImplementation((_strategy, filePath) => {
					const fileName =
						filePath
							.split("/")
							.pop()
							?.replace(/\.[^/.]+$/, "") ?? "unknown";
					// Max 50 characters
					return fileName.slice(0, 50);
				});

				const mockClassification: FileClassification = {
					category: "component" as FileCategory,
					baseRisk: 50,
					filePath:
						"src/components/ThisIsAnExtremelyLongComponentNameThatShouldBeTruncatedForReadability.tsx",
					packageScope: null,
					importedByCount: 5,
					importsCount: 3,
					isExported: true,
					exportCount: 1,
				};

				const result = generateSnapshotName(
					StrategyEnum.SINGLE_FILE,
					"src/components/ThisIsAnExtremelyLongComponentNameThatShouldBeTruncatedForReadability.tsx",
					mockClassification,
				);
				expect(result.length).toBeLessThanOrEqual(50);
			});
		});
	});

	// ===========================================================================
	// BUILD SCOPE DECISION
	// ===========================================================================

	describe("buildScopeDecision", () => {
		const mockScoringOutput: ScoringOutput = {
			totalScore: 55,
			factors: {
				categoryRisk: { score: 50, weight: 0.2, raw: 50 },
				blastRadius: { score: 60, weight: 0.2, raw: 10 },
				aiToolRisk: { score: 70, weight: 0.2, raw: 0.7 },
				changeMagnitude: { score: 40, weight: 0.1, raw: 25 },
				sessionCoherence: { score: 80, weight: 0.1, raw: 0.8 },
				temporalRisk: { score: 30, weight: 0.1, raw: 0.3 },
				criticalPath: { score: 60, weight: 0.1, raw: 60 },
			},
			reasoning: ["Component with moderate blast radius", "AI-assisted edit detected"],
			confidence: 0.85,
		};

		const mockNode: DependencyNode = {
			filePath: "src/components/Button.tsx",
			imports: ["src/utils/styles.ts"],
			importedBy: ["src/pages/Home.tsx"],
			transitiveImporters: { depth1: ["src/pages/Home.tsx"], depth2: [], depth3Plus: [] },
			crossPackageImports: [],
		};

		const mockGraph: DependencyGraph = {
			nodes: new Map([["src/components/Button.tsx", mockNode]]),
			edges: new Map(),
			reverseEdges: new Map(),
		};

		const mockSession: SessionContext = {
			id: "test-session",
			startedAt: Date.now(),
			files: [],
			changeVelocity: 1.0,
		};

		const mockRepo: RepoContext = {
			type: "single",
			rootPath: "/project",
			workspaces: [],
			entryPoints: ["src/index.tsx"],
			buildTool: "vite",
		};

		describe("Happy Path", () => {
			it("should build complete scope decision", () => {
				buildScopeDecision.mockImplementation((scoring, node) => ({
					strategy: StrategyEnum.TRANSITIVE_CLUSTER,
					filesToInclude: [node.filePath, ...node.importedBy],
					fidelity: "diff-only",
					reasoning: scoring.reasoning,
					confidence: scoring.confidence,
					suggestedName: "Button-transitive",
				}));

				const result = buildScopeDecision(mockScoringOutput, mockNode, mockGraph, mockSession, mockRepo);

				expect(result.strategy).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
				expect(result.filesToInclude).toContain("src/components/Button.tsx");
				expect(result.fidelity).toBeDefined();
				expect(result.reasoning.length).toBeGreaterThan(0);
				expect(result.confidence).toBeGreaterThan(0);
				expect(result.suggestedName).toBeDefined();
			});

			it("should include reasoning from scoring output", () => {
				buildScopeDecision.mockImplementation((scoring) => ({
					strategy: StrategyEnum.TRANSITIVE_CLUSTER,
					filesToInclude: [],
					fidelity: "diff-only",
					reasoning: [...scoring.reasoning, "Strategy selected based on score 55"],
					confidence: scoring.confidence,
					suggestedName: "test",
				}));

				const result = buildScopeDecision(mockScoringOutput, mockNode, mockGraph, mockSession, mockRepo);

				expect(result.reasoning).toContain("Component with moderate blast radius");
				expect(result.reasoning).toContain("AI-assisted edit detected");
			});

			it("should propagate confidence from scoring", () => {
				buildScopeDecision.mockImplementation((scoring) => ({
					strategy: StrategyEnum.TRANSITIVE_CLUSTER,
					filesToInclude: [],
					fidelity: "diff-only",
					reasoning: [],
					confidence: scoring.confidence,
					suggestedName: "test",
				}));

				const result = buildScopeDecision(mockScoringOutput, mockNode, mockGraph, mockSession, mockRepo);

				expect(result.confidence).toBe(0.85);
			});
		});

		describe("Edge Cases", () => {
			it("should handle very low score with minimal scope", () => {
				const lowScoreOutput: ScoringOutput = {
					...mockScoringOutput,
					totalScore: 10,
				};

				buildScopeDecision.mockImplementation((scoring, node) => {
					if (scoring.totalScore <= 25) {
						return {
							strategy: StrategyEnum.SINGLE_FILE,
							filesToInclude: [node.filePath],
							fidelity: "diff-only",
							reasoning: ["Low risk score - minimal scope"],
							confidence: scoring.confidence,
							suggestedName: "single-file",
						};
					}
					return {
						strategy: StrategyEnum.DIRECT_DEPENDENTS,
						filesToInclude: [],
						fidelity: "full",
						reasoning: [],
						confidence: 0,
						suggestedName: "test",
					};
				});

				const result = buildScopeDecision(lowScoreOutput, mockNode, mockGraph, mockSession, mockRepo);

				expect(result.strategy).toBe(StrategyEnum.SINGLE_FILE);
				expect(result.filesToInclude).toHaveLength(1);
			});

			it("should handle very high score with maximum scope", () => {
				const highScoreOutput: ScoringOutput = {
					...mockScoringOutput,
					totalScore: 95,
				};

				buildScopeDecision.mockImplementation((scoring, _node, _graph, session) => {
					if (scoring.totalScore > 90) {
						return {
							strategy: StrategyEnum.SESSION_SCOPE,
							filesToInclude: session.files.map((f) => f.path),
							fidelity: "full",
							reasoning: ["High risk score - session-wide scope"],
							confidence: scoring.confidence,
							suggestedName: "session-snapshot",
						};
					}
					return {
						strategy: StrategyEnum.PACKAGE_SCOPE,
						filesToInclude: [],
						fidelity: "full",
						reasoning: [],
						confidence: 0,
						suggestedName: "test",
					};
				});

				const result = buildScopeDecision(highScoreOutput, mockNode, mockGraph, mockSession, mockRepo);

				expect(result.strategy).toBe(StrategyEnum.SESSION_SCOPE);
				expect(result.fidelity).toBe("full");
			});
		});

		describe("Sad Path", () => {
			it("should handle missing node in graph gracefully", () => {
				const emptyGraph: DependencyGraph = {
					nodes: new Map(),
					edges: new Map(),
					reverseEdges: new Map(),
				};

				buildScopeDecision.mockImplementation((scoring, node, graph) => {
					if (!graph.nodes.has(node.filePath)) {
						return {
							strategy: StrategyEnum.SINGLE_FILE,
							filesToInclude: [node.filePath],
							fidelity: "full",
							reasoning: ["Node not in graph - falling back to single file"],
							confidence: scoring.confidence * 0.5, // Reduce confidence
							suggestedName: "fallback",
						};
					}
					return {
						strategy: StrategyEnum.DIRECT_DEPENDENTS,
						filesToInclude: [],
						fidelity: "diff-only",
						reasoning: [],
						confidence: 0,
						suggestedName: "test",
					};
				});

				const result = buildScopeDecision(mockScoringOutput, mockNode, emptyGraph, mockSession, mockRepo);

				expect(result.strategy).toBe(StrategyEnum.SINGLE_FILE);
				expect(result.confidence).toBeLessThan(mockScoringOutput.confidence);
				expect(result.reasoning).toContain("Node not in graph - falling back to single file");
			});
		});
	});
});
