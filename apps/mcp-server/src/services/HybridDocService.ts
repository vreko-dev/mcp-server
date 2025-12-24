/**
 * Hybrid Documentation Service - Context7 Replacement
 *
 * Three-layer validation approach:
 * 1. Layer 1: Dependency Analysis (npm registry API - free)
 *    - Peer dependency conflicts
 *    - Engine requirements
 *    - Semver satisfaction
 *
 * 2. Layer 2: Breaking Change Detection (GitHub API - free tier)
 *    - Changelog/release scanning
 *    - .d.ts signature diff
 *    - Keyword pattern matching
 *
 * 3. Layer 3: Semantic Validation (fallback to local/future integration)
 *    - Pattern validation
 *    - Migration guidance (future: custom index)
 *
 * @module HybridDocService
 */

import { logger } from "@snapback/infrastructure";
import type { StorageAdapter } from "@snapback/sdk";
import * as semver from "semver";
import { SemanticPatternValidator } from "./SemanticPatternValidator.js";
import { TypeSignatureAnalyzer, type TypeSignatureDiff } from "./TypeSignatureAnalyzer.js";

// ==================== Type Definitions ====================

/** Semantic patterns result for Layer 3b validation */
export interface SemanticPatterns {
	deprecatedPatterns: Array<{
		pattern: string;
		deprecated: string;
		replacement: string;
		severity: string;
		exampleBefore: string;
		exampleAfter: string;
	}>;
	migrationComplexity: "simple" | "moderate" | "complex";
	estimatedEffort: string;
}

export interface CascadeRisk {
	type: "peer-dependency-conflict" | "engine-mismatch" | "semver-violation";
	package: string;
	current: string;
	required: string;
	severity: "critical" | "high" | "medium" | "low";
	recommendation?: string;
}

export interface BreakingChange {
	version: string;
	hasBreakingChanges: boolean;
	changelog: string;
	keywords: string[];
}

export interface ValidationResult {
	safe: boolean;
	risks: CascadeRisk[];
	breakingChanges: BreakingChange[];
	migrationGuidance: string | null;
	layersExecuted: Array<"dependency-cascade" | "breaking-changes" | "semantic-validation">;
	// NEW: Enhanced semantic validation
	typeSignatureDiff?: TypeSignatureDiff;
	semanticPatterns?: SemanticPatterns;
}

export interface PackageMetadata {
	name: string;
	version: string;
	peerDependencies?: Record<string, string>;
	engines?: {
		node?: string;
		npm?: string;
	};
	repository?: {
		type: string;
		url: string;
	};
	time?: Record<string, string>;
}

export interface GitHubRelease {
	tag_name: string;
	name: string;
	body: string;
	published_at: string;
	prerelease: boolean;
}

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

// ==================== Service Class ====================

export class HybridDocService {
	private npmRegistryUrl: string;
	private githubApiUrl: string;
	private githubToken?: string;
	private cacheTtlSeconds: number;

	// Breaking change detection patterns
	private static readonly BREAKING_PATTERNS = [
		/BREAKING\s+CHANGE/i,
		/\[BREAKING\]/i,
		/⚠️.*breaking/i,
		/removed.*deprecated/i,
		/migration\s+required/i,
		/major\s+version/i,
		/incompatible\s+with/i,
	];

	private typeAnalyzer: TypeSignatureAnalyzer;
	private patternValidator: SemanticPatternValidator;

	constructor(private storage?: StorageAdapter) {
		this.npmRegistryUrl = process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";
		this.githubApiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
		this.githubToken = process.env.GITHUB_TOKEN;
		this.cacheTtlSeconds = Number.parseInt(process.env.HYBRID_DOC_CACHE_TTL || "3600", 10);
		this.typeAnalyzer = new TypeSignatureAnalyzer();
		this.patternValidator = new SemanticPatternValidator();
	}

