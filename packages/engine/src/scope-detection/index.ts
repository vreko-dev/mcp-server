/**
 * Scope Detection Engine - Main Orchestrator
 *
 * Decides snapshot scope using deterministic analysis + heuristic scoring.
 */

import { calculateConfigBlastRadius } from "./layer1-config-blast-radius";
import { calculateCriticalPathDistance } from "./layer1-critical-path";
import { getDependencyGraph, getNodeForFile } from "./layer1-dependency-graph";
import { classifyFile } from "./layer1-file-classification";
// Layer 1 imports
import { detectRepoType } from "./layer1-repo-detection";
// Layer 2 imports
import { calculateScore, mapScoreToStrategy } from "./layer2-scoring";
import type { FileChangeEvent, RepoContext, ScopeDecision, ScoringInput, ScoringWeights } from "./types";
import { DEFAULT_WEIGHTS } from "./types";

// =============================================================================
// MAIN ENGINE CLASS
// =============================================================================

export class ScopeDetectionEngine {
	private repoContextCache: Map<string, RepoContext> = new Map();

	/**
	 * Decide snapshot scope for a file change event
	 */
	async decideSnapshotScope(event: FileChangeEvent, customWeights?: Partial<ScoringWeights>): Promise<ScopeDecision> {
		// Layer 1: Deterministic Analysis
		const repoContext = await this.getRepoContext(event.workspaceRoot);
		const fileClassification = classifyFile(event.filePath, repoContext);
		const depGraph = await getDependencyGraph(event.workspaceRoot, repoContext);
		const depNode = getNodeForFile(event.filePath, depGraph) ?? {
			filePath: event.filePath,
			imports: [],
			importedBy: [],
			transitiveImporters: { depth1: [], depth2: [], depth3Plus: [] },
			crossPackageImports: [],
		};

		const criticalPath = calculateCriticalPathDistance(event.filePath, depGraph, repoContext.entryPoints);

		const configBlastRadius = await calculateConfigBlastRadius(event.filePath, repoContext);

		// Build temporal context
		const now = new Date();
		const temporal = {
			timestamp: now.getTime(),
			hourOfDay: now.getHours(),
			dayOfWeek: now.getDay(),
			timeSinceLastSnapshot: now.getTime() - (event.session.startedAt || 0),
		};

		// Build change metrics
		// TODO (HIGH PRIORITY): Integrate with git diff analyzer
		// See: packages/infrastructure/src/git/diff-analyzer.ts (to be created)
		// Required for accurate change magnitude scoring (weight: 15%)
		const changeMetrics = {
			linesAdded: 0, // Placeholder - needs git diff integration
			linesDeleted: 0,
			linesModified: 0,
			isStructuralChange: false, // Would detect export/import changes
		};

		// Build scoring input
		const scoringInput: ScoringInput = {
			fileClassification,
			dependencyContext: depNode,
			dependencyGraph: depGraph, // Full graph for session coherence analysis
			criticalPath,
			configBlastRadius: configBlastRadius ?? undefined,
			repoContext,
			aiDetection: event.aiDetection,
			changeMetrics,
			session: event.session,
			temporal,
		};

		// Layer 2: Heuristic Scoring
		const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
		const score = calculateScore(scoringInput, weights);

		// Map score to strategy
		const decision = mapScoreToStrategy(score, fileClassification, repoContext, depNode);

		return decision;
	}

	/**
	 * Get repo context (with caching)
	 */
	private async getRepoContext(workspaceRoot: string): Promise<RepoContext> {
		const cached = this.repoContextCache.get(workspaceRoot);
		if (cached) {
			return cached;
		}

		const context = await detectRepoType(workspaceRoot);
		this.repoContextCache.set(workspaceRoot, context);
		return context;
	}

	/**
	 * Clear all caches
	 */
	clearCaches(): void {
		this.repoContextCache.clear();
	}
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { calculateConfigBlastRadius } from "./layer1-config-blast-radius";
export { calculateCriticalPathDistance } from "./layer1-critical-path";
export { getDependencyGraph } from "./layer1-dependency-graph";
export { classifyFile } from "./layer1-file-classification";
export { detectRepoType } from "./layer1-repo-detection";
export { calculateScore, mapScoreToStrategy } from "./layer2-scoring";
export * from "./types";
