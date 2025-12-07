// Analysis exports

// Utility exports - re-export from OSS package
export { toError } from "@snapback-oss/sdk";
export {
	createChangeSummary,
	type FileChange,
	FileChangeAnalyzer,
	type FileChangeType,
	type IFileSystemProvider as IFileSystemProviderAnalysis,
} from "./analysis/FileChangeAnalyzer";
export {
	type AnalysisResult,
	DEFAULT_RISK_THRESHOLDS,
	RiskAnalyzer,
	type RiskFactor,
	type RiskSeverity,
} from "./analysis/RiskAnalyzer";
export {
	describeRiskFactor,
	describeRiskFactors,
	getStandardRiskFactors,
	isKnownRiskFactor,
	RISK_FACTOR_DESCRIPTIONS,
} from "./analysis/riskFactorDescriptions";
export * from "./cache/lru-cache";
export { type Envelope, SnapbackAnalyticsClient, SnapbackClient } from "./client";
export { ProtectionClient } from "./client/ProtectionClient";
export { SnapshotClient } from "./client/SnapshotClient";
// Cloud backup exports
export {
	type CloudBackupConfig,
	CloudBackupService,
	type DownloadResult,
	type UploadResult,
} from "./cloud/CloudBackupService";
export * from "./config";
// Configuration detector
export {
	type ConfigChange,
	ConfigDetector,
	type ConfigDetectorOptions,
	type ConfigFile,
	type ConfigParseResult,
	type ConfigValidationResult,
	type IFileSystemProvider,
} from "./config/ConfigDetector";
export { type MergeOptions, type ParseResult, SnapBackRCParser } from "./config/SnapBackRCParser";
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
} from "./config/Thresholds";
// Configuration types and parser
export type {
	ProtectionLevel,
	ProtectionRule,
	SnapBackHooks,
	SnapBackPolicies,
	SnapBackRC,
	SnapBackSettings,
	SnapshotTemplate,
} from "./config/types";
export {
	AI_EXTENSION_IDS,
	type AIAssistantName,
	AIPresenceDetector,
	type IExtensionProvider,
} from "./core/detection/AIPresenceDetector";
// Detection exports
export {
	type BurstDetectionResult,
	type BurstDetectorConfig,
	BurstHeuristicsDetector,
} from "./core/detection/BurstHeuristicsDetector";
export {
	CursorDetector,
	type IEnvironmentProvider,
} from "./core/detection/CursorDetector";
export {
	DEFAULT_EXPERIENCE_THRESHOLDS,
	ExperienceClassifier,
	type ExperienceClassifierOptions,
	type ExperienceThresholdsConfig,
	type ExperienceTier,
	type IKeyValueStorage,
} from "./core/session/ExperienceClassifier";
export {
	type IDisposable,
	type IEventEmitter,
	type ILogger,
	type ISessionStorage,
	type ITimerService,
	NodeTimerService,
	NoOpLogger,
} from "./core/session/interfaces";
export {
	SessionCoordinator,
	type SessionCoordinatorConfig,
	type SessionCoordinatorOptions,
} from "./core/session/SessionCoordinator";
export {
	type ISnapshotProvider,
	SessionSummaryGenerator,
	type SessionSummaryGeneratorOptions,
} from "./core/session/SessionSummaryGenerator";
// Session exports
export {
	type AIPresenceInfo,
	type SessionTag,
	SessionTagger,
	type SessionTaggerConfig,
	type SessionTaggerOptions,
	type SessionTaggingResult,
} from "./core/session/SessionTagger";
export type {
	SessionCandidate,
	SessionFileEntry,
	SessionFinalizeReason,
	SessionId,
	SessionManifest,
} from "./core/session/types";
// Dashboard client exports
export {
	createDashboardMetricsClient,
	type DashboardMetricsClient,
	type ORPCClient,
} from "./dashboard/metrics-client";
export { EncryptionService } from "./encryption/EncryptionService";
// Helper exports
export { analyze, evaluatePolicy, ingestTelemetry } from "./helpers";
export * from "./privacy/hasher";
export * from "./privacy/sanitizer";
export * from "./privacy/validator";
export { ProtectionManager } from "./protection/ProtectionManager";
// Core SDK exports
export { Snapback } from "./Snapback";
// Session Layer exports (new SessionManager)
export * from "./session/index";
export { SnapshotManager } from "./snapshot/SnapshotManager";
export { LocalStorage } from "./storage/LocalStorage";
export { MemoryStorage } from "./storage/MemoryStorage";
export type { StorageAdapter } from "./storage/StorageAdapter";
export { StorageBroker } from "./storage/StorageBroker";
export { StorageBrokerAdapter } from "./storage/StorageBrokerAdapter";
// Error exports
export {
	CorruptedDataError,
	StorageConnectionError,
	StorageError,
	StorageFullError,
	StorageLockError,
} from "./storage/StorageErrors";
export type { SDKConfig } from "./types";
export type { ExperienceMetrics } from "./types/experience";
export { areEqual, getDepth, isWithin, normalize } from "./utils/PathNormalizer";
export * from "./utils/retry";
