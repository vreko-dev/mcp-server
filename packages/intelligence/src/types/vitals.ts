/**
 * @snapback/intelligence - Vitals Types
 *
 * Type definitions for Workspace Vitals - adaptive risk sensing for AI-native development.
 */

// =============================================================================
// SIGNAL LEVELS
// =============================================================================

/** Change velocity levels */
export type PulseLevel = "resting" | "elevated" | "racing" | "critical";

/** AI activity temperature levels */
export type TempLevel = "cold" | "warm" | "hot" | "burning";

/** Workspace trajectory states */
export type Trajectory = "stable" | "escalating" | "critical" | "recovering";

/** Action urgency levels */
export type Urgency = "none" | "low" | "medium" | "high" | "critical";

// =============================================================================
// SNAPSHOT STATE
// =============================================================================

/** Point-in-time vitals reading */
export interface VitalsSnapshot {
	timestamp: number;
	pulse: {
		level: PulseLevel;
		changesPerMinute: number;
	};
	temperature: {
		level: TempLevel;
		aiPercentage: number;
		detectedTool?: string;
	};
	pressure: {
		value: number; // 0-100
		unsnapshotedChanges: number;
		timeSinceLastSnapshot: number;
		criticalFilesTouched: string[];
	};
	oxygen: {
		value: number; // 0-100
		coveragePercentage: number;
		staleSnapshots: number;
	};
	trajectory: Trajectory;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Pulse tracking configuration */
export interface PulseConfig {
	/** Changes/min to reach "elevated" (default: 15) */
	elevated: number;
	/** Changes/min to reach "racing" (default: 30) */
	racing: number;
	/** Changes/min to reach "critical" (default: 50) */
	critical: number;
	/** Sliding window in seconds (default: 60) */
	windowSeconds: number;
}

/** Temperature monitoring configuration */
export interface TemperatureConfig {
	/** AI percentage for "warm" (default: 20) */
	warm: number;
	/** AI percentage for "hot" (default: 50) */
	hot: number;
	/** AI percentage for "burning" (default: 80) */
	burning: number;
	/** Decay window in seconds (default: 300) */
	decaySeconds: number;
}

/** Pressure gauge configuration */
export interface PressureConfig {
	/** Base pressure accumulation rate per minute (default: 5) */
	baseRate: number;
	/** Multiplier for critical files (default: 2) */
	criticalMultiplier: number;
	/** Percentage of pressure released on snapshot (default: 50) */
	decayOnSnapshot: number;
	/** Maximum pressure value (default: 100) */
	maxPressure: number;
}

/** Oxygen sensor configuration */
export interface OxygenConfig {
	/** Minutes until snapshot considered stale (default: 30) */
	staleMinutes: number;
	/** Weight multiplier for critical files (default: 2) */
	criticalWeight: number;
}

/** Complete vitals configuration */
export interface VitalsConfig {
	pulse: PulseConfig;
	temperature: TemperatureConfig;
	pressure: PressureConfig;
	oxygen: OxygenConfig;
}

// =============================================================================
// AGENT GUIDANCE
// =============================================================================

/** Guidance for AI agents based on current vitals */
export interface AgentGuidance {
	/** Whether a snapshot is recommended now */
	shouldSnapshot: boolean;
	/** Reason for snapshot recommendation */
	snapshotReason?: string;
	/** Files that are risky to modify */
	riskyFiles: string[];
	/** Operations that are safe to perform */
	safeOperations: string[];
	/** Operations that should be blocked */
	blockedOperations: string[];
	/** Human-readable suggestion */
	suggestion: string;
}

/** Snapshot decision result */
export interface SnapshotDecision {
	should: boolean;
	reason: string;
	urgency: Urgency;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/** File change event for vitals tracking */
export interface VitalsFileChangeEvent {
	path: string;
	isAI?: boolean;
	tool?: string;
}

/** AI detection event */
export interface AIDetectionEvent {
	tool: string;
	confidence: number;
}

/** Snapshot creation event */
export interface SnapshotEvent {
	filePath: string;
}
