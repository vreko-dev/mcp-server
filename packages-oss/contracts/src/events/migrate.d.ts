/**
 * Event Migration Utilities
 *
 * This file provides utilities for migrating from legacy events to core events.
 */
import { CoreTelemetryEvent } from "./core";
import { LegacyAllowedTelemetryEvent } from "./index";
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
    mapEvent(event: LegacyAllowedTelemetryEvent): CoreTelemetryEvent | null;
    private mapOnboardingProtectionAssigned;
    private mapCommandExecution;
    private mapSnapshotCreated;
    private mapExtensionDeactivated;
    private mapRiskDetected;
    private mapWalkthroughStepCompleted;
    private mapSnapBackUsed;
    /**
     * Helper method to safely extract duration from various event types
     */
    private getDurationFromEvent;
}
export declare const telemetryEventMapper: TelemetryEventMapper;
