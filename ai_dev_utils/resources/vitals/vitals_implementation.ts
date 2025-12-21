// packages/intelligence/src/vitals/index.ts
// Implementation sketch for Workspace Vitals

import type { FileChangeEvent } from "@snapback/contracts";
import { EventEmitter } from "events";

// =============================================================================
// TYPES
// =============================================================================

export type PulseLevel = "resting" | "elevated" | "racing" | "critical";
export type TempLevel = "cold" | "warm" | "hot" | "burning";
export type Trajectory = "stable" | "escalating" | "critical" | "recovering";
export type Urgency = "none" | "low" | "medium" | "high" | "critical";

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

export interface VitalsConfig {
	pulse: {
		elevated: number; // changes/min threshold
		racing: number;
		critical: number;
		windowSeconds: number;
	};
	temperature: {
		warm: number; // AI percentage threshold
		hot: number;
		burning: number;
		decaySeconds: number;
	};
	pressure: {
		baseRate: number; // pressure/min when no snapshots
		criticalMultiplier: number;
		decayOnSnapshot: number;
		maxPressure: number;
	};
	oxygen: {
		staleMinutes: number;
		criticalWeight: number;
	};
}

export interface AgentGuidance {
	shouldSnapshot: boolean;
	snapshotReason?: string;
	riskyFiles: string[];
	safeOperations: string[];
	blockedOperations: string[];
	suggestion: string;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: VitalsConfig = {
	pulse: {
		elevated: 15,
		racing: 30,
		critical: 50,
		windowSeconds: 60,
	},
	temperature: {
		warm: 20,
		hot: 50,
		burning: 80,
		decaySeconds: 300, // 5 min to cool down
	},
	pressure: {
		baseRate: 5, // 5% pressure/min without snapshots
		criticalMultiplier: 2, // 2x for critical files
		decayOnSnapshot: 50, // Release 50% on snapshot
		maxPressure: 100,
	},
	oxygen: {
		staleMinutes: 30,
		criticalWeight: 2,
	},
};

// =============================================================================
// PULSE TRACKER
// =============================================================================

class PulseTracker {
	private changes: number[] = [];
	private config: VitalsConfig["pulse"];

	constructor(config: VitalsConfig["pulse"]) {
		this.config = config;
	}

	recordChange(): void {
		this.changes.push(Date.now());
		this.pruneOld();
	}

	private pruneOld(): void {
		const cutoff = Date.now() - this.config.windowSeconds * 1000;
		this.changes = this.changes.filter((t) => t > cutoff);
	}

	getLevel(): { level: PulseLevel; changesPerMinute: number } {
		this.pruneOld();
		const changesPerMinute = (this.changes.length / this.config.windowSeconds) * 60;

		let level: PulseLevel;
		if (changesPerMinute >= this.config.critical) {
			level = "critical";
		} else if (changesPerMinute >= this.config.racing) {
			level = "racing";
		} else if (changesPerMinute >= this.config.elevated) {
			level = "elevated";
		} else {
			level = "resting";
		}

		return { level, changesPerMinute: Math.round(changesPerMinute) };
	}
}

// =============================================================================
// TEMPERATURE MONITOR
// =============================================================================

class TemperatureMonitor {
	private aiEvents: { timestamp: number; tool?: string }[] = [];
	private humanEvents: number[] = [];
	private config: VitalsConfig["temperature"];

	constructor(config: VitalsConfig["temperature"]) {
		this.config = config;
	}

	recordAIActivity(tool?: string): void {
		this.aiEvents.push({ timestamp: Date.now(), tool });
		this.pruneOld();
	}

	recordHumanActivity(): void {
		this.humanEvents.push(Date.now());
		this.pruneOld();
	}

	private pruneOld(): void {
		const cutoff = Date.now() - this.config.decaySeconds * 1000;
		this.aiEvents = this.aiEvents.filter((e) => e.timestamp > cutoff);
		this.humanEvents = this.humanEvents.filter((t) => t > cutoff);
	}

