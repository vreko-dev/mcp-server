/**
 * Mock implementations for SDK testing
 */
import { vi } from "vitest";

/**
 * Mock storage adapter
 */
export function createMockStorage() {
	const store = new Map<string, any>();

	return {
		save: vi.fn(async (snapshot) => {
			store.set(snapshot.id, snapshot);
		}),
		get: vi.fn(async (id) => store.get(id) || null),
		list: vi.fn(async () => Array.from(store.values())),
		delete: vi.fn(async (id) => {
			store.delete(id);
		}),
		close: vi.fn(async () => {
			store.clear();
		}),
		getByContentHash: vi.fn(async (hash) => {
			for (const snapshot of store.values()) {
				if (snapshot.contentHash === hash) {
					return snapshot;
				}
			}
			return null;
		}),
	};
}

/**
 * Mock HTTP client
 */
export function createMockHttpClient() {
	return {
		get: vi.fn(async () => ({ data: {} })),
		post: vi.fn(async () => ({ data: {} })),
		put: vi.fn(async () => ({ data: {} })),
		delete: vi.fn(async () => ({ data: {} })),
	};
}

/**
 * Mock event bus
 */
export function createMockEventBus() {
	type EventListener = (...args: any[]) => void;
	const listeners = new Map<string, Set<EventListener>>();

	return {
		emit: vi.fn((event: string, data: any) => {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				for (const listener of eventListeners) {
					listener(data);
				}
			}
		}),
		on: vi.fn((event: string, listener: EventListener) => {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)?.add(listener);
		}),
		off: vi.fn((event: string, listener: EventListener) => {
			listeners.get(event)?.delete(listener);
		}),
		removeAllListeners: vi.fn(() => {
			listeners.clear();
		}),
	};
}

/**
 * Mock file system operations
 */
export function createMockFileSystem() {
	const files = new Map<string, string>();

	return {
		readFile: vi.fn(async (path: string) => {
			const content = files.get(path);
			if (!content) {
				throw new Error(`ENOENT: no such file or directory, open '${path}'`);
			}
			return content;
		}),
		writeFile: vi.fn(async (path: string, content: string) => {
			files.set(path, content);
		}),
		exists: vi.fn(async (path: string) => files.has(path)),
		unlink: vi.fn(async (path: string) => {
			files.delete(path);
		}),
		readdir: vi.fn(async () => Array.from(files.keys())),
	};
}

/**
 * Mock logger
 */
export function createMockLogger() {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
}

/**
 * Reset all mocks
 */
export function resetAllMocks(...mocks: any[]) {
	for (const mock of mocks) {
		if (mock && typeof mock === "object") {
			for (const key of Object.keys(mock)) {
				if (typeof mock[key]?.mockReset === "function") {
					mock[key].mockReset();
				}
			}
		}
	}
}
