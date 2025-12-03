/**
 * Telemetry Events Schema
 *
 * This file defines the schema for all telemetry events with strict typing
 * to ensure compile-time validation and runtime schema checking.
 */
// Event name enum for compile-time checking
export const TELEMETRY_EVENTS = {
    EXTENSION_ACTIVATED: "extension.activated",
    EXTENSION_DEACTIVATED: "extension.deactivated",
    COMMAND_EXECUTION: "command.execution",
    SNAPSHOT_CREATED: "snapshot.created",
    SNAPBACK_USED: "snapback.used",
    RISK_DETECTED: "risk.detected",
    VIEW_ACTIVATED: "view.activated",
    NOTIFICATION_SHOWN: "notification.shown",
    FEATURE_USED: "feature.used",
    ERROR: "error",
    WALKTHROUGH_STEP_COMPLETED: "walkthrough.step.completed",
    ONBOARDING_PROTECTION_ASSIGNED: "onboarding.protection.assigned",
    ONBOARDING_PHASE_PROGRESSED: "onboarding.phase.progressed",
    ONBOARDING_CONTEXTUAL_PROMPT_SHOWN: "onboarding.contextualPrompt.shown",
    SIGNATURE_VERIFICATION_SUCCESS: "signature.verification.success",
    SIGNATURE_VERIFICATION_FAILED: "signature.verification.failed",
    RULES_CACHED_FALLBACK: "rules.cached.fallback",
};
// Schema validation functions
export function validateTelemetryEvent(event) {
    switch (event.event) {
        case TELEMETRY_EVENTS.EXTENSION_ACTIVATED:
            return validateExtensionActivatedEvent(event);
        case TELEMETRY_EVENTS.EXTENSION_DEACTIVATED:
            return validateExtensionDeactivatedEvent(event);
        case TELEMETRY_EVENTS.COMMAND_EXECUTION:
            return validateCommandExecutionEvent(event);
        case TELEMETRY_EVENTS.SNAPSHOT_CREATED:
            return validateSnapshotCreatedEvent(event);
        case TELEMETRY_EVENTS.SNAPBACK_USED:
            return validateSnapBackUsedEvent(event);
        case TELEMETRY_EVENTS.RISK_DETECTED:
            return validateRiskDetectedEvent(event);
        case TELEMETRY_EVENTS.VIEW_ACTIVATED:
            return validateViewActivatedEvent(event);
        case TELEMETRY_EVENTS.NOTIFICATION_SHOWN:
            return validateNotificationShownEvent(event);
        case TELEMETRY_EVENTS.FEATURE_USED:
            return validateFeatureUsedEvent(event);
        case TELEMETRY_EVENTS.ERROR:
            return validateErrorEvent(event);
        case TELEMETRY_EVENTS.WALKTHROUGH_STEP_COMPLETED:
            return validateWalkthroughStepCompletedEvent(event);
        case TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED:
            return validateOnboardingProtectionAssignedEvent(event);
        case TELEMETRY_EVENTS.ONBOARDING_PHASE_PROGRESSED:
            return validateOnboardingPhaseProgressedEvent(event);
        case TELEMETRY_EVENTS.ONBOARDING_CONTEXTUAL_PROMPT_SHOWN:
            return validateOnboardingContextualPromptShownEvent(event);
        case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_SUCCESS:
            return validateSignatureVerificationSuccessEvent(event);
        case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_FAILED:
            return validateSignatureVerificationFailedEvent(event);
        case TELEMETRY_EVENTS.RULES_CACHED_FALLBACK:
            return validateRulesCachedFallbackEvent(event);
        default:
            return false;
    }
}
// Individual validation functions
function validateExtensionActivatedEvent(event) {
    return (typeof event.properties.version === "string" &&
        typeof event.properties.vscodeVersion === "string");
}
function validateExtensionDeactivatedEvent(event) {
    return Object.keys(event.properties).length === 0;
}
function validateCommandExecutionEvent(event) {
    return (typeof event.properties.command === "string" &&
        typeof event.properties.duration === "number" &&
        typeof event.properties.success === "boolean");
}
function validateSnapshotCreatedEvent(event) {
    return (typeof event.properties.method === "string" &&
        typeof event.properties.filesCount === "number");
}
function validateSnapBackUsedEvent(event) {
    return (typeof event.properties.filesRestored === "number" &&
        typeof event.properties.duration === "number" &&
        typeof event.properties.success === "boolean");
}
function validateRiskDetectedEvent(event) {
    return (typeof event.properties.riskLevel === "string" &&
        Array.isArray(event.properties.patterns) &&
        typeof event.properties.confidence === "number");
}
function validateViewActivatedEvent(event) {
    return typeof event.properties.viewId === "string";
}
function validateNotificationShownEvent(event) {
    return (typeof event.properties.notificationType === "string" &&
        (event.properties.actionTaken === null || typeof event.properties.actionTaken === "string"));
}
function validateFeatureUsedEvent(event) {
    return typeof event.properties.feature === "string";
}
function validateErrorEvent(event) {
    return (typeof event.properties.errorType === "string" &&
        typeof event.properties.errorMessage === "string");
}
function validateWalkthroughStepCompletedEvent(event) {
    return (typeof event.properties.stepId === "string" &&
        typeof event.properties.stepTitle === "string");
}
function validateOnboardingProtectionAssignedEvent(event) {
    return (typeof event.properties.level === "string" &&
        typeof event.properties.trigger === "string" &&
        typeof event.properties.fileType === "string" &&
        typeof event.properties.isFirstProtection === "boolean");
}
function validateOnboardingPhaseProgressedEvent(event) {
    return (typeof event.properties.phase === "number" &&
        typeof event.properties.trigger === "string" &&
        Array.isArray(event.properties.unlockedFeatures));
}
function validateOnboardingContextualPromptShownEvent(event) {
    return (typeof event.properties.promptType === "string" &&
        (event.properties.actionTaken === null || typeof event.properties.actionTaken === "string"));
}
function validateSignatureVerificationSuccessEvent(event) {
    return Object.keys(event.properties).length === 0;
}
function validateSignatureVerificationFailedEvent(event) {
    return Object.keys(event.properties).length === 0;
}
function validateRulesCachedFallbackEvent(event) {
    return Object.keys(event.properties).length === 0;
}
