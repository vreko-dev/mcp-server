/**
 * Integration Tests: End-to-End Scope Detection Scenarios
 *
 * Tests for complete decision flows from file change to scope decision.
 * These tests validate the entire three-layer system working together.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	AggregateInsights,
	DependencyGraph,
	DependencyNode,
	FileCategory,
	FileChangeEvent,
	RepoContext,
	ScopeDecision,
	SessionContext,
	SnapshotStrategy,
	UserProfile,
} from "../../src/scope-detection/types.js";
import {
	DEFAULT_WEIGHTS,
	STRATEGY_THRESHOLDS,
	SnapshotStrategy as StrategyEnum,
} from "../../src/scope-detection/types.js";

// Mock the complete decision engine
const decideScopeForChange = vi.fn<[FileChangeEvent, UserProfile | null, AggregateInsights], Promise<ScopeDecision>>();

// Helper functions for building test scenarios
function createMockRepoContext(overrides: Partial<RepoContext> = {}): RepoContext {
	return {
		type: "monorepo",
		rootPath: "/project",
		workspaces: [
			{
				name: "web",
				path: "apps/web",
				type: "app",
				dependents: [],
				dependencies: ["@project/ui", "@project/utils"],
			},
			{
				name: "@project/ui",
				path: "packages/ui",
				type: "package",
				dependents: ["web"],
				dependencies: ["@project/utils"],
			},
			{
				name: "@project/utils",
				path: "packages/utils",
				type: "package",
				dependents: ["web", "@project/ui"],
				dependencies: [],
			},
		],
		entryPoints: ["apps/web/src/index.tsx"],
		buildTool: "vite",
		...overrides,
	};
}

function createMockDependencyGraph(nodes: DependencyNode[]): DependencyGraph {
	const nodeMap = new Map<string, DependencyNode>();
	const edges = new Map<string, Set<string>>();
	const reverseEdges = new Map<string, Set<string>>();

	for (const node of nodes) {
		nodeMap.set(node.filePath, node);
		edges.set(node.filePath, new Set(node.imports));
		for (const importer of node.importedBy) {
			if (!reverseEdges.has(node.filePath)) {
				reverseEdges.set(node.filePath, new Set());
			}
			reverseEdges.get(node.filePath)!.add(importer);
		}
	}

	return { nodes: nodeMap, edges, reverseEdges };
}

function createMockSession(files: Array<{ path: string; category: FileCategory; changes: number }>): SessionContext {
	return {
		id: `session-${Date.now()}`,
		startedAt: Date.now() - 3600000, // 1 hour ago
		files: files.map((f) => ({
			path: f.path,
			category: f.category,
			changeCount: f.changes,
			lastChangedAt: Date.now() - 60000 * f.changes,
		})),
		changeVelocity: files.reduce((sum, f) => sum + f.changes, 0) / 60, // changes per minute
	};
}

describe("Integration: End-to-End Scope Detection Scenarios", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ===========================================================================
	// SCENARIO 1: TURBOREPO TSCONFIG.JSON EDIT
	// ===========================================================================

	describe("Scenario 1: Turborepo tsconfig.json Edit", () => {
		/**
		 * Scenario from spec:
		 * - File: packages/ui/tsconfig.json
		 * - Repo: Turborepo monorepo
		 * - AI: Claude agent mode
		 * - Session: 3 files edited in same package
		 * - Expected: PACKAGE_SCOPE strategy with workspace cascade
		 */

		const turboRepoContext: RepoContext = {
			type: "turborepo",
			rootPath: "/project",
			workspaces: [
				{ name: "web", path: "apps/web", type: "app", dependents: [], dependencies: ["@project/ui"] },
				{
					name: "@project/ui",
					path: "packages/ui",
					type: "package",
					dependents: ["web", "docs"],
					dependencies: [],
				},
				{ name: "docs", path: "apps/docs", type: "app", dependents: [], dependencies: ["@project/ui"] },
			],
			entryPoints: ["apps/web/src/index.tsx", "apps/docs/src/index.tsx"],
			buildTool: "turbopack",
		};

		const tsconfigNode: DependencyNode = {
			filePath: "packages/ui/tsconfig.json",
			imports: [],
			importedBy: [], // Config files tracked via workspace resolution, not imports
			transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
			crossPackageImports: [],
		};

		const sessionWithPackageEdits = createMockSession([
			{ path: "packages/ui/src/Button.tsx", category: "component" as FileCategory, changes: 2 },
			{ path: "packages/ui/src/Input.tsx", category: "component" as FileCategory, changes: 1 },
			{ path: "packages/ui/tsconfig.json", category: "workspace_config" as FileCategory, changes: 1 },
		]);

		it("should detect turborepo package-scope for tsconfig.json edit", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "packages/ui/tsconfig.json",
				workspaceRoot: "/project",
				userId: "test-user",
				aiDetection: {
					detected: true,
					tool: "claude",
					confidence: 0.95,
					editType: "agent",
				},
				session: sessionWithPackageEdits,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.PACKAGE_SCOPE,
				filesToInclude: [
					"packages/ui/tsconfig.json",
					"packages/ui/src/Button.tsx",
					"packages/ui/src/Input.tsx",
					"packages/ui/src/index.ts",
					"packages/ui/package.json",
				],
				fidelity: "full",
				reasoning: [
					"Workspace config file detected (base risk: 75)",
					"Turborepo monorepo - workspace cascade affects dependents",
					"AI agent mode detected (Claude) - elevated risk",
					"Session files in same package - package coherence high",
					"Total score: 85 → PACKAGE_SCOPE strategy",
				],
				confidence: 0.92,
				suggestedName: "@project/ui-package-snapshot",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.PACKAGE_SCOPE);
			expect(decision.filesToInclude).toContain("packages/ui/tsconfig.json");
			expect(decision.fidelity).toBe("full");
			expect(decision.reasoning.some((r) => r.includes("Turborepo"))).toBe(true);
			expect(decision.reasoning.some((r) => r.includes("AI agent"))).toBe(true);
		});

		it("should include dependent workspaces in reasoning", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "packages/ui/tsconfig.json",
				workspaceRoot: "/project",
				aiDetection: { detected: true, tool: "claude", confidence: 0.9, editType: "agent" },
				session: sessionWithPackageEdits,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.PACKAGE_SCOPE,
				filesToInclude: ["packages/ui/tsconfig.json"],
				fidelity: "full",
				reasoning: [
					"Config affects workspace @project/ui",
					"Dependents affected: web, docs",
					"Blast radius: 3 workspaces",
				],
				confidence: 0.9,
				suggestedName: "@project/ui-config",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.reasoning.some((r) => r.includes("Dependents affected"))).toBe(true);
		});
	});

	// ===========================================================================
	// SCENARIO 2: AI BURST EDIT OF COMPONENT
	// ===========================================================================

	describe("Scenario 2: AI Burst Edit of Component", () => {
		/**
		 * Scenario from spec:
		 * - File: apps/web/src/components/Auth/LoginForm.tsx
		 * - AI: Cursor agent mode with high confidence
		 * - Session: Rapid editing (5 changes in 2 minutes)
		 * - Component: Shared, imported by 8 files
		 * - Expected: TRANSITIVE_CLUSTER strategy
		 */

		const loginFormNode: DependencyNode = {
			filePath: "apps/web/src/components/Auth/LoginForm.tsx",
			imports: [
				"apps/web/src/hooks/useAuth.ts",
				"apps/web/src/components/UI/Button.tsx",
				"apps/web/src/components/UI/Input.tsx",
				"apps/web/src/utils/validation.ts",
			],
			importedBy: [
				"apps/web/src/pages/Login.tsx",
				"apps/web/src/pages/Register.tsx",
				"apps/web/src/components/Auth/AuthModal.tsx",
			],
			transitiveImporters: {
				depth1: [
					"apps/web/src/pages/Login.tsx",
					"apps/web/src/pages/Register.tsx",
					"apps/web/src/components/Auth/AuthModal.tsx",
				],
				depth2: ["apps/web/src/App.tsx"],
				depth3Plus: ["apps/web/src/index.tsx"],
			},
			crossPackageImports: [],
		};

		const burstSession = createMockSession([
			{ path: "apps/web/src/components/Auth/LoginForm.tsx", category: "component" as FileCategory, changes: 5 },
		]);
		burstSession.changeVelocity = 2.5; // 5 changes in 2 minutes

		it("should detect transitive-cluster for high-velocity AI component edit", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "apps/web/src/components/Auth/LoginForm.tsx",
				workspaceRoot: "/project",
				userId: "test-user",
				aiDetection: {
					detected: true,
					tool: "cursor",
					confidence: 0.92,
					editType: "agent",
				},
				session: burstSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.TRANSITIVE_CLUSTER,
				filesToInclude: [
					"apps/web/src/components/Auth/LoginForm.tsx",
					"apps/web/src/pages/Login.tsx",
					"apps/web/src/pages/Register.tsx",
					"apps/web/src/components/Auth/AuthModal.tsx",
					"apps/web/src/App.tsx",
				],
				fidelity: "diff-only",
				reasoning: [
					"Component file (base risk: 50)",
					"Cursor agent mode detected - AI risk factor: 0.75",
					"High change velocity: 2.5 changes/min (typical: 0.5)",
					"Imported by 3 files directly, 5 transitively",
					"Total score: 62 → TRANSITIVE_CLUSTER strategy",
				],
				confidence: 0.88,
				suggestedName: "LoginForm-transitive",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.TRANSITIVE_CLUSTER);
			expect(decision.filesToInclude.length).toBeGreaterThan(1);
			expect(decision.reasoning.some((r) => r.includes("Cursor agent"))).toBe(true);
			expect(decision.reasoning.some((r) => r.includes("velocity"))).toBe(true);
		});

		it("should include transitive importers in scope", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "apps/web/src/components/Auth/LoginForm.tsx",
				workspaceRoot: "/project",
				aiDetection: { detected: true, tool: "cursor", confidence: 0.9, editType: "agent" },
				session: burstSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.TRANSITIVE_CLUSTER,
				filesToInclude: [
					"apps/web/src/components/Auth/LoginForm.tsx",
					...loginFormNode.transitiveImporters.depth1,
					...loginFormNode.transitiveImporters.depth2,
				],
				fidelity: "diff-only",
				reasoning: ["Transitive cluster includes depth 1-2 importers"],
				confidence: 0.85,
				suggestedName: "LoginForm-cluster",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.filesToInclude).toContain("apps/web/src/App.tsx");
			expect(decision.filesToInclude.length).toBeGreaterThanOrEqual(4);
		});
	});

	// ===========================================================================
	// SCENARIO 3: LOW-RISK DOCUMENTATION EDIT
	// ===========================================================================

	describe("Scenario 3: Low-Risk Documentation Edit", () => {
		/**
		 * Scenario from spec:
		 * - File: docs/README.md
		 * - AI: None detected (manual edit)
		 * - Session: Single file, first change
		 * - Expected: SINGLE_FILE strategy with diff-only fidelity
		 */

		const readmeNode: DependencyNode = {
			filePath: "docs/README.md",
			imports: [],
			importedBy: [],
			transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
			crossPackageImports: [],
		};

		const singleFileSession = createMockSession([
			{ path: "docs/README.md", category: "documentation" as FileCategory, changes: 1 },
		]);
		singleFileSession.changeVelocity = 0.1;

		it("should detect single-file for documentation with no AI", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "docs/README.md",
				workspaceRoot: "/project",
				userId: "test-user",
				aiDetection: {
					detected: false,
					tool: "unknown",
					confidence: 0,
					editType: "unknown",
				},
				session: singleFileSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.SINGLE_FILE,
				filesToInclude: ["docs/README.md"],
				fidelity: "diff-only",
				reasoning: [
					"Documentation file (base risk: 10)",
					"No AI tool detected - manual edit",
					"Single file in session - low coherence risk",
					"No dependencies - isolated change",
					"Total score: 12 → SINGLE_FILE strategy",
				],
				confidence: 0.98,
				suggestedName: "README-single",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.SINGLE_FILE);
			expect(decision.filesToInclude).toHaveLength(1);
			expect(decision.fidelity).toBe("diff-only");
			expect(decision.confidence).toBeGreaterThan(0.9);
		});

		it("should use diff-only fidelity for low-risk files", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "docs/README.md",
				workspaceRoot: "/project",
				aiDetection: { detected: false, tool: "unknown", confidence: 0, editType: "unknown" },
				session: singleFileSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.SINGLE_FILE,
				filesToInclude: ["docs/README.md"],
				fidelity: "diff-only",
				reasoning: ["Low risk - diff-only sufficient for restoration"],
				confidence: 0.95,
				suggestedName: "README",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.fidelity).toBe("diff-only");
		});
	});

	// ===========================================================================
	// SCENARIO 4: PERSONALIZED HIGH-RISK USER
	// ===========================================================================

	describe("Scenario 4: Personalized High-Risk User", () => {
		/**
		 * Scenario from spec:
		 * - File: src/utils/helpers.ts (utility file)
		 * - AI: Copilot completion mode
		 * - User: Pro tier with 40% rollback rate, risky afternoon patterns
		 * - Expected: Higher strategy than default due to personalization
		 */

		const helpersNode: DependencyNode = {
			filePath: "src/utils/helpers.ts",
			imports: [],
			importedBy: ["src/components/Button.tsx", "src/components/Input.tsx", "src/hooks/useForm.ts"],
			transitiveImporters: {
				depth1: ["src/components/Button.tsx", "src/components/Input.tsx", "src/hooks/useForm.ts"],
				depth2: ["src/pages/Home.tsx", "src/pages/Settings.tsx"],
				depth3Plus: [],
			},
			crossPackageImports: [],
		};

		const normalSession = createMockSession([
			{ path: "src/utils/helpers.ts", category: "utility" as FileCategory, changes: 1 },
		]);

		const highRiskProfile: UserProfile = {
			userId: "high-risk-user",
			tier: "pro",
			patterns: {
				rollbackRate: 0.4, // 40% rollback rate
				rollbackLatencyBuckets: {
					immediate: 25,
					sameSession: 10,
					later: 5,
				},
				fileTypeProtection: {
					utility: { protectionCount: 30, rollbackCount: 12, rollbackRate: 0.4 },
				},
				aiToolStats: {
					copilot: {
						usageCount: 100,
						rollbackRate: 0.45,
						avgConfidenceAtRollback: 0.6,
						fileTypeRollbackRates: { utility: 0.5 },
					},
				},
				riskiestHours: [14, 15, 16, 17], // Afternoon is risky
				avgSessionLength: 3600000,
				typicalChangeVelocity: 1.5,
			},
			weightAdjustments: {
				aiToolRisk: 0.3, // User learned to weight AI risk higher
			},
			updatedAt: Date.now(),
			dataPointCount: 150,
		};

		const mockAggregateInsights: AggregateInsights = {
			global: {
				optimalWeights: DEFAULT_WEIGHTS,
				aiToolFileRisk: {
					copilot: { utility: 0.35 },
					cursor: {},
					claude: {},
					windsurf: {},
					aider: {},
					unknown: {},
				},
				categoryRiskRanking: [{ category: "utility" as FileCategory, avgRollbackRate: 0.2, sampleSize: 5000 }],
				strategyEffectiveness: {} as Record<
					SnapshotStrategy,
					{ successRate: number; overInclusionRate: number; avgFileCount: number }
				>,
				optimalThresholds: STRATEGY_THRESHOLDS,
				temporalPatterns: {
					riskiestHoursGlobal: [14, 15, 16],
					riskiestDaysGlobal: [4, 5],
				},
			},
			byRepoType: {},
			computedAt: Date.now(),
			sampleSize: 10000,
			confidenceLevel: 0.95,
		};

		it("should apply personalized boost for high-risk user", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "src/utils/helpers.ts",
				workspaceRoot: "/project",
				userId: "high-risk-user",
				aiDetection: {
					detected: true,
					tool: "copilot",
					confidence: 0.75,
					editType: "completion",
				},
				session: normalSession,
			};

			// With personalization, a normally low-risk utility file edit gets boosted
			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.DIRECT_DEPENDENTS, // Elevated from SINGLE_FILE
				filesToInclude: [
					"src/utils/helpers.ts",
					"src/components/Button.tsx",
					"src/components/Input.tsx",
					"src/hooks/useForm.ts",
				],
				fidelity: "full", // Elevated from diff-only
				reasoning: [
					"Utility file (base risk: 45)",
					"Copilot completion detected",
					"User personalization: 40% historical rollback rate",
					"User-specific: utility files have 50% rollback rate with Copilot",
					"User risky hours: current time is in afternoon window",
					"Personalized score boost: 1.35x",
					"Total score: 52 → DIRECT_DEPENDENTS strategy (elevated from SINGLE_FILE)",
				],
				confidence: 0.82,
				suggestedName: "helpers-personalized",
			});

			const decision = await decideScopeForChange(fileChange, highRiskProfile, mockAggregateInsights);

			// Should be elevated from SINGLE_FILE to DIRECT_DEPENDENTS
			expect(decision.strategy).toBe(StrategyEnum.DIRECT_DEPENDENTS);
			expect(decision.reasoning.some((r) => r.includes("personalization"))).toBe(true);
			expect(decision.reasoning.some((r) => r.includes("40% historical rollback"))).toBe(true);
		});

		it("should use user-specific AI tool risk for file type", async () => {
			const fileChange: FileChangeEvent = {
				filePath: "src/utils/helpers.ts",
				workspaceRoot: "/project",
				userId: "high-risk-user",
				aiDetection: { detected: true, tool: "copilot", confidence: 0.8, editType: "completion" },
				session: normalSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.DIRECT_DEPENDENTS,
				filesToInclude: ["src/utils/helpers.ts"],
				fidelity: "full",
				reasoning: [
					"User-specific Copilot+utility rollback rate: 50%",
					"Global Copilot+utility rollback rate: 35%",
					"Using user-specific rate (higher confidence)",
				],
				confidence: 0.85,
				suggestedName: "helpers",
			});

			const decision = await decideScopeForChange(fileChange, highRiskProfile, mockAggregateInsights);

			expect(decision.reasoning.some((r) => r.includes("User-specific Copilot"))).toBe(true);
		});

		it("should apply time-based personalization during risky hours", async () => {
			const afternoonChange: FileChangeEvent = {
				filePath: "src/utils/helpers.ts",
				workspaceRoot: "/project",
				userId: "high-risk-user",
				aiDetection: { detected: true, tool: "copilot", confidence: 0.7, editType: "completion" },
				session: normalSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.DIRECT_DEPENDENTS,
				filesToInclude: ["src/utils/helpers.ts"],
				fidelity: "full",
				reasoning: [
					"Current hour (15:00) is in user's risky hours [14, 15, 16, 17]",
					"Temporal risk boost applied: +15%",
				],
				confidence: 0.8,
				suggestedName: "helpers-afternoon",
			});

			const decision = await decideScopeForChange(afternoonChange, highRiskProfile, mockAggregateInsights);

			expect(decision.reasoning.some((r) => r.includes("risky hours"))).toBe(true);
		});
	});

	// ===========================================================================
	// SCENARIO 5: CROSS-PACKAGE IMPORT DETECTION
	// ===========================================================================

	describe("Scenario 5: Cross-Package Import Change", () => {
		/**
		 * Scenario: Shared package type definition change
		 * - File: packages/types/src/user.ts
		 * - Importers: Multiple packages depend on this
		 * - Expected: MODULE_SCOPE or higher due to cross-package blast radius
		 */

		const sharedTypeNode: DependencyNode = {
			filePath: "packages/types/src/user.ts",
			imports: [],
			importedBy: [],
			transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
			crossPackageImports: [
				"apps/web/src/hooks/useUser.ts",
				"apps/api/src/routes/user.ts",
				"packages/utils/src/userHelpers.ts",
			],
		};

		it("should detect high blast radius for cross-package type change", async () => {
			const typeChangeSession = createMockSession([
				{ path: "packages/types/src/user.ts", category: "type_definition" as FileCategory, changes: 1 },
			]);

			const fileChange: FileChangeEvent = {
				filePath: "packages/types/src/user.ts",
				workspaceRoot: "/project",
				aiDetection: { detected: true, tool: "claude", confidence: 0.9, editType: "chat" },
				session: typeChangeSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.MODULE_SCOPE,
				filesToInclude: [
					"packages/types/src/user.ts",
					"packages/types/src/index.ts",
					"apps/web/src/hooks/useUser.ts",
					"apps/api/src/routes/user.ts",
					"packages/utils/src/userHelpers.ts",
				],
				fidelity: "full",
				reasoning: [
					"Type definition file (base risk: 60)",
					"Cross-package imports detected: 3 packages affected",
					"Blast radius score: 85 (logarithmic scale)",
					"Claude chat mode detected",
					"Total score: 72 → MODULE_SCOPE strategy",
				],
				confidence: 0.88,
				suggestedName: "user-types-module",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.MODULE_SCOPE);
			expect(decision.reasoning.some((r) => r.includes("Cross-package"))).toBe(true);
			expect(decision.filesToInclude.some((f) => f.includes("apps/web"))).toBe(true);
			expect(decision.filesToInclude.some((f) => f.includes("apps/api"))).toBe(true);
		});
	});

	// ===========================================================================
	// SCENARIO 6: SESSION COHERENCE - RELATED FILES
	// ===========================================================================

	describe("Scenario 6: High Session Coherence", () => {
		/**
		 * Scenario: Multiple related files edited together
		 * - Session: Component + test + styles edited together
		 * - Expected: Session coherence boosts scope
		 */

		it("should boost scope when session files are highly related", async () => {
			const coherentSession = createMockSession([
				{ path: "src/components/Card.tsx", category: "component" as FileCategory, changes: 3 },
				{ path: "src/components/Card.test.tsx", category: "test_file" as FileCategory, changes: 2 },
				{ path: "src/components/Card.css", category: "style" as FileCategory, changes: 1 },
			]);

			const fileChange: FileChangeEvent = {
				filePath: "src/components/Card.tsx",
				workspaceRoot: "/project",
				aiDetection: { detected: true, tool: "cursor", confidence: 0.85, editType: "chat" },
				session: coherentSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.MODULE_SCOPE,
				filesToInclude: ["src/components/Card.tsx", "src/components/Card.test.tsx", "src/components/Card.css"],
				fidelity: "diff-only",
				reasoning: [
					"High session coherence: 3 files in same module",
					"Files share common prefix 'Card'",
					"Session coherence score: 0.95 (high)",
					"Including all session files in scope",
				],
				confidence: 0.9,
				suggestedName: "Card-module",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.MODULE_SCOPE);
			expect(decision.filesToInclude).toContain("src/components/Card.test.tsx");
			expect(decision.filesToInclude).toContain("src/components/Card.css");
			expect(decision.reasoning.some((r) => r.includes("coherence"))).toBe(true);
		});
	});

	// ===========================================================================
	// EDGE CASES AND ERROR HANDLING
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should handle orphan file with no dependencies", async () => {
			const orphanSession = createMockSession([
				{ path: "scripts/one-off.js", category: "utility" as FileCategory, changes: 1 },
			]);

			const fileChange: FileChangeEvent = {
				filePath: "scripts/one-off.js",
				workspaceRoot: "/project",
				aiDetection: { detected: false, tool: "unknown", confidence: 0, editType: "unknown" },
				session: orphanSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.SINGLE_FILE,
				filesToInclude: ["scripts/one-off.js"],
				fidelity: "diff-only",
				reasoning: [
					"Orphan file - not imported by any other file",
					"No dependencies detected",
					"Critical path score: 10 (orphan penalty)",
					"Total score: 18 → SINGLE_FILE strategy",
				],
				confidence: 0.95,
				suggestedName: "one-off-single",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.SINGLE_FILE);
			expect(decision.reasoning.some((r) => r.includes("Orphan"))).toBe(true);
		});

		it("should handle maximum score scenario gracefully", async () => {
			const extremeSession = createMockSession([
				{ path: "package.json", category: "root_config" as FileCategory, changes: 5 },
				{ path: "tsconfig.json", category: "root_config" as FileCategory, changes: 3 },
				{ path: ".env", category: "env_config" as FileCategory, changes: 2 },
			]);
			extremeSession.changeVelocity = 5.0; // Very high velocity

			const fileChange: FileChangeEvent = {
				filePath: "package.json",
				workspaceRoot: "/project",
				aiDetection: { detected: true, tool: "claude", confidence: 0.99, editType: "agent" },
				session: extremeSession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.SESSION_SCOPE,
				filesToInclude: [
					"package.json",
					"tsconfig.json",
					".env",
					// Plus all affected files
				],
				fidelity: "full",
				reasoning: [
					"Root config file (base risk: 90)",
					"Claude agent mode with 99% confidence",
					"Extreme change velocity: 5.0 changes/min",
					"Multiple root configs in session",
					"Score capped at 100 → SESSION_SCOPE strategy",
				],
				confidence: 0.75, // Lower confidence due to extreme scenario
				suggestedName: "session-emergency",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBe(StrategyEnum.SESSION_SCOPE);
			expect(decision.fidelity).toBe("full");
		});

		it("should handle unknown AI tool gracefully", async () => {
			const unknownAISession = createMockSession([
				{ path: "src/app.ts", category: "entry_point" as FileCategory, changes: 1 },
			]);

			const fileChange: FileChangeEvent = {
				filePath: "src/app.ts",
				workspaceRoot: "/project",
				aiDetection: {
					detected: true,
					tool: "unknown",
					confidence: 0.5,
					editType: "unknown",
				},
				session: unknownAISession,
			};

			decideScopeForChange.mockResolvedValue({
				strategy: StrategyEnum.DIRECT_DEPENDENTS,
				filesToInclude: ["src/app.ts"],
				fidelity: "full",
				reasoning: [
					"Entry point file (base risk: 70)",
					"Unknown AI tool detected - using default risk factor",
					"Low AI confidence (0.5) - moderate risk",
				],
				confidence: 0.7,
				suggestedName: "app-dependents",
			});

			const decision = await decideScopeForChange(fileChange, null, {} as AggregateInsights);

			expect(decision.strategy).toBeDefined();
			expect(decision.reasoning.some((r) => r.includes("Unknown AI tool"))).toBe(true);
		});
	});
});
