#!/usr/bin/env node
import { AllowedTelemetryEvent } from "./events";
import { CoreTelemetryEventV1 } from "./events.v1";
export { migrateLegacyEventsToFile, migrateLegacyEventsToArray };
/**
 * Migrates legacy events from an input file to core events in an output file
 * @param inputFile Path to JSON file containing legacy events array
 * @param outputFile Path to write converted core events
 */
declare function migrateLegacyEventsToFile(inputFile: string, outputFile: string): Promise<void>;
/**
 * Migrates legacy events to core events and returns the result
 * @param legacyEvents Array of legacy events to convert
 * @returns Array of converted core events
 */
declare function migrateLegacyEventsToArray(legacyEvents: AllowedTelemetryEvent[]): CoreTelemetryEventV1[];
