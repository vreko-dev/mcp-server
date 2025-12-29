/// <reference types="react" />

export * from "./analytics";
// Auth contracts (explicit exports to avoid naming conflicts)
export {
	AUTH_ERROR_MESSAGES,
	type AuthError,
	type AuthErrorCode,
	// Error types
	AuthErrorCodeSchema,
	AuthErrorSchema,
	type AuthState,
	AuthStateSchema,
	type AuthUser,
	// Session types
	AuthUserSchema,
	BETTER_AUTH_ERROR_MAP,
	type ChangePasswordRequest,
	ChangePasswordRequestSchema,
	type ChangePasswordResponse,
	ChangePasswordResponseSchema,
	createAuthError,
	EmailSchema,
	type GetSessionResponse,
	GetSessionResponseSchema,
	getErrorMessage,
	isAuthenticated,
	isLoading,
	isUnauthenticated,
	mapBetterAuthError,
	type OAuthSignInRequest,
	OAuthSignInRequestSchema,
	// API contracts
	PasswordSchema,
	type Session as AuthSession,
	SessionSchema as AuthSessionSchema,
	type SessionWithUser,
	SessionWithUserSchema,
	type SignInRequest,
	SignInRequestSchema,
	type SignInResponse,
	SignInResponseSchema,
	type SignOutResponse,
	SignOutResponseSchema,
	type SignUpRequest,
	SignUpRequestSchema,
	type SignUpResponse,
	SignUpResponseSchema,
	type UpdateProfileRequest,
	UpdateProfileRequestSchema,
	type UpdateProfileResponse,
	UpdateProfileResponseSchema,
} from "./auth/index";
export * from "./eventBus";
// Event bus emitter implementation (consolidated from @snapback/events)
export {
	type EnhancedEvent,
	type EventAcknowledgment,
	type FileProtectedPayload,
	type FileUnprotectedPayload,
	type ProtectionChangedPayload,
	QoSLevel,
	SnapBackEvent,
	SnapBackEventBus,
	SnapBackEventBusEventEmitter2,
	type SnapshotCreatedPayload,
} from "./eventBus.emitter";
export * from "./events/index";
export * from "./exports";
export * from "./feature-manager";
export * from "./features";
export * from "./id-generator";
export * from "./logger";
export * from "./observability";
// Pioneer Program WebSocket types (explicit to avoid Tier naming conflict)
export {
	type ClientToServerMessage,
	type ConnectedMessage,
	type ErrorMessage,
	type LeaderboardUpdateMessage,
	type PingMessage,
	type PioneerEventType,
	type PioneerTier,
	type PioneerWSEvent,
	type PioneerWSMessage,
	type PointsUpdatedMessage,
	type PongMessage,
	type ReferralConvertedMessage,
	type ServerToClientMessage,
	type SubscribeMessage,
	type TierChangedMessage,
	type UnsubscribeMessage,
	WS_CLOSE_CODES,
	type WSCloseCode,
} from "./pioneer";
export * from "./risk-conversion";
export * from "./schemas";
// Alpha contracts (Phase 0)
export * from "./tiers";
// Note: telemetry re-exports from events, so not exported here to avoid conflicts

export * from "./session";
// Session subdirectory (file modification tracking)
export * from "./session/index";
export * from "./types/analysis";
export * from "./types/branded";
export * from "./types/config";
export * from "./types/protection";
export * from "./types/protection-utils";
// Note: Not exporting types/snapshot due to naming conflicts with schemas.ts

// Required exports for SDK functionality
export type {
	AnalyticsResponse,
	DiffChange,
	FileMetadata,
	RiskScore,
	Snapshot,
	SnapshotMetadata,
} from "./schemas";

// Export snapshot types that don't conflict
export type {
	ConflictReport,
	CreateSnapshotOptions,
	DiffPreview,
	FileDiff,
	FileInput,
	SnapshotFilters,
	SnapshotRestoreResult,
	SnapshotStorage,
} from "./types/snapshot";

// Note: createSnapshotStorage is commented out to avoid SDK dependency in web builds
// CLI and VSCode extension import SDK directly, not through contracts
// Web app uses Supabase storage, not local SQLite (better-sqlite3)
// export { createSnapshotStorage } from "./types/snapshot"

// Dashboard exports (for web app metrics display)
export type {
	AIActivityBreakdown,
	DashboardMetrics,
	DashboardMetricsError,
	DashboardMetricsResponse,
	RecentActivity,
} from "./dashboard/metrics";
export {
	AI_TOOLS,
	AIActivityBreakdownSchema,
	DashboardMetricsErrorSchema,
	DashboardMetricsResponseSchema,
	DashboardMetricsSchema,
	isDashboardMetrics,
	isDashboardMetricsError,
	isProtectionActive,
	isProtectionInactive,
	PROTECTION_STATUSES,
	RECENT_ACTIVITY_ACTIONS,
	RecentActivitySchema,
} from "./dashboard/metrics";
