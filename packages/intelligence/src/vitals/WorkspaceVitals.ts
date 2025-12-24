/**
 * WorkspaceVitals - Core vitals orchestrator
 *
 * Combines all four vital signs into a unified workspace health monitor:
 * - Pulse: Change velocity
 * - Temperature: AI activity level
 * - Pressure: Risk accumulation
 * - Oxygen: Snapshot coverage
 *
 * Phase 4 additions:
 * - User behavior learning
 * - Per-workspace threshold calibration
 * - Trajectory prediction
 *
 * Provides decision support for when to create snapshots and guides AI agents.
 *
 * @performance Budget: <10ms for current() snapshot
 */

import { EventEmitter } from "events";
import type {
	AgentGuidance,
	AIDetectionEvent,
	SnapshotDecision,
	SnapshotEvent,
	Trajectory,
	VitalsConfig,
	VitalsFileChangeEvent,
	VitalsSnapshot,
} from "../types/vitals.js";
import type { ThresholdAdjustments, TrajectoryForecast } from "../types/vitals-learning.js";
import { BehaviorTracker } from "./BehaviorTracker.js";
import { ThresholdCalibrator } from "./learning/ThresholdCalibrator.js";
import { TrajectoryPredictor } from "./learning/TrajectoryPredictor.js";
import { UserBehaviorLearner } from "./learning/UserBehaviorLearner.js";
import { DEFAULT_OXYGEN_CONFIG, OxygenSensor } from "./OxygenSensor.js";
import { DEFAULT_PRESSURE_CONFIG, PressureGauge } from "./PressureGauge.js";
import { DEFAULT_PULSE_CONFIG, PulseTracker } from "./PulseTracker.js";
import { DEFAULT_TEMPERATURE_CONFIG, TemperatureMonitor } from "./TemperatureMonitor.js";

/** Default vitals configuration */
export const DEFAULT_VITALS_CONFIG: VitalsConfig = {
	pulse: DEFAULT_PULSE_CONFIG,
	temperature: DEFAULT_TEMPERATURE_CONFIG,
	pressure: DEFAULT_PRESSURE_CONFIG,
	oxygen: DEFAULT_OXYGEN_CONFIG,
};

/**
 * Unified workspace vitals monitor.
 *
 * Singleton per workspace ID to maintain consistent state.
 * Emits events: 'update', 'warning', 'critical'
 */
export class WorkspaceVitals extends EventEmitter {
	private static instances: Map<string, WorkspaceVitals> = new Map();

	private readonly pulse: PulseTracker;
	private readonly temperature: TemperatureMonitor;
	private readonly pressure: PressureGauge;
	private readonly oxygen: OxygenSensor;
	private readonly config: VitalsConfig;
	private history: VitalsSnapshot[] = [];
	private readonly maxHistory = 100;

	// Phase 4: Learning components
	private readonly workspaceId: string;
	private readonly learner: UserBehaviorLearner;
	private readonly calibrator: ThresholdCalibrator;
	private readonly predictor: TrajectoryPredictor;

	// Phase 2: Behavioral metadata tracking
	private readonly behaviorTracker: BehaviorTracker;

	private constructor(workspaceId: string, config: Partial<VitalsConfig> = {}, initialTime: number = Date.now()) {
		super();
		this.workspaceId = workspaceId;
		this.config = {
			pulse: { ...DEFAULT_VITALS_CONFIG.pulse, ...config.pulse },
			temperature: { ...DEFAULT_VITALS_CONFIG.temperature, ...config.temperature },
			pressure: { ...DEFAULT_VITALS_CONFIG.pressure, ...config.pressure },
			oxygen: { ...DEFAULT_VITALS_CONFIG.oxygen, ...config.oxygen },
		};

		this.pulse = new PulseTracker(this.config.pulse);
		this.temperature = new TemperatureMonitor(this.config.temperature);
		this.pressure = new PressureGauge(this.config.pressure, initialTime);
		this.oxygen = new OxygenSensor(this.config.oxygen);

		// Initialize learning components
		this.learner = new UserBehaviorLearner(workspaceId);
		this.calibrator = new ThresholdCalibrator(workspaceId, this.learner);
		this.predictor = new TrajectoryPredictor(workspaceId);

		// Initialize behavior tracking
		this.behaviorTracker = new BehaviorTracker(initialTime);
	}

