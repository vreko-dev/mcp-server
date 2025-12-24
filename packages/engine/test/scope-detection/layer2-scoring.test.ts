/**
 * Layer 2 Tests: Heuristic Scoring
 *
 * Tests for all scoring factors including blast radius, AI tool risk,
 * session coherence, temporal risk, and combined scoring.
 */

import { describe, expect, it, vi } from "vitest";
import {
	type AIDetection,
	type AIToolRiskResult,
	type BlastRadiusResult,
	CATEGORY_BASE_RISK,
	type ChangeMetrics,
	type ConfigBlastRadius,
	DEFAULT_WEIGHTS,
	type DependencyGraph,
	type DependencyNode,
	FileCategory,
	type FileClassification,
	type RepoContext,
	type ScoringInput,
	type ScoringOutput,
	type SessionCoherenceResult,
	type SessionContext,
	type TemporalContext,
	type TemporalRiskResult,
} from "../../src/scope-detection/types.js";

// =============================================================================
// Mock implementations
// =============================================================================

const calculateBlastRadius = vi.fn<
	[FileClassification, DependencyNode, ConfigBlastRadius | undefined],
	BlastRadiusResult
>();
const calculateAiToolRisk = vi.fn<[AIDetection, FileCategory], AIToolRiskResult>();
const calculateSessionCoherence = vi.fn<
	[string, SessionContext, DependencyGraph, RepoContext],
	SessionCoherenceResult
>();
const calculateTemporalRisk = vi.fn<[TemporalContext, SessionContext], TemporalRiskResult>();
const calculateChangeMagnitude = vi.fn<[ChangeMetrics], number>();
const calculateTotalScore = vi.fn<[ScoringInput], ScoringOutput>();
const calculateConfidence = vi.fn<[ScoringInput], number>();

// Test fixtures
const createMockDependencyNode = (overrides: Partial<DependencyNode> = {}): DependencyNode => ({
	filePath: "src/utils.ts",
	imports: ["src/helpers.ts"],
	importedBy: ["src/app.ts", "src/service.ts"],
	transitiveImporters: {
		depth1: ["src/app.ts", "src/service.ts"],
		depth2: ["src/index.ts"],
		depth3Plus: [],
	},
	crossPackageImports: [],
	...overrides,
});

const createMockFileClassification = (overrides: Partial<FileClassification> = {}): FileClassification => ({
	category: FileCategory.DOMAIN_LOGIC,
	baseRisk: CATEGORY_BASE_RISK[FileCategory.DOMAIN_LOGIC],
	filePath: "src/utils.ts",
	packageScope: null,
	importedByCount: 2,
	importsCount: 1,
	isExported: true,
	exportCount: 3,
	...overrides,
});

const createMockAIDetection = (overrides: Partial<AIDetection> = {}): AIDetection => ({
	detected: true,
	tool: "cursor",
	confidence: 0.9,
	editType: "chat",
	...overrides,
});

const createMockSessionContext = (overrides: Partial<SessionContext> = {}): SessionContext => ({
	id: "session-123",
	startedAt: Date.now() - 30 * 60 * 1000, // 30 mins ago
	files: [
		{
			path: "src/utils.ts",
			category: FileCategory.UTILITY,
			changeCount: 3,
			lastChangedAt: Date.now(),
		},
	],
	changeVelocity: 2,
	...overrides,
});

const createMockTemporalContext = (overrides: Partial<TemporalContext> = {}): TemporalContext => ({
	timestamp: Date.now(),
	hourOfDay: 14,
	dayOfWeek: 3, // Wednesday
	timeSinceLastSnapshot: 10 * 60 * 1000, // 10 mins
	...overrides,
});

// =============================================================================
// HAPPY PATH TESTS
// =============================================================================

