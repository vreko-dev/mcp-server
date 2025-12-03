/**
 * Experience-related types
 *
 * This module contains experience-related type definitions that are shared
 * between multiple modules to avoid circular dependencies.
 */

/**
 * Metrics used for experience classification
 */
export interface ExperienceMetrics {
	/** Total snapshots created */
	snapshotsCreated: number;

	/** Total sessions recorded */
	sessionsRecorded: number;

	/** Total protected files */
	protectedFiles: number;

	/** Total manual restores performed */
	manualRestores: number;

	/** Total AI-assisted sessions */
	aiAssistedSessions: number;

	/** Days since first use */
	daysSinceFirstUse: number;

	/** Commands used diversity (0-1) */
	commandDiversity: number;
}
