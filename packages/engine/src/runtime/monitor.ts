/**
 * SnapBack Session Monitor (Session Coach)
 *
 * MIGRATION NOTES:
 * - NEW component (not extracted from existing code)
 * - Provides continuous health tracking during AI coding sessions
 * - Injects coaching into every MCP response
 *
 * DESIGN:
 * - Captures baseline state at session start
 * - Watches for file changes, detects degradation
 * - Escalates coaching from silent → gentle → firm → urgent
 *
 * TARGET: ~100 LOC
 * CURRENT: Scaffolding with TODO markers
 */

import { execSync } from "node:child_process";
import type { FSWatcher } from "fs";
import { eventBus } from "./events.js";

// Placeholder for chokidar - would need to be installed via pnpm add -D chokidar
// For now, we'll make watch optional and use a stub
let watch: any = null;
try {
	// @ts-expect-error - chokidar may not be installed
	watch = require("chokidar").watch;
} catch {
	// Chokidar not available, use stub
	watch = () => ({
		on: () => {},
		close: async () => {},
	});
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Captured state of the project at a point in time
 */
export interface ProjectState {
	/** Number of circular dependencies */
	cycleCount: number;
	/** List of cycle paths */
	cycles: string[][];
	/** Average file complexity */
	avgComplexity: number;
	/** Files with highest complexity */
	hotspots: Array<{ file: string; complexity: number }>;
	/** Timestamp of capture */
	timestamp: number;
}

/**
 * Session health report
 */
export interface SessionHealth {
	/** Health score 0-100 (100 = perfect) */
	score: number;
	/** Active warnings */
	warnings: string[];
	/** Suggestions for improvement */
	suggestions: string[];
	/** Files modified this session */
	filesModified: string[];
	/** Modification count per file */
	fileModificationCounts: Record<string, number>;
	/** Cycles introduced this session */
	cyclesIntroduced: number;
	/** Complexity change since baseline */
	complexityDelta: number;
	/** Coaching level based on health */
	coachingLevel: "silent" | "gentle" | "firm" | "urgent";
	/** Formatted coaching message (empty if silent) */
	coachingMessage: string;
}

// =============================================================================
// MONITOR IMPLEMENTATION
// =============================================================================

/**
 * Session monitor that tracks project health during AI coding sessions.
 *
 * Usage:
 * ```typescript
 * const monitor = new SessionMonitor();
 * await monitor.start("/path/to/workspace");
 *
 * // After changes
 * const health = monitor.getHealth();
 * console.log(health.coachingMessage); // "⚠️ Session health declining..."
 *
 * // When done
 * monitor.stop();
 * ```
 */
export class SessionMonitor {
	private baseline: ProjectState | null = null;
	private current: ProjectState | null = null;
	private watcher: FSWatcher | null = null;
	private workspacePath = "";
	private filesModified: Set<string> = new Set();
	private fileModificationCounts: Record<string, number> = {};
	private warnings: string[] = [];
	private suggestions: string[] = [];
	private sessionId = "";

	/**
	 * Hash workspace path for privacy
	 */
	private hashWorkspace(path: string): string {
		// Simple hash for privacy (in production, use crypto.createHash)
		return path.split("/").pop() || "unknown";
	}

	/**
	 * Start monitoring a workspace
	 *
	 * @param workspacePath - Path to workspace root
	 */
	async start(workspacePath: string): Promise<void> {
		this.workspacePath = workspacePath;
		this.sessionId = `session_${Date.now()}`;
		this.filesModified.clear();
		this.fileModificationCounts = {};
		this.warnings = [];
		this.suggestions = [];

		// Capture baseline
		this.baseline = await this.captureState();
		this.current = { ...this.baseline };

		// Start watching
		this.watcher = watch(workspacePath, {
			ignored: [/node_modules/, /\.git/, /dist/, /\.next/],
			ignoreInitial: true,
			persistent: true,
		});

		if (this.watcher) {
			this.watcher.on("change", (path: string) => this.onFileChanged(path));
			this.watcher.on("add", (path: string) => this.onFileChanged(path));
		}

		// Emit session started event
		eventBus.emit("session.started", {
			sessionId: this.sessionId,
			workspaceHash: this.hashWorkspace(workspacePath),
		});
	}

	/**
	 * Stop monitoring
	 */
	async stop(): Promise<void> {
		if (this.watcher) {
			await this.watcher.close();
			this.watcher = null;
		}

		// Emit session ended event
		if (this.baseline) {
			const _health = this.getHealth();
			eventBus.emit("session.ended", {
				sessionId: this.sessionId,
				duration: Date.now() - this.baseline.timestamp,
				filesModified: this.filesModified.size,
				snapshotsCreated: 0, // TODO: Track from storage
			});
		}
	}

	/**
	 * Handle file change
	 */
	private async onFileChanged(path: string): Promise<void> {
		// Track modifications
		this.filesModified.add(path);
		this.fileModificationCounts[path] = (this.fileModificationCounts[path] ?? 0) + 1;

		// Emit file changed event
		const ext = path.substring(path.lastIndexOf("."));
		eventBus.emit("file.changed", {
			changeType: "modify",
			extension: ext,
			lineCount: 0, // Unknown without reading file
		});

		// Recapture state (debounced in real implementation)
		// TODO: Add debouncing to avoid excessive recaptures
		const before = this.current;
		this.current = await this.captureState();

		// Detect new issues
		if (before && this.current) {
			this.detectNewCycles(before, this.current);
			this.detectComplexityCreep(before, this.current);
			this.detectHotspots(path);
		}

		// Emit health events if needed
		const health = this.getHealth();
		if (health.score < 50 && health.coachingLevel === "urgent") {
			eventBus.emit("error.occurred", {
				component: "session-monitor",
				message: `Critical: ${health.coachingMessage}`,
				recoverable: true,
			});
		} else if (health.score < 70 && health.coachingLevel === "firm") {
			eventBus.emit("error.occurred", {
				component: "session-monitor",
				message: `Warning: ${health.coachingMessage}`,
				recoverable: true,
			});
		}
	}

	/**
	 * Capture current project state
	 *
	 * TODO: Extract cycle detection from apps/vscode/spike/assumptions/madge-*.ts
	 * TODO: Extract complexity analysis from packages/core/src/guardian.ts
	 */
	private async captureState(): Promise<ProjectState> {
		let cycles: string[][] = [];
		let avgComplexity = 0;

		// Detect cycles using madge
		try {
			const output = execSync(`npx madge --circular --json ${this.workspacePath}/src`, {
				encoding: "utf8",
				timeout: 20000,
				stdio: ["pipe", "pipe", "pipe"],
			});
			cycles = JSON.parse(output) as string[][];
		} catch {
			// madge not available or failed
			cycles = [];
		}

		// TODO: Calculate complexity using AST analysis
		// For now, use placeholder
		avgComplexity = 25;

		return {
			cycleCount: cycles.length,
			cycles,
			avgComplexity,
			hotspots: [], // TODO: Implement
			timestamp: Date.now(),
		};
	}

	/**
	 * Detect newly introduced cycles
	 */
	private detectNewCycles(before: ProjectState, after: ProjectState): void {
		const newCycles = after.cycles.filter(
			(cycle) => !before.cycles.some((bc) => JSON.stringify(bc) === JSON.stringify(cycle)),
		);

		for (const cycle of newCycles) {
			this.warnings.push(`⚠️ New circular dependency: ${cycle.join(" → ")}`);
			this.suggestions.push("Extract shared logic to a separate module to break the cycle");
		}
	}

	/**
	 * Detect complexity increases
	 */
	private detectComplexityCreep(before: ProjectState, after: ProjectState): void {
		const delta = after.avgComplexity - before.avgComplexity;

		if (delta > 5) {
			this.warnings.push(`⚠️ Complexity increased by ${delta.toFixed(1)} points`);
			this.suggestions.push("Consider extracting functions or simplifying logic");
		}
	}

	/**
	 * Detect files being modified too frequently
	 */
	private detectHotspots(path: string): void {
		const count = this.fileModificationCounts[path] ?? 0;

		if (count >= 3 && count % 3 === 0) {
			// Warn every 3rd modification
			this.warnings.push(`⚠️ ${path} modified ${count} times this session`);
			this.suggestions.push("Consider if this file is taking on too many responsibilities");
		}
	}

	/**
	 * Get current session health
	 */
	getHealth(): SessionHealth {
		if (!this.baseline || !this.current) {
			return {
				score: 100,
				warnings: [],
				suggestions: [],
				filesModified: [],
				fileModificationCounts: {},
				cyclesIntroduced: 0,
				complexityDelta: 0,
				coachingLevel: "silent",
				coachingMessage: "",
			};
		}

		// Calculate health score
		let score = 100;

		// Penalty for new cycles (15 points each)
		const cyclesIntroduced = this.current.cycleCount - this.baseline.cycleCount;
		score -= cyclesIntroduced * 15;

		// Penalty for complexity increase (2 points per unit)
		const complexityDelta = this.current.avgComplexity - this.baseline.avgComplexity;
		score -= Math.max(0, complexityDelta) * 2;

		// Penalty for warnings (5 points each)
		score -= this.warnings.length * 5;

		// Clamp to 0-100
		score = Math.max(0, Math.min(100, score));

		// Determine coaching level
		const coachingLevel = this.getCoachingLevel(score);
		const coachingMessage = this.formatCoaching(score, coachingLevel);

		return {
			score,
			warnings: this.warnings.slice(-5), // Last 5 warnings
			suggestions: this.suggestions.slice(-3), // Last 3 suggestions
			filesModified: Array.from(this.filesModified),
			fileModificationCounts: { ...this.fileModificationCounts },
			cyclesIntroduced,
			complexityDelta,
			coachingLevel,
			coachingMessage,
		};
	}

	/**
	 * Determine coaching level based on health score
	 */
	private getCoachingLevel(score: number): "silent" | "gentle" | "firm" | "urgent" {
		if (score >= 90) {
			return "silent";
		}
		if (score >= 70) {
			return "gentle";
		}
		if (score >= 50) {
			return "firm";
		}
		return "urgent";
	}

	/**
	 * Format coaching message based on level
	 */
	private formatCoaching(score: number, level: "silent" | "gentle" | "firm" | "urgent"): string {
		switch (level) {
			case "silent":
				return "";
			case "gentle":
				return this.warnings.length > 0 ? `Note: ${this.warnings[this.warnings.length - 1]}` : "";
			case "firm":
				return (
					`⚠️ Session health declining (${score}/100). ` +
					`Please address: ${this.warnings.slice(-2).join(", ")}`
				);
			case "urgent":
				return (
					`🛑 STOP: Session health critical (${score}/100). ` +
					`Cycles introduced: ${(this.current?.cycleCount ?? 0) - (this.baseline?.cycleCount ?? 0)}. ` +
					`Recommended: ${this.suggestions[0] ?? "Review recent changes"}`
				);
		}
	}
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const sessionMonitor = new SessionMonitor();
