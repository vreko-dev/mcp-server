/**
 * Events Index - Unified Event Definitions
 *
 * This file exports all event definitions from the contracts package.
 */
// Export core events (new v1 schema)
export * from "./core";
// Export infrastructure events
export * from "./infrastructure";
// Export legacy event names and validation functions
export { TELEMETRY_EVENTS as LEGACY_TELEMETRY_EVENTS, validateTelemetryEvent as validateLegacyTelemetryEvent } from "../telemetry/events";
// Export migration utilities
export * from "./migrate";
