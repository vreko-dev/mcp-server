/**
 * TemperatureMonitor - AI activity level tracking
 *
 * Monitors the ratio of AI vs human activity to determine "temperature".
 * Higher AI activity = hotter temperature = more need for protection.
 *
 * Uses a decay window to cool down over time when AI activity stops.
 *
 * @performance Budget: <1ms per operation
 */

import type { TemperatureConfig, TempLevel } from "../types/vitals.js";

/** Default temperature configuration */
export const DEFAULT_TEMPERATURE_CONFIG: TemperatureConfig = {
	warm: 20, // 20% AI activity
	hot: 50, // 50% AI activity
	burning: 80, // 80% AI activity
	decaySeconds: 300, // 5 minutes to cool down
};

/** Temperature state with metrics */
export interface TemperatureState {
	level: TempLevel;
	aiPercentage: number;
	detectedTool?: string;
}

interface AIEvent {
	timestamp: number;
	tool?: string;
}

/**
 * Monitors AI vs human activity within a decay window.
 *
 * Temperature rises with AI activity and cools over time.
 */
export class TemperatureMonitor {
	private aiEvents: AIEvent[] = [];
	private humanEvents: number[] = [];
	private readonly config: TemperatureConfig;

	constructor(config: Partial<TemperatureConfig> = {}) {
		this.config = { ...DEFAULT_TEMPERATURE_CONFIG, ...config };
	}

	/**
	 * Record AI-assisted activity.
	 * @param tool Optional: which AI tool (e.g., "Cursor", "Copilot", "Claude")
	 * @param timestamp Optional: event time for testing
	 */
	recordAIActivity(tool?: string, timestamp: number = Date.now()): void {
		this.aiEvents.push({ timestamp, tool });
	}

	/**
	 * Record human (non-AI) activity.
	 * @param timestamp Optional: event time for testing
	 */
	recordHumanActivity(timestamp: number = Date.now()): void {
		this.humanEvents.push(timestamp);
	}

	/**
	 * Get current temperature level and metrics.
	 * @param now Optional: current time for testing
	 */
	getLevel(now: number = Date.now()): TemperatureState {
		this.pruneOld(now);

		const total = this.aiEvents.length + this.humanEvents.length;
		const aiPercentage = total > 0 ? (this.aiEvents.length / total) * 100 : 0;

		// Most recent AI tool
		const detectedTool = this.aiEvents.length > 0 ? this.aiEvents[this.aiEvents.length - 1].tool : undefined;

		return {
			level: this.classifyLevel(aiPercentage),
			aiPercentage: Math.round(aiPercentage),
			detectedTool,
		};
	}

	/**
	 * Get counts for testing.
	 */
	getCounts(now: number = Date.now()): { ai: number; human: number } {
		this.pruneOld(now);
		return {
			ai: this.aiEvents.length,
			human: this.humanEvents.length,
		};
	}

	/**
	 * Clear all recorded activity.
	 */
	reset(): void {
		this.aiEvents = [];
		this.humanEvents = [];
	}

	/**
	 * Remove events outside the decay window.
	 */
	private pruneOld(now: number): void {
		const cutoff = now - this.config.decaySeconds * 1000;
		this.aiEvents = this.aiEvents.filter((e) => e.timestamp > cutoff);
		this.humanEvents = this.humanEvents.filter((t) => t > cutoff);
	}

	/**
	 * Classify AI percentage into a temperature level.
	 */
	private classifyLevel(aiPercentage: number): TempLevel {
		if (aiPercentage >= this.config.burning) {
			return "burning";
		}
		if (aiPercentage >= this.config.hot) {
			return "hot";
		}
		if (aiPercentage >= this.config.warm) {
			return "warm";
		}
		return "cold";
	}
}