	getLevel(): { level: TempLevel; aiPercentage: number; detectedTool?: string } {
		this.pruneOld();
		const total = this.aiEvents.length + this.humanEvents.length;
		const aiPercentage = total > 0 ? (this.aiEvents.length / total) * 100 : 0;

		// Most recent AI tool
		const detectedTool = this.aiEvents.length > 0 ? this.aiEvents[this.aiEvents.length - 1].tool : undefined;

		let level: TempLevel;
		if (aiPercentage >= this.config.burning) {
			level = "burning";
		} else if (aiPercentage >= this.config.hot) {
			level = "hot";
		} else if (aiPercentage >= this.config.warm) {
			level = "warm";
		} else {
			level = "cold";
		}

		return { level, aiPercentage: Math.round(aiPercentage), detectedTool };
	}
}

// =============================================================================
// PRESSURE GAUGE
// =============================================================================

class PressureGauge {
	private value = 0;
	private unsnapshotedChanges = 0;
	private lastSnapshotTime = Date.now();
	private criticalFilesTouched: Set<string> = new Set();
	private config: VitalsConfig["pressure"];
	private criticalPatterns = [/package\.json$/, /\.env/, /tsconfig\.json$/, /\.lock$/, /migrations?\//];

	constructor(config: VitalsConfig["pressure"]) {
		this.config = config;
	}

	recordChange(filePath: string): void {
		this.unsnapshotedChanges++;

		const isCritical = this.criticalPatterns.some((p) => p.test(filePath));
		if (isCritical) {
			this.criticalFilesTouched.add(filePath);
		}

		// Accumulate pressure
		const multiplier = isCritical ? this.config.criticalMultiplier : 1;
		this.value = Math.min(this.config.maxPressure, this.value + (this.config.baseRate * multiplier) / 10);
	}

	recordSnapshot(): void {
		this.value = Math.max(0, this.value - this.config.decayOnSnapshot);
		this.unsnapshotedChanges = 0;
		this.criticalFilesTouched.clear();
		this.lastSnapshotTime = Date.now();
	}

	getState(): {
		value: number;
		unsnapshotedChanges: number;
		timeSinceLastSnapshot: number;
		criticalFilesTouched: string[];
	} {
		// Time-based pressure accumulation
		const minutesSinceSnapshot = (Date.now() - this.lastSnapshotTime) / 60000;
		const timePressure = minutesSinceSnapshot * this.config.baseRate;
		const totalPressure = Math.min(this.config.maxPressure, this.value + timePressure);

		return {
			value: Math.round(totalPressure),
			unsnapshotedChanges: this.unsnapshotedChanges,
			timeSinceLastSnapshot: Math.round(minutesSinceSnapshot),
			criticalFilesTouched: Array.from(this.criticalFilesTouched),
		};
	}
}

// =============================================================================
// OXYGEN SENSOR
// =============================================================================

class OxygenSensor {
	private snapshots: Map<string, number> = new Map(); // filePath -> timestamp
	private modifiedFiles: Set<string> = new Set();
	private config: VitalsConfig["oxygen"];
	private criticalPatterns = [/package\.json$/, /\.env/, /tsconfig\.json$/];

	constructor(config: VitalsConfig["oxygen"]) {
		this.config = config;
	}

	recordModification(filePath: string): void {
		this.modifiedFiles.add(filePath);
	}

	recordSnapshot(filePath: string): void {
		this.snapshots.set(filePath, Date.now());
		this.modifiedFiles.delete(filePath);
	}

	getLevel(): { value: number; coveragePercentage: number; staleSnapshots: number } {
		const now = Date.now();
		const staleThreshold = now - this.config.staleMinutes * 60 * 1000;

		let covered = 0;
		let total = 0;
		let stale = 0;

		for (const file of this.modifiedFiles) {
			const isCritical = this.criticalPatterns.some((p) => p.test(file));
			const weight = isCritical ? this.config.criticalWeight : 1;
			total += weight;

			const snapshotTime = this.snapshots.get(file);
			if (snapshotTime) {
				if (snapshotTime > staleThreshold) {
					covered += weight;
				} else {
					stale++;
				}
			}
		}

		const coveragePercentage = total > 0 ? (covered / total) * 100 : 100;

		return {
			value: Math.round(coveragePercentage),
			coveragePercentage: Math.round(coveragePercentage),
			staleSnapshots: stale,
		};
	}
}

// =============================================================================
// WORKSPACE VITALS (Main Class)
// =============================================================================

export class WorkspaceVitals extends EventEmitter {
	private static instances: Map<string, WorkspaceVitals> = new Map();

	private pulse: PulseTracker;
	private temperature: TemperatureMonitor;
	private pressure: PressureGauge;
	private oxygen: OxygenSensor;
	private config: VitalsConfig;
	private history: VitalsSnapshot[] = [];
	private maxHistory = 100;

