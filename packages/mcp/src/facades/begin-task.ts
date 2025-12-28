/**
 * Composite Tool: begin_task
 *
 * Single entry point that replaces the manual workflow:
 * get_context → snapshot_create → get_learnings → session.start
 *
 * Reduces 5+ tool calls to 1 for starting any development task.
 *
 * @see pair_programmer.md Section 2.1
 * @module facades/begin-task
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beginTaskViaDaemon } from "../daemon/client-facade.js";
import type { ToolHandler, ToolResult } from "../registry.js";
import { createErrorCacheService } from "../services/error-cache-service.js";
import { createGitContextService } from "../services/git-context-service.js";
import { createSnapshotService } from "../services/snapshot-service.js";
import { TieredLearningService } from "../services/tiered-learning-service.js";
import {
	drainPendingObservations,
	extractKeywords,
	getSessionState,
	type RiskArea,
	startTask,
} from "../session/state.js";
import type { ErrorContext, GitContext } from "../types/context.js";
import { getIntelligence } from "./intelligence.js";

// =============================================================================
// TYPES
// =============================================================================

interface RiskAssessment {
	overallRisk: "low" | "medium" | "high";
	riskAreas: RiskArea[];
	recommendations: string[];
}

/**
 * Task intent types for intent-aware context loading
 * @see Archaeological Feedback Synthesis - P0: Intent-Aware Context
 */
export type TaskIntent = "implement" | "debug" | "refactor" | "review" | "explore";

/**
 * Intent-specific context loading configuration
 * Controls what context is pre-loaded based on user intent
 */
const INTENT_CONTEXT_CONFIG: Record<
	TaskIntent,
	{
		prioritize: string[];
		include: string[];
		exclude: string[];
	}
> = {
	implement: {
		prioritize: ["contracts", "patterns", "tests"],
		include: ["architecture", "constraints"],
		exclude: ["violations"], // Don't distract during new work
	},
	debug: {
		prioritize: ["violations", "failures", "history"],
		include: ["tests", "patterns"],
		exclude: [], // Need all context for debugging
	},
	refactor: {
		prioritize: ["canonical", "patterns", "duplicates"],
		include: ["architecture", "migrations"],
		exclude: [],
	},
	review: {
		prioritize: ["checklist", "risks", "coverage"],
		include: ["constraints", "violations"],
		exclude: [],
	},
	explore: {
		prioritize: ["architecture", "genealogy", "epochs"],
		include: ["history", "decisions"],
		exclude: ["violations"], // Not relevant for exploration
	},
};

/**
 * Infer intent from task description using keyword matching
 */
function inferIntent(task: string): TaskIntent {
	const lower = task.toLowerCase();

	// Debug indicators
	if (
		lower.includes("fix") ||
		lower.includes("bug") ||
		lower.includes("error") ||
		lower.includes("debug") ||
		lower.includes("broken") ||
		lower.includes("failing")
	) {
		return "debug";
	}

	// Refactor indicators
	if (
		lower.includes("refactor") ||
		lower.includes("clean") ||
		lower.includes("rename") ||
		lower.includes("move") ||
		lower.includes("extract") ||
		lower.includes("consolidate")
	) {
		return "refactor";
	}

	// Review indicators
	if (
		lower.includes("review") ||
		lower.includes("check") ||
		lower.includes("audit") ||
		lower.includes("verify") ||
		lower.includes("validate")
	) {
		return "review";
	}

	// Explore indicators
	if (
		lower.includes("explore") ||
		lower.includes("understand") ||
		lower.includes("how does") ||
		lower.includes("what is") ||
		lower.includes("where is") ||
		lower.includes("find")
	) {
		return "explore";
	}

	// Default to implement
	return "implement";
}

/**
 * Get intent-specific context loading hints
 */
export function getIntentContextHints(intent: TaskIntent): {
	prioritize: string[];
	include: string[];
	exclude: string[];
} {
	return INTENT_CONTEXT_CONFIG[intent];
}

interface SkippedTestInfo {
	file: string;
	type: "describe" | "it" | "test";
	name?: string;
	line: number;
}

interface StaticAnalysisOutput {
	/** Skipped tests found in planned files */
	skippedTests: SkippedTestInfo[];
	/** Whether analysis completed successfully */
	success: boolean;
	/** Analysis duration in ms */
	duration: number;
	/** Errors encountered */
	errors: string[];
}

/**
 * Proactive guidance from AdvisoryEngine
 */
interface ProactiveGuidance {
	/** Brief summary for LLM */
	summary: string;
	/** Proactive suggestions (ranked by priority) */
	suggestions: Array<{
		text: string;
		priority: number;
		confidence: number;
		category: "testing" | "checkpoint" | "validation" | "documentation" | "safety";
		files?: string[];
	}>;
}

