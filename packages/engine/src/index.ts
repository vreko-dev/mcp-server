/**
 * SnapBack Simplified Architecture - Entry Point
 *
 * This is the main entry point for the simplified architecture.
 * It exports all public APIs for use by transports and external consumers.
 *
 * Target: ~20 LOC
 */

// =============================================================================
// RUNTIME EXPORTS
// =============================================================================

export { eventBus, type SnapBackEvents } from "./runtime/events";
export { Orchestrator, orchestrator } from "./runtime/orchestrator";
export { type SnapshotManifest, Storage, type StorageConfig } from "./runtime/storage";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
	ActionOutput,
	// File changes
	FileChange,
	MCPTool,
	// Orchestrator
	OrchestratorResult,
	ScriptConfig,
	SessionBaseline,
	// Session & health
	SessionHealth,
	// Script outputs
	SignalOutput,
	// Config
	SnapBackConfig,
	// Storage
	Snapshot,
	SnapshotFile,
	// Transport
	TransportResponse,
	ValidationError,
	ValidatorOutput,
} from "./types";

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = "2.0.0-alpha.1";
