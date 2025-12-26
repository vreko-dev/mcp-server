/**
 * MCP Session State Management
 *
 * Maintains session state across tool calls for composite tool support.
 * Enables "pair programmer" workflow with task tracking, change detection,
 * and proactive observations.
 *
 * @module session/state
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// =============================================================================
// TYPES
// =============================================================================

/**
 * File change tracked during a task
 */
export interface FileChange {
	file: string;
	type: "created" | "modified" | "deleted";
	timestamp: number;
	aiAttributed: boolean;
	linesChanged: number;
}

/**
 * Proactive observation from extension
 */
export interface Observation {
	type: "risk" | "pattern" | "suggestion" | "warning" | "progress";
	message: string;
	timestamp: number;
	context?: Record<string, unknown>;
}

/**
 * Git file status at a point in time
 */
export interface GitFileStatus {
	file: string;
	status: "A" | "M" | "D" | "?";
	timestamp: number;
}

/**
 * Current task being worked on
 */
export interface CurrentTask {
	id: string;
	description: string;
	startedAt: number;
	plannedFiles: string[];
	snapshotId?: string;
	keywords: string[];
	/** Git state when task started - used to filter what_changed/review_work */
	gitBaseline?: GitFileStatus[];
}

/**
 * Risk area categories
 */
export type RiskArea = "auth" | "payment" | "database" | "config" | "api" | "security";

/**
 * Complete MCP session state
 */
export interface MCPSessionState {
	/** Current task tracking */
	currentTask: CurrentTask | null;

	/** Changes since task start (populated by extension bridge) */
	changesSinceTaskStart: FileChange[];

	/** Proactive observations (populated by extension) */
	pendingObservations: Observation[];

	/** Learnings surfaced this session */
	surfacedLearnings: string[];

	/** Risk areas touched */
	riskAreasTouched: RiskArea[];

	/** Session statistics */
	stats: {
		tasksCompleted: number;
		snapshotsCreated: number;
		restoresPerformed: number;
		learningsCaptured: number;
	};

	/** Suggested learnings pending acceptance */
	pendingSuggestedLearnings: Array<{
		type: string;
		trigger: string;
		action: string;
	}>;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * In-memory session state per workspace
 * Key: workspaceRoot path
 */
const sessionStates = new Map<string, MCPSessionState>();

/**
 * Create default session state
 */
function createDefaultState(): MCPSessionState {
	return {
		currentTask: null,
		changesSinceTaskStart: [],
		pendingObservations: [],
		surfacedLearnings: [],
		riskAreasTouched: [],
		stats: {
			tasksCompleted: 0,
			snapshotsCreated: 0,
			restoresPerformed: 0,
			learningsCaptured: 0,
		},
		pendingSuggestedLearnings: [],
	};
}

/**
 * Get session state for a workspace (creates if needed)
 */
export function getSessionState(workspaceRoot: string): MCPSessionState {
	if (!sessionStates.has(workspaceRoot)) {
		// Try to load from disk first
		const loaded = loadStateFromDisk(workspaceRoot);
		sessionStates.set(workspaceRoot, loaded || createDefaultState());
	}
	const state = sessionStates.get(workspaceRoot);
	if (!state) {
		throw new Error(`Failed to get session state for ${workspaceRoot}`);
	}
	return state;
}

/**
 * Update session state
 */
export function updateSessionState(workspaceRoot: string, updates: Partial<MCPSessionState>): MCPSessionState {
	const current = getSessionState(workspaceRoot);
	const updated = { ...current, ...updates };
	sessionStates.set(workspaceRoot, updated);

	// Persist to disk for recovery
	saveStateToDisk(workspaceRoot, updated);

	return updated;
}

/**
 * Clear session state (on session end)
 */
export function clearSessionState(workspaceRoot: string): void {
	sessionStates.delete(workspaceRoot);
	clearStateFromDisk(workspaceRoot);
}

// =============================================================================
// TASK MANAGEMENT
// =============================================================================

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `task_${timestamp}_${random}`;
}