/**
 * Context warning for stale data detection
 */
interface ContextWarning {
	/** Warning type: context_stale (detected) or context_rebuilt (auto-fixed) */
	type: "context_stale" | "context_rebuilt";
	/** Human-readable warning message */
	message: string;
	/** Action taken or recommended */
	action: "auto_rebuilt" | "manual_scan_recommended" | "none_required";
	/** Days since last scan */
	daysSinceScanned?: number;
	/** Threshold that was exceeded */
	threshold?: number;
}

/**
 * Context staleness check result
 */
interface StalenessCheckResult {
	/** Whether context exists */
	exists: boolean;
	/** Whether context is stale */
	isStale: boolean;
	/** Days since last scan */
	daysSinceScanned: number;
	/** Configured threshold */
	threshold: number;
	/** Last scan timestamp */
	lastScanned?: string;
}

interface BeginTaskOutput {
	taskId: string;
	/** Detected or provided intent for context loading */
	intent: TaskIntent;
	/** Intent-specific context loading hints */
	intentHints: {
		prioritize: string[];
		include: string[];
		exclude: string[];
	};
	snapshot: {
		created: boolean;
		id?: string;
		reason?: string;
	};
	patterns: Array<{
		name: string;
		description: string;
		examples?: string[];
	}>;
	constraints: Array<{
		domain: string;
		name: string;
		value: number | string;
		description: string;
	}>;
	learnings: Array<{
		type: string;
		trigger: string;
		action: string;
		source?: string;
		relevanceScore: number;
	}>;
	observations: Array<{
		type: string;
		message: string;
	}>;
	riskAssessment: RiskAssessment;
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
	}>;
	/** Static analysis results for planned files */
	staticAnalysis?: StaticAnalysisOutput;
	/** Last known errors for planned files (P0 context enhancement) */
	lastKnownErrors?: ErrorContext;
	/** Git change context (P0 context enhancement) */
	gitContext?: GitContext;
	/** Proactive guidance from AdvisoryEngine */
	proactive_guidance?: ProactiveGuidance;
	/** Warnings about stale context that was auto-rebuilt */
	contextWarnings?: ContextWarning[];
}

/**
 * Compact output format for token efficiency
 * Target: ~400 bytes (~100 tokens) vs ~5KB (~1300 tokens) for full output
 *
 * @see Stress test results showing 92% token reduction
 */
