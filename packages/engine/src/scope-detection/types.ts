/**
 * Scope Detection Engine v2 - Type Definitions
 *
 * This module provides intelligent snapshot scope detection with a three-layer approach:
 * 1. Deterministic Analysis (local, fast, cached)
 * 2. Heuristic Scoring (local, weighted factors)
 * 3. Personalization & Learning (server, Pro tier)
 */

// =============================================================================
// REPOSITORY CONTEXT TYPES
// =============================================================================

export type RepoType = "single" | "monorepo" | "turborepo";
export type BuildTool = "vite" | "webpack" | "esbuild" | "rollup" | "turbopack" | "none";
export type WorkspaceType = "app" | "package" | "config";

/**
 * Context about the repository structure
 */
export interface RepoContext {
	type: RepoType;
	rootPath: string;
	workspaces: WorkspaceInfo[];
	entryPoints: string[];
	buildTool: BuildTool;
}

export interface WorkspaceInfo {
	name: string;
	path: string;
	type: WorkspaceType;
	dependents: string[];
	dependencies: string[];
}

// =============================================================================
// FILE CLASSIFICATION TYPES
// =============================================================================

/**
 * File categories with associated risk levels
 */
export enum FileCategory {
	// Config files (highest risk - affect everything)
	ROOT_CONFIG = "root_config",
	BUILD_CONFIG = "build_config",
	ENV_CONFIG = "env_config",
	WORKSPACE_CONFIG = "workspace_config",

	// Core code (high risk - wide blast radius)
	ENTRY_POINT = "entry_point",
	SHARED_EXPORT = "shared_export",
	TYPE_DEFINITION = "type_definition",

	// Domain code (medium risk)
	DOMAIN_LOGIC = "domain_logic",
	COMPONENT = "component",
	HOOK = "hook",
	UTILITY = "utility",

	// Support code (lower risk)
	TEST_FILE = "test_file",
	STYLE = "style",
	ASSET = "asset",
	DOCUMENTATION = "documentation",
}

/**
 * Base risk scores (0-100) per category
 */
export const CATEGORY_BASE_RISK: Record<FileCategory, number> = {
	[FileCategory.ROOT_CONFIG]: 90,
	[FileCategory.BUILD_CONFIG]: 85,
	[FileCategory.ENV_CONFIG]: 80,
	[FileCategory.WORKSPACE_CONFIG]: 75,
	[FileCategory.ENTRY_POINT]: 70,
	[FileCategory.SHARED_EXPORT]: 65,
	[FileCategory.TYPE_DEFINITION]: 60,
	[FileCategory.DOMAIN_LOGIC]: 55,
	[FileCategory.HOOK]: 55,
	[FileCategory.COMPONENT]: 50,
	[FileCategory.UTILITY]: 45,
	[FileCategory.TEST_FILE]: 20,
	[FileCategory.STYLE]: 30,
	[FileCategory.ASSET]: 15,
	[FileCategory.DOCUMENTATION]: 10,
};

export interface FileClassification {
	category: FileCategory;
	baseRisk: number;
	filePath: string;
	packageScope: string | null;
	importedByCount: number;
	importsCount: number;
	isExported: boolean;
	exportCount: number;
}

// =============================================================================
// DEPENDENCY GRAPH TYPES
// =============================================================================

export interface DependencyGraph {
	nodes: Map<string, DependencyNode>;
	edges: Map<string, Set<string>>;
	reverseEdges: Map<string, Set<string>>;
}

export interface DependencyNode {
	filePath: string;
	imports: string[];
	importedBy: string[];
	transitiveImporters: {
		depth1: string[];
		depth2: string[];
		depth3Plus: string[];
	};
	crossPackageImports: string[];
}

// =============================================================================
// CRITICAL PATH TYPES
// =============================================================================

export interface CriticalPathAnalysis {
	distanceToNearestEntry: number;
	entryPointsReached: string[];
	isOnCriticalPath: boolean;
	criticalPathScore: number;
}

// =============================================================================
// CONFIG BLAST RADIUS TYPES
// =============================================================================

export type ConfigScope = "file" | "package" | "workspace" | "extends-chain" | "env-consumers";

