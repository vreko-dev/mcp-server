/**
 * ConfigStore v2 - Unified Configuration Store
 *
 * Single source of truth for all configuration across surfaces.
 * Handles loading from:
 * - .snapbackrc (project root)
 * - Environment variables (SNAPBACK_CONFIG)
 * - ~/.snapback/config.json (home directory, CLI)
 *
 * Precedence (highest to lowest):
 * 1. .snapbackrc in workspace root
 * 2. Environment variables (SNAPBACK_CONFIG)
 * 3. ~/.snapback/config.json
 * 4. ZERO_CONFIG_DEFAULTS
 */

import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import type { ConfigStoreV2 } from "./schemas";
import { DEFAULT_CONFIG, validateConfig, ZERO_CONFIG_DEFAULTS } from "./schemas";

/**
 * Simple logger - will be replaced with canonical logger
 */
const logger = {
	debug: (msg: string, ctx?: any) => console.debug(`[DEBUG] ${msg}`, ctx),
	info: (msg: string, ctx?: any) => console.log(`[INFO] ${msg}`, ctx),
	warn: (msg: string, ctx?: any) => console.warn(`[WARN] ${msg}`, ctx),
	error: (msg: string, ctx?: any) => console.error(`[ERROR] ${msg}`, ctx),
};

/**
 * Simple error conversion
 */
function toError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}

export type ConfigChangeCallback = (config: ConfigStoreV2) => void;

export interface ConfigStoreV2Options {
	workspaceRoot?: string;
	snapbackrcPath?: string;
	useZeroConfig?: boolean;
	homeDir?: string;
}

/**
 * ConfigStore v2 implementation
 */
export class ConfigStore {
	private static instance: ConfigStore | null = null;
	private workspaceRoot: string;
	private snapbackrcPath: string;
	private homeDir: string;
	private homeConfigPath: string;
	private useZeroConfig: boolean;
	private cache: ConfigStoreV2 | null = null;
	private initialized = false;
	private changeListeners: ConfigChangeCallback[] = [];
	private watcher: fsSync.FSWatcher | null = null;
	private lastWriteTime = 0;

	constructor(options: ConfigStoreV2Options = {}) {
		this.workspaceRoot = options.workspaceRoot || process.cwd();
		this.snapbackrcPath = options.snapbackrcPath || path.join(this.workspaceRoot, ".snapbackrc");
		this.homeDir = options.homeDir || homedir();
		this.homeConfigPath = path.join(this.homeDir, ".snapback", "config.json");
		this.useZeroConfig = options.useZeroConfig !== false;
	}

	/**
	 * Get or create singleton instance
	 */
	static getInstance(options?: ConfigStoreV2Options): ConfigStore {
		if (!ConfigStore.instance) {
			ConfigStore.instance = new ConfigStore(options);
		}
		return ConfigStore.instance;
	}

	/**
	 * Reset singleton for testing
	 */
	static reset(): void {
		if (ConfigStore.instance) {
			ConfigStore.instance.stopWatching();
		}
		ConfigStore.instance = null;
	}

	/**
	 * Initialize config store
	 */
	async initialize(): Promise<ConfigStoreV2> {
		if (this.initialized && this.cache) {
			return this.cache;
		}

		try {
			const homeConfig = await this.loadHomeConfig();
			const envConfig = this.loadEnvConfig();
			const snapbackrcConfig = await this.loadSnapbackrc();

			let merged = this.useZeroConfig ? structuredClone(ZERO_CONFIG_DEFAULTS) : structuredClone(DEFAULT_CONFIG);

			if (homeConfig) {
				merged = this.mergeConfigs(merged, homeConfig);
			}
			if (envConfig) {
				merged = this.mergeConfigs(merged, envConfig);
			}
			if (snapbackrcConfig) {
				merged = this.mergeConfigs(merged, snapbackrcConfig);
			}

			const validation = validateConfig(merged);
			if (!validation.valid) {
				logger.warn("Config validation failed", { errors: validation.errors });
				this.cache = this.useZeroConfig
					? structuredClone(ZERO_CONFIG_DEFAULTS)
					: structuredClone(DEFAULT_CONFIG);
			} else {
				this.cache = validation.data;
			}

			this.initialized = true;
			return this.cache;
		} catch (err) {
			logger.error("Failed to initialize ConfigStore", { error: toError(err).message });
			this.cache = this.useZeroConfig ? structuredClone(ZERO_CONFIG_DEFAULTS) : structuredClone(DEFAULT_CONFIG);
			this.initialized = true;
			return this.cache;
		}
	}

