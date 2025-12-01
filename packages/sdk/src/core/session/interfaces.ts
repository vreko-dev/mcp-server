/**
 * Platform-agnostic interfaces for SessionCoordinator dependencies
 *
 * These interfaces enable SessionCoordinator to work across multiple platforms
 * (VSCode, CLI, MCP, Web) by abstracting platform-specific implementations.
 */

/**
 * Generic event emitter interface for session events
 */
export interface IEventEmitter<T> {
	/**
	 * Fire an event with the given data
	 * @param data - Event data to emit
	 */
	fire(data: T): void;

	/**
	 * Subscribe to events
	 * @param listener - Function to call when event is fired
	 * @returns Disposable to unsubscribe
	 */
	subscribe(listener: (data: T) => void): IDisposable;

	/**
	 * Dispose the emitter and clean up resources
	 */
	dispose(): void;
}

/**
 * Disposable interface for cleanup
 */
export interface IDisposable {
	dispose(): void;
}

/**
 * Timer service interface for platform-agnostic timeout/interval management
 */
export interface ITimerService {
	/**
	 * Set a timeout
	 * @param callback - Function to call after delay
	 * @param ms - Delay in milliseconds
	 * @returns Timer ID for cancellation
	 */
	setTimeout(callback: () => void, ms: number): string;

	/**
	 * Clear a timeout
	 * @param id - Timer ID from setTimeout
	 */
	clearTimeout(id: string): void;

	/**
	 * Set an interval
	 * @param callback - Function to call repeatedly
	 * @param ms - Interval in milliseconds
	 * @returns Timer ID for cancellation
	 */
	setInterval(callback: () => void, ms: number): string;

	/**
	 * Clear an interval
	 * @param id - Timer ID from setInterval
	 */
	clearInterval(id: string): void;
}

/**
 * Logger interface for platform-agnostic logging
 */
export interface ILogger {
	debug(message: string, data?: unknown): void;
	info(message: string, data?: unknown): void;
	error(message: string, error?: Error, data?: unknown): void;
}

/**
 * Storage interface for session manifests
 */
export interface ISessionStorage {
	/**
	 * Store a session manifest
	 * @param manifest - Session manifest to store
	 */
	storeSessionManifest(manifest: SessionManifest): Promise<void>;

	/**
	 * List all session manifests
	 * @returns Array of session manifests
	 */
	listSessionManifests?(): Promise<SessionManifest[]>;

	/**
	 * Get a session manifest by ID
	 * @param sessionId - Session ID
	 * @returns Session manifest or null if not found
	 */
	getSessionManifest?(sessionId: string): Promise<SessionManifest | null>;
}

/**
 * No-op logger implementation (default)
 */
export class NoOpLogger implements ILogger {
	debug(): void {}
	info(): void {}
	error(): void {}
}

/**
 * Node.js-based timer service implementation
 */
export class NodeTimerService implements ITimerService {
	private timeouts = new Map<string, NodeJS.Timeout>();
	private intervals = new Map<string, NodeJS.Timeout>();
	private nextId = 0;

	setTimeout(callback: () => void, ms: number): string {
		const id = `timeout_${this.nextId++}`;
		const timeout = globalThis.setTimeout(callback, ms);
		this.timeouts.set(id, timeout);
		return id;
	}

	clearTimeout(id: string): void {
		const timeout = this.timeouts.get(id);
		if (timeout) {
			globalThis.clearTimeout(timeout);
			this.timeouts.delete(id);
		}
	}

	setInterval(callback: () => void, ms: number): string {
		const id = `interval_${this.nextId++}`;
		const interval = globalThis.setInterval(callback, ms);
		this.intervals.set(id, interval);
		return id;
	}

	clearInterval(id: string): void {
		const interval = this.intervals.get(id);
		if (interval) {
			globalThis.clearInterval(interval);
			this.intervals.delete(id);
		}
	}

	/**
	 * Dispose all active timers
	 */
	dispose(): void {
		for (const timeout of this.timeouts.values()) {
			globalThis.clearTimeout(timeout);
		}
		for (const interval of this.intervals.values()) {
			globalThis.clearInterval(interval);
		}
		this.timeouts.clear();
		this.intervals.clear();
	}
}

// Import SessionManifest type for storage interface
import type { SessionManifest } from "./types.js";
