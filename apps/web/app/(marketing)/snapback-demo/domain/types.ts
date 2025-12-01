// Protection levels
export type ProtectionLevel = "unprotected" | "watch" | "warn" | "block";

// Snapshot interface
export interface Snapshot {
	id: string;
	fileId: string;
	content: string;
	timestamp: Date;
	name: string;
	protectionLevel: ProtectionLevel;
}

// Protected file interface
export interface ProtectedFile {
	id: string;
	path: string;
	protectionLevel: ProtectionLevel;
	lastSnapshotId?: string;
}

// Notification interface
export interface Notification {
	id: string;
	type: "info" | "warning" | "error" | "success";
	title: string;
	message: string;
	timestamp: Date;
	actions?: NotificationAction[];
	duration?: number;
}

export interface NotificationAction {
	label: string;
	action: () => void;
}

// Policy interface
export interface Policy {
	pattern: string;
	protectionLevel: ProtectionLevel;
	type: "protected" | "ignore";
}

// AI suggestion interface
export interface AiSuggestion {
	confidence: number;
	suggestLevelUpgrade?: ProtectionLevel;
	requireCheckpoint: boolean;
	reason: string;
}

// Settings interface
export interface SnapBackSettings {
	protectionLevels: {
		defaultLevel: ProtectionLevel;
	};
	notifications: {
		showCheckpointCreated: boolean;
		duration: number;
	};
	showAutoCheckpointNotifications: boolean;
	checkpoint: {
		naming: {
			useGit: boolean;
			gitTimeout: number;
		};
		deletion: {
			autoCleanup: {
				enabled: boolean;
			};
		};
	};
	aiDetectionEnabled: boolean;
	checkpointInterval: number;
}

// Git context interface
export interface GitContext {
	branch: string;
	commit: string;
	author: string;
}