/**
 * Start a new task
 * Captures git baseline to enable task-scoped change tracking
 */
export function startTask(
	workspaceRoot: string,
	task: Omit<CurrentTask, "id" | "startedAt" | "gitBaseline">,
): CurrentTask {
	// Capture git state BEFORE starting task
	const gitBaseline = captureGitBaseline(workspaceRoot);

	const currentTask: CurrentTask = {
		...task,
		id: generateTaskId(),
		startedAt: Date.now(),
		gitBaseline,
	};

	updateSessionState(workspaceRoot, {
		currentTask,
		changesSinceTaskStart: [],
		pendingObservations: [],
	});

	return currentTask;
}

/**
 * End current task
 */
export function endTask(workspaceRoot: string, outcome: "completed" | "abandoned" | "blocked"): CurrentTask | null {
	const state = getSessionState(workspaceRoot);
	const task = state.currentTask;

	if (task) {
		// Update stats
		if (outcome === "completed") {
			state.stats.tasksCompleted++;
		}

		// Clear task but preserve stats
		updateSessionState(workspaceRoot, {
			currentTask: null,
			changesSinceTaskStart: [],
			pendingObservations: [],
			pendingSuggestedLearnings: [],
		});
	}

	return task;
}

/**
 * Get current task (or null)
 */
export function getCurrentTask(workspaceRoot: string): CurrentTask | null {
	return getSessionState(workspaceRoot).currentTask;
}

// =============================================================================
// CHANGE TRACKING
// =============================================================================

/**
 * Record a file change
 */
export function recordFileChange(workspaceRoot: string, change: FileChange): void {
	const state = getSessionState(workspaceRoot);

	// Only track if task is active
	if (!state.currentTask) {
		return;
	}

	// Add to changes list
	state.changesSinceTaskStart.push(change);

	// Detect risk areas from file path
	const riskAreas = detectRiskAreas(change.file);
	for (const area of riskAreas) {
		if (!state.riskAreasTouched.includes(area)) {
			state.riskAreasTouched.push(area);
		}
	}

	updateSessionState(workspaceRoot, state);
}

/**
 * Detect risk areas from file path
 */
function detectRiskAreas(filePath: string): RiskArea[] {
	const areas: RiskArea[] = [];
	const lowerPath = filePath.toLowerCase();

	if (lowerPath.includes("auth") || lowerPath.includes("login") || lowerPath.includes("session")) {
		areas.push("auth");
	}
	if (lowerPath.includes("payment") || lowerPath.includes("stripe") || lowerPath.includes("billing")) {
		areas.push("payment");
	}
	if (lowerPath.includes("database") || lowerPath.includes("db") || lowerPath.includes("migration")) {
		areas.push("database");
	}
	if (lowerPath.includes("config") || lowerPath.includes(".env") || lowerPath.includes("settings")) {
		areas.push("config");
	}
	if (lowerPath.includes("api") || lowerPath.includes("route") || lowerPath.includes("endpoint")) {
		areas.push("api");
	}
	if (lowerPath.includes("security") || lowerPath.includes("crypto") || lowerPath.includes("secret")) {
		areas.push("security");
	}

	return areas;
}

// =============================================================================
// OBSERVATIONS
// =============================================================================

/**
 * Push an observation (from extension or internally)
 */
export function pushObservation(workspaceRoot: string, observation: Observation): void {
	const state = getSessionState(workspaceRoot);

	state.pendingObservations.push(observation);

	// Limit queue size (keep recent 50)
	if (state.pendingObservations.length > 50) {
		state.pendingObservations = state.pendingObservations.slice(-50);
	}

	updateSessionState(workspaceRoot, state);
}

/**
 * Drain pending observations (returns and clears)
 */
export function drainPendingObservations(workspaceRoot: string): Observation[] {
	const state = getSessionState(workspaceRoot);
	const observations = [...state.pendingObservations];

	updateSessionState(workspaceRoot, {
		pendingObservations: [],
	});

	return observations;
}

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Get state file path
 */