	/**
	 * Get or create WorkspaceVitals for a workspace.
	 * Singleton per workspaceId.
	 */
	static for(workspaceId: string, config?: Partial<VitalsConfig>): WorkspaceVitals {
		if (!WorkspaceVitals.instances.has(workspaceId)) {
			WorkspaceVitals.instances.set(workspaceId, new WorkspaceVitals(workspaceId, config));
		}
		return WorkspaceVitals.instances.get(workspaceId)!;
	}

	/**
	 * Create a new instance (for testing - bypasses singleton).
	 */
	static create(config?: Partial<VitalsConfig>, initialTime?: number): WorkspaceVitals {
		return new WorkspaceVitals(`test-${Date.now()}`, config, initialTime);
	}

	/**
	 * Clear all singleton instances (for testing).
	 */
	static clearInstances(): void {
		WorkspaceVitals.instances.clear();
	}

	/**
	 * Try to get an existing WorkspaceVitals instance.
	 * Returns undefined if none exists for the workspace.
	 */
	static tryGet(workspaceId: string): WorkspaceVitals | undefined {
		return WorkspaceVitals.instances.get(workspaceId);
	}

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	/**
	 * Handle a file change event.
	 */
	onFileChange(event: VitalsFileChangeEvent, now: number = Date.now()): void {
		this.pulse.recordChange(now);
		this.pressure.recordChange(event.path);
		this.oxygen.recordModification(event.path);

		if (event.isAI) {
			this.temperature.recordAIActivity(event.tool, now);
		} else {
			this.temperature.recordHumanActivity(now);
		}

		this.checkAndEmit(now);
	}

	/**
	 * Handle a snapshot creation event.
	 */
	onSnapshot(event: SnapshotEvent, now: number = Date.now()): void {
		this.pressure.recordSnapshot(now);
		this.oxygen.recordSnapshot(event.filePath, now);
		this.behaviorTracker.recordSnapshot(now);
		this.checkAndEmit(now);
	}

	/**
	 * Handle AI detection event.
	 */
	onAIDetected(detection: AIDetectionEvent, now: number = Date.now()): void {
		if (detection.confidence > 0.6) {
			this.temperature.recordAIActivity(detection.tool, now);
		}
		this.checkAndEmit(now);
	}

	// =========================================================================
	// CURRENT STATE
	// =========================================================================

	/**
	 * Get current vitals snapshot.
	 */
	current(now: number = Date.now()): VitalsSnapshot {
		const pulseData = this.pulse.getLevel(now);
		const tempData = this.temperature.getLevel(now);
		const pressureData = this.pressure.getState(now);
		const oxygenData = this.oxygen.getLevel(now);

		const snapshot: VitalsSnapshot = {
			timestamp: now,
			pulse: pulseData,
			temperature: tempData,
			pressure: pressureData,
			oxygen: oxygenData,
			trajectory: this.calculateTrajectory(pulseData, tempData, pressureData, oxygenData),
			// Include behavioral metadata
			behavior: this.behaviorTracker.getMetadata(now),
		};

		// Record history (bounded FIFO)
		this.history.push(snapshot);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}

