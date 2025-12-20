/**
 * Learning Types
 *
 * Types for the learning engine, feedback loop, and violation tracking.
 */

/**
 * Logged AI interaction for analysis
 */
export interface Interaction {
	id: string;
	timestamp: string;
	query: string;
	contextUsed: string[];
	toolsCalled: string[];
	output: string;
	validationPassed?: boolean;
	confidence?: number;
	humanFeedback?: HumanFeedback;
}

/**
 * Human feedback on an interaction
 */
export interface HumanFeedback {
	correct: boolean;
	confidence: number;
	corrections?: string[];
	timeSpent?: number;
	timestamp: string;
}

/**
 * Input for recording feedback (without timestamp)
 */
export type FeedbackInput = Omit<HumanFeedback, "timestamp">;

/**
 * Perfect interaction added to golden dataset
 */
export interface GoldenExample {
	id: string;
	queryType: QueryType;
	query: string;
	output: string;
	contextUsed: string[];
	addedAt: string;
}

/**
 * Query types for classification
 */
export type QueryType =
	| "authentication"
	| "testing"
	| "api"
	| "database"
	| "ui"
	| "vscode"
	| "mcp"
	| "performance"
	| "architecture"
	| "general";

/**
 * Keywords for query classification
 */
export const QUERY_TYPE_KEYWORDS: Record<QueryType, string[]> = {
	authentication: ["auth", "login", "session", "token", "api-key", "verify"],
	testing: ["test", "vitest", "coverage", "mock", "spec", "assertion"],
	api: ["endpoint", "route", "handler", "request", "response", "http"],
	database: ["db", "query", "sql", "drizzle", "migration", "schema"],
	ui: ["component", "react", "css", "style", "layout", "render"],
	vscode: ["extension", "command", "webview", "activation", "disposable"],
	mcp: ["mcp", "tool", "server", "protocol", "context"],
	performance: ["perf", "slow", "timeout", "budget", "latency", "optimize"],
	architecture: ["layer", "pattern", "structure", "boundary", "module"],
	general: [],
};

/**
 * Learning engine statistics
 */
export interface LearningStats {
	totalInteractions: number;
	feedbackReceived: number;
	correctRate: number;
	goldenExamples: number;
	queryTypeBreakdown: Record<QueryType, number>;
}

/**
 * Recorded violation for tracking
 */
export interface Violation {
	id: string;
	type: string;
	file: string;
	context?: string;
	whatHappened: string;
	whyItHappened: string;
	prevention: string;
	wrongExample?: string;
	correctExample?: string;
	detectionRule?: string;
	timestamp: string;
	count: number;
	promotedAt?: string | null;
	automatedAt?: string | null;
}

/**
 * Input for reporting a violation
 */
export interface ViolationInput {
	type: string;
	file: string;
	message: string;
	reason: string;
	prevention: string;
	wrongExample?: string;
	correctExample?: string;
}

/**
 * Status after reporting a violation
 */
export interface ViolationStatus {
	id: string;
	count: number;
	shouldPromote: boolean;
	shouldAutomate: boolean;
}

/**
 * Summary of all violations
 */
export interface ViolationsSummary {
	total: number;
	byType: Array<{
		type: string;
		count: number;
		status: "tracking" | "ready_for_promotion" | "ready_for_automation" | "promoted" | "automated";
	}>;
	readyForPromotion: string[];
	readyForAutomation: string[];
}

/**
 * Thresholds for violation promotion
 */
export const PROMOTION_THRESHOLDS = {
	PROMOTE_TO_PATTERN: 3,
	ADD_AUTOMATION: 5,
} as const;

/**
 * Recorded learning from a session
 */
export interface Learning {
	id: string;
	type: LearningType;
	trigger: string | string[];
	context?: string;
	problem?: string;
	solution: string;
	action: string;
	related?: string[];
	source: string;
	timestamp: string;
}

/**
 * Types of learnings
 */
export type LearningType =
	| "pattern"
	| "pitfall"
	| "architecture"
	| "performance"
	| "efficiency"
	| "discovery"
	| "workflow";

/**
 * Input for recording a learning
 */
export interface LearningInput {
	type: LearningType;
	trigger: string;
	action: string;
	source: string;
}
