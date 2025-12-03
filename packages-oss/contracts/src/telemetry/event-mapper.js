import { AllowedTelemetryEvent, TELEMETRY_EVENTS, ExtensionActivatedEvent, ExtensionDeactivatedEvent, CommandExecutionEvent, SnapshotCreatedEvent, SnapBackUsedEvent, RiskDetectedEvent, ViewActivatedEvent, NotificationShownEvent, FeatureUsedEvent, ErrorEvent, WalkthroughStepCompletedEvent, OnboardingProtectionAssignedEvent, OnboardingPhaseProgressedEvent, OnboardingContextualPromptShownEvent, SignatureVerificationSuccessEvent, SignatureVerificationFailedEvent, RulesCachedFallbackEvent } from "./events";
import { CoreTelemetryEventV1, SaveAttemptSchema, SnapshotCreatedSchemaV1, SessionFinalizedSchema, IssueCreatedSchema, IssueResolvedSchema, SessionRestoredSchema, PolicyChangedSchema } from "./events.v1";
/**
 * Maps legacy telemetry events to new core events
 *
 * This utility transforms the existing 60+ events into the new 7 core events
 * for simplified analytics and reporting.
 */
export class TelemetryEventMapper {
    /**
     * Maps a legacy telemetry event to a core event
     * @param event The legacy event to map
     * @returns The mapped core event or null if no mapping exists
     */
    static mapEvent(event) {
        switch (event.event) {
            case TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED:
                return this.mapOnboardingProtectionAssigned(event);
            case TELEMETRY_EVENTS.SNAPSHOT_CREATED:
                return this.mapSnapshotCreated(event);
            case TELEMETRY_EVENTS.SNAPBACK_USED:
                return this.mapSnapBackUsed(event);
            case TELEMETRY_EVENTS.RISK_DETECTED:
                return this.mapRiskDetected(event);
            // Events that don't map directly but contribute to derived metrics
            case TELEMETRY_EVENTS.EXTENSION_ACTIVATED:
            case TELEMETRY_EVENTS.EXTENSION_DEACTIVATED:
            case TELEMETRY_EVENTS.COMMAND_EXECUTION:
            case TELEMETRY_EVENTS.VIEW_ACTIVATED:
            case TELEMETRY_EVENTS.NOTIFICATION_SHOWN:
            case TELEMETRY_EVENTS.FEATURE_USED:
            case TELEMETRY_EVENTS.ERROR:
            case TELEMETRY_EVENTS.WALKTHROUGH_STEP_COMPLETED:
            case TELEMETRY_EVENTS.ONBOARDING_PHASE_PROGRESSED:
            case TELEMETRY_EVENTS.ONBOARDING_CONTEXTUAL_PROMPT_SHOWN:
            case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_SUCCESS:
            case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_FAILED:
            case TELEMETRY_EVENTS.RULES_CACHED_FALLBACK:
                // These events contribute to derived metrics but don't map to core events
                return null;
            default:
                // Unknown event type
                return null;
        }
    }
    /**
     * Maps onboarding protection assigned event to save attempt
     */
    static mapOnboardingProtectionAssigned(event) {
        try {
            // Map protection level to our protection enum
            const protectionMap = {
                "low": "watch",
                "medium": "warn",
                "high": "block",
                "critical": "block"
            };
            // Map to severity
            const severityMap = {
                "low": "low",
                "medium": "medium",
                "high": "high",
                "critical": "critical"
            };
            const mappedEvent = SaveAttemptSchema.parse({
                event: "save_attempt",
                properties: {
                    protection: protectionMap[event.properties.level] || "watch",
                    severity: severityMap[event.properties.level] || "low",
                    file_kind: event.properties.fileType,
                    reason: `onboarding_${event.properties.trigger}`,
                    ai_present: false, // Onboarding events don't involve AI
                    ai_burst: false, // Onboarding events don't involve AI
                    outcome: "saved" // Onboarding protection assignments are always successful
                },
                timestamp: event.timestamp
            });
            return mappedEvent;
        }
        catch (error) {
            console.error("Failed to map onboarding protection assigned event:", error);
            return null;
        }
    }
    /**
     * Maps snapshot created event to snapshot created core event
     */
    static mapSnapshotCreated(event) {
        try {
            // For legacy events, we'll need to generate or use placeholder values for new fields
            const mappedEvent = SnapshotCreatedSchemaV1.parse({
                event: "snapshot_created",
                properties: {
                    session_id: "legacy_session", // Placeholder for legacy events
                    snapshot_id: `snap_${Date.now()}`, // Generate ID for legacy events
                    bytes_original: event.properties.filesCount * 1024, // Estimate original size
                    bytes_stored: event.properties.filesCount * 512, // Estimate stored size
                    dedup_hit: false, // Legacy events don't have this info
                    latency_ms: 0 // Legacy events don't have this info
                },
                timestamp: event.timestamp
            });
            return mappedEvent;
        }
        catch (error) {
            console.error("Failed to map snapshot created event:", error);
            return null;
        }
    }
    /**
     * Maps snapback used event to session restored core event
     */
    static mapSnapBackUsed(event) {
        try {
            // For legacy events, we'll need to generate or use placeholder values for new fields
            const mappedEvent = SessionRestoredSchema.parse({
                event: "session_restored",
                properties: {
                    session_id: "legacy_session", // Placeholder for legacy events
                    files_restored: Array(event.properties.filesRestored).fill("legacy_file"), // Placeholder file names
                    time_to_restore_ms: event.properties.duration,
                    reason: event.properties.success ? "user_initiated" : "failed"
                },
                timestamp: event.timestamp
            });
            return mappedEvent;
        }
        catch (error) {
            console.error("Failed to map snapback used event:", error);
            return null;
        }
    }
    /**
     * Maps risk detected event to issue created core event
     */
    static mapRiskDetected(event) {
        try {
            // Map risk level to severity
            const severityMap = {
                "low": "low",
                "medium": "medium",
                "high": "high",
                "critical": "critical"
            };
            // Determine issue type based on patterns
            let issueType = "secret";
            if (event.properties.patterns.some(p => p.includes("mock") || p.includes("test"))) {
                issueType = "mock";
            }
            else if (event.properties.patterns.some(p => p.includes("phantom") || p.includes("unused"))) {
                issueType = "phantom";
            }
            const mappedEvent = IssueCreatedSchema.parse({
                event: "issue_created",
                properties: {
                    issue_id: `issue_${Date.now()}`, // Generate ID for legacy events
                    session_id: "legacy_session", // Placeholder for legacy events
                    file_kind: "unknown", // Legacy events don't have this info
                    type: issueType,
                    severity: severityMap[event.properties.riskLevel] || "medium",
                    recommendation: "Review detected risk pattern"
                },
                timestamp: event.timestamp
            });
            return mappedEvent;
        }
        catch (error) {
            console.error("Failed to map risk detected event:", error);
            return null;
        }
    }
}
/**
 * Utility function to map an array of legacy events to core events
 * @param events Array of legacy events
 * @returns Array of mapped core events
 */
export function mapLegacyEventsToCore(events) {
    return events
        .map(event => TelemetryEventMapper.mapEvent(event))
        .filter((event) => event !== null);
}
