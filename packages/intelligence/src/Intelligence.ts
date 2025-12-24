/**
 * Intelligence Facade
 *
 * Main entry point for @snapback/intelligence.
 * Provides unified access to all intelligence capabilities:
 * - Context retrieval (getContext, semanticSearch)
 * - Validation (checkPatterns, validateCode)
 * - Learning (reportViolation, queryLearnings, recordLearning)
 *
 * Same algorithms, different configs:
 * - Internal use: rootDir='ai_dev_utils'
 * - Product use: rootDir=workspace
 */

import { AdvisoryEngine } from "./advisory/AdvisoryEngine.js";
import { ContextEngine } from "./context/ContextEngine.js";
import { LearningEngine } from "./learning/LearningEngine.js";
import { ViolationTracker } from "./learning/ViolationTracker.js";
import { SessionManager } from "./session/SessionManager.js";
import { ConfigStore } from "./storage/ConfigStore.js";
import type { AdvisoryContext, AdvisoryTriggerContext, FileHistory } from "./types/advisory.js";
import type { CacheableContext, IntelligenceConfig, ResolvedConfig } from "./types/config.js";
import { IntelligenceConfigSchema } from "./types/config.js";
import type {
	ContextInput,
	ContextResult,
	FeedbackInput,
	Interaction,
	Learning,
	LearningInput,
	LearningStats,
	SearchResult,
	ViolationInput,
	ViolationStatus,
	ViolationsSummary,
} from "./types/index.js";
import type { AgentGuidance, SnapshotDecision, VitalsConfig, VitalsSnapshot } from "./types/vitals.js";
import type { ThresholdAdjustments, TrajectoryForecast, WorkspaceProfile } from "./types/vitals-learning.js";
import type { PipelineResult } from "./validation/ValidationPipeline.js";
import { ValidationPipeline } from "./validation/ValidationPipeline.js";
import { WorkspaceVitals } from "./vitals/WorkspaceVitals.js";

/**
 * Intelligence - Unified AI-assisted development intelligence
 *
 * @example
 * ```typescript
 * const intel = new Intelligence({
 *   rootDir: 'ai_dev_utils',
 *   enableSemanticSearch: false,
 *   enableLearningLoop: true,
 * });
 *
 * // Get context before implementing
 * const context = await intel.getContext({
 *   task: "Add authentication to MCP server",
 *   keywords: ["auth", "api-key"],
 * });
 *
 * // Validate code before committing
 * const validation = await intel.checkPatterns(code, "apps/mcp-server/src/auth.ts");
 *
 * // Report violations for learning
 * await intel.reportViolation({
 *   type: "layer-boundary-violation",
 *   file: "apps/vscode/src/auth.ts",
 *   message: "Imported infrastructure directly",
 *   reason: "Didn't check layer boundaries",
 *   prevention: "Use @snapback/core instead",
 * });
 * ```
 */
export class Intelligence {
	private config: ResolvedConfig;
	private configStore: ConfigStore;
	private contextEngine: ContextEngine;
	private validationPipeline: ValidationPipeline;
	private learningEngine: LearningEngine;
	private violationTracker: ViolationTracker;
	private sessionManager: SessionManager;
	private advisoryEngine: AdvisoryEngine;
	private initialized = false;

	constructor(config: IntelligenceConfig) {
		this.config = this.resolveConfig(config);
		this.configStore = new ConfigStore(this.config);
		this.contextEngine = new ContextEngine(this.config, this.configStore);
		this.validationPipeline = new ValidationPipeline();
		this.learningEngine = new LearningEngine(this.config);
		this.violationTracker = new ViolationTracker(this.config);
		this.sessionManager = new SessionManager(config.sessionLimits);
		this.advisoryEngine = new AdvisoryEngine(config.advisoryConfig);
	}

	/**
	 * Initialize async resources (embeddings, database)
	 * Call once before using semantic features
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		if (this.config.enableSemanticSearch) {
			await this.contextEngine.initialize();
		}

		this.initialized = true;
	}

	// =========================================================================
	// CONTEXT RETRIEVAL
	// =========================================================================

	/**
	 * Get relevant context for a task
	 * Primary entry point - used before implementing anything
	 */
	async getContext(params: ContextInput): Promise<ContextResult> {
		return this.contextEngine.getContext(params);
	}