	private constructor(config: Partial<VitalsConfig> = {}) {
		super();
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.pulse = new PulseTracker(this.config.pulse);
		this.temperature = new TemperatureMonitor(this.config.temperature);
		this.pressure = new PressureGauge(this.config.pressure);
		this.oxygen = new OxygenSensor(this.config.oxygen);
	}

	static for(workspaceId: string, config?: Partial<VitalsConfig>): WorkspaceVitals {
		if (!WorkspaceVitals.instances.has(workspaceId)) {
			WorkspaceVitals.instances.set(workspaceId, new WorkspaceVitals(config));
		}
		return WorkspaceVitals.instances.get(workspaceId)!;
	}

	// ===== Event Handlers =====

	onFileChange(event: FileChangeEvent & { isAI?: boolean; tool?: string }): void {
		this.pulse.recordChange();
		this.pressure.recordChange(event.path);
		this.oxygen.recordModification(event.path);

		if (event.isAI) {
			this.temperature.recordAIActivity(event.tool);
		} else {
			this.temperature.recordHumanActivity();
		}

		this.checkAndEmit();
	}

	onSnapshot(snapshot: { filePath: string }): void {
		this.pressure.recordSnapshot();
		this.oxygen.recordSnapshot(snapshot.filePath);
		this.checkAndEmit();
	}

	onAIDetected(detection: { tool: string; confidence: number }): void {
		if (detection.confidence > 0.6) {
			this.temperature.recordAIActivity(detection.tool);
		}
		this.checkAndEmit();
	}

	// ===== Current State =====

	current(): VitalsSnapshot {
		const pulseData = this.pulse.getLevel();
		const tempData = this.temperature.getLevel();
		const pressureData = this.pressure.getState();
		const oxygenData = this.oxygen.getLevel();

		const snapshot: VitalsSnapshot = {
			timestamp: Date.now(),
			pulse: pulseData,
			temperature: tempData,
			pressure: pressureData,
			oxygen: oxygenData,
			trajectory: this.calculateTrajectory(pulseData, tempData, pressureData, oxygenData),
		};

		// Record history
		this.history.push(snapshot);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}

		return snapshot;
	}

	private calculateTrajectory(
		pulse: VitalsSnapshot["pulse"],
		temp: VitalsSnapshot["temperature"],
		pressure: VitalsSnapshot["pressure"],
		oxygen: VitalsSnapshot["oxygen"],
	): Trajectory {
		// Critical: High pressure + Hot temp + Low oxygen
		if (pressure.value > 80 && temp.level === "burning" && oxygen.value < 50) {
			return "critical";
		}

		// Escalating: Rising pressure or heat without coverage
		if ((pressure.value > 60 && oxygen.value < 70) || (temp.level === "hot" && pulse.level === "racing")) {
			return "escalating";
		}

		// Recovering: Decreasing pressure, good oxygen
		const recentHistory = this.history.slice(-5);
		if (recentHistory.length >= 3) {
			const pressureTrend =
				recentHistory[recentHistory.length - 1]?.pressure.value - recentHistory[0]?.pressure.value;
			if (pressureTrend < -10 && oxygen.value > 70) {
				return "recovering";
			}
		}

		return "stable";
	}

	// ===== Decision Support =====

	shouldSnapshot(): { should: boolean; reason: string; urgency: Urgency } {
		const vitals = this.current();

		if (vitals.trajectory === "critical") {
			return {
				should: true,
				reason: "Critical risk state - immediate snapshot recommended",
				urgency: "critical",
			};
		}

		if (vitals.pressure.value > 80) {
			return {
				should: true,
				reason: `High pressure (${vitals.pressure.value}%) - ${vitals.pressure.unsnapshotedChanges} unsaved changes`,
				urgency: "high",
			};
		}

		if (vitals.pressure.criticalFilesTouched.length > 0 && vitals.oxygen.value < 50) {
			return {
				should: true,
				reason: `Critical files modified without snapshot: ${vitals.pressure.criticalFilesTouched.join(", ")}`,
				urgency: "high",
			};
		}

		if (vitals.temperature.level === "burning" && vitals.oxygen.value < 60) {
			return {
				should: true,
				reason: "Heavy AI activity with low snapshot coverage",
				urgency: "medium",
			};
		}

		if (vitals.pressure.value > 50) {
			return {
				should: false,
				reason: "Consider snapshotting soon",
				urgency: "low",
			};
		}

		return {
			should: false,
			reason: "No immediate action needed",
			urgency: "none",
		};
	}

