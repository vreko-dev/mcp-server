/**
 * Test Utilities for Analytics Package
 *
 * Mock client and helpers for testing analytics integrations.
 */

import type { EventPropertiesMap } from "../core/events.js";
import type { AnalyticsClient, GroupProperties, UserTraits } from "../core/types.js";

// ============================================================================
// MOCK ANALYTICS CLIENT
// ============================================================================

export interface TrackedEvent {
	event: string;
	properties: any;
	timestamp: Date;
}

export interface IdentifyCall {
	userId: string;
	traits?: UserTraits;
	timestamp: Date;
}

export interface AliasCall {
	userId: string;
	previousId: string;
	timestamp: Date;
}

export interface GroupCall {
	groupType: string;
	groupId: string;
	properties?: GroupProperties;
	timestamp: Date;
}

/**
 * Mock Analytics Client for Testing
 *
 * Records all analytics calls in memory for assertion in tests.
 */
export class MockAnalyticsClient implements AnalyticsClient {
	public events: TrackedEvent[] = [];
	public identifies: IdentifyCall[] = [];
	public aliases: AliasCall[] = [];
	public groups: GroupCall[] = [];
	public featureFlags: Record<string, boolean> = {};
	public shutdownCalled = false;

	track<E extends keyof EventPropertiesMap>(event: E, properties: EventPropertiesMap[E]): void {
		this.events.push({
			event: event as string,
			properties,
			timestamp: new Date(),
		});
	}

	identify(userId: string, traits?: UserTraits): void {
		this.identifies.push({
			userId,
			traits,
			timestamp: new Date(),
		});
	}

	alias(userId: string, previousId: string): void {
		this.aliases.push({
			userId,
			previousId,
			timestamp: new Date(),
		});
	}

	setGroup(groupType: string, groupId: string, properties?: GroupProperties): void {
		this.groups.push({
			groupType,
			groupId,
			properties,
			timestamp: new Date(),
		});
	}

	isFeatureEnabled(flag: string): boolean {
		return this.featureFlags[flag] ?? false;
	}

	onFeatureFlag(_flag: string, _callback: (value: any) => void): void {
		// Mock implementation
	}

	async shutdown(): Promise<void> {
		this.shutdownCalled = true;
	}

	// ===== Test Helper Methods =====

	/**
	 * Clear all recorded calls
	 */
	clear(): void {
		this.events = [];
		this.identifies = [];
		this.aliases = [];
		this.groups = [];
		this.featureFlags = {};
		this.shutdownCalled = false;
	}

	/**
	 * Get all events of a specific type
	 */
	getEvents(eventName: string): TrackedEvent[] {
		return this.events.filter((e) => e.event === eventName);
	}

	/**
	 * Get the last tracked event
	 */
	getLastEvent(): TrackedEvent | undefined {
		return this.events[this.events.length - 1];
	}

	/**
	 * Get the last identify call
	 */
	getLastIdentify(): IdentifyCall | undefined {
		return this.identifies[this.identifies.length - 1];
	}

	/**
	 * Set a feature flag value for testing
	 */
	setFeatureFlag(flag: string, value: boolean): void {
		this.featureFlags[flag] = value;
	}

	/**
	 * Assert that an event was tracked
	 */
	assertEventTracked(eventName: string): void {
		const found = this.events.some((e) => e.event === eventName);
		if (!found) {
			throw new Error(`Expected event "${eventName}" to be tracked, but it was not.`);
		}
	}

	/**
	 * Assert that shutdown was called
	 */
	assertShutdownCalled(): void {
		if (!this.shutdownCalled) {
			throw new Error("Expected shutdown() to be called, but it was not.");
		}
	}
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock analytics client for testing
 */
export function createMockAnalytics(): MockAnalyticsClient {
	return new MockAnalyticsClient();
}

/**
 * Wait for a short time (useful for async testing)
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create test event properties with minimal required fields
 */
export function createTestEventProperties<E extends keyof EventPropertiesMap>(
	event: E,
	overrides?: Partial<EventPropertiesMap[E]>,
): EventPropertiesMap[E] {
	// Default minimal properties for testing
	const defaults: Record<string, any> = {
		// Add sensible defaults for each event type
		// This will be expanded as needed
	};

	return {
		...defaults[event as string],
		...overrides,
	} as EventPropertiesMap[E];
}