	/**
	 * Semantic search across indexed content
	 * Requires initialization with enableSemanticSearch: true
	 */
	async semanticSearch(_query: string, _maxTokens?: number): Promise<SearchResult> {
		if (!this.config.enableSemanticSearch) {
			throw new Error("Semantic search not enabled. Set enableSemanticSearch: true");
		}
		// Semantic search implementation would go here
		// For now, return empty result
		return {
			context: "",
			tokensUsed: 0,
			sectionsIncluded: 0,
			compressionRatio: 0,
		};
	}

	// =========================================================================
	// VALIDATION
	// =========================================================================

	/**
	 * Validate code against patterns and constraints
	 * Used before committing
	 */
	async checkPatterns(code: string, filePath: string): Promise<PipelineResult> {
		return this.validationPipeline.validate(code, filePath);
	}

	/**
	 * Full 7-layer validation with confidence score
	 * Alias for checkPatterns
	 */
	async validateCode(code: string, filePath: string): Promise<PipelineResult> {
		return this.validationPipeline.validate(code, filePath);
	}

	/**
	 * Quick check - returns true if code passes all critical checks
	 */
	async quickCheck(code: string, filePath: string): Promise<boolean> {
		return this.validationPipeline.quickCheck(code, filePath);
	}

	// =========================================================================
	// LEARNING
	// =========================================================================

	/**
	 * Report a violation for tracking
	 * Auto-promotes at 3x, auto-marks for automation at 5x
	 */
	async reportViolation(violation: ViolationInput): Promise<ViolationStatus> {
		return this.violationTracker.report(violation);
	}

	/**
	 * Search learnings database
	 */
	queryLearnings(keywords: string[]): Learning[] {
		return this.learningEngine.query(keywords);
	}

	/**
	 * Record a new learning
	 */
	async recordLearning(learning: LearningInput): Promise<{ id: string }> {
		return this.learningEngine.record(learning);
	}

	/**
	 * Log an AI interaction for analysis
	 */
	async logInteraction(data: {
		query: string;
		contextUsed: string[];
		toolsCalled: string[];
		output: string;
		validationPassed?: boolean;
		confidence?: number;
	}): Promise<Interaction> {
		return this.learningEngine.logInteraction(data);
	}

	/**
	 * Record human feedback on an interaction
	 */
	async recordFeedback(
		interactionId: string,
		feedback: FeedbackInput,
	): Promise<{ updated: boolean; addedToGolden: boolean }> {
		return this.learningEngine.recordFeedback(interactionId, feedback);
	}

	/**
	 * Get learning statistics
	 */
	getStats(): LearningStats {
		return this.learningEngine.getStats();
	}

	/**
	 * Get violations summary with promotion status
	 */
	getViolationsSummary(): ViolationsSummary {
		return this.violationTracker.getSummary();
	}

	// =========================================================================
	// VITALS (Adaptive Risk Sensing)
	// =========================================================================

	/**
	 * Get or create WorkspaceVitals instance for a workspace
	 * Singleton per workspaceId
	 */
	getVitals(workspaceId: string, config?: Partial<VitalsConfig>): WorkspaceVitals {
		return WorkspaceVitals.for(workspaceId, config);
	}

