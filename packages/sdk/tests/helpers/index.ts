import type { Snapshot, SnapshotFilters } from "@snapback/contracts";
import { vi } from "vitest";
import type { StorageAdapter } from "../../src/storage/StorageAdapter";

/**
 * Create a mock storage adapter for testing
 */
export function createMockStorage(): StorageAdapter {
	const storage = new Map<string, Snapshot>();

	return {
		save: vi.fn(async (snapshot: Snapshot) => {
			storage.set(snapshot.id, snapshot);
		}),

		get: vi.fn(async (id: string) => {
			return storage.get(id) || null;
		}),

		list: vi.fn(async (_filters?: SnapshotFilters) => {
			const snapshots = Array.from(storage.values());

			// Note: The actual filtering would depend on how the storage implementation works
			// For now, we'll just return all snapshots

			return snapshots;
		}),

		delete: vi.fn(async (id: string) => {
			storage.delete(id);
		}),

		close: vi.fn(async () => {
			storage.clear();
		}),
	};
}

/**
 * Create a mock HTTP client (ky-compatible)
 */
export function createMockHttp() {
	const mockResponses = new Map<string, any>();

	const http = {
		get: vi.fn((url: string, options?: any) => ({
			json: vi.fn(async () => {
				const key = `GET:${url}:${JSON.stringify(options?.searchParams || {})}`;
				const response = mockResponses.get(key);
				if (response === null) {
					// Simulate 404 error
					const error = new Error("Not found");
					(error as any).response = { status: 404 };
					throw error;
				}
				// If we don't have a specific response for this URL, check if we have a general one
				if (response === undefined) {
					const generalKey = `GET:${url}:`;
					const generalResponse = mockResponses.get(generalKey);
					if (generalResponse !== undefined) {
						return generalResponse;
					}
					return [];
				}
				return response;
			}),
		})),

		post: vi.fn((url: string, options?: any) => ({
			json: vi.fn(async () => {
				// Try to find a specific response for this POST request
				const specificKey = `POST:${url}:${JSON.stringify(options || {})}`;
				const specificResponse = mockResponses.get(specificKey);
				if (specificResponse !== undefined) {
					if (specificResponse === null) {
						// Simulate 404 error
						const error = new Error("Not found");
						(error as any).response = { status: 404 };
						throw error;
					}
					return specificResponse;
				}

				// Fall back to general response
				const key = `POST:${url}:`;
				const response = mockResponses.get(key);
				if (response === null) {
					// Simulate 404 error
					const error = new Error("Not found");
					(error as any).response = { status: 404 };
					throw error;
				}
				// If we don't have a specific response for this URL, return a default
				if (response === undefined) {
					return { success: true };
				}
				return response;
			}),
		})),

		put: vi.fn((url: string, options?: any) => ({
			json: vi.fn(async () => {
				// Try to find a specific response for this PUT request
				const specificKey = `PUT:${url}:${JSON.stringify(options || {})}`;
				const specificResponse = mockResponses.get(specificKey);
				if (specificResponse !== undefined) {
					if (specificResponse === null) {
						// Simulate 404 error
						const error = new Error("Not found");
						(error as any).response = { status: 404 };
						throw error;
					}
					return specificResponse;
				}

				// Fall back to general response
				const key = `PUT:${url}:`;
				const response = mockResponses.get(key);
				if (response === null) {
					// Simulate 404 error
					const error = new Error("Not found");
					(error as any).response = { status: 404 };
					throw error;
				}
				// If we don't have a specific response for this URL, return a default
				if (response === undefined) {
					return { success: true };
				}
				return response;
			}),
		})),

		delete: vi.fn((url: string, options?: any) => ({
			json: vi.fn(async () => {
				const key = `DELETE:${url}:${JSON.stringify(options?.json || {})}`;
				const response = mockResponses.get(key);
				if (response === null) {
					// Simulate 404 error
					const error = new Error("Not found");
					(error as any).response = { status: 404 };
					throw error;
				}
				// If we don't have a specific response for this URL, return a default
				if (response === undefined) {
					return { success: true };
				}
				return response;
			}),
		})),

		// Helper to set mock responses
		setMockResponse: (method: string, url: string, data: any, searchParams?: any) => {
			const key = searchParams ? `${method}:${url}:${JSON.stringify(searchParams)}` : `${method}:${url}:`;
			mockResponses.set(key, data);
		},
	};

	return http;
}

/**
 * Create a mock cache
 */
export function createMockCache() {
	const cache = new Map<string, any>();

	return {
		get: vi.fn((key: string) => cache.get(key)),
		set: vi.fn((key: string, value: any) => cache.set(key, value)),
		has: vi.fn((key: string) => cache.has(key)),
		delete: vi.fn((key: string) => cache.delete(key)),
		clear: vi.fn(() => cache.clear()),
	};
}
