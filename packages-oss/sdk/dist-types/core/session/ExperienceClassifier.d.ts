/**
 * Experience Classifier - Platform-agnostic user experience tier classification
 *
 * This module provides utilities for classifying users into experience tiers
 * (explorer, intermediate, power user) based on their interaction patterns.
 * This enables adaptive hints and features across all platforms.
 *
 * @module ExperienceClassifier
 */
import type { ExperienceMetrics } from "../../types/experience";
import type { ILogger } from "./interfaces";
/**
 * Experience tiers for users
 */
export type ExperienceTier = "explorer" | "intermediate" | "power" | "unknown";
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
export declare const DEFAULT_EXPERIENCE_THRESHOLDS: ExperienceThresholdsConfig;
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
export declare class ExperienceClassifier {
    private storage;
    private logger;
    private thresholds;
    /**
     * Creates a new Experience Classifier
     *
     * @param options - Configuration options
     */
    constructor(options: ExperienceClassifierOptions);
    /**
     * Gets the current experience tier for the user
     *
     * @returns The user's experience tier
     */
    getExperienceTier(): Promise<ExperienceTier>;
    /**
     * Checks if metrics meet or exceed a threshold tier
     *
     * @param metrics - Experience metrics
     * @param tier - Tier to check against
     * @returns True if metrics meet or exceed the tier
     */
    private meetsThreshold;
    /**
     * Gets experience metrics for the current user
     *
     * @returns Experience metrics
     */
    getExperienceMetrics(): Promise<ExperienceMetrics>;
    /**
     * Updates experience metrics based on user activity
     *
     * @param activity - Type of activity to record
     * @param count - Number of activities to record (default: 1)
     */
    updateExperienceMetrics(activity: keyof ExperienceMetrics, count?: number): Promise<void>;
    /**
     * Records command usage for diversity calculation
     *
     * @param command - Command that was used
     */
    recordCommandUsage(command: string): Promise<void>;
    /**
     * Sets experience tier manually (for testing)
     *
     * @param tier - Experience tier to set
     */
    setExperienceTier(tier: ExperienceTier): Promise<void>;
    /**
     * Resets experience tier (for testing)
     */
    resetExperienceTier(): Promise<void>;
    /**
     * Gets a description of the user's experience tier
     *
     * @returns Description of the experience tier
     */
    getExperienceTierDescription(): Promise<string>;
}
//# sourceMappingURL=ExperienceClassifier.d.ts.map