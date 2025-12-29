// Onboarding lib exports

export type { AuthSuccessPayload, UserInfo } from "./authSync";
// Auth Sync
export {
	AUTH_SYNC_KEYS,
	clearAuthStorage,
	clearAuthSuccess,
	getUserInfo,
	isExtensionWaitingForAuth,
	listenForAuthSuccess,
	listenToExtension,
	postToExtension,
	signalAuthSuccess,
	storeUserInfo,
} from "./authSync";
export type { BackupQueue, BackupQueueConfig, QueuedBackup } from "./backupQueue";
// Backup Queue (Phase 5)
export { createBackupQueue } from "./backupQueue";
export type { MCPClient, MCPClientConfig } from "./mcpClient";
// MCP Client (Phase 4)
export { createMCPClient } from "./mcpClient";
export type { SessionManager, SessionManagerConfig } from "./sessionManager";
// Session Manager (Phase 5)
export { createSessionManager } from "./sessionManager";
export type { SessionSync, SessionSyncConfig } from "./sessionSync";
// Session Sync (Phase 5)
export { createSessionSync } from "./sessionSync";
