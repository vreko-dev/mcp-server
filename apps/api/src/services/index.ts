/**
 * API Services - Barrel export
 *
 * Core services for the SnapBack API.
 * Module-specific services are exported from their respective module directories.
 */

// Cloud & Storage
export * from "./cloud-backup";
export * from "./database";

// Email & Communication
export * from "./email";

// Security
export { type AnalysisRequest, type AnalysisResult, GuardianService, type RiskFactor } from "./guardian";
export * from "./keys";

// MCP Integration
export * from "./mcp";

// Metrics & Analytics
export * from "./metrics-aggregator";

// User & Pioneer
export * from "./pioneer-service";
export * from "./secret-detection";

// Trust & Risk
export * from "./trust-calibration";
export * from "./trust-calibration-helpers";
export * from "./user-context-service";