export interface ConfigBlastRadius {
	scope: ConfigScope;
	affectedFiles: string[];
	affectedPackages: string[];
	reasoning: string;
}

// =============================================================================
// AI DETECTION TYPES
// =============================================================================

export type AITool = "cursor" | "copilot" | "claude" | "windsurf" | "aider" | "unknown";
export type AIEditType = "completion" | "chat" | "agent" | "unknown";

export interface AIDetection {
	detected: boolean;
	tool: AITool;
	confidence: number;
	editType: AIEditType;
}

// =============================================================================
// SESSION TYPES
// =============================================================================

export interface SessionFile {
	path: string;
	category: FileCategory;
	changeCount: number;
	lastChangedAt: number;
}

export interface SessionContext {
	id: string;
	startedAt: number;
	files: SessionFile[];
	changeVelocity: number;
}

// =============================================================================
// SCORING TYPES
// =============================================================================

export interface ChangeMetrics {
	linesAdded: number;
	linesDeleted: number;
	linesModified: number;
	isStructuralChange: boolean;
}

export interface TemporalContext {
	timestamp: number;
	hourOfDay: number;
	dayOfWeek: number;
	timeSinceLastSnapshot: number;
}

export interface ScoringInput {
	fileClassification: FileClassification;
	dependencyContext: DependencyNode;
	dependencyGraph: DependencyGraph; // Full graph for session coherence
	criticalPath: CriticalPathAnalysis;
	configBlastRadius?: ConfigBlastRadius;
	repoContext: RepoContext;
	aiDetection: AIDetection;
	changeMetrics: ChangeMetrics;
	session: SessionContext;
	temporal: TemporalContext;
}

export interface ScoringFactor {
	score: number;
	weight: number;
	raw: number;
}

export interface ScoringOutput {
	totalScore: number;
	factors: {
		categoryRisk: ScoringFactor;
		blastRadius: ScoringFactor;
		aiToolRisk: ScoringFactor;
		changeMagnitude: ScoringFactor;
		sessionCoherence: ScoringFactor;
		temporalRisk: ScoringFactor;
		criticalPath: ScoringFactor;
	};
	reasoning: string[];
	confidence: number;
}

// =============================================================================
// STRATEGY TYPES
// =============================================================================

export enum SnapshotStrategy {
	SINGLE_FILE = "single_file",
	DIRECT_DEPENDENTS = "direct_dependents",
	TRANSITIVE_CLUSTER = "transitive_cluster",
	MODULE_SCOPE = "module_scope",
	PACKAGE_SCOPE = "package_scope",
	SESSION_SCOPE = "session_scope",
}

export type SnapshotFidelity = "diff-only" | "full";

export interface ScopeDecision {
	strategy: SnapshotStrategy;
	filesToInclude: string[];
	fidelity: SnapshotFidelity;
	reasoning: string[];
	confidence: number;
	suggestedName: string;
}

/**
 * Strategy thresholds (score ranges)
 */
export const STRATEGY_THRESHOLDS = {
	singleFile: 25,
	directDependents: 45,
	transitive: 65,
	module: 80,
	package: 90,
	session: 100,
} as const;

// =============================================================================
// DEFAULT WEIGHTS
// =============================================================================

export const DEFAULT_WEIGHTS = {
	categoryRisk: 0.2,
	blastRadius: 0.2,
	aiToolRisk: 0.2,
	changeMagnitude: 0.1,
	sessionCoherence: 0.1,
	temporalRisk: 0.1,
	criticalPath: 0.1,
} as const;

export type ScoringWeights = typeof DEFAULT_WEIGHTS;

// =============================================================================
// USER PROFILE TYPES (Layer 3)
// =============================================================================

export type UserTier = "free" | "pro";

export interface RollbackLatencyBuckets {
	immediate: number;
	sameSession: number;
	later: number;
}

export interface FileTypeProtectionStats {
	protectionCount: number;
	rollbackCount: number;
	rollbackRate: number;
}

export interface AIToolStats {
	usageCount: number;
	rollbackRate: number;
	avgConfidenceAtRollback: number;
	fileTypeRollbackRates: Partial<Record<FileCategory, number>>;
}

