// Analysis exports
export {
	createChangeSummary,
	type FileChange,
	FileChangeAnalyzer,
	type FileChangeType,
	type IFileSystemProvider as IFileSystemProviderAnalysis,
} from "./analysis/FileChangeAnalyzer.js";
export {
	type AnalysisResult,
	DEFAULT_RISK_THRESHOLDS,
	RiskAnalyzer,
	type RiskFactor,
	type RiskSeverity,
} from "./analysis/RiskAnalyzer.js";
export * from "./cache/lru-cache.js";
export { ProtectionClient } from "./client/ProtectionClient.js";
export { SnapshotClient } from "./client/SnapshotClient.js";
export { type Envelope, SnapbackAnalyticsClient, SnapbackClient } from "./client.js";
// Cloud backup exports
export {
	type CloudBackupConfig,
	CloudBackupService,
	type DownloadResult,
	type UploadResult,
} from "./cloud/CloudBackupService.js";
// Configuration detector
export {
	type ConfigChange,
	ConfigDetector,
	type ConfigDetectorOptions,
	type ConfigFile,
	type ConfigParseResult,
	type ConfigValidationResult,
	type IFileSystemProvider,
} from "./config/ConfigDetector.js";
export { type MergeOptions, type ParseResult, SnapBackRCParser } from "./config/SnapBackRCParser.js";
// Centralized threshold configuration
export {
	type BurstThresholds,
	createThresholds,
	DEFAULT_THRESHOLDS,
	type DetectionThresholds,
	type ExperienceThresholds,
	type ProtectionThresholds,
	type QoSThresholds,
	type ResourceThresholds,
	type RiskThresholds,
	resetThresholds,
	type SecurityPatternScores,
	type SessionThresholds,
	type TaggingThresholds,
	THRESHOLDS,
	type ThresholdsConfig,
	updateThresholds,
} from "./config/Thresholds.js";
// Configuration types and parser
export type {
	ProtectionLevel,
	ProtectionRule,
	SnapBackHooks,
	SnapBackPolicies,
	SnapBackRC,
	SnapBackSettings,
	SnapshotTemplate,
} from "./config/types.js";
export * from "./config.js";
export {
	AI_EXTENSION_IDS,
	type AIAssistantName,
	AIPresenceDetector,
	type IExtensionProvider,
} from "./core/detection/AIPresenceDetector.js";
// Detection exports
export {
	type BurstDetectionResult,
	type BurstDetectorConfig,
	BurstHeuristicsDetector,
} from "./core/detection/BurstHeuristicsDetector.js";
export {
	CursorDetector,
	type IEnvironmentProvider,
} from "./core/detection/CursorDetector.js";
export {
	DEFAULT_EXPERIENCE_THRESHOLDS,
	ExperienceClassifier,
	type ExperienceClassifierOptions,
	type ExperienceThresholdsConfig,
	type ExperienceTier,
	type IKeyValueStorage,
} from "./core/session/ExperienceClassifier.js";
export {
	type IDisposable,
	type IEventEmitter,
	type ILogger,
	type ISessionStorage,
	type ITimerService,
	NodeTimerService,
	NoOpLogger,
} from "./core/session/interfaces.js";
export {
	SessionCoordinator,
	type SessionCoordinatorConfig,
	type SessionCoordinatorOptions,
} from "./core/session/SessionCoordinator.js";
export {
	type ISnapshotProvider,
	SessionSummaryGenerator,
	type SessionSummaryGeneratorOptions,
} from "./core/session/SessionSummaryGenerator.js";
// Session exports
export {
	type AIPresenceInfo,
	type SessionTag,
	SessionTagger,
	type SessionTaggerConfig,
	type SessionTaggerOptions,
	type SessionTaggingResult,
} from "./core/session/SessionTagger.js";
export type {
	SessionCandidate,
	SessionFileEntry,
	SessionFinalizeReason,
	SessionId,
	SessionManifest,
} from "./core/session/types.js";
export { EncryptionService } from "./encryption/EncryptionService.js";
// Helper exports
export { analyze, evaluatePolicy, ingestTelemetry } from "./helpers.js";
export * from "./privacy/hasher.js";
export * from "./privacy/sanitizer.js";
export * from "./privacy/validator.js";
export { ProtectionManager } from "./protection/ProtectionManager.js";
// Core SDK exports
export { Snapback } from "./Snapback.js";
// Session Layer exports (new SessionManager)
export * from "./session/index.js";
export { SnapshotManager } from "./snapshot/SnapshotManager.js";
export { LocalStorage } from "./storage/LocalStorage.js";
export { MemoryStorage } from "./storage/MemoryStorage.js";
export type { StorageAdapter } from "./storage/StorageAdapter.js";
export { StorageBroker } from "./storage/StorageBroker.js";
export { StorageBrokerAdapter } from "./storage/StorageBrokerAdapter.js";
// Error exports
export {
	CorruptedDataError,
	StorageConnectionError,
	StorageError,
	StorageFullError,
	StorageLockError,
} from "./storage/StorageErrors.js";
export type { ExperienceMetrics } from "./types/experience.js";
export type { SDKConfig } from "./types.js";
// Utility exports
export { toError } from "./utils/errorHelpers.js";
export { areEqual, getDepth, isWithin, normalize } from "./utils/PathNormalizer.js";
