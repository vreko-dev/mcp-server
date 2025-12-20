/**
 * Config Store
 *
 * Loads and caches configuration from context files.
 * Provides static context for Anthropic prompt caching.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { CacheableContext, ResolvedConfig } from "../types/config.js";

/**
 * Config Store for loading architecture, constraints, and patterns
 */
export class ConfigStore {
	private config: ResolvedConfig;
	private cache: {
		architecture?: string;
		constraints?: string;
		patterns?: string;
		timestamp?: string;
	} = {};

	constructor(config: ResolvedConfig) {
		this.config = config;
	}

	/**
	 * Get the root directory for intelligence data
	 */
	get rootDir(): string {
		return this.config.rootDir;
	}

	/**
	 * Resolve a path relative to rootDir
	 */
	resolvePath(relativePath: string): string {
		return path.join(this.config.rootDir, relativePath);
	}

	/**
	 * Load architecture documentation
	 */
	loadArchitecture(): string {
		if (this.cache.architecture) {
			return this.cache.architecture;
		}

		const archPath = this.resolvePath("ARCHITECTURE.md");
		if (fs.existsSync(archPath)) {
			this.cache.architecture = fs.readFileSync(archPath, "utf-8");
		} else {
			this.cache.architecture = "";
		}
		return this.cache.architecture;
	}

	/**
	 * Load constraints/rules
	 */
	loadConstraints(): string {
		if (this.cache.constraints) {
			return this.cache.constraints;
		}

		const constraintsPath = this.resolvePath(this.config.constraintsFile);
		if (fs.existsSync(constraintsPath)) {
			this.cache.constraints = fs.readFileSync(constraintsPath, "utf-8");
		} else {
			this.cache.constraints = "";
		}
		return this.cache.constraints;
	}

	/**
	 * Load codebase patterns
	 */
	loadPatterns(): string {
		if (this.cache.patterns) {
			return this.cache.patterns;
		}

		const patternsPath = this.resolvePath(path.join(this.config.patternsDir, "codebase-patterns.md"));
		if (fs.existsSync(patternsPath)) {
			this.cache.patterns = fs.readFileSync(patternsPath, "utf-8");
		} else {
			this.cache.patterns = "";
		}
		return this.cache.patterns;
	}

	/**
	 * Load any context file by name
	 */
	loadContextFile(filename: string): string {
		const filePath = this.resolvePath(filename);
		if (fs.existsSync(filePath)) {
			return fs.readFileSync(filePath, "utf-8");
		}
		return "";
	}

	/**
	 * Get static context suitable for prompt caching
	 * Content changes rarely - cache for 5+ minutes
	 */
	getStaticContext(): CacheableContext {
		return {
			architecture: this.loadArchitecture(),
			constraints: this.loadConstraints(),
			patterns: this.loadPatterns(),
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Clear the cache (for testing or after file changes)
	 */
	clearCache(): void {
		this.cache = {};
	}

	/**
	 * Check if a context file exists
	 */
	contextFileExists(filename: string): boolean {
		return fs.existsSync(this.resolvePath(filename));
	}

	/**
	 * List all context files that exist
	 */
	listAvailableContextFiles(): string[] {
		return this.config.contextFiles.filter((f) => this.contextFileExists(f));
	}
}
