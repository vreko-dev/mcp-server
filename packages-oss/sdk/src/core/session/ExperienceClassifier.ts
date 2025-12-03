/**
 * Experience Classifier - Platform-agnostic user experience tier classification
 *
 * This module provides utilities for classifying users into experience tiers
 * (explorer, intermediate, power user) based on their interaction patterns.
 * This enables adaptive hints and features across all platforms.
 *
 * @module ExperienceClassifier
 */

import { THRESHOLDS } from "../../config/Thresholds.js";
import type { ExperienceMetrics } from "../../types/experience.js";
import type { ILogger } from "./interfaces.js";
import { NoOpLogger } from "./interfaces.js";

/**
 * Experience tiers for users
 */
export type ExperienceTier =
	| "explorer" // New users just getting started
	| "intermediate" // Regular users with some experience
	| "power" // Advanced users who use many features
	| "unknown"; // Unable to classify

/**
 * Metrics used for experience classification
 */

/**
 * Key-value storage interface for persisting experience data
 */
export interface IKeyValueStorage {
	/**
	 * Get a value from storage
	 * @param key - Storage key
	 * @param defaultValue - Default value if key doesn't exist
	 * @returns Value from storage or default
	 */
	get<T>(key: string, defaultValue?: T): Promise<T | undefined>;

	/**
	 * Set a value in storage
	 * @param key - Storage key
	 * @param value - Value to store
	 */
	set<T>(key: string, value: T): Promise<void>;
}

/**
 * Configuration for experience classification thresholds
 */
export interface ExperienceThresholdsConfig {
	explorer: ExperienceMetrics;
	intermediate: ExperienceMetrics;
	power: ExperienceMetrics;
}

/**
 * Default thresholds for experience classification
 * Uses centralized THRESHOLDS from SDK config (Phase 15)
 */
export const DEFAULT_EXPERIENCE_THRESHOLDS: ExperienceThresholdsConfig = THRESHOLDS.experience;

/**
 * Options for ExperienceClassifier
 */
export interface ExperienceClassifierOptions {
	/** Storage adapter for persisting experience data */
	storage: IKeyValueStorage;

	/** Logger for debug/info messages (optional) */
	logger?: ILogger;

	/** Custom thresholds (optional) */
	thresholds?: ExperienceThresholdsConfig;
}

/**
 * Experience Classifier - Classifies users into experience tiers
 *
 * Platform-agnostic implementation that works across VSCode, CLI, MCP, Web.
 */
export class ExperienceClassifier {
	private storage: IKeyValueStorage;
	private logger: ILogger;
	private thresholds: ExperienceThresholdsConfig;

	/**
	 * Creates a new Experience Classifier
	 *
	 * @param options - Configuration options
	 */
	constructor(options: ExperienceClassifierOptions) {
		this.storage = options.storage;
		this.logger = options.logger || new NoOpLogger();
		this.thresholds = options.thresholds || DEFAULT_EXPERIENCE_THRESHOLDS;
	}

	/**
	 * Gets the current experience tier for the user
	 *
	 * @returns The user's experience tier
	 */
	async getExperienceTier(): Promise<ExperienceTier> {
		// Check if tier is manually set (for testing)
		const manualTier = await this.storage.get<ExperienceTier>("experienceTier");
		if (manualTier && manualTier !== "unknown") {
			return manualTier;
		}

		// Get experience metrics
		const metrics = await this.getExperienceMetrics();

		// Classify based on metrics (check highest tier first)
		if (this.meetsThreshold(metrics, "power")) {
			return "power";
		}
		if (this.meetsThreshold(metrics, "intermediate")) {
			return "intermediate";
		}
		if (this.meetsThreshold(metrics, "explorer")) {
			return "explorer";
		}

		return "unknown";
	}

	/**
	 * Checks if metrics meet or exceed a threshold tier
	 *
	 * @param metrics - Experience metrics
	 * @param tier - Tier to check against
	 * @returns True if metrics meet or exceed the tier
	 */
	private meetsThreshold(metrics: ExperienceMetrics, tier: keyof ExperienceThresholdsConfig): boolean {
		const threshold = this.thresholds[tier];

		return (
			metrics.snapshotsCreated >= threshold.snapshotsCreated &&
			metrics.sessionsRecorded >= threshold.sessionsRecorded &&
			metrics.protectedFiles >= threshold.protectedFiles &&
			metrics.manualRestores >= threshold.manualRestores &&
			metrics.aiAssistedSessions >= threshold.aiAssistedSessions &&
			metrics.daysSinceFirstUse >= threshold.daysSinceFirstUse &&
			metrics.commandDiversity >= threshold.commandDiversity
		);
	}

