// ============================================
// apps/vscode/src/protection/prwIntegration.ts
// PRW Patch Day 2: Integration with burst detection and SaveHandler
// ============================================

import type { SnapshotStore } from "../storage/SnapshotStore";
import type { OriginLabel, ReasonCode, SnapshotManifestV2 } from "../storage/types";

// ============================================
// PRW Manager
// Coordinates PRE checkpoint creation with signal detection
// ============================================

export interface PRWConfig {
	/** Minimum risk score to trigger PRE checkpoint */
	riskThreshold: number;
	/** Maximum PRE checkpoints per minute (rate limit) */
	maxPrePerMinute: number;
	/** Cooldown between PRE checkpoints for same file (ms) */
	fileCooldownMs: number;
}

export const DEFAULT_PRW_CONFIG: PRWConfig = {
	riskThreshold: 0.6, // 60% risk triggers PRE
	maxPrePerMinute: 10, // Don't spam PRE checkpoints
	fileCooldownMs: 5000, // 5s between PRE for same file
};

export class PRWManager {
	private readonly preCooldowns = new Map<string, number>(); // filePath → expiresAt
	private readonly recentPres: number[] = []; // timestamps of recent PREs

	constructor(
		private readonly snapshotStore: SnapshotStore,
		private readonly config: PRWConfig = DEFAULT_PRW_CONFIG,
	) {}

	/**
	 * Called by SignalAggregator when a risky signal is detected
	 * Creates a PRE checkpoint if appropriate
	 *
	 * @returns The PRE checkpoint if created, null if skipped
	 */
	async onRiskySignalDetected(signal: {
		filePath: string;
		riskScore: number;
		reasons: ReasonCode[];
		origin: OriginLabel;
		burstId?: string;
	}): Promise<SnapshotManifestV2 | null> {
		// Check if risk meets threshold
		if (signal.riskScore < this.config.riskThreshold) {
			return null;
		}

		// Check file-level cooldown
		const fileCooldown = this.preCooldowns.get(signal.filePath);
		if (fileCooldown && Date.now() < fileCooldown) {
			console.debug(`[PRW] Skipping PRE for ${signal.filePath} - in cooldown`);
			return null;
		}

		// Check global rate limit
		if (!this.checkRateLimit()) {
			console.debug("[PRW] Skipping PRE - rate limit exceeded");
			return null;
		}

		// Create PRE checkpoint
		const pre = await this.snapshotStore.createPreCheckpoint({
			name: this.generatePreName(signal),
			trigger: "risk-burst",
			reasons: signal.reasons,
			origin: signal.origin,
		});

		// Update cooldowns
		this.preCooldowns.set(signal.filePath, Date.now() + this.config.fileCooldownMs);
		this.recentPres.push(Date.now());

		console.debug(`[PRW] Created PRE checkpoint ${pre.id} for ${signal.filePath}`);

		return pre;
	}

	/**
	 * Called before rollback is applied
	 */
	async onBeforeRollback(targetCheckpointId: string): Promise<SnapshotManifestV2> {
		return this.snapshotStore.createPreRollbackCheckpoint(targetCheckpointId);
	}

	/**
	 * Check if we're within rate limits
	 */
	private checkRateLimit(): boolean {
		const oneMinuteAgo = Date.now() - 60_000;

		// Clean old entries
		while (this.recentPres.length > 0 && this.recentPres[0] < oneMinuteAgo) {
			this.recentPres.shift();
		}

		return this.recentPres.length < this.config.maxPrePerMinute;
	}

	/**
	 * Generate a descriptive name for the PRE checkpoint
	 */
	private generatePreName(signal: { filePath: string; reasons: ReasonCode[] }): string {
		const fileName = signal.filePath.split("/").pop() ?? "file";
		const reason = signal.reasons[0] ?? "RISK";

		const reasonLabels: Record<ReasonCode, string> = {
			RISK_BURST_START: "Burst detected",
			RISK_LARGE_DELETE: "Large deletion",
			RISK_MULTI_FILE: "Multi-file change",
			AI_DETECTED: "AI edit detected",
			MANUAL_SAVE: "Manual save",
			PRE_ROLLBACK: "Before rollback",
			MANUAL_CHECKPOINT: "Manual checkpoint",
			CRITICAL_FILE: "Critical file",
		};

		return `Pre: ${reasonLabels[reason]} on ${fileName}`;
	}

	/**
	 * Clean up expired cooldowns (call periodically)
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [path, expiresAt] of this.preCooldowns) {
			if (expiresAt < now) {
				this.preCooldowns.delete(path);
			}
		}
	}
}

// ============================================
// Integration with existing components
// ============================================

/**
 * Hook into SignalAggregator to trigger PRE checkpoints
 *
 * Add to apps/vscode/src/protection/signalAggregator.ts:
 *
 * ```typescript
 * import { PRWManager } from './prwIntegration';
 *
 * class SignalAggregator {
 *   private prwManager?: PRWManager;
 *
 *   setPRWManager(manager: PRWManager) {
 *     this.prwManager = manager;
 *   }
 *
 *   // In processSignal() or wherever risk is evaluated:
 *   private async onRiskDetected(signal: AggregatedSignal) {
 *     if (this.prwManager && signal.riskScore >= 0.6) {
 *       await this.prwManager.onRiskySignalDetected({
 *         filePath: signal.filePath,
 *         riskScore: signal.riskScore,
 *         reasons: signal.reasons as ReasonCode[],
 *         origin: signal.origin as OriginLabel,
 *         burstId: signal.burstId,
 *       });
 *     }
 *   }
 * }
 * ```
 */

/**
 * Hook into SaveHandler for pre-save checkpoints
 *
 * Add to apps/vscode/src/protection/saveHandler.ts:
 *
 * ```typescript
 * import { PRWManager } from './prwIntegration';
 *
 * class SaveHandler {
 *   private prwManager?: PRWManager;
 *
 *   setPRWManager(manager: PRWManager) {
 *     this.prwManager = manager;
 *   }
 *
 *   // In handleWillSaveDocument():
 *   async handleWillSaveDocument(event: TextDocumentWillSaveEvent) {
 *     const decision = await this.autoDecisionEngine.evaluate(event.document);
 *
 *     // If high risk and PRW enabled, create PRE before save
 *     if (this.prwManager && decision.shouldProtect && decision.riskScore >= 0.6) {
 *       await this.prwManager.onRiskySignalDetected({
 *         filePath: event.document.uri.fsPath,
 *         riskScore: decision.riskScore,
 *         reasons: decision.reasons,
 *         origin: decision.origin,
 *       });
 *     }
 *
 *     // Continue with normal save handling...
 *   }
 * }
 * ```
 */

/**
 * Hook into Rollback flow
 *
 * Add to your rollback function:
 *
 * ```typescript
 * async function rollbackToCheckpoint(checkpointId: string) {
 *   // Create safety net BEFORE rollback
 *   const preRollback = await prwManager.onBeforeRollback(checkpointId);
 *   console.log(`[Rollback] Created pre-rollback checkpoint: ${preRollback.id}`);
 *
 *   // Now apply the rollback
 *   const snapshot = await snapshotStore.getWithContent(checkpointId);
 *   // ... restore files
 * }
 * ```
 */