		return snapshot;
	}

	/**
	 * Get historical snapshots.
	 */
	getHistory(): VitalsSnapshot[] {
		return [...this.history];
	}

	// =========================================================================
	// DECISION SUPPORT
	// =========================================================================

	/**
	 * Determine if a snapshot should be created.
	 */
	shouldSnapshot(now: number = Date.now()): SnapshotDecision {
		const vitals = this.current(now);

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

	/**
	 * Get guidance for AI agents.
	 */
	getAgentGuidance(now: number = Date.now()): AgentGuidance {
		const vitals = this.current(now);
		const snapshotDecision = this.shouldSnapshot(now);

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

	/**
	 * Get threshold multiplier for dynamic risk adjustment.
	 */
	getThresholdMultiplier(now: number = Date.now()): number {
		const vitals = this.current(now);

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

	// =========================================================================
	// PHASE 4: LEARNING & CALIBRATION
	// =========================================================================

	/**
	 * Record user behavior for learning.
	 * Call when user creates a snapshot to learn their patterns.
	 */
	recordBehavior(userCreatedSnapshot: boolean, now: number = Date.now()): void {
		const vitals = this.current(now);
		const decision = this.shouldSnapshot(now);

		// Record observation
		this.learner.recordObservation({
			vitals,
			userCreatedSnapshot,
			vitalsRecommended: decision.should,
		});

		// Update calibration
		this.calibrator.updateFromBehavior();

		// Record for trajectory prediction
		this.predictor.recordSnapshots([vitals]);
	}

	/**
	 * Get calibrated threshold adjustments.
	 * Returns per-workspace learned adjustments (multipliers).
	 */
	getCalibratedThresholds(): ThresholdAdjustments {
		return this.calibrator.getAdjustedThresholds();
	}

	/**
	 * Get trajectory forecast.
	 * Predicts future trajectory based on recent history.
	 */
	getForecast(): TrajectoryForecast {
		return this.predictor.predict();
	}

	/**
	 * Get user behavior statistics.
	 */
	getBehaviorStats() {
		return this.learner.getStats();
	}

	/**
	 * Get workspace calibration profile.
	 */
	getCalibrationProfile() {
		return this.calibrator.getProfile();
	}

	/**
	 * Reset learning data for this workspace.
	 */
	resetLearning(): void {
		this.calibrator.reset();
		this.predictor.reset();
	}

	// =========================================================================
	// PHASE 2: BEHAVIORAL METADATA TRACKING
	// =========================================================================

	/**
	 * Record a file edit event for behavioral analytics.
	 */
	recordEdit(linesAdded: number, linesDeleted: number, timestamp: number = Date.now()): void {
		this.behaviorTracker.recordEdit(linesAdded, linesDeleted, timestamp);
	}

	/**
	 * Record a file save event.
	 */
	recordFileSave(): void {
		this.behaviorTracker.recordFileSave();
	}

	/**
	 * Record a test execution result.
	 */
	recordTest(passed: boolean, timestamp: number = Date.now()): void {
		this.behaviorTracker.recordTest(passed, timestamp);
	}

	/**
	 * Record an AI suggestion event.
	 * @param accepted Whether the user accepted the AI suggestion
	 */
	recordAISuggestion(accepted: boolean, timestamp: number = Date.now()): void {
		this.behaviorTracker.recordAISuggestion(accepted, timestamp);
	}

	/**
	 * Get current behavioral metadata.
	 */
	getBehavioralMetadata(now: number = Date.now()) {
		return this.behaviorTracker.getMetadata(now);
	}

	// =========================================================================
	// INTERNAL
	// =========================================================================

	private calculateTrajectory(
		pulse: VitalsSnapshot["pulse"],
		temp: VitalsSnapshot["temperature"],
		pressure: VitalsSnapshot["pressure"],
		oxygen: VitalsSnapshot["oxygen"],
	): Trajectory {
		// Critical: High pressure + Burning temp + Low oxygen
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
			const latestPressure = recentHistory[recentHistory.length - 1]?.pressure.value ?? 0;
			const earliestPressure = recentHistory[0]?.pressure.value ?? 0;
			const pressureTrend = latestPressure - earliestPressure;
			if (pressureTrend < -10 && oxygen.value > 70) {
				return "recovering";
			}
		}

		return "stable";
	}

	private getSuggestion(vitals: VitalsSnapshot): string {
		if (vitals.trajectory === "critical") {
			return "STOP: Create a checkpoint before making more changes";
		}
		if (vitals.trajectory === "escalating") {
			return "Consider creating a snapshot - risk is accumulating";
		}
		if (vitals.pressure.value > 80) {
			return "High pressure - create a snapshot before continuing";
		}
		if (vitals.pressure.value > 50) {
			return "Moderate pressure - consider creating a snapshot soon";
		}
		if (vitals.temperature.level === "burning") {
			return "Heavy AI activity detected - extra caution recommended";
		}
		if (vitals.oxygen.value < 50) {
			return "Low snapshot coverage - protect your work";
		}
		return "Proceed normally";
	}

	private checkAndEmit(now: number): void {
		const vitals = this.current(now);
		const decision = this.shouldSnapshot(now);

		if (decision.urgency === "critical") {
			this.emit("critical", vitals);
		} else if (decision.urgency === "high") {
			this.emit("warning", vitals);
		}

		this.emit("update", vitals);
	}
}