	/**
	 * Main validation method - orchestrates all 3 layers + semantic analysis
	 */
	async validateRecommendation(
		packageName: string,
		targetVersion: string,
		currentDependencies: Record<string, string>,
		userCode?: string, // Optional: user's code for pattern detection
	): Promise<ValidationResult> {
		const result: ValidationResult = {
			safe: true,
			risks: [],
			breakingChanges: [],
			migrationGuidance: null,
			layersExecuted: [],
		};

		try {
			// Layer 1: Dependency Cascade Detection
			logger.info("HybridDocService: Starting Layer 1 - Dependency Cascade", {
				package: packageName,
				version: targetVersion,
			});

			const cascadeRisks = await this.detectDependencyCascade(packageName, targetVersion, currentDependencies);
			result.risks = cascadeRisks;
			result.layersExecuted.push("dependency-cascade");

			// Layer 2: Breaking Change Detection (only if Layer 1 found issues OR major version change)
			const currentVersion = currentDependencies[packageName];
			const isMajorBump =
				currentVersion && semver.valid(currentVersion) && semver.valid(targetVersion)
					? semver.major(targetVersion) > semver.major(currentVersion)
					: false;

			if (cascadeRisks.length > 0 || isMajorBump || !currentVersion) {
				logger.info("HybridDocService: Starting Layer 2 - Breaking Changes", {
					reason: cascadeRisks.length > 0 ? "cascade-risks" : "major-version-bump",
				});

				const breakingChanges = await this.detectBreakingChanges(packageName, currentVersion, targetVersion);
				result.breakingChanges = breakingChanges;
				result.layersExecuted.push("breaking-changes");

				// Layer 3: Semantic Validation (only if critical issues found)
				const hasCriticalIssues =
					cascadeRisks.some((r) => r.severity === "critical" || r.severity === "high") ||
					breakingChanges.some((b) => b.hasBreakingChanges);

				if (hasCriticalIssues) {
					logger.info("HybridDocService: Starting Layer 3 - Semantic Validation");

					// 3a: Type signature analysis (.d.ts diff)
					const typeSignatureDiff = await this.typeAnalyzer.compareVersions(
						packageName,
						currentVersion || "0.0.0",
						targetVersion,
					);

					if (typeSignatureDiff.removed.length > 0 || typeSignatureDiff.modified.length > 0) {
						result.typeSignatureDiff = typeSignatureDiff;
					}

					// 3b: Semantic pattern validation
					const patternValidation = await this.patternValidator.validateCodePatterns(
						packageName,
						currentVersion || "0.0.0",
						targetVersion,
						userCode,
					);

					if (patternValidation.deprecatedPatterns.length > 0) {
						result.semanticPatterns = {
							deprecatedPatterns: patternValidation.deprecatedPatterns,
							migrationComplexity: patternValidation.migrationComplexity,
							estimatedEffort: patternValidation.estimatedEffort,
						};
					}

					// 3c: Enhanced migration guidance
					result.migrationGuidance = await this.generateEnhancedMigrationGuidance(
						packageName,
						currentVersion,
						targetVersion,
						breakingChanges,
						typeSignatureDiff,
						patternValidation,
					);

					result.layersExecuted.push("semantic-validation");
				}
			}

			// Determine overall safety
			result.safe = result.risks.length === 0 && !result.breakingChanges.some((b) => b.hasBreakingChanges);

			return result;
		} catch (error) {
			logger.error("HybridDocService validation failed", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
			});

			throw error;
		}
	}

	/**
	 * Layer 1: Detect dependency cascade issues using npm registry API
	 */
	async detectDependencyCascade(
		packageName: string,
		version: string,
		currentDeps: Record<string, string>,
	): Promise<CascadeRisk[]> {
		const risks: CascadeRisk[] = [];

		try {
			// Fetch package metadata from npm registry
			const packageInfo = await this.fetchPackageMetadata(packageName, version);

			// Check peer dependencies
			if (packageInfo.peerDependencies) {
				for (const [peer, requiredRange] of Object.entries(packageInfo.peerDependencies)) {
					const currentVersion = currentDeps[peer];

					if (currentVersion) {
						// Clean version for semver (remove ^ ~ etc)
						const cleanCurrent = semver.valid(semver.coerce(currentVersion));
						const cleanRequired = requiredRange;

						if (cleanCurrent && !semver.satisfies(cleanCurrent, cleanRequired)) {
							risks.push({
								type: "peer-dependency-conflict",
								package: peer,
								current: currentVersion,
								required: requiredRange,
								severity: "high",
								recommendation: `Update ${peer} to ${requiredRange} to satisfy ${packageName}@${version}`,
							});
						}
					} else {
						// Peer dependency not installed
						risks.push({
							type: "peer-dependency-conflict",
							package: peer,
							current: "not installed",
							required: requiredRange,
							severity: "medium",
							recommendation: `Install ${peer}@${requiredRange} as required by ${packageName}@${version}`,
						});
					}
				}
			}

			// Check engine requirements (Node.js version)
			if (packageInfo.engines?.node) {
				const currentNodeVersion = process.version;
				if (!semver.satisfies(currentNodeVersion, packageInfo.engines.node)) {
					risks.push({
						type: "engine-mismatch",
						package: "node",
						current: currentNodeVersion,
						required: packageInfo.engines.node,
						severity: "critical",
						recommendation: `Upgrade Node.js to ${packageInfo.engines.node}`,
					});
				}
			}
		} catch (error) {
			logger.warn("Failed to detect dependency cascade", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
			});
		}

		return risks;
	}

	/**
	 * Layer 2: Detect breaking changes using GitHub releases API
	 */
	async detectBreakingChanges(
		packageName: string,
		fromVersion: string | undefined,
		toVersion: string,
	): Promise<BreakingChange[]> {
		const breakingChanges: BreakingChange[] = [];

		try {
			// Get package metadata to find repository URL
			const packageInfo = await this.fetchPackageMetadata(packageName);

			if (!packageInfo.repository?.url) {
				logger.info("No repository URL found for package", { package: packageName });
				return breakingChanges;
			}

			// Parse GitHub repo from URL
			const repoInfo = this.parseGitHubUrl(packageInfo.repository.url);
			if (!repoInfo) {
				logger.info("Not a GitHub repository", { url: packageInfo.repository.url });
				return breakingChanges;
			}

			// Fetch releases from GitHub
			const releases = await this.fetchGitHubReleases(repoInfo.owner, repoInfo.repo);

			// Filter releases between versions
			const relevantReleases = this.filterRelevantReleases(releases, fromVersion, toVersion);

			// Scan for breaking change indicators
			for (const release of relevantReleases) {
				const hasBreaking = HybridDocService.BREAKING_PATTERNS.some((pattern) => pattern.test(release.body));
				const keywords = this.extractKeywords(release.body);

				breakingChanges.push({
					version: release.tag_name.replace(/^v/, ""),
					hasBreakingChanges: hasBreaking,
					changelog: release.body.slice(0, 500), // Truncate for storage
					keywords,
				});
			}
		} catch (error) {
			logger.warn("Failed to detect breaking changes", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
			});
		}

		return breakingChanges;
	}

	/**
	 * Layer 3: Generate migration guidance (local fallback)
	 */
	async generateMigrationGuidance(
		packageName: string,
		fromVersion: string | undefined,
		toVersion: string,
		breakingChanges: BreakingChange[],
	): Promise<string | null> {
		// For now, return structured guidance based on detected changes
		// Future: Could integrate with local documentation index or LLM
		if (breakingChanges.length === 0) {
			return null;
		}

		const guidance = [
			`Migration required for ${packageName}: ${fromVersion || "unknown"} → ${toVersion}`,
			"",
			"Detected changes:",
		];

		for (const change of breakingChanges) {
			if (change.hasBreakingChanges) {
				guidance.push(`- Version ${change.version}: BREAKING CHANGES detected`);
				if (change.keywords.length > 0) {
					guidance.push(`  Keywords: ${change.keywords.join(", ")}`);
				}
			}
		}

		guidance.push("");
		guidance.push("Recommendations:");
		guidance.push("1. Review changelog before upgrading");
		guidance.push("2. Test in development environment");
		guidance.push("3. Update usage patterns if needed");

		return guidance.join("\n");
	}

	/**
	 * Enhanced migration guidance with semantic analysis
	 */
	private async generateEnhancedMigrationGuidance(
		packageName: string,
		fromVersion: string | undefined,
		toVersion: string,
		breakingChanges: BreakingChange[],
		_typeSignatureDiff?: TypeSignatureDiff,
		_patternValidation?: any,
	): Promise<string | null> {
		// For now, return structured guidance based on detected changes
		// Future: Could integrate with local documentation index or LLM
		if (breakingChanges.length === 0) {
			return null;
		}

		const guidance = [
			`Migration required for ${packageName}: ${fromVersion || "unknown"} → ${toVersion}`,
			"",
			"Detected changes:",
		];

		for (const change of breakingChanges) {
			if (change.hasBreakingChanges) {
				guidance.push(`- Version ${change.version}: BREAKING CHANGES detected`);
				if (change.keywords.length > 0) {
					guidance.push(`  Keywords: ${change.keywords.join(", ")}`);
				}
			}
		}

		guidance.push("");
		guidance.push("Recommendations:");
		guidance.push("1. Review changelog before upgrading");
		guidance.push("2. Test in development environment");
		guidance.push("3. Update usage patterns if needed");

		return guidance.join("\n");
	}

	/**
	 * Fetch package metadata from npm registry (with caching)
	 */
	private async fetchPackageMetadata(packageName: string, version?: string): Promise<PackageMetadata> {
		const cacheKey = `npm:metadata:${packageName}:${version || "latest"}`;

		// Check cache first
		const cached = await this.getFromCache<PackageMetadata>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from npm registry
		const url = version
			? `${this.npmRegistryUrl}/${packageName}/${version}`
			: `${this.npmRegistryUrl}/${packageName}/latest`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`npm registry error: ${response.statusText}`);
		}

		const data = (await response.json()) as PackageMetadata;

		// Cache result
		await this.saveToCache(cacheKey, data);

		return data;
	}

	/**
	 * Fetch GitHub releases
	 */
	private async fetchGitHubReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
		const cacheKey = `github:releases:${owner}/${repo}`;

		// Check cache
		const cached = await this.getFromCache<GitHubRelease[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from GitHub
		const headers: Record<string, string> = {
			Accept: "application/vnd.github.v3+json",
		};

		if (this.githubToken) {
			headers.Authorization = `token ${this.githubToken}`;
		}

		const response = await fetch(`${this.githubApiUrl}/repos/${owner}/${repo}/releases`, {
			headers,
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.statusText}`);
		}

		const releases = (await response.json()) as GitHubRelease[];

		// Cache result (shorter TTL for releases)
		await this.saveToCache(cacheKey, releases, this.cacheTtlSeconds / 2);

		return releases;
	}

	/**
	 * Parse GitHub URL to extract owner/repo
	 */
	private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
		// Handle various GitHub URL formats
		const patterns = [/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/, /github\.com\/([^/]+)\/([^/]+)/];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) {
				return {
					owner: match[1],
					repo: match[2].replace(/\.git$/, ""),
				};
			}
		}

		return null;
	}

	/**
	 * Filter releases between version ranges
	 */
	private filterRelevantReleases(
		releases: GitHubRelease[],
		fromVersion: string | undefined,
		toVersion: string,
	): GitHubRelease[] {
		return releases.filter((release) => {
			const releaseVersion = release.tag_name.replace(/^v/, "");

			// Skip pre-releases
			if (release.prerelease) {
				return false;
			}

			// Check version is valid
			const cleanRelease = semver.valid(semver.coerce(releaseVersion));
			const cleanTo = semver.valid(semver.coerce(toVersion));

			if (!cleanRelease || !cleanTo) {
				return false;
			}

			// Must be <= target version
			if (semver.gt(cleanRelease, cleanTo)) {
				return false;
			}

			// If we have a from version, must be > from
			if (fromVersion) {
				const cleanFrom = semver.valid(semver.coerce(fromVersion));
				if (cleanFrom && semver.lte(cleanRelease, cleanFrom)) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Extract keywords from changelog text
	 */
	private extractKeywords(text: string): string[] {
		const keywords: Set<string> = new Set();

		// Common breaking change keywords
		const patterns = [
			/removed?\s+([a-z]+)/gi,
			/deprecated?\s+([a-z]+)/gi,
			/breaking:\s+([^.\n]+)/gi,
			/migration:\s+([^.\n]+)/gi,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(text)) !== null) {
				keywords.add(match[1].toLowerCase().trim());
			}
		}

		return Array.from(keywords).slice(0, 10); // Limit to 10 keywords
	}

	// ==================== Cache Methods ====================

	/**
	 * Get value from cache
	 */
	private async getFromCache<T>(key: string): Promise<T | null> {
		if (!this.storage) {
			return null;
		}

		try {
			const cached = await this.storage.get(key);

			if (!cached?.fileContents?.data) {
				return null;
			}

			const entry: CacheEntry<T> = JSON.parse(cached.fileContents.data);

			// Check expiration
			if (entry.expiresAt < Date.now()) {
				await this.storage.delete(key);
				return null;
			}

			return entry.data;
		} catch (error) {
			logger.warn("Cache retrieval failed", { key, error });
			return null;
		}
	}

	/**
	 * Save value to cache
	 */
	private async saveToCache<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
		if (!this.storage) {
			return;
		}

		const ttl = (ttlSeconds || this.cacheTtlSeconds) * 1000;

		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			expiresAt: Date.now() + ttl,
		};

		try {
			await this.storage.save({
				id: key,
				timestamp: Date.now(),
				meta: {
					cacheType: "hybrid-doc",
					createdAt: Date.now(),
				},
				files: [],
				fileContents: {
					data: JSON.stringify(entry),
				},
			});
		} catch (error) {
			logger.warn("Cache save failed", { key, error });
		}
	}
}
