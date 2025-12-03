/**
 * Unified Mock Factory for SnapBack SDK Testing
 *
 * Provides consistent, reusable mock builders for all SDK tests.
 * Ensures mock contracts match the SDK interfaces exactly.
 */

import { vi } from "vitest";

/**
 * Mock Storage Adapter Factory
 *
 * Creates a consistent mock storage adapter matching StorageAdapter interface
 * Used across snapshot, cache, and persistence tests
 */
export function createMockStorageAdapter() {
	return {
		save: vi.fn(async () => {}),
		get: vi.fn(async () => null),
		list: vi.fn(async () => []),
		delete: vi.fn(async () => {}),
		close: vi.fn(async () => {}),
		exists: vi.fn(async () => false),
		getByContentHash: vi.fn(async () => null),
	};
}

/**
 * Mock HTTP Client Factory
 *
 * Creates a consistent mock HTTP client for API integration tests
 * Supports GET, POST, PUT, DELETE, and PATCH operations
 */
export function createMockHttpClient() {
	return {
		get: vi.fn(async () => ({ data: {} })),
		post: vi.fn(async () => ({ data: {} })),
		put: vi.fn(async () => ({ data: {} })),
		delete: vi.fn(async () => ({ data: {} })),
		patch: vi.fn(async () => ({ data: {} })),
		request: vi.fn(async () => ({ data: {} })),
	};
}

/**
 * Mock Event Bus Factory
 *
 * Creates a consistent mock event bus for event publishing/subscription tests
 * Supports publish, subscribe, unsubscribe operations
 */
export function createMockEventBus() {
	type EventListener = (...args: unknown[]) => void;
	const listeners = new Map<string, Set<EventListener>>();

	return {
		publish: vi.fn(async (event: string, data?: unknown) => {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				for (const listener of eventListeners) {
					listener(data);
				}
			}
		}),
		subscribe: vi.fn((event: string, listener: EventListener) => {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)?.add(listener);

			return () => {
				listeners.get(event)?.delete(listener);
			};
		}),
		unsubscribe: vi.fn((event: string, listener: EventListener) => {
			listeners.get(event)?.delete(listener);
		}),
		clearListeners: vi.fn((event?: string) => {
			if (event) {
				listeners.delete(event);
			} else {
				listeners.clear();
			}
		}),
		getListeners: vi.fn((event: string) => {
			return Array.from(listeners.get(event) || []);
		}),
	};
}

/**
 * Mock Privacy Validator Factory
 *
 * Creates a consistent mock privacy validator for privacy/redaction tests
 * Validates and redacts sensitive data
 */
export function createMockPrivacyValidator() {
	return {
		validate: vi.fn(() => true),
		redact: vi.fn((content: string) => content),
		isSensitive: vi.fn(() => false),
		getSensitivePatterns: vi.fn(() => []),
	};
}

/**
 * Mock Cache Manager Factory
 *
 * Creates a consistent mock cache for cache integration tests
 * Supports get, set, delete, clear operations with TTL support
 */
export function createMockCacheManager() {
	const cache = new Map<string, { value: unknown; expiresAt?: number }>();

	return {
		get: vi.fn((key: string) => {
			const entry = cache.get(key);
			if (!entry) {
				return undefined;
			}
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				cache.delete(key);
				return undefined;
			}
			return entry.value;
		}),
		set: vi.fn((key: string, value: unknown, ttl?: number) => {
			cache.set(key, {
				value,
				expiresAt: ttl ? Date.now() + ttl : undefined,
			});
		}),
		delete: vi.fn((key: string) => {
			cache.delete(key);
		}),
		clear: vi.fn(() => {
			cache.clear();
		}),
		has: vi.fn((key: string) => {
			return cache.has(key);
		}),
		getSize: vi.fn(() => cache.size),
	};
}

/**
 * Mock Session Manager Factory
 *
 * Creates a consistent mock session manager for session-related tests
 * Manages session lifecycle (create, update, finalize, cleanup)
 */
export function createMockSessionManager() {
	const sessions = new Map<string, unknown>();

	return {
		createSession: vi.fn((id: string, data: unknown) => {
			sessions.set(id, data);
		}),
		getSession: vi.fn((id: string) => {
			return sessions.get(id);
		}),
		updateSession: vi.fn((id: string, data: unknown) => {
			sessions.set(id, data);
		}),
		deleteSession: vi.fn((id: string) => {
			sessions.delete(id);
		}),
		finalizeSession: vi.fn(async () => {}),
		listSessions: vi.fn(() => Array.from(sessions.values())),
		clearSessions: vi.fn(() => {
			sessions.clear();
		}),
	};
}

/**
 * Mock Risk Analyzer Factory
 *
 * Creates a consistent mock risk analyzer for risk detection tests
 * Analyzes content for various risk factors (secrets, mocks, phantom deps)
 */
export function createMockRiskAnalyzer() {
	return {
		analyze: vi.fn(async () => ({ score: 0 })),
		detectSecrets: vi.fn(async () => []),
		detectMocks: vi.fn(async () => []),
		detectPhantomDeps: vi.fn(async () => []),
		getRiskFactors: vi.fn(async () => []),
	};
}

/**
 * Mock Snapshot Repository Factory
 *
 * Creates a consistent mock snapshot repository for data access tests
 * CRUD operations for snapshots with filtering and pagination
 */
export function createMockSnapshotRepository() {
	const snapshots = new Map<string, unknown>();

	return {
		create: vi.fn(async (id: string, data: unknown) => {
			snapshots.set(id, data);
		}),
		read: vi.fn(async (id: string) => {
			return snapshots.get(id) || null;
		}),
		update: vi.fn(async (id: string, data: unknown) => {
			snapshots.set(id, data);
		}),
		delete: vi.fn(async (id: string) => {
			snapshots.delete(id);
		}),
		list: vi.fn(async () => {
			return Array.from(snapshots.values());
		}),
		count: vi.fn(async () => {
			return snapshots.size;
		}),
		clear: vi.fn(() => {
			snapshots.clear();
		}),
	};
}

/**
 * Mock Checkpoint Manager Factory
 *
 * Creates a consistent mock checkpoint manager for checkpoint lifecycle tests
 * Manages checkpoint creation, restoration, and cleanup
 */
export function createMockCheckpointManager() {
	return {
		createCheckpoint: vi.fn(async () => ({ id: `cp-${Math.random().toString(36).slice(2)}` })),
		restoreCheckpoint: vi.fn(async () => ""),
		deleteCheckpoint: vi.fn(async () => {}),
		listCheckpoints: vi.fn(async () => []),
		getCheckpointMetadata: vi.fn(async () => null),
		validateCheckpoint: vi.fn(async () => true),
	};
}

/**
 * Test Factory Bundle
 *
 * Provides all mock factories as a single bundle for convenience
 * Use individual factory functions for more granular control
 */
export const testFactories = {
	createMockStorageAdapter,
	createMockHttpClient,
	createMockEventBus,
	createMockPrivacyValidator,
	createMockCacheManager,
	createMockSessionManager,
	createMockRiskAnalyzer,
	createMockSnapshotRepository,
	createMockCheckpointManager,
};
