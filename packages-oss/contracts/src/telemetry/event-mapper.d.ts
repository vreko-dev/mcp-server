import { AllowedTelemetryEvent } from "./events";
import { CoreTelemetryEventV1 } from "./events.v1";
/**
 * Maps legacy telemetry events to new core events
 *
 * This utility transforms the existing 60+ events into the new 7 core events
 * for simplified analytics and reporting.
 */
export declare class TelemetryEventMapper {
    /**
     * Maps a legacy telemetry event to a core event
     * @param event The legacy event to map
     * @returns The mapped core event or null if no mapping exists
     */
    static mapEvent(event: AllowedTelemetryEvent): CoreTelemetryEventV1 | null;
    /**
     * Maps onboarding protection assigned event to save attempt
     */
    private static mapOnboardingProtectionAssigned;
    /**
     * Maps snapshot created event to snapshot created core event
     */
    private static mapSnapshotCreated;
    /**
     * Maps snapback used event to session restored core event
     */
    private static mapSnapBackUsed;
    /**
     * Maps risk detected event to issue created core event
     */
    private static mapRiskDetected;
}
/**
 * Utility function to map an array of legacy events to core events
 * @param events Array of legacy events
 * @returns Array of mapped core events
 */
export declare function mapLegacyEventsToCore(events: AllowedTelemetryEvent[]): CoreTelemetryEventV1[];