	/**
	 * Gets experience metrics for the current user
	 *
	 * @returns Experience metrics
	 */
	async getExperienceMetrics(): Promise<ExperienceMetrics> {
		// Get metrics from storage
		const snapshotsCreated = await this.storage.get<number>("snapshotsCreated", 0);
		const sessionsRecorded = await this.storage.get<number>("sessionsRecorded", 0);
		const protectedFiles = await this.storage.get<number>("protectedFiles", 0);
		const manualRestores = await this.storage.get<number>("manualRestores", 0);
		const aiAssistedSessions = await this.storage.get<number>("aiAssistedSessions", 0);
		const firstUseTimestamp = await this.storage.get<number>("firstUseTimestamp", Date.now());
		const commandsUsed = await this.storage.get<Record<string, number>>("commandsUsed", {});

		// Calculate days since first use
		const daysSinceFirstUse = Math.floor((Date.now() - (firstUseTimestamp || Date.now())) / (1000 * 60 * 60 * 24));

		// Calculate command diversity (0-1)
		const commandsUsedRecord = commandsUsed || {};
		const totalCommands = Object.values(commandsUsedRecord).reduce((sum, count) => sum + count, 0);
		const uniqueCommands = Object.keys(commandsUsedRecord).length;
		const commandDiversity = totalCommands > 0 ? uniqueCommands / Math.min(totalCommands, 20) : 0;

		return {
			snapshotsCreated: snapshotsCreated || 0,
			sessionsRecorded: sessionsRecorded || 0,
			protectedFiles: protectedFiles || 0,
			manualRestores: manualRestores || 0,
			aiAssistedSessions: aiAssistedSessions || 0,
			daysSinceFirstUse,
			commandDiversity,
		};
	}

	/**
	 * Updates experience metrics based on user activity
	 *
	 * @param activity - Type of activity to record
	 * @param count - Number of activities to record (default: 1)
	 */
	async updateExperienceMetrics(activity: keyof ExperienceMetrics, count = 1): Promise<void> {
		const current = await this.storage.get<number>(activity, 0);
		await this.storage.set(activity, (current || 0) + count);

		// Set first use timestamp if not already set
		const firstUseTimestamp = await this.storage.get<number>("firstUseTimestamp");
		if (!firstUseTimestamp) {
			await this.storage.set("firstUseTimestamp", Date.now());
		}

		this.logger.debug("Experience metrics updated", {
			activity,
			count,
			newValue: (current || 0) + count,
		});
	}

	/**
	 * Records command usage for diversity calculation
	 *
	 * @param command - Command that was used
	 */
	async recordCommandUsage(command: string): Promise<void> {
		const commandsUsed = await this.storage.get<Record<string, number>>("commandsUsed", {});
		const commandsUsedRecord = commandsUsed || {};
		commandsUsedRecord[command] = (commandsUsedRecord[command] || 0) + 1;
		await this.storage.set("commandsUsed", commandsUsedRecord);

		this.logger.debug("Command usage recorded", {
			command,
			count: commandsUsedRecord[command],
		});
	}

	/**
	 * Sets experience tier manually (for testing)
	 *
	 * @param tier - Experience tier to set
	 */
	async setExperienceTier(tier: ExperienceTier): Promise<void> {
		await this.storage.set("experienceTier", tier);
		this.logger.info("Experience tier manually set", { tier });
	}

	/**
	 * Resets experience tier (for testing)
	 */
	async resetExperienceTier(): Promise<void> {
		await this.storage.set("experienceTier", undefined);
		this.logger.info("Experience tier reset");
	}

	/**
	 * Gets a description of the user's experience tier
	 *
	 * @returns Description of the experience tier
	 */
	async getExperienceTierDescription(): Promise<string> {
		const tier = await this.getExperienceTier();

		switch (tier) {
			case "explorer":
				return "Welcome to SnapBack! You're just getting started with file protection.";
			case "intermediate":
				return "You're becoming a SnapBack pro! You're using multiple protection levels effectively.";
			case "power":
				return "You're a SnapBack expert! You're using the full power of the extension.";
			default:
				return "We're still learning about how you use SnapBack.";
		}
	}
}