export interface UserPatterns {
	rollbackRate: number;
	rollbackLatencyBuckets: RollbackLatencyBuckets;
	fileTypeProtection: Partial<Record<FileCategory, FileTypeProtectionStats>>;
	aiToolStats: Partial<Record<AITool, AIToolStats>>;
	riskiestHours: number[];
	avgSessionLength: number;
	typicalChangeVelocity: number;
}

export interface UserProfile {
	userId: string;
	tier: UserTier;
	patterns: UserPatterns;
	weightAdjustments: Partial<ScoringWeights>;
	updatedAt: number;
	dataPointCount: number;
}

// =============================================================================
// BEHAVIOR EVENT TYPES
// =============================================================================

export type BehaviorEventType =
	| "snapshot_restored"
	| "snapshot_created"
	| "snapshot_ignored"
	| "files_changed_together";

export interface BaseBehaviorEvent {
	type: BehaviorEventType;
	timestamp: number;
	userId: string;
}

export interface SnapshotRestoredEvent extends BaseBehaviorEvent {
	type: "snapshot_restored";
	fileCategory: FileCategory;
	aiTool?: AITool;
	snapshotCreatedAt: number;
}

export interface SnapshotCreatedEvent extends BaseBehaviorEvent {
	type: "snapshot_created";
	fileCategory: FileCategory;
	aiTool?: AITool;
}

export interface SnapshotIgnoredEvent extends BaseBehaviorEvent {
	type: "snapshot_ignored";
}

export interface FilesChangedTogetherEvent extends BaseBehaviorEvent {
	type: "files_changed_together";
	files: string[];
}

export type UserBehaviorEvent =
	| SnapshotRestoredEvent
	| SnapshotCreatedEvent
	| SnapshotIgnoredEvent
	| FilesChangedTogetherEvent;

// =============================================================================
// AGGREGATE INSIGHTS TYPES
// =============================================================================

export interface CategoryRiskRanking {
	category: FileCategory;
	avgRollbackRate: number;
	sampleSize: number;
}

export interface StrategyEffectiveness {
	successRate: number;
	overInclusionRate: number;
	avgFileCount: number;
}

export interface TemporalPatterns {
	riskiestHoursGlobal: number[];
	riskiestDaysGlobal: number[];
}

export interface RepoTypePatterns {
	avgBlastRadius: number;
	recommendedWeightAdjustments: Partial<ScoringWeights>;
	mostProblematicConfigs: string[];
}

export interface AggregateInsights {
	global: {
		optimalWeights: ScoringWeights;
		aiToolFileRisk: Record<AITool, Partial<Record<FileCategory, number>>>;
		categoryRiskRanking: CategoryRiskRanking[];
		strategyEffectiveness: Record<SnapshotStrategy, StrategyEffectiveness>;
		optimalThresholds: typeof STRATEGY_THRESHOLDS;
		temporalPatterns: TemporalPatterns;
	};
	byRepoType: Partial<Record<RepoType, RepoTypePatterns>>;
	computedAt: number;
	sampleSize: number;
	confidenceLevel: number;
}

// =============================================================================
// SESSION COHERENCE TYPES
// =============================================================================

export type CoherenceLevel = "high" | "medium" | "low" | "scattered";

export interface SessionCoherenceResult {
	score: number;
	level: CoherenceLevel;
	reasoning: string[];
}

// =============================================================================
// TEMPORAL RISK TYPES
// =============================================================================

export interface TemporalRiskResult {
	score: number;
	reasoning: string[];
}

// =============================================================================
// BLAST RADIUS RESULT TYPES
// =============================================================================

export interface BlastRadiusResult {
	score: number;
	reasoning: string[];
}

// =============================================================================
// AI TOOL RISK TYPES
// =============================================================================

export interface AIToolRiskResult {
	score: number;
	reasoning: string[];
}

// =============================================================================
// FILE CHANGE EVENT
// =============================================================================

export interface FileChangeEvent {
	filePath: string;
	workspaceRoot: string;
	userId?: string;
	aiDetection: AIDetection;
	session: SessionContext;
}