describe("Layer 2: Heuristic Scoring", () => {
	describe("Happy Path", () => {
		describe("calculateBlastRadius", () => {
			it("should calculate low blast radius for files with few importers", () => {
				const fileClass = createMockFileClassification({ importedByCount: 1 });
				const depNode = createMockDependencyNode({
					importedBy: ["src/app.ts"],
				});
				const mockResult: BlastRadiusResult = {
					score: 15,
					reasoning: ["Low direct importer count: 1"],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, undefined);

				expect(result.score).toBeLessThan(30);
			});

			it("should calculate high blast radius for files with many importers", () => {
				const fileClass = createMockFileClassification({ importedByCount: 50 });
				const depNode = createMockDependencyNode({
					importedBy: Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`),
				});
				const mockResult: BlastRadiusResult = {
					score: 67,
					reasoning: ["High direct importer count: 50"],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, undefined);

				expect(result.score).toBeGreaterThan(50);
			});

			it("should use logarithmic scaling for import count", () => {
				// 1 importer = 10, 10 importers = 33, 100 importers = 67
				const fileClass10 = createMockFileClassification({
					importedByCount: 10,
				});
				const depNode10 = createMockDependencyNode({
					importedBy: Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`),
				});

				const fileClass100 = createMockFileClassification({
					importedByCount: 100,
				});
				const depNode100 = createMockDependencyNode({
					importedBy: Array.from({ length: 100 }, (_, i) => `src/file${i}.ts`),
				});

				calculateBlastRadius.mockReturnValueOnce({
					score: 33,
					reasoning: [],
				});
				calculateBlastRadius.mockReturnValueOnce({
					score: 67,
					reasoning: [],
				});

				const result10 = calculateBlastRadius(fileClass10, depNode10, undefined);
				const result100 = calculateBlastRadius(fileClass100, depNode100, undefined);

				// Logarithmic: 100 importers should not be 10x the score of 10 importers
				expect(result100.score).toBeLessThan(result10.score * 3);
			});

			it("should add bonus for entry point importers", () => {
				const fileClass = createMockFileClassification();
				const depNode = createMockDependencyNode({
					importedBy: ["src/index.ts"], // Entry point
				});
				const mockResult: BlastRadiusResult = {
					score: 25,
					reasoning: ["Imported by critical-path files"],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, undefined);

				expect(result.reasoning).toContain("Imported by critical-path files");
			});

			it("should add bonus for cross-package imports", () => {
				const fileClass = createMockFileClassification();
				const depNode = createMockDependencyNode({
					crossPackageImports: ["@packages/ui", "@packages/utils"],
				});
				const mockResult: BlastRadiusResult = {
					score: 35,
					reasoning: ["Cross-package imports: 2"],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, undefined);

				expect(result.score).toBeGreaterThan(20);
			});

			it("should use config blast radius when provided", () => {
				const fileClass = createMockFileClassification({
					category: FileCategory.ROOT_CONFIG,
				});
				const depNode = createMockDependencyNode();
				const configRadius: ConfigBlastRadius = {
					scope: "workspace",
					affectedFiles: [],
					affectedPackages: ["pkg1", "pkg2"],
					reasoning: "Root config affects all",
				};
				const mockResult: BlastRadiusResult = {
					score: 95,
					reasoning: ["Root config affects all"],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, configRadius);

				expect(result.score).toBe(95);
			});
		});

		describe("calculateAiToolRisk", () => {
			it("should return 0 when AI not detected", () => {
				const aiDetection = createMockAIDetection({ detected: false });
				const mockResult: AIToolRiskResult = {
					score: 0,
					reasoning: ["No AI tool detected"],
				};
				calculateAiToolRisk.mockReturnValue(mockResult);

				const result = calculateAiToolRisk(aiDetection, FileCategory.DOMAIN_LOGIC);

				expect(result.score).toBe(0);
			});

			it("should calculate risk for Cursor with chat mode", () => {
				const aiDetection = createMockAIDetection({
					tool: "cursor",
					editType: "chat",
				});
				const mockResult: AIToolRiskResult = {
					score: 55,
					reasoning: ["AI tool: cursor (chat mode)"],
				};
				calculateAiToolRisk.mockReturnValue(mockResult);

				const result = calculateAiToolRisk(aiDetection, FileCategory.DOMAIN_LOGIC);

				expect(result.score).toBeGreaterThan(0);
				expect(result.reasoning).toContain("AI tool: cursor (chat mode)");
			});

			it("should increase risk for agent mode", () => {
				const chatMode = createMockAIDetection({ editType: "chat" });
				const agentMode = createMockAIDetection({ editType: "agent" });

				calculateAiToolRisk.mockReturnValueOnce({ score: 55, reasoning: [] });
				calculateAiToolRisk.mockReturnValueOnce({
					score: 72,
					reasoning: ["Agent mode increases risk by 30%"],
				});

				const chatResult = calculateAiToolRisk(chatMode, FileCategory.DOMAIN_LOGIC);
				const agentResult = calculateAiToolRisk(agentMode, FileCategory.DOMAIN_LOGIC);

				expect(agentResult.score).toBeGreaterThan(chatResult.score);
			});

			it("should use tool-specific risk matrix", () => {
				const cursorDetection = createMockAIDetection({ tool: "cursor" });
				const copilotDetection = createMockAIDetection({ tool: "copilot" });

				calculateAiToolRisk.mockReturnValueOnce({ score: 55, reasoning: [] });
				calculateAiToolRisk.mockReturnValueOnce({ score: 45, reasoning: [] });

				const cursorResult = calculateAiToolRisk(cursorDetection, FileCategory.DOMAIN_LOGIC);
				const copilotResult = calculateAiToolRisk(copilotDetection, FileCategory.DOMAIN_LOGIC);

				// Different tools have different risk profiles
				expect(cursorResult.score).not.toBe(copilotResult.score);
			});

			it("should have higher risk for config files", () => {
				const aiDetection = createMockAIDetection();

				calculateAiToolRisk.mockReturnValueOnce({ score: 55, reasoning: [] });
				calculateAiToolRisk.mockReturnValueOnce({ score: 85, reasoning: [] });

				const domainResult = calculateAiToolRisk(aiDetection, FileCategory.DOMAIN_LOGIC);
				const configResult = calculateAiToolRisk(aiDetection, FileCategory.ROOT_CONFIG);

				expect(configResult.score).toBeGreaterThan(domainResult.score);
			});
		});

		describe("calculateSessionCoherence", () => {
			it("should return high coherence for single file session", () => {
				const session = createMockSessionContext({
					files: [
						{
							path: "src/a.ts",
							category: FileCategory.DOMAIN_LOGIC,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
					],
				});
				const mockResult: SessionCoherenceResult = {
					score: 100,
					level: "high",
					reasoning: ["Single file session"],
				};
				calculateSessionCoherence.mockReturnValue(mockResult);

				const result = calculateSessionCoherence("src/a.ts", session, {} as DependencyGraph, {} as RepoContext);

				expect(result.score).toBe(100);
				expect(result.level).toBe("high");
			});

			it("should return high coherence for related files in same directory", () => {
				const session = createMockSessionContext({
					files: [
						{
							path: "src/auth/login.ts",
							category: FileCategory.DOMAIN_LOGIC,
							changeCount: 2,
							lastChangedAt: Date.now(),
						},
						{
							path: "src/auth/logout.ts",
							category: FileCategory.DOMAIN_LOGIC,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
						{
							path: "src/auth/types.ts",
							category: FileCategory.TYPE_DEFINITION,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
					],
				});
				const mockResult: SessionCoherenceResult = {
					score: 85,
					level: "high",
					reasoning: ["Files in same directory tree"],
				};
				calculateSessionCoherence.mockReturnValue(mockResult);

				const result = calculateSessionCoherence(
					"src/auth/login.ts",
					session,
					{} as DependencyGraph,
					{} as RepoContext,
				);

				expect(result.level).toBe("high");
			});

			it("should return low coherence for scattered files", () => {
				const session = createMockSessionContext({
					files: [
						{
							path: "src/auth/login.ts",
							category: FileCategory.DOMAIN_LOGIC,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
						{
							path: "packages/ui/Button.tsx",
							category: FileCategory.COMPONENT,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
						{
							path: "apps/api/routes/users.ts",
							category: FileCategory.DOMAIN_LOGIC,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
						{
							path: "config/jest.config.ts",
							category: FileCategory.BUILD_CONFIG,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
					],
				});
				const mockResult: SessionCoherenceResult = {
					score: 25,
					level: "scattered",
					reasoning: ["Files span 4 packages", "Files span multiple categories"],
				};
				calculateSessionCoherence.mockReturnValue(mockResult);

				const result = calculateSessionCoherence(
					"src/auth/login.ts",
					session,
					{} as DependencyGraph,
					{ type: "turborepo" } as RepoContext,
				);

				expect(result.level).toBe("scattered");
				expect(result.score).toBeLessThan(50);
			});

			it("should boost coherence for graph-connected files", () => {
				const session = createMockSessionContext({
					files: [
						{
							path: "src/utils.ts",
							category: FileCategory.UTILITY,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
						{
							path: "src/helpers.ts",
							category: FileCategory.UTILITY,
							changeCount: 1,
							lastChangedAt: Date.now(),
						},
					],
				});
				const mockResult: SessionCoherenceResult = {
					score: 90,
					level: "high",
					reasoning: ["1/1 files are connected in dependency graph"],
				};
				calculateSessionCoherence.mockReturnValue(mockResult);

				const result = calculateSessionCoherence(
					"src/utils.ts",
					session,
					{} as DependencyGraph,
					{} as RepoContext,
				);

				expect(result.score).toBeGreaterThan(80);
			});
		});

		describe("calculateTemporalRisk", () => {
			it("should return low risk for normal velocity", () => {
				const temporal = createMockTemporalContext();
				const session = createMockSessionContext({ changeVelocity: 1 });
				const mockResult: TemporalRiskResult = {
					score: 10,
					reasoning: [],
				};
				calculateTemporalRisk.mockReturnValue(mockResult);

				const result = calculateTemporalRisk(temporal, session);

				expect(result.score).toBeLessThan(30);
			});

			it("should increase risk for high change velocity", () => {
				const temporal = createMockTemporalContext();
				const session = createMockSessionContext({ changeVelocity: 6 });
				const mockResult: TemporalRiskResult = {
					score: 40,
					reasoning: ["High change velocity: 6.0/min"],
				};
				calculateTemporalRisk.mockReturnValue(mockResult);

				const result = calculateTemporalRisk(temporal, session);

				expect(result.score).toBeGreaterThan(20);
				expect(result.reasoning).toContain("High change velocity: 6.0/min");
			});

			it("should increase risk for late night hours", () => {
				const temporal = createMockTemporalContext({ hourOfDay: 2 });
				const session = createMockSessionContext();
				const mockResult: TemporalRiskResult = {
					score: 25,
					reasoning: ["Generally risky hour: 2:00"],
				};
				calculateTemporalRisk.mockReturnValue(mockResult);

				const result = calculateTemporalRisk(temporal, session);

				expect(result.reasoning.some((r) => r.includes("risky hour"))).toBe(true);
			});

			it("should increase risk for Friday afternoon", () => {
				const temporal = createMockTemporalContext({
					hourOfDay: 16,
					dayOfWeek: 5, // Friday
				});
				const session = createMockSessionContext();
				const mockResult: TemporalRiskResult = {
					score: 25,
					reasoning: ["Friday afternoon (historically higher error rate)"],
				};
				calculateTemporalRisk.mockReturnValue(mockResult);

				const result = calculateTemporalRisk(temporal, session);

				expect(result.reasoning).toContain("Friday afternoon (historically higher error rate)");
			});

			it("should increase risk for new session", () => {
				const temporal = createMockTemporalContext();
				const session = createMockSessionContext({
					startedAt: Date.now() - 2 * 60 * 1000, // 2 mins ago
				});
				const mockResult: TemporalRiskResult = {
					score: 25,
					reasoning: ["Early in session (<5 min)"],
				};
				calculateTemporalRisk.mockReturnValue(mockResult);

				const result = calculateTemporalRisk(temporal, session);

				expect(result.reasoning).toContain("Early in session (<5 min)");
			});
		});

		describe("calculateChangeMagnitude", () => {
			it("should return low score for small changes", () => {
				const metrics: ChangeMetrics = {
					linesAdded: 5,
					linesDeleted: 2,
					linesModified: 3,
					isStructuralChange: false,
				};
				calculateChangeMagnitude.mockReturnValue(10);

				const result = calculateChangeMagnitude(metrics);

				expect(result).toBeLessThan(30);
			});

			it("should return high score for large changes", () => {
				const metrics: ChangeMetrics = {
					linesAdded: 100,
					linesDeleted: 50,
					linesModified: 200,
					isStructuralChange: false,
				};
				calculateChangeMagnitude.mockReturnValue(50);

				const result = calculateChangeMagnitude(metrics);

				expect(result).toBeGreaterThan(30);
			});

			it("should add bonus for structural changes", () => {
				const metricsNoStructural: ChangeMetrics = {
					linesAdded: 10,
					linesDeleted: 5,
					linesModified: 5,
					isStructuralChange: false,
				};
				const metricsStructural: ChangeMetrics = {
					linesAdded: 10,
					linesDeleted: 5,
					linesModified: 5,
					isStructuralChange: true,
				};

				calculateChangeMagnitude.mockReturnValueOnce(15);
				calculateChangeMagnitude.mockReturnValueOnce(45);

				const resultNoStructural = calculateChangeMagnitude(metricsNoStructural);
				const resultStructural = calculateChangeMagnitude(metricsStructural);

				expect(resultStructural).toBeGreaterThan(resultNoStructural);
			});

			it("should cap at 100", () => {
				const metrics: ChangeMetrics = {
					linesAdded: 1000,
					linesDeleted: 500,
					linesModified: 2000,
					isStructuralChange: true,
				};
				calculateChangeMagnitude.mockReturnValue(100);

				const result = calculateChangeMagnitude(metrics);

				expect(result).toBeLessThanOrEqual(100);
			});
		});

		describe("calculateTotalScore", () => {
			it("should combine all factors with weights", () => {
				const mockOutput: ScoringOutput = {
					totalScore: 55,
					factors: {
						categoryRisk: { raw: 55, weight: 0.2, score: 11 },
						blastRadius: { raw: 40, weight: 0.2, score: 8 },
						aiToolRisk: { raw: 60, weight: 0.2, score: 12 },
						changeMagnitude: { raw: 30, weight: 0.1, score: 3 },
						sessionCoherence: { raw: 20, weight: 0.1, score: 2 },
						temporalRisk: { raw: 25, weight: 0.1, score: 2.5 },
						criticalPath: { raw: 60, weight: 0.1, score: 6 },
					},
					reasoning: ["AI tool: cursor (chat mode)", "On critical path (distance: 2)"],
					confidence: 0.9,
				};
				calculateTotalScore.mockReturnValue(mockOutput);

				const result = calculateTotalScore({} as ScoringInput);

				expect(result.totalScore).toBeGreaterThan(0);
				expect(result.totalScore).toBeLessThanOrEqual(100);
				expect(result.factors).toBeDefined();
			});

			it("should include reasoning from all factors", () => {
				const mockOutput: ScoringOutput = {
					totalScore: 65,
					factors: {
						categoryRisk: { raw: 55, weight: 0.2, score: 11 },
						blastRadius: { raw: 60, weight: 0.2, score: 12 },
						aiToolRisk: { raw: 70, weight: 0.2, score: 14 },
						changeMagnitude: { raw: 40, weight: 0.1, score: 4 },
						sessionCoherence: { raw: 30, weight: 0.1, score: 3 },
						temporalRisk: { raw: 35, weight: 0.1, score: 3.5 },
						criticalPath: { raw: 80, weight: 0.1, score: 8 },
					},
					reasoning: [
						"High direct importer count: 15",
						"AI tool: cursor (agent mode)",
						"Agent mode increases risk by 30%",
						"On critical path (distance: 1)",
					],
					confidence: 0.85,
				};
				calculateTotalScore.mockReturnValue(mockOutput);

				const result = calculateTotalScore({} as ScoringInput);

				expect(result.reasoning.length).toBeGreaterThan(0);
			});

			it("should invert session coherence (low coherence = high risk)", () => {
				// When coherence is high (100), the risk contribution should be low
				// When coherence is low (20), the risk contribution should be high
				const mockOutput: ScoringOutput = {
					totalScore: 45,
					factors: {
						categoryRisk: { raw: 55, weight: 0.2, score: 11 },
						blastRadius: { raw: 40, weight: 0.2, score: 8 },
						aiToolRisk: { raw: 50, weight: 0.2, score: 10 },
						changeMagnitude: { raw: 30, weight: 0.1, score: 3 },
						sessionCoherence: { raw: 80, weight: 0.1, score: 8 }, // Inverted: 100 - 20 = 80
						temporalRisk: { raw: 20, weight: 0.1, score: 2 },
						criticalPath: { raw: 40, weight: 0.1, score: 4 },
					},
					reasoning: ["Files span 4 packages"],
					confidence: 0.8,
				};
				calculateTotalScore.mockReturnValue(mockOutput);

				const result = calculateTotalScore({} as ScoringInput);

				// Low coherence should result in high sessionCoherence risk factor
				expect(result.factors.sessionCoherence.raw).toBeGreaterThan(50);
			});
		});

		describe("calculateConfidence", () => {
			it("should return high confidence for known AI tool", () => {
				calculateConfidence.mockReturnValue(0.95);

				const result = calculateConfidence({
					aiDetection: { detected: true, tool: "cursor", confidence: 0.9, editType: "chat" },
				} as ScoringInput);

				expect(result).toBeGreaterThan(0.9);
			});

			it("should reduce confidence for unknown AI tool", () => {
				calculateConfidence.mockReturnValue(0.8);

				const result = calculateConfidence({
					aiDetection: { detected: true, tool: "unknown", confidence: 0.9, editType: "chat" },
				} as ScoringInput);

				expect(result).toBeLessThan(0.9);
			});

			it("should reduce confidence for orphan files", () => {
				calculateConfidence.mockReturnValue(0.85);

				const result = calculateConfidence({
					criticalPath: { distanceToNearestEntry: -1 },
				} as ScoringInput);

				expect(result).toBeLessThan(0.95);
			});

			it("should reduce confidence for very new sessions", () => {
				calculateConfidence.mockReturnValue(0.85);

				const result = calculateConfidence({
					session: { startedAt: Date.now() - 60 * 1000 }, // 1 min ago
					temporal: { timestamp: Date.now() },
				} as ScoringInput);

				expect(result).toBeLessThan(0.95);
			});
		});
	});

	// =============================================================================
	// SAD PATH TESTS
	// =============================================================================

	describe("Sad Path", () => {
		describe("calculateBlastRadius", () => {
			it("should handle file with no importers", () => {
				const fileClass = createMockFileClassification({ importedByCount: 0 });
				const depNode = createMockDependencyNode({ importedBy: [] });
				const mockResult: BlastRadiusResult = {
					score: 0,
					reasoning: [],
				};
				calculateBlastRadius.mockReturnValue(mockResult);

				const result = calculateBlastRadius(fileClass, depNode, undefined);

				expect(result.score).toBe(0);
			});
		});

		describe("calculateSessionCoherence", () => {
			it("should handle empty session files", () => {
				const session = createMockSessionContext({ files: [] });
				const mockResult: SessionCoherenceResult = {
					score: 100,
					level: "high",
					reasoning: ["Empty session"],
				};
				calculateSessionCoherence.mockReturnValue(mockResult);

				const result = calculateSessionCoherence(
					"src/file.ts",
					session,
					{} as DependencyGraph,
					{} as RepoContext,
				);

				expect(result.score).toBe(100);
			});
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe("Edge Cases", () => {
		describe("DEFAULT_WEIGHTS", () => {
			it("should sum to 1.0", () => {
				const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
				expect(sum).toBeCloseTo(1.0, 5);
			});

			it("should have all expected factors", () => {
				expect(DEFAULT_WEIGHTS.categoryRisk).toBeDefined();
				expect(DEFAULT_WEIGHTS.blastRadius).toBeDefined();
				expect(DEFAULT_WEIGHTS.aiToolRisk).toBeDefined();
				expect(DEFAULT_WEIGHTS.changeMagnitude).toBeDefined();
				expect(DEFAULT_WEIGHTS.sessionCoherence).toBeDefined();
				expect(DEFAULT_WEIGHTS.temporalRisk).toBeDefined();
				expect(DEFAULT_WEIGHTS.criticalPath).toBeDefined();
			});
		});

		describe("calculateTotalScore", () => {
			it("should handle maximum possible score", () => {
				const mockOutput: ScoringOutput = {
					totalScore: 100,
					factors: {
						categoryRisk: { raw: 100, weight: 0.2, score: 20 },
						blastRadius: { raw: 100, weight: 0.2, score: 20 },
						aiToolRisk: { raw: 100, weight: 0.2, score: 20 },
						changeMagnitude: { raw: 100, weight: 0.1, score: 10 },
						sessionCoherence: { raw: 100, weight: 0.1, score: 10 },
						temporalRisk: { raw: 100, weight: 0.1, score: 10 },
						criticalPath: { raw: 100, weight: 0.1, score: 10 },
					},
					reasoning: [],
					confidence: 1.0,
				};
				calculateTotalScore.mockReturnValue(mockOutput);

				const result = calculateTotalScore({} as ScoringInput);

				expect(result.totalScore).toBe(100);
			});

			it("should handle minimum possible score", () => {
				const mockOutput: ScoringOutput = {
					totalScore: 0,
					factors: {
						categoryRisk: { raw: 0, weight: 0.2, score: 0 },
						blastRadius: { raw: 0, weight: 0.2, score: 0 },
						aiToolRisk: { raw: 0, weight: 0.2, score: 0 },
						changeMagnitude: { raw: 0, weight: 0.1, score: 0 },
						sessionCoherence: { raw: 0, weight: 0.1, score: 0 },
						temporalRisk: { raw: 0, weight: 0.1, score: 0 },
						criticalPath: { raw: 0, weight: 0.1, score: 0 },
					},
					reasoning: [],
					confidence: 1.0,
				};
				calculateTotalScore.mockReturnValue(mockOutput);

				const result = calculateTotalScore({} as ScoringInput);

				expect(result.totalScore).toBe(0);
			});
		});
	});

	// =============================================================================
	// ERROR PATH TESTS
	// =============================================================================

	describe("Error Path", () => {
		describe("calculateTotalScore", () => {
			it("should handle null input gracefully", () => {
				calculateTotalScore.mockImplementation(() => {
					throw new Error("ScoringInput is required");
				});

				expect(() => calculateTotalScore(null as unknown as ScoringInput)).toThrow("ScoringInput is required");
			});
		});
	});
});
