import type { FileInput, ProtectionConfig } from "@snapback-oss/contracts";
import { SnapbackAnalyticsClient, SnapbackClient } from "./client.js";
import { ProtectionManager } from "./protection/ProtectionManager.js";
import { SnapshotManager } from "./snapshot/SnapshotManager.js";
import { LocalStorage } from "./storage/LocalStorage.js";
import { MemoryStorage } from "./storage/MemoryStorage.js";
import type { StorageAdapter } from "./storage/StorageAdapter.js";

// Define the SnapshotFilters interface
export interface SnapshotFilters {
	limit?: number;
	offset?: number;
	protected?: boolean;
	before?: Date;
	after?: Date;
}

export interface SnapbackOptions {
	/**
	 * Storage configuration
	 * Can be a path to SQLite database, StorageAdapter instance, or 'memory' for testing
	 */
	storage?: string | StorageAdapter;

	/**
	 * Protection configuration
	 */
	protection?: ProtectionConfig;

	/**
	 * Cloud API configuration (optional)
	 * If provided, enables cloud sync functionality
	 */
	cloud?: {
		baseUrl: string;
		apiKey: string;
		timeout?: number;
		retries?: number;
	};

	/**
	 * Enable deduplication for local snapshots
	 */
	enableDeduplication?: boolean;

	/**
	 * Auto-protect configuration files
	 */
	autoProtectConfigs?: boolean;
}

/**
 * Unified Snapback SDK entry point
 * Combines local snapshot management with optional cloud sync
 *
 * @example
 * ```typescript
 * // Local-only mode
 * const snapback = new Snapback({
 *   storage: './snapshots.db',
 *   protection: {
 *     patterns: [{ pattern: '**\/*.env', level: 'block' }],
 *     defaultLevel: 'watch',
 *     enabled: true
 *   }
 * });
 *
 * // Cloud-enabled mode
 * const snapback = new Snapback({
 *   storage: './snapshots.db',
 *   cloud: {
 *     baseUrl: 'https://api.snapback.dev',
 *     apiKey: 'your-api-key'
 *   }
 * });
 * ```
 */
export class Snapback {
	private storage: StorageAdapter;
	private snapshotManager: SnapshotManager;
	private protectionManager: ProtectionManager;
	private cloudClient?: SnapbackClient;
	private analyticsClient?: SnapbackAnalyticsClient;

	constructor(options: SnapbackOptions) {
		// Initialize storage
		if (typeof options.storage === "string") {
			if (options.storage === ":memory:") {
				this.storage = new MemoryStorage();
			} else {
				this.storage = new LocalStorage(options.storage);
			}
		} else if (options.storage) {
			this.storage = options.storage;
		} else {
			// Default to in-memory storage for testing
			this.storage = new MemoryStorage();
		}

		// Initialize protection manager
		const protectionConfig: ProtectionConfig = {
			patterns: options.protection?.patterns || [],
			defaultLevel: options.protection?.defaultLevel || "watch",
			enabled: options.protection?.enabled !== false,
			autoProtectConfigs: options.autoProtectConfigs !== false,
		};

		this.protectionManager = new ProtectionManager(protectionConfig);

		// Initialize snapshot manager
		this.snapshotManager = new SnapshotManager(this.storage, {
			enableDeduplication: options.enableDeduplication,
			autoProtect: options.autoProtectConfigs,
		});

		// Initialize cloud client if configured
		if (options.cloud) {
			const sdkConfig = {
				endpoint: options.cloud.baseUrl,
				apiKey: options.cloud.apiKey,
				privacy: {
					hashFilePaths: true,
					anonymizeWorkspace: false,
				},
				cache: {
					enabled: true,
					ttl: {
						analytics: 3600,
					},
				},
				retry: {
					maxRetries: options.cloud.retries || 3,
					backoffMs: options.cloud.timeout || 1000,
				},
			};

			this.cloudClient = new SnapbackClient(sdkConfig);
			this.analyticsClient = new SnapbackAnalyticsClient(sdkConfig);
		}
	}

	/**
	 * Create a snapshot of files
	 * @param files - Files to snapshot
	 * @param options - Snapshot options
	 * @returns Created snapshot
	 */
	async createSnapshot(
		files: Array<{
			path: string;
			content: string;
			action?: "add" | "modify" | "delete";
		}>,
		options?: { description?: string; protected?: boolean },
	) {
		const fileInputs: FileInput[] = files.map((file) => ({
			path: file.path,
			content: file.content,
			action: file.action || "modify",
		}));
		return this.snapshotManager.create(fileInputs, options);
	}

	/**
	 * Save a single file snapshot
	 * @param path - File path
	 * @param content - File content
	 * @param description - Optional description
	 * @returns Created snapshot
	 */
	async save(path: string, content: string, description?: string) {
		return this.snapshotManager.create([{ path, content, action: "modify" }], { description });
	}

	/**
	 * List snapshots with optional filters
	 * @param filters - Filter options
	 * @returns Array of snapshots
	 */
	async listSnapshots(filters?: SnapshotFilters) {
		return this.snapshotManager.list(filters);
	}

	/**
	 * Get a specific snapshot by ID
	 * @param id - Snapshot ID
	 * @returns Snapshot or null if not found
	 */
	async getSnapshot(id: string) {
		return this.snapshotManager.get(id);
	}

	/**
	 * Delete a snapshot by ID
	 * @param id - Snapshot ID
	 */
	async deleteSnapshot(id: string) {
		return this.snapshotManager.delete(id);
	}

	/**
	 * Restore a snapshot
	 * @param id - Snapshot ID
	 * @returns Restore result
	 */
	async restoreSnapshot(id: string) {
		return this.snapshotManager.restore(id);
	}

	/**
	 * Protect a snapshot
	 * @param id - Snapshot ID
	 */
	async protectSnapshot(id: string) {
		return this.snapshotManager.protect(id);
	}

	/**
	 * Unprotect a snapshot
	 * @param id - Snapshot ID
	 */
	async unprotectSnapshot(id: string) {
		return this.snapshotManager.unprotect(id);
	}

	/**
	 * Protect a file path
	 * @param filePath - File path to protect
	 * @param level - Protection level
	 * @param reason - Optional reason
	 */
	protectFile(filePath: string, level: "watch" | "warn" | "block", reason?: string) {
		this.protectionManager.protect(filePath, level, reason);
	}

	/**
	 * Check if a file is protected
	 * @param filePath - File path to check
	 * @returns Protection level or null if not protected
	 */
	getProtectionLevel(filePath: string) {
		return this.protectionManager.getLevel(filePath);
	}

	/**
	 * Close the storage connection
	 */
	async close() {
		if ("close" in this.storage && typeof this.storage.close === "function") {
			await this.storage.close();
		}
	}

	/**
	 * Get the underlying snapshot manager for advanced operations
	 */
	get snapshots() {
		return this.snapshotManager;
	}

	/**
	 * Get the underlying protection manager for advanced operations
	 */
	get protection() {
		return this.protectionManager;
	}

	/**
	 * Get the cloud client if configured
	 */
	get cloud() {
		return this.cloudClient;
	}

	/**
	 * Get the analytics client if configured
	 */
	get analytics() {
		return this.analyticsClient;
	}
}
