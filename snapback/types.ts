/**
 * SnapBack Simplified Architecture - Shared Types
 *
 * This file contains all type definitions shared across the simplified architecture.
 * It replaces the sprawling types across @snapback/contracts, @snapback/events, etc.
 *
 * Target: ~100 LOC
 * Current: Scaffolding
 */

// =============================================================================
// SCRIPT OUTPUT TYPES
// =============================================================================

/**
 * Output format for signal scripts (scripts/signals/*)
 *
 * Signals compute metrics used for risk scoring and health tracking.
 * They do NOT make decisions - they provide data for the orchestrator.
 */
export interface SignalOutput {
	/** Signal name matching the script (e.g., "risk-score", "complexity") */
	signal: string;

	/** Numeric value (interpretation depends on signal type) */
	value: number;

	/** Optional metadata for debugging/logging */
	metadata?: Record<string, unknown>;

	/** Timestamp when signal was computed */
	timestamp?: number;
}

/**
 * Output format for validator scripts (scripts/validators/*)
 *
 * Validators make pass/fail decisions about code quality.
 * They are the "gates" that block bad code from being applied.
 */
export interface ValidatorOutput {
	/** Validator name matching the script (e.g., "types", "cycles") */
	validator: string;

	/** Pass or fail - no ambiguity */
	status: "pass" | "fail";

	/** Errors found (only present if status === 'fail') */
	errors?: ValidationError[];

	/** Human-readable suggestion for fixing issues */
	suggestion?: string;

	/** How long the validation took (ms) */
	duration?: number;
}

export interface ValidationError {
	message: string;
	file?: string;
	line?: number;
	column?: number;
	severity?: "error" | "warning" | "info";
}

/**
 * Output format for action scripts (scripts/actions/*)
 *
 * Actions perform side effects (create snapshots, restore files, etc.)
 */
export interface ActionOutput {
	/** Action name matching the script (e.g., "snapshot", "restore") */
	action: string;

	/** Whether the action succeeded */
	success: boolean;

	/** Action-specific result data */
	result?: unknown;

	/** Error message if success === false */
	error?: string;

	/** How long the action took (ms) */
	duration?: number;
}

// =============================================================================
// SESSION & HEALTH TYPES
// =============================================================================

/**
 * Session health tracked by the monitor
 *
 * This is injected into every MCP response to "coach" the agent.
 */
export interface SessionHealth {
	/** Overall health score 0-100 */
	score: number;

	/** Active warnings (most recent 3) */
	warnings: string[];

	/** Actionable suggestions (most recent 2) */
	suggestions: string[];

	/** Files modified in this session */
	filesModified: string[];

	/** Cycles introduced since session start */
	cyclesIntroduced: number;

	/** Complexity change since session start */
	complexityDelta: number;

	/** Coaching message based on health score */
	coaching?: string;
}

/**
 * Baseline captured at session start for delta comparison
 */
export interface SessionBaseline {
	/** Circular dependencies at session start */
	cycles: string[][];

	/** Average complexity at session start */
	avgComplexity: number;

	/** Timestamp when session started */
	startedAt: number;

	/** Workspace root path */
	workspacePath: string;
}

// =============================================================================
// ORCHESTRATOR TYPES
// =============================================================================

/**
 * Configuration for script execution
 */
export interface ScriptConfig {
	/** Script path relative to snapback/ */
	path: string;

	/** Timeout in milliseconds (default: 30000) */
	timeout?: number;

	/** Whether failure blocks the operation */
	blocking?: boolean;
}

/**
 * Result of running multiple scripts
 */
export interface OrchestratorResult {
	/** Combined outcome: pass if all pass, fail if any blocking fails */
	outcome: "pass" | "warn" | "fail";

	/** Individual signal results */
	signals: SignalOutput[];

	/** Individual validator results */
	validators: ValidatorOutput[];

	/** Aggregated risk score (0-10) */
	riskScore: number;

	/** Session health after this operation */
	health: SessionHealth;

	/** Total time taken */
	duration: number;
}

// =============================================================================
// STORAGE TYPES
// =============================================================================

/**
 * Snapshot metadata (stored in manifest)
 *
 * Simplified from the 903 LOC StorageBroker.
 */
export interface Snapshot {
	/** Unique snapshot ID */
	id: string;

	/** When the snapshot was created */
	createdAt: number;

	/** Files included in this snapshot */
	files: SnapshotFile[];

	/** Optional description/reason */
	description?: string;

	/** Risk score at time of snapshot */
	riskScore?: number;

	/** Session ID if created during a session */
	sessionId?: string;
}

export interface SnapshotFile {
	/** Relative path from workspace root */
	path: string;

	/** SHA-256 hash of content (for dedup) */
	hash: string;

	/** File size in bytes */
	size: number;
}

// =============================================================================
// FILE CHANGE TYPES
// =============================================================================

/**
 * Information about a file change
 *
 * Used as input to signals and validators.
 */
export interface FileChange {
	/** Relative path from workspace root */
	path: string;

	/** File content (may be empty for deletes) */
	content: string;

	/** Line count */
	lineCount: number;

	/** Type of change */
	changeType: "add" | "modify" | "delete";
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Main configuration for the simplified architecture
 *
 * Can be loaded from .snapbackrc or snapback.config.ts
 */
export interface SnapBackConfig {
	/** Patterns to exclude from snapshots */
	excludePatterns?: string[];

	/** Patterns to include (if set, only these are included) */
	includePatterns?: string[];

	/** Script timeout in ms (default: 30000) */
	scriptTimeout?: number;

	/** Enable/disable specific validators */
	validators?: {
		types?: boolean;
		cycles?: boolean;
		security?: boolean;
		patterns?: boolean;
	};

	/** Sensitive file patterns (trigger extra caution) */
	sensitivePatterns?: string[];
}

// =============================================================================
// TRANSPORT TYPES
// =============================================================================

/**
 * Standard response format for all transports (MCP, CLI, HTTP)
 */
export interface TransportResponse<T = unknown> {
	/** The actual result */
	result: T;

	/** Session health (always included for coaching) */
	session: SessionHealth;
}

/**
 * MCP tool definition
 */
export interface MCPTool {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	handler: (params: unknown) => Promise<unknown>;
}