function getStateFilePath(workspaceRoot: string): string {
	return join(workspaceRoot, ".snapback", "mcp", "session-state.json");
}

/**
 * Save state to disk
 */
function saveStateToDisk(workspaceRoot: string, state: MCPSessionState): void {
	const filePath = getStateFilePath(workspaceRoot);

	try {
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
	} catch {
		// Ignore write errors (non-critical)
	}
}

/**
 * Load state from disk
 */
function loadStateFromDisk(workspaceRoot: string): MCPSessionState | null {
	const filePath = getStateFilePath(workspaceRoot);

	try {
		if (existsSync(filePath)) {
			const content = readFileSync(filePath, "utf8");
			return JSON.parse(content) as MCPSessionState;
		}
	} catch {
		// Ignore read errors
	}

	return null;
}

/**
 * Clear state from disk
 */
function clearStateFromDisk(workspaceRoot: string): void {
	const filePath = getStateFilePath(workspaceRoot);

	try {
		if (existsSync(filePath)) {
			require("node:fs").unlinkSync(filePath);
		}
	} catch {
		// Ignore delete errors
	}
}

// =============================================================================
// GIT BASELINE HELPERS
// =============================================================================

/**
 * Capture current git status as baseline
 * Call this when starting a task to know what was already modified
 */
export function captureGitBaseline(workspaceRoot: string): GitFileStatus[] {
	const baseline: GitFileStatus[] = [];
	const now = Date.now();

	try {
		const result = execSync("git status --porcelain", {
			cwd: workspaceRoot,
			encoding: "utf8",
			timeout: 5000, // 5s timeout to prevent blocking
		});

		for (const line of result.split("\n")) {
			if (!line.trim()) {
				continue;
			}

			const statusCode = line.substring(0, 2);
			const file = line.substring(3).trim();

			let status: "A" | "M" | "D" | "?" = "M";
			if (statusCode.includes("A") || statusCode === "??") {
				status = statusCode === "??" ? "?" : "A";
			} else if (statusCode.includes("D")) {
				status = "D";
			}

			baseline.push({ file, status, timestamp: now });
		}
	} catch {
		// Git not available or not a git repo - return empty baseline
	}

	return baseline;
}

/**
 * Check if a file was in the baseline (existed before task started)
 */
export function isInBaseline(file: string, baseline: GitFileStatus[] | undefined): boolean {
	if (!baseline || baseline.length === 0) {
		return false;
	}
	return baseline.some((b) => b.file === file);
}

/**
 * Get baseline file set for quick lookup
 */
export function getBaselineFileSet(workspaceRoot: string): Set<string> {
	const state = getSessionState(workspaceRoot);
	const baseline = state.currentTask?.gitBaseline || [];
	return new Set(baseline.map((b) => b.file));
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Extract keywords from task description
 */
export function extractKeywords(taskDescription: string): string[] {
	// Remove common words and punctuation
	const stopWords = new Set([
		"a",
		"an",
		"the",
		"to",
		"for",
		"of",
		"in",
		"on",
		"at",
		"and",
		"or",
		"but",
		"is",
		"are",
		"was",
		"were",
		"be",
		"been",
		"being",
		"have",
		"has",
		"had",
		"do",
		"does",
		"did",
		"will",
		"would",
		"could",
		"should",
		"may",
		"might",
		"i",
		"we",
		"you",
		"they",
		"it",
		"this",
		"that",
		"with",
		"from",
		"by",
		"add",
		"update",
		"fix",
		"implement",
		"create",
		"make",
		"change",
		"modify",
	]);

	const words = taskDescription
		.toLowerCase()
		.replace(/[^\w\s-]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 2 && !stopWords.has(word));

	// Return unique keywords (max 5)
	return [...new Set(words)].slice(0, 5);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}

	if (minutes > 0) {
		return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
	}

	return "less than a minute";
}
