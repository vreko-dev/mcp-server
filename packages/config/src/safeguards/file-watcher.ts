/**
 * Safeguard 2: Chokidar File Watcher
 *
 * Per TDD_CORE.md: Prevents file watcher crashes and race conditions
 * Uses Chokidar library with stability thresholds and resource limits
 * Reference: 30M+ repos use Chokidar; native race condition handling
 */

/**
 * File watcher configuration
 */
export interface WatcherConfig {
	filePath: string;
	debounceMs?: number;
	maxListeners?: number;
}

/**
 * Watch event callback
 */
export type WatchCallback = (path: string, eventType: "change" | "error") => Promise<void>;

/**
 * Configuration file watcher using Chokidar
 * Handles:
 * - Atomic writes (stabilityThreshold: 200ms)
 * - Race conditions (native debouncing)
 * - Resource limits (maxListeners: 10)
 */
export class ConfigWatcher {
	private watcher: any = null; // FSWatcher from chokidar
	private debounceTimer: NodeJS.Timeout | null = null;
	private debounceMs = 300;
	private onChange: WatchCallback | null = null;
	private isWatching = false;

	constructor(config?: WatcherConfig) {
		if (config?.debounceMs) {
			this.debounceMs = config.debounceMs;
		}
	}

	/**
	 * Start watching a file for changes
	 * Strategy: Use Chokidar with awaitWriteFinish to handle atomic writes
	 */
	async startWatching(filePath: string, callback: WatchCallback): Promise<{ success: boolean; error?: Error }> {
		try {
			if (this.isWatching) {
				return { success: false, error: new Error("Watcher already active") };
			}

			// Dynamic import to handle optional chokidar dependency
			let chokidar: any;
			try {
				chokidar = await import("chokidar");
			} catch (_error) {
				return {
					success: false,
					error: new Error("Chokidar not installed. Run: pnpm add chokidar --filter @snapback/config"),
				};
			}

			this.onChange = callback;

			// Initialize watcher with stability thresholds
			this.watcher = chokidar.watch(filePath, {
				persistent: true,
				awaitWriteFinish: {
					stabilityThreshold: 200, // Wait 200ms for write to finish
					pollInterval: 100,
				},
				depth: 0, // Only watch this file, not directory contents
				ignored: /(^|[/\\])\./, // Ignore dotfiles
				usePolling: false, // Use native fs.watch (more efficient)
				maxListeners: 10, // Limit event listeners
			});

			// Handle file change events
			this.watcher.on("change", (path: string) => {
				this.handleFileChange(path);
			});

			// Handle errors
			this.watcher.on("error", (error: Error) => {
				console.error("[ConfigWatcher] Error:", error.message);
				if (this.onChange) {
					this.onChange(filePath, "error").catch((err) => {
						console.error("[ConfigWatcher] Callback error:", err);
					});
				}
			});

			this.isWatching = true;
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Handle file change with debouncing to prevent multiple triggers
	 */
	private handleFileChange(path: string): void {
		// Clear previous debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// Debounce the callback
		this.debounceTimer = setTimeout(() => {
			if (this.onChange) {
				this.onChange(path, "change").catch((err) => {
					console.error("[ConfigWatcher] Callback error:", err);
				});
			}
		}, this.debounceMs);
	}

	/**
	 * Stop watching and cleanup
	 */
	async stopWatching(): Promise<void> {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		if (this.watcher) {
			await this.watcher.close();
			this.watcher = null;
		}

		this.isWatching = false;
		this.onChange = null;
	}

	/**
	 * Check if watcher is currently active
	 */
	isActive(): boolean {
		return this.isWatching;
	}
}

/**
 * Resource manager for file watchers
 * Prevents EMFILE errors by limiting concurrent watchers
 */
export class WatcherResourceManager {
	private activeWatchers = 0;
	private readonly maxWatchers = 50; // System limit varies; 50 is safe
	private readonly emfileThreshold = 40; // Alert at 80% capacity

	/**
	 * Check if a new watcher can be started
	 */
	canStartWatcher(): boolean {
		return this.activeWatchers < this.maxWatchers;
	}

	/**
	 * Register a new watcher (call after starting)
	 */
	registerWatcher(): { success: boolean; error?: Error } {
		if (!this.canStartWatcher()) {
			return {
				success: false,
				error: new Error(`Max watchers (${this.maxWatchers}) exceeded. Close some watchers first.`),
			};
		}

		this.activeWatchers++;

		// Warn if approaching capacity
		if (this.activeWatchers >= this.emfileThreshold) {
			console.warn(`[WatcherResourceManager] Near capacity: ${this.activeWatchers}/${this.maxWatchers}`);
		}

		return { success: true };
	}

	/**
	 * Unregister a watcher (call after stopping)
	 */
	unregisterWatcher(): void {
		if (this.activeWatchers > 0) {
			this.activeWatchers--;
		}
	}

	/**
	 * Get current health metrics
	 */
	getWatcherHealth(): { active: number; max: number; capacity: number } {
		return {
			active: this.activeWatchers,
			max: this.maxWatchers,
			capacity: (this.activeWatchers / this.maxWatchers) * 100,
		};
	}
}
