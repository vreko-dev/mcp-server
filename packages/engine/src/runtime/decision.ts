/**
 * Decision Engine - Signal aggregation and action determination
 *
 * Combines multiple signals (AI, risk, burst, cycles) into a single protection decision.
 * Transport-agnostic: no vscode imports, pure TypeScript logic.
 *
 * @module runtime/decision
 */

export interface RiskSignal {
	score: number; // 0-100
	factors: string[];
}

export interface BurstState {
	active: boolean;
	changeCount: number;
	windowStart: number;
	velocity: number;
}

export interface AIDetectionResult {
	detected: boolean;
	tool?: string;
	confidence: number; // 0-1
	method?: "pattern" | "velocity" | "combined" | "extension";
}

export interface CycleResult {
	detected: boolean;
	count: number;
}

export interface DecisionInput {
	signals: {
		risk?: RiskSignal;
		burst?: BurstState;
		ai?: AIDetectionResult;
		cycles?: CycleResult;
	};
	protectionLevel: "watch" | "warn" | "block";
	rateLimitRemaining: number;
	fileCount?: number;
	criticalFileCount?: number;
}

export interface Decision {
	action: "allow" | "snapshot" | "warn" | "block";
	snapshot: boolean;
	notify: boolean;
	reason: string;
	signals: string[];
	confidence: number; // 0-1
}

export interface DecisionEngineConfig {
	riskThreshold: number; // Default: 70
	aiConfidenceThreshold: number; // Default: 0.8
	minFilesForBurst: number; // Default: 3
	notifyThreshold: number; // Default: 40
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
	riskThreshold: 70,
	aiConfidenceThreshold: 0.8,
	minFilesForBurst: 3,
	notifyThreshold: 40,
};

export class DecisionEngine {
	private config: DecisionEngineConfig;

	constructor(config?: Partial<DecisionEngineConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Evaluate signals and determine action
	 */
	evaluate(input: DecisionInput): Decision {
		const { protectionLevel, rateLimitRemaining } = input;

		// Rate limit check (highest priority)
		if (rateLimitRemaining <= 0) {
			return {
				action: "warn",
				snapshot: false,
				notify: true,
				reason: "Rate limit exceeded",
				signals: [],
				confidence: 1.0,
			};
		}

		// Check if snapshot should be created based on signals
		const shouldSnapshot = this.shouldCreateSnapshot(input);
		const contributingSignals = this.getContributingSignals(input);
		const confidence = this.calculateConfidence(input, shouldSnapshot);

		// Apply protection level rules
		return this.applyProtectionLevel(protectionLevel, shouldSnapshot, contributingSignals, confidence);
	}

	/**
	 * Determine if snapshot should be created based on critical signals
	 */
	private shouldCreateSnapshot(input: DecisionInput): boolean {
		const { signals, fileCount = 0, criticalFileCount = 0 } = input;

		// Critical Signal 1: AI detected with high confidence
		if (signals.ai?.detected && signals.ai.confidence >= this.config.aiConfidenceThreshold) {
			return true;
		}

		// Critical Signal 2: Risk score exceeds threshold
		if (signals.risk && signals.risk.score >= this.config.riskThreshold) {
			return true;
		}

		// Critical Signal 3: Critical files modified
		if (criticalFileCount > 0) {
			return true;
		}

		// Critical Signal 4: Burst with multiple files
		if (signals.burst?.active && fileCount >= this.config.minFilesForBurst) {
			return true;
		}

		// Critical Signal 5: Circular dependencies detected
		if (signals.cycles?.detected && signals.cycles.count > 0) {
			return true;
		}

		return false;
	}

	/**
	 * Get list of signals that contributed to the decision
	 */
	private getContributingSignals(input: DecisionInput): string[] {
		const { signals, criticalFileCount = 0 } = input;
		const contributingSignals: string[] = [];

		if (signals.ai?.detected && signals.ai.confidence >= this.config.aiConfidenceThreshold) {
			contributingSignals.push(`ai_detected (${signals.ai.tool || "unknown"})`);
		}

		if (signals.risk && signals.risk.score >= this.config.riskThreshold) {
			contributingSignals.push(`risk_score (${signals.risk.score})`);
		}

		if (criticalFileCount > 0) {
			contributingSignals.push(`critical_files (${criticalFileCount})`);
		}

		if (signals.burst?.active) {
			contributingSignals.push(`burst (${signals.burst.velocity.toFixed(1)} chars/ms)`);
		}

		if (signals.cycles?.detected && signals.cycles.count > 0) {
			contributingSignals.push(`cycles (${signals.cycles.count})`);
		}

		return contributingSignals;
	}

	/**
	 * Calculate confidence score based on signal strength
	 * Formula: (AI * 0.4) + (risk/100 * 0.4) + (signal_count/5 * 0.2)
	 */
	private calculateConfidence(input: DecisionInput, shouldSnapshot: boolean): number {
		if (!shouldSnapshot) {
			return 0;
		}

		const { signals } = input;
		let confidence = 0;

		// AI signal weight (40%)
		if (signals.ai?.detected) {
			confidence += signals.ai.confidence * 0.4;
		}

		// Risk score weight (40%)
		if (signals.risk) {
			confidence += Math.min(1, signals.risk.score / 100) * 0.4;
		}

		// Signal count weight (20%)
		let signalCount = 0;
		if (signals.ai?.detected && signals.ai.confidence >= this.config.aiConfidenceThreshold) signalCount++;
		if (signals.risk && signals.risk.score >= this.config.notifyThreshold) signalCount++;
		if (signals.burst?.active) signalCount++;
		if (signals.cycles?.detected) signalCount++;
		if (input.criticalFileCount && input.criticalFileCount > 0) signalCount++;

		confidence += Math.min(1, signalCount / 5) * 0.2;

		return Math.min(1, Math.round(confidence * 100) / 100);
	}

	/**
	 * Apply protection level rules to determine final action
	 */
	private applyProtectionLevel(
		level: "watch" | "warn" | "block",
		shouldSnapshot: boolean,
		signals: string[],
		confidence: number,
	): Decision {
		if (!shouldSnapshot) {
			return {
				action: "allow",
				snapshot: false,
				notify: false,
				reason: "No critical signals detected",
				signals: [],
				confidence: 0,
			};
		}

		const reason = signals.length > 0 ? signals.join(", ") : "Snapshot triggered";

		switch (level) {
			case "watch":
				return {
					action: "snapshot",
					snapshot: true,
					notify: false,
					reason,
					signals,
					confidence,
				};

			case "warn":
				return {
					action: "warn",
					snapshot: true,
					notify: true,
					reason,
					signals,
					confidence,
				};

			case "block":
				return {
					action: "block",
					snapshot: true,
					notify: true,
					reason,
					signals,
					confidence,
				};
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<DecisionEngineConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): DecisionEngineConfig {
		return { ...this.config };
	}
}
