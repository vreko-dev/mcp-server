import type { SnapBackSettings } from "./types";

/**
 * Default SnapBack settings
 */
export const DEFAULT_SETTINGS: SnapBackSettings = {
	protectionLevels: {
		defaultLevel: "watch",
	},
	notifications: {
		showCheckpointCreated: true,
		duration: 3000,
	},
	showAutoCheckpointNotifications: true,
	checkpoint: {
		naming: {
			useGit: true,
			gitTimeout: 5000,
		},
		deletion: {
			autoCleanup: {
				enabled: false,
			},
		},
	},
	aiDetectionEnabled: true,
	checkpointInterval: 300000, // 5 minutes
};

/**
 * Gets a specific setting value with type safety
 */
export function getSetting<T extends keyof SnapBackSettings>(settings: SnapBackSettings, key: T): SnapBackSettings[T] {
	return settings[key];
}