	/**
	 * Get current vitals snapshot for a workspace
	 */
	getVitalsSnapshot(workspaceId: string): VitalsSnapshot | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.current() ?? null;
	}

	/**
	 * Get snapshot decision based on current vitals
	 */
	shouldSnapshot(workspaceId: string): SnapshotDecision | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.shouldSnapshot() ?? null;
	}

	/**
	 * Get agent guidance based on current vitals
	 */
	getAgentGuidance(workspaceId: string): AgentGuidance | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getAgentGuidance() ?? null;
	}

	// =========================================================================
	// VITALS PHASE 4: Learning & Calibration
	// =========================================================================

	/**
	 * Record user behavior for learning
	 * Call when user creates/acknowledges a snapshot
	 */
	recordBehavior(workspaceId: string, userCreatedSnapshot: boolean): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.recordBehavior(userCreatedSnapshot);
	}

	/**
	 * Get calibrated thresholds based on learned user behavior
	 */
	getCalibratedThresholds(workspaceId: string): ThresholdAdjustments | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getCalibratedThresholds() ?? null;
	}

	/**
	 * Get trajectory forecast (5/10 minute predictions)
	 */
	getForecast(workspaceId: string): TrajectoryForecast | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getForecast() ?? null;
	}

	/**
	 * Get user behavior statistics
	 */
	getBehaviorStats(workspaceId: string): ReturnType<WorkspaceVitals["getBehaviorStats"]> | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getBehaviorStats() ?? null;
	}

	/**
	 * Get calibration profile for workspace
	 */
	getCalibrationProfile(workspaceId: string): WorkspaceProfile | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getCalibrationProfile() ?? null;
	}

	/**
	 * Reset learning data for workspace
	 */
	resetLearning(workspaceId: string): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.resetLearning();
	}

	// =========================================================================
	// VITALS PHASE 2: Behavioral Metadata
	// =========================================================================

	/**
	 * Record a file edit event
	 * @param workspaceId Workspace identifier
	 * @param linesAdded Number of lines added
	 * @param linesDeleted Number of lines deleted
	 */
	recordEdit(workspaceId: string, linesAdded: number, linesDeleted: number): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.recordEdit(linesAdded, linesDeleted);
	}

	/**
	 * Record a file save event
	 */
	recordFileSave(workspaceId: string): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.recordFileSave();
	}

	/**
	 * Record a test execution result
	 * @param workspaceId Workspace identifier
	 * @param passed Whether the test passed
	 */
	recordTestResult(workspaceId: string, passed: boolean): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.recordTest(passed);
	}

	/**
	 * Record an AI suggestion event
	 * @param workspaceId Workspace identifier
	 * @param accepted Whether the user accepted the suggestion
	 */
	recordAISuggestionResponse(workspaceId: string, accepted: boolean): void {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		vitals?.recordAISuggestion(accepted);
	}

	/**
	 * Get current behavioral metadata for a workspace
	 */
	getBehavioralMetadata(workspaceId: string): ReturnType<WorkspaceVitals["getBehavioralMetadata"]> | null {
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		return vitals?.getBehavioralMetadata() ?? null;
	}

	// =========================================================================
	// SESSION MANAGEMENT (Phase 1)
	// =========================================================================

	/**
	 * Start a new LLM session
	 */
	startSession(
		sessionId: string,
		metadata?: {
			workspaceId?: string;
			userId?: string;
			tags?: string[];
		},
	): void {
		this.sessionManager.startSession(sessionId, metadata);
	}

	/**
	 * Record a tool call in the session
	 * Returns true if allowed, false if blocked (circuit breaker/loop)
	 */
	recordToolCall(sessionId: string, call: import("./types/session.js").ToolCall): boolean {
		return this.sessionManager.recordToolCall(sessionId, call);
	}

	/**
	 * Record a file modification
	 */
	recordFileModification(sessionId: string, mod: import("./types/session.js").FileModification): void {
		this.sessionManager.recordFileModification(sessionId, mod);
	}

	/**
	 * Detect loops in session behavior
	 */
	detectLoop(sessionId: string): import("./types/session.js").LoopDetectionResult {
		return this.sessionManager.detectLoop(sessionId);
	}

	/**
	 * Get session analytics
	 */
	getSessionAnalytics(sessionId: string): import("./types/session.js").SessionAnalytics | null {
		return this.sessionManager.getAnalytics(sessionId);
	}

	/**
	 * End a session and get analytics
	 */
	endSession(sessionId: string): import("./types/session.js").SessionAnalytics | null {
		return this.sessionManager.endSession(sessionId);
	}

	// =========================================================================
	// ADVISORY CONTEXT
	// =========================================================================

	/**
	 * Enrich context with advisory guidance
	 * Used to add warnings/suggestions to tool responses
	 */
	enrichAdvisory(context: AdvisoryTriggerContext): AdvisoryContext {
		return this.advisoryEngine.enrich(context);
	}

	/**
	 * Get file history for a specific file
	 */
	getFileHistory(file: string): FileHistory {
		return this.advisoryEngine.getFileHistory(file);
	}

	// =========================================================================
	// CACHING (for Anthropic prompt caching)
	// =========================================================================

	/**
	 * Get static context suitable for prompt caching
	 * Content changes rarely - cache for 5+ minutes
	 */
	getStaticContext(): CacheableContext {
		return this.configStore.getStaticContext();
	}

	// =========================================================================
	// UTILITIES
	// =========================================================================

	/**
	 * Resolve config with defaults using Zod schema
	 */
	private resolveConfig(config: IntelligenceConfig): ResolvedConfig {
		return IntelligenceConfigSchema.parse(config);
	}

	/**
	 * Get the resolved configuration
	 */
	getConfig(): ResolvedConfig {
		return this.config;
	}

	/**
	 * Dispose resources
	 */
	async dispose(): Promise<void> {
		await this.contextEngine.dispose();
		this.initialized = false;
	}
}
