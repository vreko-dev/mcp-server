/**
 * Session Context Types
 *
 * Session-level intelligence for tracking LLM behavior, detecting loops,
 * and escalating risk based on patterns.
 *
 * Based on research:
 * - arXiv:2511.10650 - Unsupervised Cycle Detection in Agentic Applications
 * - Pedowitz Safety Playbook - AI Agent Loop Prevention
 * - LangChain Context Engineering patterns
 */

/**
 * Tool call record for history tracking
 */
export interface ToolCall {
	/** Unique idempotency key */
	id: string;
	/** Tool name (e.g., 'check_patterns', 'validate_code') */
	name: string;
	/** Tool arguments */
	args: Record<string, unknown>;
	/** Timestamp */
	timestamp: number;
	/** Result (success/error) */
	result?: {
		success: boolean;
		output?: unknown;
		error?: string;
	};
	/** Semantic embedding of args (for cycle detection) */
	embedding?: number[];
}

/**
 * File modification record
 */
export interface FileModification {
	/** File path */
	path: string;
	/** Modification timestamp */
	timestamp: number;
	/** Type of modification */
	type: "create" | "update" | "delete";
	/** Lines changed (for velocity tracking) */
	linesChanged?: number;
}

/**
 * Loop detection state
 * Detects both structural (same tool) and semantic (similar args) cycles
 */
export interface LoopDetectionState {
	/** Sequential tool call pattern (last 5 calls) */
	sequence: string[];
	/** Idempotency key cache (prevent duplicate operations) */
	dedupKeys: Set<string>;
	/** Consecutive same-tool calls */
	consecutiveSameTool: Map<string, number>;
	/** Semantic similarity cache (detect near-duplicate calls) */
	semanticCache: Map<string, number[]>;
	/** Circuit breaker states */
	circuitBreakers: Map<string, CircuitBreaker>;
}

/**
 * Circuit breaker for tool calls
 * Trips after N failures, requires cooldown before retry
 */
export interface CircuitBreaker {
	/** Tool name */
	tool: string;
	/** Current state */
	state: "closed" | "open" | "half-open";
	/** Failure count */
	failures: number;
	/** Failure threshold (default: 3) */
	threshold: number;
	/** Last failure timestamp */
	lastFailure: number;
	/** Cooldown period in ms (default: 60000 = 1min) */
	cooldownMs: number;
}

/**
 * Session risk level
 * Escalates based on behavior patterns
 */
export type SessionRiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Session state for a single LLM conversation
 * Tracks all context needed for behavioral intelligence
 */
export interface SessionState {
	/** Unique session ID */
	sessionId: string;
	/** Session start time */
	startedAt: number;
	/** Last activity timestamp */
	lastActivity: number;
	/** Total turn count */
	turnCount: number;

	/** Tool call history */
	toolCalls: ToolCall[];

	/** File modifications this session */
	fileModifications: FileModification[];

	/** Files modified multiple times (velocity tracking) */
	consecutiveModifications: Map<string, number>;

	/** Loop detection state */
	loopDetection: LoopDetectionState;

	/** Current risk level */
	riskLevel: SessionRiskLevel;

	/** Risk escalation reasons */
	riskReasons: string[];

	/** Session metadata */
	metadata: {
		workspaceId?: string;
		userId?: string;
		tags?: string[];
	};
}

/**
 * Loop detection result
 */
export interface LoopDetectionResult {
	/** Is a loop detected? */
	detected: boolean;
	/** Loop type */
	type?: "structural" | "semantic" | "both";
	/** Confidence score (0-1) */
	confidence: number;
	/** Evidence */
	evidence: string[];
	/** Recommended action */
	action: "continue" | "warn" | "halt";
}

/**
 * Session limits configuration
 */
export interface SessionLimits {
	/** Max tool calls per session */
	maxToolCalls: number;
	/** Max consecutive same-tool calls */
	maxConsecutiveSameTool: number;
	/** Max file modifications per session */
	maxFileModifications: number;
	/** Max consecutive modifications to same file */
	maxConsecutiveSameFile: number;
	/** Session timeout (ms) */
	sessionTimeoutMs: number;
	/** Turn limit (max back-and-forth exchanges) */
	maxTurns: number;
	/** Circuit breaker failure threshold */
	circuitBreakerThreshold: number;
	/** Circuit breaker cooldown (ms) */
	circuitBreakerCooldownMs: number;
}

/**
 * Default session limits (safety-first)
 */
export const DEFAULT_SESSION_LIMITS: SessionLimits = {
	maxToolCalls: 100,
	maxConsecutiveSameTool: 3,
	maxFileModifications: 50,
	maxConsecutiveSameFile: 5,
	sessionTimeoutMs: 3600000, // 1 hour
	maxTurns: 50,
	circuitBreakerThreshold: 3,
	circuitBreakerCooldownMs: 60000, // 1 minute
};

/**
 * Session analytics for reporting
 */
export interface SessionAnalytics {
	/** Session ID */
	sessionId: string;
	/** Duration (ms) */
	duration: number;
	/** Total tool calls */
	totalToolCalls: number;
	/** Unique tools used */
	uniqueTools: string[];
	/** Most called tool */
	mostCalledTool: { name: string; count: number } | null;
	/** Files touched */
	filesTouched: string[];
	/** Peak risk level */
	peakRiskLevel: SessionRiskLevel;
	/** Loops detected */
	loopsDetected: number;
	/** Circuit breaker trips */
	circuitBreakerTrips: number;
	/** Session outcome */
	outcome: "completed" | "timeout" | "halted" | "error";
}