	getAgentGuidance(): AgentGuidance {
		const vitals = this.current();
		const snapshotDecision = this.shouldSnapshot();

		const blockedOps: string[] = [];
		if (vitals.trajectory === "critical") {
			blockedOps.push("delete", "refactor-large", "mass-rename");
		}

		const safeOps = ["read", "analyze", "suggest"];
		if (vitals.oxygen.value > 80 && vitals.pressure.value < 40) {
			safeOps.push("write", "modify", "refactor-small");
		}

		return {
			shouldSnapshot: snapshotDecision.should,
			snapshotReason: snapshotDecision.should ? snapshotDecision.reason : undefined,
			riskyFiles: vitals.pressure.criticalFilesTouched,
			safeOperations: safeOps,
			blockedOperations: blockedOps,
			suggestion: this.getSuggestion(vitals),
		};
	}

	private getSuggestion(vitals: VitalsSnapshot): string {
		if (vitals.trajectory === "critical") {
			return "STOP: Create a checkpoint before making more changes";
		}
		if (vitals.trajectory === "escalating") {
			return "Consider creating a snapshot - risk is accumulating";
		}
		if (vitals.temperature.level === "burning") {
			return "Heavy AI activity detected - extra caution recommended";
		}
		if (vitals.oxygen.value < 50) {
			return "Low snapshot coverage - protect your work";
		}
		return "Proceed normally";
	}

	// ===== Threshold Multiplier (for AutoDecisionEngine) =====

	getThresholdMultiplier(): number {
		const vitals = this.current();

		// High temperature → more protective (lower threshold)
		const tempMultiplier = {
			cold: 1.2,
			warm: 1.0,
			hot: 0.8,
			burning: 0.6,
		}[vitals.temperature.level];

		// High oxygen → less protective (higher threshold)
		const oxygenMultiplier = vitals.oxygen.value > 80 ? 1.2 : 1.0;

		// High pressure → more protective
		const pressureMultiplier = vitals.pressure.value > 60 ? 0.8 : 1.0;

		return tempMultiplier * oxygenMultiplier * pressureMultiplier;
	}

	// ===== Internal =====

	private checkAndEmit(): void {
		const vitals = this.current();
		const decision = this.shouldSnapshot();

		if (decision.urgency === "critical") {
			this.emit("critical", vitals);
		} else if (decision.urgency === "high") {
			this.emit("warning", vitals);
		}

		this.emit("update", vitals);
	}
}

// =============================================================================
// MCP TOOL DEFINITIONS
// =============================================================================

export const MCP_TOOLS = {
	get_workspace_vitals: {
		name: "get_workspace_vitals",
		description:
			"Get current workspace health signals before making changes. Returns pulse (change velocity), temperature (AI activity), pressure (risk accumulation), and oxygen (snapshot coverage).",
		inputSchema: {
			type: "object",
			properties: {
				workspaceId: {
					type: "string",
					description: "Workspace identifier",
				},
			},
			required: ["workspaceId"],
		},
		handler: async ({ workspaceId }: { workspaceId: string }) => {
			const vitals = WorkspaceVitals.for(workspaceId);
			const current = vitals.current();
			const guidance = vitals.getAgentGuidance();

			return {
				vitals: current,
				guidance,
				recommendation: vitals.shouldSnapshot(),
			};
		},
	},

	acknowledge_risk: {
		name: "acknowledge_risk",
		description:
			"Acknowledge current risk state and proceed with changes. Use when you understand the risks and want to continue.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceId: { type: "string" },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you intend to modify",
				},
				reason: {
					type: "string",
					description: "Why you are proceeding despite the risk",
				},
			},
			required: ["workspaceId", "files", "reason"],
		},
		handler: async ({ workspaceId, files, reason }: { workspaceId: string; files: string[]; reason: string }) => {
			// Log the acknowledgment for audit
			console.log(`[Vitals] Risk acknowledged for ${workspaceId}:`, { files, reason });

			// Could trigger telemetry, reduce urgency temporarily, etc.
			return {
				acknowledged: true,
				message: `Proceeding with modifications to ${files.length} files`,
				reminder: "Consider snapshotting after completing your changes",
			};
		},
	},
};

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_CONFIG as VITALS_DEFAULT_CONFIG };
export type { VitalsConfig, AgentGuidance };
