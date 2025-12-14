/**
 * Enhanced Test Helpers
 *
 * Advanced mocking utilities for external services and dependencies.
 * Provides realistic mock implementations for PostHog, Stripe, databases, etc.
 *
 * @module enhanced-test-helpers
 * @see Design: .qoder/quests/orpc-test-infrastructure.md
 */

import { vi, type MockInstance } from "vitest";

// ============================================================================
// External Service Mock Types
// ============================================================================

/**
 * Mock PostHog telemetry service
 */
export interface MockPostHog {
	capture: MockInstance;
	flush: MockInstance;
	shutdown: MockInstance;
	shutdownAsync: MockInstance;
}

/**
 * Mock Stripe payment service
 */
export interface MockStripe {
	customers: {
		create: MockInstance;
		retrieve: MockInstance;
		update: MockInstance;
	};
	subscriptions: {
		create: MockInstance;
		retrieve: MockInstance;
		update: MockInstance;
		cancel: MockInstance;
	};
}

/**
 * Mock database client
 */
export interface MockDatabase {
	query: MockInstance;
	execute: MockInstance;
	transaction: MockInstance;
}

/**
 * Mock Redis cache
 */
export interface MockRedis {
	get: MockInstance;
	set: MockInstance;
	del: MockInstance;
	expire: MockInstance;
}

/**
 * Mock email service
 */
export interface MockEmailService {
	send: MockInstance;
	sendBatch: MockInstance;
}

/**
 * Collection of all mock external services
 */
export interface MockExternalServices {
	postHog: MockPostHog;
	stripe: MockStripe;
	database: MockDatabase;
	redis: MockRedis;
	email: MockEmailService;
}

// ============================================================================
// Service Factory
// ============================================================================

/**
 * Create mock implementations of external services
 *
 * Provides Vitest mock functions for all external dependencies with
 * realistic default behaviors. Mocks automatically reset between tests
 * when using Vitest's beforeEach/afterEach hooks.
 *
 * @returns Object containing all service mocks
 *
 * @example
 * ```typescript
 * const mocks = createMockExternalServices();
 *
 * // Configure PostHog
 * mocks.postHog.capture.mockResolvedValue(undefined);
 *
 * // Configure Stripe
 * mocks.stripe.customers.create.mockResolvedValue({
 *   id: 'cus_test123',
 *   email: 'test@example.com'
 * });
 *
 * // Use in tests
 * await telemetryService.track('event', { data });
 * expect(mocks.postHog.capture).toHaveBeenCalledWith({
 *   event: 'event',
 *   properties: { data }
 * });
 * ```
 */
export function createMockExternalServices(): MockExternalServices {
	return {
		postHog: createMockPostHog(),
		stripe: createMockStripe(),
		database: createMockDatabase(),
		redis: createMockRedis(),
		email: createMockEmailService(),
	};
}

// ============================================================================
// Individual Service Mocks
// ============================================================================

/**
 * Create mock PostHog telemetry service
 */
function createMockPostHog(): MockPostHog {
	return {
		capture: vi.fn().mockResolvedValue(undefined),
		flush: vi.fn().mockResolvedValue(undefined),
		shutdown: vi.fn().mockResolvedValue(undefined),
		shutdownAsync: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Create mock Stripe payment service
 */
function createMockStripe(): MockStripe {
	return {
		customers: {
			create: vi.fn().mockResolvedValue({
				id: "cus_test_123456",
				email: "test@example.com",
				created: Math.floor(Date.now() / 1000),
			}),
			retrieve: vi.fn().mockResolvedValue({
				id: "cus_test_123456",
				email: "test@example.com",
			}),
			update: vi.fn().mockResolvedValue({
				id: "cus_test_123456",
				email: "updated@example.com",
			}),
		},
		subscriptions: {
			create: vi.fn().mockResolvedValue({
				id: "sub_test_123456",
				customer: "cus_test_123456",
				status: "active",
			}),
			retrieve: vi.fn().mockResolvedValue({
				id: "sub_test_123456",
				status: "active",
			}),
			update: vi.fn().mockResolvedValue({
				id: "sub_test_123456",
				status: "active",
			}),
			cancel: vi.fn().mockResolvedValue({
				id: "sub_test_123456",
				status: "canceled",
			}),
		},
	};
}

/**
 * Create mock database client
 */
function createMockDatabase(): MockDatabase {
	return {
		query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
		execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
		transaction: vi.fn().mockImplementation(async (callback) => {
			return callback({
				query: vi.fn().mockResolvedValue({ rows: [] }),
				execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
			});
		}),
	};
}

/**
 * Create mock Redis cache
 */
function createMockRedis(): MockRedis {
	const cache = new Map<string, string>();

	return {
		get: vi.fn().mockImplementation((key: string) => {
			return Promise.resolve(cache.get(key) ?? null);
		}),
		set: vi.fn().mockImplementation((key: string, value: string) => {
			cache.set(key, value);
			return Promise.resolve("OK");
		}),
		del: vi.fn().mockImplementation((key: string) => {
			cache.delete(key);
			return Promise.resolve(1);
		}),
		expire: vi.fn().mockResolvedValue(1),
	};
}

/**
 * Create mock email service
 */
function createMockEmailService(): MockEmailService {
	return {
		send: vi.fn().mockResolvedValue({
			messageId: "test-message-id",
			accepted: ["test@example.com"],
			rejected: [],
		}),
		sendBatch: vi.fn().mockResolvedValue({
			messageIds: ["test-message-id-1", "test-message-id-2"],
			accepted: ["test1@example.com", "test2@example.com"],
			rejected: [],
		}),
	};
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Reset all mocks to their initial state
 *
 * Call this in beforeEach to ensure clean state between tests.
 *
 * @param services - Mock services to reset
 *
 * @example
 * ```typescript
 * let mocks: MockExternalServices;
 *
 * beforeEach(() => {
 *   mocks = createMockExternalServices();
 * });
 *
 * afterEach(() => {
 *   resetMockServices(mocks);
 * });
 * ```
 */
export function resetMockServices(services: MockExternalServices): void {
	// Reset PostHog
	services.postHog.capture.mockClear();
	services.postHog.flush.mockClear();
	services.postHog.shutdown.mockClear();
	services.postHog.shutdownAsync.mockClear();

	// Reset Stripe
	services.stripe.customers.create.mockClear();
	services.stripe.customers.retrieve.mockClear();
	services.stripe.customers.update.mockClear();
	services.stripe.subscriptions.create.mockClear();
	services.stripe.subscriptions.retrieve.mockClear();
	services.stripe.subscriptions.update.mockClear();
	services.stripe.subscriptions.cancel.mockClear();

	// Reset Database
	services.database.query.mockClear();
	services.database.execute.mockClear();
	services.database.transaction.mockClear();

	// Reset Redis
	services.redis.get.mockClear();
	services.redis.set.mockClear();
	services.redis.del.mockClear();
	services.redis.expire.mockClear();

	// Reset Email
	services.email.send.mockClear();
	services.email.sendBatch.mockClear();
}
