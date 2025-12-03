/**
 * Telemetry Events Schema
 *
 * This file defines the schema for all telemetry events with strict typing
 * to ensure compile-time validation and runtime schema checking.
 */
export interface TelemetryEvent {
    event: string;
    properties?: Record<string, unknown>;
    timestamp: number;
}
export interface ExtensionActivatedEvent {
    event: "extension.activated";
    properties: {
        version: string;
        vscodeVersion: string;
    };
    timestamp: number;
}
export interface ExtensionDeactivatedEvent {
    event: "extension.deactivated";
    properties: Record<string, never>;
    timestamp: number;
}
export interface CommandExecutionEvent {
    event: "command.execution";
    properties: {
        command: string;
        duration: number;
        success: boolean;
    };
    timestamp: number;
}
export interface SnapshotCreatedEvent {
    event: "snapshot.created";
    properties: {
        method: string;
        filesCount: number;
    };
    timestamp: number;
}
export interface SnapBackUsedEvent {
    event: "snapback.used";
    properties: {
        filesRestored: number;
        duration: number;
        success: boolean;
    };
    timestamp: number;
}
export interface RiskDetectedEvent {
    event: "risk.detected";
    properties: {
        riskLevel: string;
        patterns: string[];
        confidence: number;
    };
    timestamp: number;
}
export interface ViewActivatedEvent {
    event: "view.activated";
    properties: {
        viewId: string;
    };
    timestamp: number;
}
export interface NotificationShownEvent {
    event: "notification.shown";
    properties: {
        notificationType: string;
        actionTaken: string | null;
    };
    timestamp: number;
}
export interface FeatureUsedEvent {
    event: "feature.used";
    properties: {
        feature: string;
    };
    timestamp: number;
}
export interface ErrorEvent {
    event: "error";
    properties: {
        errorType: string;
        errorMessage: string;
    };
    timestamp: number;
}
export interface WalkthroughStepCompletedEvent {
    event: "walkthrough.step.completed";
    properties: {
        stepId: string;
        stepTitle: string;
    };
    timestamp: number;
}
export interface OnboardingProtectionAssignedEvent {
    event: "onboarding.protection.assigned";
    properties: {
        level: string;
        trigger: string;
        fileType: string;
        isFirstProtection: boolean;
    };
    timestamp: number;
}
export interface OnboardingPhaseProgressedEvent {
    event: "onboarding.phase.progressed";
    properties: {
        phase: number;
        trigger: string;
        unlockedFeatures: string[];
    };
    timestamp: number;
}
export interface OnboardingContextualPromptShownEvent {
    event: "onboarding.contextualPrompt.shown";
    properties: {
        promptType: string;
        actionTaken: string | null;
    };
    timestamp: number;
}
export interface SignatureVerificationSuccessEvent {
    event: "signature.verification.success";
    properties: Record<string, never>;
    timestamp: number;
}
export interface SignatureVerificationFailedEvent {
    event: "signature.verification.failed";
    properties: Record<string, never>;
    timestamp: number;
}
export interface RulesCachedFallbackEvent {
    event: "rules.cached.fallback";
    properties: Record<string, never>;
    timestamp: number;
}
export type AllowedTelemetryEvent = ExtensionActivatedEvent | ExtensionDeactivatedEvent | CommandExecutionEvent | SnapshotCreatedEvent | SnapBackUsedEvent | RiskDetectedEvent | ViewActivatedEvent | NotificationShownEvent | FeatureUsedEvent | ErrorEvent | WalkthroughStepCompletedEvent | OnboardingProtectionAssignedEvent | OnboardingPhaseProgressedEvent | OnboardingContextualPromptShownEvent | SignatureVerificationSuccessEvent | SignatureVerificationFailedEvent | RulesCachedFallbackEvent;
export declare const TELEMETRY_EVENTS: {
    readonly EXTENSION_ACTIVATED: "extension.activated";
    readonly EXTENSION_DEACTIVATED: "extension.deactivated";
    readonly COMMAND_EXECUTION: "command.execution";
    readonly SNAPSHOT_CREATED: "snapshot.created";
    readonly SNAPBACK_USED: "snapback.used";
    readonly RISK_DETECTED: "risk.detected";
    readonly VIEW_ACTIVATED: "view.activated";
    readonly NOTIFICATION_SHOWN: "notification.shown";
    readonly FEATURE_USED: "feature.used";
    readonly ERROR: "error";
    readonly WALKTHROUGH_STEP_COMPLETED: "walkthrough.step.completed";
    readonly ONBOARDING_PROTECTION_ASSIGNED: "onboarding.protection.assigned";
    readonly ONBOARDING_PHASE_PROGRESSED: "onboarding.phase.progressed";
    readonly ONBOARDING_CONTEXTUAL_PROMPT_SHOWN: "onboarding.contextualPrompt.shown";
    readonly SIGNATURE_VERIFICATION_SUCCESS: "signature.verification.success";
    readonly SIGNATURE_VERIFICATION_FAILED: "signature.verification.failed";
    readonly RULES_CACHED_FALLBACK: "rules.cached.fallback";
};
export type TelemetryEventName = typeof TELEMETRY_EVENTS[keyof typeof TELEMETRY_EVENTS];
export declare function validateTelemetryEvent(event: TelemetryEvent): event is AllowedTelemetryEvent;