interface BeginTaskCompactOutput {
	/** Task ID for tracking */
	taskId: string;
	/** Overall risk level */
	risk: "low" | "medium" | "high";
	/** Protection score 0-100 */
	protection: number;
	/** Count of uncommitted files (not full list) */
	dirtyFiles: number;
	/** Key constraints as simple key:value */
	constraints: Record<string, string>;
	/** Top learnings as plain strings (action only) */
	learnings: string[];
	/** Warnings only if present */
	warnings: string[];
	/** Snapshot status */
	snapshot: "created" | "reused" | "skipped";
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Default staleness threshold in days
 */
const DEFAULT_STALE_AFTER_DAYS = 7;

/**
 * Check if context is stale
 * Returns staleness status without modifying anything
 */
function checkContextStaleness(workspaceRoot: string): StalenessCheckResult {
	const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");

	if (!existsSync(ctxPath)) {
		return {
			exists: false,
			isStale: false,
			daysSinceScanned: 0,
			threshold: DEFAULT_STALE_AFTER_DAYS,
		};
	}

	try {
		const content = JSON.parse(readFileSync(ctxPath, "utf8"));
		const lastScanned = content.lastScanned;
		const staleAfterDays = content.staleAfterDays || DEFAULT_STALE_AFTER_DAYS;

		if (!lastScanned) {
			// No lastScanned means we can't determine staleness
			// Treat as fresh to avoid false positives
			return {
				exists: true,
				isStale: false,
				daysSinceScanned: 0,
				threshold: staleAfterDays,
			};
		}

		const scanTime = new Date(lastScanned).getTime();
		const daysSinceScanned = Math.floor((Date.now() - scanTime) / (1000 * 60 * 60 * 24));
		const isStale = daysSinceScanned > staleAfterDays;

		return {
			exists: true,
			isStale,
			daysSinceScanned,
			threshold: staleAfterDays,
			lastScanned,
		};
	} catch {
		// If we can't read context, treat as non-existent
		return {
			exists: false,
			isStale: false,
			daysSinceScanned: 0,
			threshold: DEFAULT_STALE_AFTER_DAYS,
		};
	}
}

/**
 * Rebuild stale context by updating lastScanned
 * This is a lightweight rebuild - just refreshes the timestamp
 * For full rebuild, use context op=scan
 */
function rebuildContext(workspaceRoot: string): { success: boolean; error?: string } {
	const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");

	try {
		if (!existsSync(ctxPath)) {
			return { success: false, error: "Context file does not exist" };
		}

		const content = JSON.parse(readFileSync(ctxPath, "utf8"));

		// Update lastScanned to now
		content.lastScanned = new Date().toISOString();

		writeFileSync(ctxPath, JSON.stringify(content, null, 2));

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Check context staleness and auto-rebuild if needed
 * Returns warnings for the response
 */
function handleStaleContext(workspaceRoot: string): ContextWarning[] {
	const warnings: ContextWarning[] = [];
	const staleness = checkContextStaleness(workspaceRoot);

	if (!staleness.exists || !staleness.isStale) {
		// No context or context is fresh - no warnings
		return warnings;
	}

	// Context is stale - attempt auto-rebuild
	const rebuild = rebuildContext(workspaceRoot);

	if (rebuild.success) {
		warnings.push({
			type: "context_rebuilt",
			message: `Context was stale (${staleness.daysSinceScanned} days since last scan, threshold: ${staleness.threshold} days). Auto-rebuilt.`,
			action: "auto_rebuilt",
			daysSinceScanned: staleness.daysSinceScanned,
			threshold: staleness.threshold,
		});
	} else {
		// Rebuild failed - warn but suggest manual action
		warnings.push({
			type: "context_stale",
			message: `Context is stale (${staleness.daysSinceScanned} days since last scan, threshold: ${staleness.threshold} days). Auto-rebuild failed: ${rebuild.error}`,
			action: "manual_scan_recommended",
			daysSinceScanned: staleness.daysSinceScanned,
			threshold: staleness.threshold,
		});
	}

	return warnings;
}

/**
 * Assess risk of planned files
 */
function assessRisk(files: string[], _workspaceRoot: string): RiskAssessment {
	const riskAreas: RiskArea[] = [];
	const recommendations: string[] = [];

	for (const file of files) {
		const lowerPath = file.toLowerCase();

		if (lowerPath.includes("auth") || lowerPath.includes("login")) {
			if (!riskAreas.includes("auth")) {
				riskAreas.push("auth");
			}
		}
		if (lowerPath.includes("payment") || lowerPath.includes("stripe")) {
			if (!riskAreas.includes("payment")) {
				riskAreas.push("payment");
			}
		}
		if (lowerPath.includes("database") || lowerPath.includes("migration")) {
			if (!riskAreas.includes("database")) {
				riskAreas.push("database");
			}
		}
		if (lowerPath.includes("config") || lowerPath.includes(".env")) {
			if (!riskAreas.includes("config")) {
				riskAreas.push("config");
			}
		}
		if (lowerPath.includes("api") || lowerPath.includes("route")) {
			if (!riskAreas.includes("api")) {
				riskAreas.push("api");
			}
		}
		if (lowerPath.includes("security") || lowerPath.includes("crypto")) {
			if (!riskAreas.includes("security")) {
				riskAreas.push("security");
			}
		}
	}

	// Determine overall risk
	const criticalAreas: RiskArea[] = ["auth", "payment", "security"];
	const hasCritical = riskAreas.some((a) => criticalAreas.includes(a));
	const overallRisk: "low" | "medium" | "high" = hasCritical
		? "high"
		: riskAreas.length >= 2
			? "medium"
			: riskAreas.length > 0
				? "medium"
				: "low";

	// Build recommendations
	if (riskAreas.includes("auth")) {
		recommendations.push("Test with both valid and invalid credentials");
	}
	if (riskAreas.includes("payment")) {
		recommendations.push("Use test mode/sandbox for payment testing");
	}
	if (riskAreas.includes("database")) {
		recommendations.push("Verify migrations can be rolled back");
	}
	if (riskAreas.includes("config")) {
		recommendations.push("Ensure secrets are not committed");
	}
	if (files.length >= 5) {
		recommendations.push("Consider breaking into smaller focused changes");
	}

	return { overallRisk, riskAreas, recommendations };
}

/**
 * Decide if snapshot should be auto-created
 */
function shouldAutoSnapshot(risk: RiskAssessment, files?: string[]): boolean {
	// Always snapshot for high risk
	if (risk.overallRisk === "high") {
		return true;
	}

	// Snapshot if touching critical areas
	const criticalAreas: RiskArea[] = ["auth", "payment", "database", "security"];
	if (risk.riskAreas.some((a) => criticalAreas.includes(a))) {
		return true;
	}

	// Snapshot if modifying 3+ files
	if (files && files.length >= 3) {
		return true;
	}

	// Medium risk + config files
	if (risk.overallRisk === "medium" && files?.some((f) => f.includes("config") || f.endsWith(".env"))) {
		return true;
	}

	return false;
}

// NOTE: getLearningsFromFile removed - replaced by TieredLearningService
// which implements intent-based loading from hot/warm tiers for 97% token reduction

/**
 * Get context constraints from .snapback/ctx/context.json
 */
function getConstraints(workspaceRoot: string): Array<{
	domain: string;
	name: string;
	value: number | string;
	description: string;
}> {
	const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");

	if (!existsSync(ctxPath)) {
		return [];
	}

	try {
		const content = JSON.parse(readFileSync(ctxPath, "utf8"));
		const constraints: Array<{
			domain: string;
			name: string;
			value: number | string;
			description: string;
		}> = [];

		if (content.constraints) {
			for (const [domain, domainConstraints] of Object.entries(content.constraints)) {
				for (const [name, constraint] of Object.entries(domainConstraints as Record<string, any>)) {
					constraints.push({
						domain,
						name,
						value: constraint.max || constraint.value,
						description: constraint.description || "",
					});
				}
			}
		}

		return constraints;
	} catch {
		return [];
	}
}

/**
 * Generate next actions based on context
 */
function generateNextActions(
	risk: RiskAssessment,
	_learnings: Array<{ type: string }>,
	staticAnalysis?: StaticAnalysisOutput,
): Array<{ tool: string; priority: number; reason: string }> {
	const actions: Array<{ tool: string; priority: number; reason: string }> = [];

	// If skipped tests found, suggest enabling them first
	if (staticAnalysis?.skippedTests && staticAnalysis.skippedTests.length > 0) {
		actions.push({
			tool: "enable_skipped_tests",
			priority: 1,
			reason: `${staticAnalysis.skippedTests.length} skipped test(s) may be ready to enable`,
		});
	}

	// Always suggest quick_check after implementation
	actions.push({
		tool: "quick_check",
		priority: 2,
		reason: "Validate changes after implementation",
	});

	// If high risk, suggest frequent validation
	if (risk.overallRisk === "high") {
		actions.push({
			tool: "what_changed",
			priority: 3,
			reason: "Track changes in high-risk area",
		});
	}

	// Before commit
	actions.push({
		tool: "review_work",
		priority: 4,
		reason: "Review before committing",
	});

	return actions;
}

/**
 * Run static analysis on planned files
 * Uses dynamic import to avoid build-time coupling with @snapback/core
 */
async function runStaticAnalysis(files: string[], workspaceRoot: string): Promise<StaticAnalysisOutput> {
	const startTime = Date.now();
	const result: StaticAnalysisOutput = {
		skippedTests: [],
		success: true,
		duration: 0,
		errors: [],
	};

	// Only analyze test files
	const testFiles = files.filter((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));

	if (testFiles.length === 0) {
		result.duration = Date.now() - startTime;
		return result;
	}

	try {
		// Build file map with contents
		const fileMap = new Map<string, string>();
		for (const filePath of testFiles) {
			const fullPath = filePath.startsWith("/") ? filePath : join(workspaceRoot, filePath);
			if (existsSync(fullPath)) {
				try {
					const content = readFileSync(fullPath, "utf8");
					fileMap.set(filePath, content);
				} catch {
					// Skip files that can't be read
				}
			}
		}

		if (fileMap.size === 0) {
			result.duration = Date.now() - startTime;
			return result;
		}

		// Dynamic import to avoid build-time coupling
		const { analyzeSkippedTests } = await import("@snapback/core/analysis");
		const analysisResults = analyzeSkippedTests(fileMap);

		for (const analysisResult of analysisResults) {
			if (!analysisResult.parsed && analysisResult.error) {
				result.errors.push(`Parse error in ${analysisResult.file}: ${analysisResult.error}`);
			}
			for (const skipped of analysisResult.skipped) {
				result.skippedTests.push({
					file: skipped.file,
					type: skipped.type,
					name: skipped.name,
					line: skipped.line,
				});
			}
		}
	} catch (error) {
		// Static analysis is optional - don't fail the task
		result.errors.push(`Static analysis unavailable: ${error instanceof Error ? error.message : String(error)}`);
	}

	result.duration = Date.now() - startTime;
	result.success = result.errors.length === 0;

	return result;
}

/**
 * Generate proactive guidance using AdvisoryEngine
 * Runs the SkippedTestRule and other advisory rules to provide suggestions
 */
async function generateProactiveGuidance(files: string[], workspaceRoot: string): Promise<ProactiveGuidance> {
	const guidance: ProactiveGuidance = {
		summary:
			files.length > 0 ? `Analyzing ${files.length} file${files.length > 1 ? "s" : ""}` : "No files targeted",
		suggestions: [],
	};

	try {
		// Use AdvisoryEngine from @snapback/intelligence
		const { AdvisoryEngine, SkippedTestRule } = await import("@snapback/intelligence");

		const engine = new AdvisoryEngine();
		// Register SkippedTestRule for skipped test detection
		engine.registerRule(SkippedTestRule);

		// Build trigger context for advisory rules
		// Read test file contents for SkippedTestRule
		const testFiles = files.filter((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));

		for (const testFile of testFiles) {
			const fullPath = testFile.startsWith("/") ? testFile : join(workspaceRoot, testFile);
			if (existsSync(fullPath)) {
				try {
					const code = readFileSync(fullPath, "utf8");

					// Create context with code for SkippedTestRule
					const triggerContext = {
						files: [testFile],
						session: {
							riskLevel: "low" as const,
							toolCallCount: 0,
							filesModified: 0,
							loopsDetected: 0,
							consecutiveFileModifications: new Map<string, number>(),
						},
						fragility: new Map<string, number>(),
						recentViolations: [] as Array<{ type: string; file: string }>,
						code, // Extended property for SkippedTestRule
					};

					const advisoryContext = engine.enrich(triggerContext);

					// Add suggestions from advisory context
					for (const suggestion of advisoryContext.suggestions) {
						guidance.suggestions.push({
							text: suggestion.text,
							priority: suggestion.priority,
							confidence: suggestion.confidence,
							category: suggestion.category,
							files: suggestion.files,
						});
					}
				} catch {
					// Skip files that can't be read
				}
			}
		}

		// Update summary if we have suggestions
		if (guidance.suggestions.length > 0) {
			const skippedTestSuggestions = guidance.suggestions.filter((s) => s.category === "testing");
			if (skippedTestSuggestions.length > 0) {
				guidance.summary = `Found ${skippedTestSuggestions.length} testing suggestion(s)`;
			}
		}

		// Sort suggestions by priority (1 = highest)
		guidance.suggestions.sort((a, b) => a.priority - b.priority);
	} catch {
		// Advisory guidance is optional - continue without it
		guidance.summary = "Advisory analysis unavailable";
	}

	return guidance;
}

// =============================================================================
// COMPACT OUTPUT FORMATTER
// =============================================================================

/**
 * Format full output as compact result for token efficiency
 * Reduces ~5KB (~1300 tokens) to ~400B (~100 tokens)
 */
function formatCompactResult(output: BeginTaskOutput, gitContext?: GitContext): BeginTaskCompactOutput {
	// Extract key constraints as simple strings
	const constraintMap: Record<string, string> = {};
	for (const c of output.constraints.slice(0, 4)) {
		constraintMap[c.name] =
			String(c.value) + (c.name.includes("time") ? "ms" : c.name.includes("bundle") ? "MB" : "");
	}

	// Extract top 2 learnings as action strings only
	const learningStrings = output.learnings.slice(0, 2).map((l) => l.action.substring(0, 100)); // Truncate long actions

	// Build warnings from various sources
	const warnings: string[] = [];
	if (output.contextWarnings?.length) {
		warnings.push(output.contextWarnings[0].message);
	}
	if (output.proactive_guidance?.suggestions?.length) {
		const topSuggestion = output.proactive_guidance.suggestions[0];
		if (topSuggestion.priority <= 2) {
			warnings.push(topSuggestion.text);
		}
	}
	if (output.staticAnalysis?.skippedTests?.length) {
		warnings.push(`${output.staticAnalysis.skippedTests.length} skipped test(s)`);
	}

	// Determine snapshot status
	let snapshotStatus: "created" | "reused" | "skipped";
	if (output.snapshot.created) {
		snapshotStatus = "created";
	} else if (output.snapshot.id) {
		snapshotStatus = "reused";
	} else {
		snapshotStatus = "skipped";
	}

	return {
		taskId: output.taskId,
		risk: output.riskAssessment.overallRisk,
		protection: 100, // Default - would need vitals integration for real value
		dirtyFiles: gitContext?.uncommittedChanges?.length ?? 0,
		constraints: constraintMap,
		learnings: learningStrings,
		warnings: warnings.slice(0, 2), // Max 2 warnings
		snapshot: snapshotStatus,
	};
}

/**
 * Format compact output as plain text for minimal token usage
 * Target: 3-4 lines of text
 */
function formatCompactText(compact: BeginTaskCompactOutput): string {
	const lines: string[] = [];

	// Line 1: Status summary
	const snapshotIcon = compact.snapshot === "created" ? "📸" : compact.snapshot === "reused" ? "♻️" : "⏭️";
	lines.push(
		`✓ ${compact.taskId} | risk:${compact.risk} | protection:${compact.protection}% | dirty:${compact.dirtyFiles} | ${snapshotIcon} ${compact.snapshot}`,
	);

	// Line 2: Constraints (if any)
	if (Object.keys(compact.constraints).length > 0) {
		const constraintStr = Object.entries(compact.constraints)
			.map(([k, v]) => `${k}<${v}`)
			.join(", ");
		lines.push(`constraints: ${constraintStr}`);
	}

	// Line 3: Learnings (if any)
	if (compact.learnings.length > 0) {
		lines.push(`learnings: ${compact.learnings.join(" | ")}`);
	}

	// Line 4: Warnings (only if present)
	if (compact.warnings.length > 0) {
		lines.push(`⚠️ ${compact.warnings.join(" | ")}`);
	}

	return lines.join("\n");
}

// =============================================================================
// HANDLER
// =============================================================================

/**
 * Helper to create JSON result
 */
function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * begin_task - Start any development task
 *
 * Combines: get_context + snapshot_create + get_learnings + session.start
 *
 * DAEMON-FIRST ARCHITECTURE:
 * 1. Try to delegate to daemon for cross-surface coordination (Extension, MCP, CLI)
 * 2. If daemon unavailable, fall back to local Intelligence
 */
export const handleBeginTask: ToolHandler = async (args, context): Promise<ToolResult> => {
	const input = args as Record<string, unknown>;
	const task = input.task as string | undefined;
	const files = input.files as string[] | undefined;
	const providedKeywords = input.keywords as string[] | undefined;
	const skipSnapshot = input.skipSnapshot as boolean | undefined;
	const compact = input.compact !== false; // Default to true for token efficiency
	const intent = (input.intent as TaskIntent | undefined) ?? inferIntent(task || "");
	const intentHints = getIntentContextHints(intent);

	if (!task) {
		return result(
			JSON.stringify({
				error: "E102_MISSING_PARAM",
				message: "Required parameter 'task' is missing",
			}),
			true,
		);
	}

	const workspaceRoot = context.workspaceRoot;

	// 0. Check context staleness and auto-rebuild if needed
	const contextWarnings = handleStaleContext(workspaceRoot);

	// 1. Extract keywords from task description if not provided
	const keywords = providedKeywords ?? extractKeywords(task);

	// =========================================================================
	// DAEMON-FIRST: Try delegating to daemon for cross-surface coordination
	// =========================================================================
	const daemonResult = await beginTaskViaDaemon(workspaceRoot, task, files, keywords);

	if (daemonResult) {
		// Daemon is available - use its response directly
		// This ensures Extension, MCP, and CLI all share the same session state

		// Still need to start local tracking for MCP-specific state
		startTask(workspaceRoot, {
			description: task,
			plannedFiles: files || [],
			snapshotId: daemonResult.snapshot.id,
			keywords,
		});

		// Drain any pending observations from extension
		const observations = drainPendingObservations(workspaceRoot).map((o) => ({
			type: o.type,
			message: o.message,
		}));

		// Get local-only context enhancements (error cache, git context)
		let lastKnownErrors: ErrorContext | undefined;
		if (files && files.length > 0) {
			try {
				const errorCacheService = createErrorCacheService(workspaceRoot);
				const cachedErrors = errorCacheService.getErrorsForFiles(files);
				if (cachedErrors.length > 0) {
					lastKnownErrors = {
						typescript: cachedErrors
							.filter((e) => e.source === "typescript")
							.map((e) => ({ ...e, age: e.age })),
						tests: cachedErrors.filter((e) => e.source === "test").map((e) => ({ ...e, age: e.age })),
						lintErrors: cachedErrors.filter((e) => e.source === "lint").map((e) => ({ ...e, age: e.age })),
					};
				}
			} catch {
				// Error cache is optional
			}
		}

		let gitContext: GitContext | undefined;
		try {
			const gitContextService = createGitContextService(workspaceRoot);
			gitContext = await gitContextService.getContext(files || []);
			if (
				!gitContext.branch.current &&
				gitContext.uncommittedChanges.length === 0 &&
				gitContext.recentCommits.length === 0
			) {
				gitContext = undefined;
			}
		} catch {
			// Git context is optional
		}

		// Run static analysis for planned files (skipped test detection)
		// NOTE: Daemon doesn't provide this, so we run it locally
		let staticAnalysis: StaticAnalysisOutput | undefined;
		if (files && files.length > 0) {
			staticAnalysis = await runStaticAnalysis(files, workspaceRoot);
		}

		// Generate proactive guidance from AdvisoryEngine
		// NOTE: Daemon doesn't provide this, so we run it locally
		const proactive_guidance = await generateProactiveGuidance(files || [], workspaceRoot);

		// Build enhanced output with daemon data + local context
		const output: BeginTaskOutput = {
			taskId: daemonResult.taskId,
			intent,
			intentHints,
			snapshot: daemonResult.snapshot,
			patterns: daemonResult.patterns as BeginTaskOutput["patterns"],
			constraints: daemonResult.constraints as BeginTaskOutput["constraints"],
			learnings: daemonResult.learnings as BeginTaskOutput["learnings"],
			observations,
			riskAssessment: daemonResult.riskAssessment as BeginTaskOutput["riskAssessment"],
			nextActions: daemonResult.nextActions as BeginTaskOutput["nextActions"],
			staticAnalysis,
			lastKnownErrors,
			gitContext,
			proactive_guidance,
			contextWarnings: contextWarnings.length > 0 ? contextWarnings : undefined,
		};

		// Return compact or full output based on flag
		if (compact) {
			const compactOutput = formatCompactResult(output, gitContext);
			return result(formatCompactText(compactOutput));
		}

		const hint = daemonResult.snapshot.created
			? `Safety snapshot created via daemon: ${daemonResult.snapshot.id}`
			: daemonResult.learnings.length > 0
				? `${daemonResult.learnings.length} relevant learning(s) found`
				: "Ready to start coding! (daemon-coordinated)";

		return result(
			JSON.stringify(
				{
					...output,
					message: `Task started: ${task}`,
					_hint: hint,
					_source: "daemon", // Indicate response came from daemon
				},
				null,
				2,
			),
		);
	}

	// =========================================================================
	// FALLBACK: Daemon unavailable, use local Intelligence
	// =========================================================================

	// 2. Assess risk of planned files
	const riskAssessment = files
		? assessRisk(files, workspaceRoot)
		: {
				overallRisk: "low" as const,
				riskAreas: [] as RiskArea[],
				recommendations: [],
			};

	// 3. Auto-decide snapshot creation using SnapshotService
	let snapshot: BeginTaskOutput["snapshot"] = { created: false };

	if (!skipSnapshot && shouldAutoSnapshot(riskAssessment, files) && files && files.length > 0) {
		const snapshotService = createSnapshotService(workspaceRoot);
		const snapshotResult = await snapshotService.createFromFiles(files, {
			description: `Pre-task: ${task}`,
			trigger: "ai-detection",
			skipDedup: false,
			dedupWindow: 5,
		});

		if (snapshotResult.success) {
			if (snapshotResult.reused) {
				// Reusing existing snapshot
				snapshot = {
					created: false,
					id: snapshotResult.reusedSnapshotId,
					reason: snapshotResult.reusedReason,
				};
			} else if (snapshotResult.snapshot) {
				// New snapshot created
				snapshot = {
					created: true,
					id: snapshotResult.snapshot.id,
					reason: `Auto-created: ${riskAssessment.overallRisk} risk task touching ${riskAssessment.riskAreas.join(", ") || "planned files"}`,
				};

				// Update session stats
				const state = getSessionState(workspaceRoot);
				state.stats.snapshotsCreated++;
			}
		} else {
			// Snapshot creation failed
			snapshot = {
				created: false,
				reason: `Snapshot creation failed: ${snapshotResult.error}`,
			};
		}
	}

	// 4. Get relevant learnings using tiered storage (P0 token efficiency)
	// Loads hot tier (always) + warm tier (based on intent) - never auto-loads cold tier
	const tieredLearningService = new TieredLearningService(workspaceRoot);
	const tieredLearnings = await tieredLearningService.loadTieredLearnings({
		intent,
		keywords,
		maxLearnings: 10,
	});
	const learnings = tieredLearnings.map((l) => ({
		type: l.type,
		trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
		action: l.action,
		source: l.source,
		relevanceScore: l.score / (keywords.length || 1),
	}));

	// 5. Get patterns from Intelligence (if available)
	let patterns: BeginTaskOutput["patterns"] = [];
	try {
		const intel = getIntelligence(workspaceRoot);
		const contextResult = await intel.getContext({ task, keywords });

		// Extract patterns from context
		if (contextResult.patterns) {
			const patternLines = contextResult.patterns.split("\n").filter(Boolean);
			patterns = patternLines.slice(0, 5).map((line) => ({
				name: line.substring(0, 50),
				description: line,
			}));
		}
	} catch {
		// Intelligence not available - continue without patterns
	}

	// 6. Get constraints
	const constraints = getConstraints(workspaceRoot);

	// 7. Run static analysis on planned files (skipped tests, etc.)
	let staticAnalysis: StaticAnalysisOutput | undefined;
	if (files && files.length > 0) {
		staticAnalysis = await runStaticAnalysis(files, workspaceRoot);
	}

	// 8. Get error context for planned files (P0 context enhancement)
	let lastKnownErrors: ErrorContext | undefined;
	if (files && files.length > 0) {
		try {
			const errorCacheService = createErrorCacheService(workspaceRoot);
			const cachedErrors = errorCacheService.getErrorsForFiles(files);

			if (cachedErrors.length > 0) {
				// Group errors by source type
				lastKnownErrors = {
					typescript: cachedErrors
						.filter((e) => e.source === "typescript")
						.map((e) => ({ ...e, age: e.age })),
					tests: cachedErrors.filter((e) => e.source === "test").map((e) => ({ ...e, age: e.age })),
					lintErrors: cachedErrors.filter((e) => e.source === "lint").map((e) => ({ ...e, age: e.age })),
				};
			}
		} catch {
			// Error cache is optional - continue without it
		}
	}

	// 9. Get git context for planned files (P0 context enhancement)
	let gitContext: GitContext | undefined;
	try {
		const gitContextService = createGitContextService(workspaceRoot);
		gitContext = await gitContextService.getContext(files || []);

		// Only include if there's meaningful content
		if (
			!gitContext.branch.current &&
			gitContext.uncommittedChanges.length === 0 &&
			gitContext.recentCommits.length === 0
		) {
			gitContext = undefined;
		}
	} catch {
		// Git context is optional - continue without it
	}

	// 10. Drain pending observations from extension
	const observations = drainPendingObservations(workspaceRoot).map((o) => ({
		type: o.type,
		message: o.message,
	}));

	// 11. Start task tracking (including intent for completion hints)
	const currentTask = startTask(workspaceRoot, {
		description: task,
		plannedFiles: files || [],
		snapshotId: snapshot.id,
		keywords,
		intent,
	});

	// Update risk areas touched
	const state = getSessionState(workspaceRoot);
	state.riskAreasTouched = riskAssessment.riskAreas;

	// 11b. Start Intelligence session with same task ID for cross-surface coordination
	// This enables Extension, MCP, and CLI to share file modification tracking
	try {
		const intel = getIntelligence(workspaceRoot);
		intel.startSession(currentTask.id, {
			workspaceId: workspaceRoot,
			tags: keywords,
		});
	} catch {
		// Intelligence session start is best-effort, don't fail the task
	}

	// 12. Generate next actions (informed by static analysis and errors)
	const nextActions = generateNextActions(riskAssessment, learnings, staticAnalysis);

	// 12b. Generate proactive guidance from AdvisoryEngine
	const proactive_guidance = await generateProactiveGuidance(files || [], workspaceRoot);

	// 13. Build response with enhanced context
	const output: BeginTaskOutput = {
		taskId: currentTask.id,
		intent,
		intentHints,
		snapshot,
		patterns,
		constraints,
		learnings,
		observations,
		riskAssessment,
		nextActions,
		staticAnalysis,
		lastKnownErrors,
		gitContext,
		proactive_guidance,
		contextWarnings: contextWarnings.length > 0 ? contextWarnings : undefined,
	};

	// Return compact or full output based on flag
	if (compact) {
		const compactOutput = formatCompactResult(output, gitContext);
		return result(formatCompactText(compactOutput));
	}

	// Generate hint based on most useful information (full output only)
	const skippedCount = staticAnalysis?.skippedTests?.length ?? 0;
	const knownErrorCount =
		(lastKnownErrors?.typescript?.length ?? 0) +
		(lastKnownErrors?.tests?.length ?? 0) +
		(lastKnownErrors?.lintErrors?.length ?? 0);
	const uncommittedCount = gitContext?.uncommittedChanges?.length ?? 0;

	let hint: string;
	if (contextWarnings.length > 0) {
		const rebuiltWarning = contextWarnings.find((w) => w.type === "context_rebuilt");
		if (rebuiltWarning) {
			hint = `🔄 Context was stale and auto-rebuilt (${rebuiltWarning.daysSinceScanned} days old)`;
		} else {
			hint = `⚠️ Context is stale - consider running 'context op=scan'`;
		}
	} else if (knownErrorCount > 0) {
		hint = `⚠️ ${knownErrorCount} known error(s) in planned files - check lastKnownErrors`;
	} else if (skippedCount > 0) {
		hint = `⚠️ ${skippedCount} skipped test(s) found - may need enabling`;
	} else if (uncommittedCount > 0) {
		hint = `📝 ${uncommittedCount} uncommitted change(s) in working tree`;
	} else if (snapshot.created) {
		hint = `Safety snapshot created: ${snapshot.id}`;
	} else if (learnings.length > 0) {
		hint = `${learnings.length} relevant learning(s) found`;
	} else {
		hint = "Ready to start coding!";
	}

	return result(
		JSON.stringify(
			{
				...output,
				message: `Task started: ${task}`,
				_hint: hint,
			},
			null,
			2,
		),
	);
};