	/**
	 * Get current config
	 */
	getConfig(): ConfigStoreV2 {
		if (!this.initialized || !this.cache) {
			throw new Error("ConfigStore not initialized. Call initialize() first");
		}
		return structuredClone(this.cache);
	}

	/**
	 * Get config value by dot notation path
	 * Example: get<number>("engine.maxDepth") => 2
	 */
	get<T>(path: string): T {
		if (!this.initialized || !this.cache) {
			throw new Error("ConfigStore not initialized. Call initialize() first");
		}

		const keys = path.split(".");
		let current: any = this.cache;

		for (const key of keys) {
			if (current === null || current === undefined) {
				return undefined as T;
			}
			current = current[key];
		}

		return current as T;
	}

	/**
	 * Subscribe to config changes
	 */
	onChange(callback: ConfigChangeCallback): () => void {
		this.changeListeners.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.changeListeners.indexOf(callback);
			if (index > -1) {
				this.changeListeners.splice(index, 1);
			}
		};
	}

	/**
	 * Watch .snapbackrc for changes (hot-reload)
	 */
	watchForChanges(): void {
		if (this.watcher) {
			return; // Already watching
		}

		try {
			this.watcher = fsSync.watch(this.snapbackrcPath, async (eventType) => {
				// Debounce rapid file changes
				const now = Date.now();
				if (now - this.lastWriteTime < 100) {
					return;
				}
				this.lastWriteTime = now;

				if (eventType === "change") {
					try {
						const reloaded = await this.loadSnapbackrc();
						if (reloaded) {
							const merged = this.mergeConfigs(this.cache || DEFAULT_CONFIG, reloaded);
							this.cache = merged;
							this.notifyListeners();
						}
					} catch (err) {
						logger.warn("Failed to reload .snapbackrc on watch", {
							error: toError(err).message,
						});
					}
				}
			});

			logger.debug("Started watching .snapbackrc", {
				file: this.snapbackrcPath,
			});
		} catch (err) {
			logger.warn("Failed to watch .snapbackrc", {
				error: toError(err).message,
			});
		}
	}

	/**
	 * Stop watching for changes
	 */
	stopWatching(): void {
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
			logger.debug("Stopped watching .snapbackrc");
		}
	}

	/**
	 * Notify all listeners of config changes
	 */
	private notifyListeners(): void {
		if (this.cache) {
			for (const listener of this.changeListeners) {
				try {
					listener(structuredClone(this.cache));
				} catch (err) {
					logger.error("Config change listener error", {
						error: toError(err).message,
					});
				}
			}
		}
	}

	/**
	 * Load .snapbackrc from workspace
	 */
	private async loadSnapbackrc(): Promise<ConfigStoreV2 | null> {
		try {
			const content = await fs.readFile(this.snapbackrcPath, "utf-8");
			const data = JSON.parse(content);
			const validation = validateConfig(data);

			if (!validation.valid) {
				logger.warn(".snapbackrc validation failed", { file: this.snapbackrcPath, errors: validation.errors });
				return null;
			}

			logger.debug("Loaded .snapbackrc", { file: this.snapbackrcPath });
			return validation.data;
		} catch (err) {
			const nodeErr = err as NodeJS.ErrnoException;
			if (nodeErr.code === "ENOENT") {
				logger.debug(".snapbackrc not found", { file: this.snapbackrcPath });
				return null;
			}
			logger.warn("Failed to load .snapbackrc", { file: this.snapbackrcPath, error: toError(err).message });
			return null;
		}
	}

	/**
	 * Load config from ~/.snapback/config.json
	 */
	private async loadHomeConfig(): Promise<ConfigStoreV2 | null> {
		try {
			const content = await fs.readFile(this.homeConfigPath, "utf-8");
			const data = JSON.parse(content);
			const validation = validateConfig(data);

			if (!validation.valid) {
				logger.warn("Home config validation failed", { errors: validation.errors });
				return null;
			}

			logger.debug("Loaded home config", { file: this.homeConfigPath });
			return validation.data;
		} catch (err) {
			const nodeErr = err as NodeJS.ErrnoException;
			if (nodeErr.code === "ENOENT") {
				logger.debug("Home config not found", { file: this.homeConfigPath });
				return null;
			}
			logger.warn("Failed to load home config", { error: toError(err).message });
			return null;
		}
	}

	/**
	 * Load config from SNAPBACK_CONFIG environment variable
	 */
	private loadEnvConfig(): ConfigStoreV2 | null {
		const envConfig = process.env.SNAPBACK_CONFIG;
		if (!envConfig) {
			return null;
		}

		try {
			const data = JSON.parse(envConfig);
			const validation = validateConfig(data);

			if (!validation.valid) {
				logger.warn("Environment config validation failed", { errors: validation.errors });
				return null;
			}

			logger.debug("Loaded environment config");
			return validation.data;
		} catch (err) {
			logger.warn("Failed to load environment config", { error: toError(err).message });
			return null;
		}
	}

	/**
	 * Save config to .snapbackrc with atomic write + backup
	 */
	async saveSnapbackrc(config: ConfigStoreV2): Promise<void> {
		try {
			const validation = validateConfig(config);
			if (!validation.valid) {
				throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
			}

			// Create backup if file exists
			try {
				const backupPath = `${this.snapbackrcPath}.backup`;
				await fs.copyFile(this.snapbackrcPath, backupPath);
				logger.debug("Created backup", { file: backupPath });
			} catch (err) {
				const nodeErr = err as NodeJS.ErrnoException;
				if (nodeErr.code !== "ENOENT") {
					logger.warn("Failed to create backup", { error: toError(err).message });
				}
			}

			// Atomic write
			const tmpPath = `${this.snapbackrcPath}.tmp`;
			await fs.writeFile(tmpPath, JSON.stringify(validation.data, null, 2), "utf-8");
			await fs.rename(tmpPath, this.snapbackrcPath);

			this.cache = validation.data;
			this.lastWriteTime = Date.now();
			this.notifyListeners();
			logger.info("Saved config", { file: this.snapbackrcPath });
		} catch (err) {
			logger.error("Failed to save config", { error: toError(err).message });
			throw err;
		}
	}

	/**
	 * Merge configurations (right overrides left)
	 */
	private mergeConfigs(base: ConfigStoreV2, override: Partial<ConfigStoreV2>): ConfigStoreV2 {
		return {
			version: 2,
			protections: this.mergeProtections(base.protections, override.protections || []),
			ignore: override.ignore ?? base.ignore,
			engine: { ...base.engine, ...(override.engine || {}) },
			settings: { ...base.settings, ...(override.settings || {}) },
			policies: { ...base.policies, ...(override.policies || {}) },
		};
	}

	/**
	 * Merge protection rules
	 */
	private mergeProtections(base: any[], override: any[]): any[] {
		const map = new Map<string, any>();
		for (const rule of base) {
			map.set(rule.pattern, rule);
		}
		for (const rule of override) {
			map.set(rule.pattern, rule);
		}
		return Array.from(map.values());
	}
}

/**
 * Singleton instance
 */
let storeInstance: ConfigStore | null = null;

/**
 * Get or create ConfigStore singleton and initialize
 */
export async function getConfigStore(options?: ConfigStoreV2Options): Promise<ConfigStore> {
	if (!storeInstance) {
		storeInstance = new ConfigStore(options);
		await storeInstance.initialize();
	}
	return storeInstance;
}

/**
 * Reset singleton for testing
 */
export function resetConfigStore(): void {
	if (storeInstance) {
		storeInstance.stopWatching();
	}
	storeInstance = null;
}
