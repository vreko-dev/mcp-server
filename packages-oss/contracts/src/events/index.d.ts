/**
 * Events Index - Unified Event Definitions
 *
 * This file exports all event definitions from the contracts package.
 */
export * from "./core";
export * from "./infrastructure";
export type { TelemetryEvent as LegacyTelemetryEvent, ExtensionActivatedEvent as LegacyExtensionActivatedEvent, ExtensionDeactivatedEvent as LegacyExtensionDeactivatedEvent, CommandExecutionEvent as LegacyCommandExecutionEvent, SnapshotCreatedEvent as LegacySnapshotCreatedEvent, SnapBackUsedEvent as LegacySnapBackUsedEvent, RiskDetectedEvent as LegacyRiskDetectedEvent, ViewActivatedEvent as LegacyViewActivatedEvent, NotificationShownEvent as LegacyNotificationShownEvent, FeatureUsedEvent as LegacyFeatureUsedEvent, ErrorEvent as LegacyErrorEvent, WalkthroughStepCompletedEvent as LegacyWalkthroughStepCompletedEvent, OnboardingProtectionAssignedEvent as LegacyOnboardingProtectionAssignedEvent, OnboardingPhaseProgressedEvent as LegacyOnboardingPhaseProgressedEvent, OnboardingContextualPromptShownEvent as LegacyOnboardingContextualPromptShownEvent, SignatureVerificationSuccessEvent as LegacySignatureVerificationSuccessEvent, SignatureVerificationFailedEvent as LegacySignatureVerificationFailedEvent, RulesCachedFallbackEvent as LegacyRulesCachedFallbackEvent, AllowedTelemetryEvent as LegacyAllowedTelemetryEvent, TelemetryEventName as LegacyTelemetryEventName } from "../telemetry/events";
export { TELEMETRY_EVENTS as LEGACY_TELEMETRY_EVENTS, validateTelemetryEvent as validateLegacyTelemetryEvent } from "../telemetry/events";
export * from "./migrate";
