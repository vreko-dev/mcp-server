import type { SelectiveSnapshotConfig } from "@snapback/contracts";
import { chunk } from "es-toolkit";
import { type ChangeInfo, type CommitContext, GitIntegration } from "./git-integration";
import { type DetectedThreat, detectThreats } from "./threat-detection";

/**
 * Risk analysis result with standardized 0-10 scoring scale
 *
 * As of Phase 16, all risk scores use 0-10 scale for consistency across SnapBack.
 * This matches SDK RiskAnalyzer and THRESHOLDS configuration.
 */
export interface RiskAnalysisResult {
	/** Risk score on 0-10 scale (0 = no risk, 10 = maximum risk) */
	score: number;
	/** Array of risk factors detected */
	factors: string[];
	/** Security threats detected in code */
	threats: DetectedThreat[];
	/** Velocity of changes (0-1 normalized, for internal use) */
	changeVelocity?: number;
	/** File complexity (0-1 normalized, for internal use) */
	fileComplexity?: number;
}

export interface FileChangeInfo {
	filePath: string;
	lineCount: number;
	content: string;
}

export interface SelectiveCheckpointConfig {
	excludePatterns: string[];
	includePatterns: string[];
}

export class RiskAnalyzer {
	private gitIntegration: GitIntegration;
	private changeHistory: { timestamp: number; fileCount: number }[] = [];
	private maxHistorySize = 100;
	private lastSnapshotTime = 0;
	private snapshotCooldown = 5000; // 5 seconds cooldown
	private selectiveSnapshotConfig: SelectiveSnapshotConfig | null = null;
	// Cache for pattern matching results
	private patternMatchCache: Map<string, boolean> = new Map();
	// Cache for file complexity results
	private complexityCache: Map<string, number> = new Map();

	constructor(cwd?: string) {
		this.gitIntegration = new GitIntegration(cwd);
	}

	/**
	 * Set selective snapshot configuration
	 * @param config Configuration for selective snapshot content
	 */
	setSelectiveSnapshotConfig(config: SelectiveSnapshotConfig): void {
		this.selectiveSnapshotConfig = config;
		// Clear cache when configuration changes
		this.patternMatchCache.clear();
	}

	/**
	 * Analyze risk for a set of file changes
	 * @param fileChanges Array of file change information
	 * @param commitContext Optional Git context
	 * @returns Risk analysis result with score and factors
	 */
	async analyzeFileChanges(
		fileChanges: FileChangeInfo[],
		commitContext?: CommitContext,
	): Promise<RiskAnalysisResult> {
		const threats: DetectedThreat[] = [];
		let totalRiskScore = 0;
		const riskFactors: string[] = [];

		// Filter file changes based on selective snapshot configuration
		const filteredFileChanges = fileChanges.filter((fileChange) =>
			this.isFileIncludedInSnapshot(fileChange.filePath),
		);

		// If no files are included based on configuration, return low risk
		if (filteredFileChanges.length === 0) {
			return {
				score: 0,
				factors: ["No files included in selective snapshot configuration"],
				threats: [],
				changeVelocity: 0,
				fileComplexity: 0,
			};
		}

		// Process files in batches to avoid blocking the event loop
		const batchSize = 10;
		const batches = chunk(filteredFileChanges, batchSize);
		for (const batch of batches) {
			// Analyze each file in the batch for threats
			for (const fileChange of batch) {
				const fileThreats = detectThreats(fileChange.content);
				threats.push(...fileThreats);

				// Add to risk score based on threat severity (convert 0-1 to 0-10 scale)
				for (const threat of fileThreats) {
					totalRiskScore += threat.severity * 10;
					riskFactors.push(`Security threat detected: ${threat.description}`);
				}

				// Analyze file complexity
				const complexity = this.analyzeFileComplexity(fileChange);
				if (complexity > 0.7) {
					totalRiskScore += 3.0; // High complexity adds 3.0 points on 0-10 scale
					riskFactors.push(`High complexity file: ${fileChange.filePath}`);
				}
			}

			// Yield control back to the event loop periodically
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		// Analyze change velocity if we have commit context
		let changeVelocity = 0;
		if (commitContext) {
			changeVelocity = this.analyzeChangeVelocity(commitContext.changes);
			if (changeVelocity > 0.8) {
				totalRiskScore += 5.0; // High velocity adds 5.0 points on 0-10 scale
				riskFactors.push(`High change velocity: ${Math.round(changeVelocity * 100)}% of files changed`);
			}
		}

		// Analyze temporal change velocity (changes over time)
		const temporalVelocity = this.analyzeTemporalVelocity(filteredFileChanges.length);
		if (temporalVelocity > 0.7) {
			totalRiskScore += 4.0; // Temporal velocity adds 4.0 points on 0-10 scale
			riskFactors.push(`High temporal velocity: ${Math.round(temporalVelocity * 100)}% of normal change rate`);
		}

		// Analyze file types for sensitivity
		const sensitiveFiles = this.analyzeSensitiveFiles(filteredFileChanges);
		if (sensitiveFiles.length > 0) {
			totalRiskScore += 4.0 * sensitiveFiles.length; // Each sensitive file adds 4.0 points
			riskFactors.push(`Sensitive files modified: ${sensitiveFiles.join(", ")}`);
		}

		// Detect pattern-based triggers
		const patternTriggers = this.detectPatternTriggers(filteredFileChanges);
		riskFactors.push(...patternTriggers);
		if (patternTriggers.length > 0) {
			totalRiskScore += 3.0 * patternTriggers.length; // Each trigger adds 3.0 points
		}

		// Normalize risk score to 0-10 scale (cap at 10)
		const normalizedScore = Math.min(10, totalRiskScore / (filteredFileChanges.length + 1));

		return {
			score: normalizedScore,
			factors: riskFactors,
			threats: threats,
			changeVelocity: changeVelocity,
			fileComplexity:
				filteredFileChanges.length > 0 ? this.analyzeFileComplexity(filteredFileChanges[0]) : undefined,
		};
	}

	/**
	 * Determine if a file should be included in a snapshot based on configuration
	 * @param filePath Path of the file to check
	 * @returns Boolean indicating whether the file should be included
	 */
	private isFileIncludedInSnapshot(filePath: string): boolean {
		// If no configuration is set, include all files by default
		if (!this.selectiveSnapshotConfig) {
			return true;
		}

		// Check cache first
		const cacheKey = `${filePath}-${JSON.stringify(this.selectiveSnapshotConfig)}`;
		if (this.patternMatchCache.has(cacheKey)) {
			return this.patternMatchCache.get(cacheKey) ?? true;
		}

		// Check exclude patterns first
		if (this.selectiveSnapshotConfig.excludePatterns) {
			for (const pattern of this.selectiveSnapshotConfig.excludePatterns) {
				if (this.matchesPattern(filePath, pattern)) {
					this.patternMatchCache.set(cacheKey, false);
					return false;
				}
			}
		}

		// If include patterns are specified, file must match at least one
		if (this.selectiveSnapshotConfig.includePatterns && this.selectiveSnapshotConfig.includePatterns.length > 0) {
			for (const pattern of this.selectiveSnapshotConfig.includePatterns) {
				if (this.matchesPattern(filePath, pattern)) {
					this.patternMatchCache.set(cacheKey, true);
					return true;
				}
			}
			this.patternMatchCache.set(cacheKey, false);
			return false;
		}

		// If no include patterns are specified, include by default (unless excluded)
		this.patternMatchCache.set(cacheKey, true);
		return true;
	}

	/**
	 * Simple pattern matching function
	 * @param filePath The file path to match
	 * @param pattern The pattern to match against
	 * @returns Boolean indicating whether the file path matches the pattern
	 */
	private matchesPattern(filePath: string, pattern: string): boolean {
		// Handle simple glob patterns
		if (pattern.includes("**")) {
			// Double star pattern (e.g., "src/**")
			const prefix = pattern.split("**")[0];
			return filePath.startsWith(prefix);
		}

		if (pattern.includes("*")) {
			// Single star pattern (e.g., "src/*.ts")
			const regexPattern = pattern
				.replace(/\./g, "\\.") // Escape dots
				.replace(/\*/g, ".*"); // Convert * to .*
			const regex = new RegExp(`^${regexPattern}$`);
			return regex.test(filePath);
		}

		// Exact match or prefix match
		return filePath === pattern || filePath.startsWith(pattern);
	}

	/**
	 * Determine if a snapshot should be created based on risk score and rate limiting
	 * @param riskScore The calculated risk score (0-10 scale)
	 * @returns Boolean indicating whether a snapshot should be created
	 */
	shouldCreateSnapshot(riskScore: number): boolean {
		const now = Date.now();

		// If risk score is high enough (>5.0 on 0-10 scale), check rate limiting
		if (riskScore > 5.0) {
			// Check if enough time has passed since last snapshot
			if (now - this.lastSnapshotTime >= this.snapshotCooldown) {
				this.lastSnapshotTime = now;
				return true;
			}
			return false;
		}

		// For lower risk scores (>3.0), be more conservative with rate limiting
		if (riskScore > 3.0) {
			// Longer cooldown for medium risk
			if (now - this.lastSnapshotTime >= this.snapshotCooldown * 2) {
				this.lastSnapshotTime = now;
				return true;
			}
			return false;
		}

		return false;
	}

	/**
	 * Analyze file complexity based on line count and content patterns
	 * @param fileChange File change information
	 * @returns Complexity score (0-1)
	 */
	private analyzeFileComplexity(fileChange: FileChangeInfo): number {
		// Check cache first
		const cacheKey = `${fileChange.filePath}-${fileChange.lineCount}`;
		if (this.complexityCache.has(cacheKey)) {
			return this.complexityCache.get(cacheKey) ?? 0;
		}

		// Base complexity on line count (normalized to 0-1 scale)
		const lineComplexity = Math.min(1, fileChange.lineCount / 1000);

		// Check for complex code patterns
		let patternComplexity = 0;
		const content = fileChange.content;

		// Count function definitions as complexity indicator
		const functionCount = (content.match(/function\s+\w+|\w+\s*=>|\w+\s*:\s*function/g) || []).length;
		patternComplexity += Math.min(0.3, functionCount * 0.05);

		// Count nested structures
		const nestedCount = (content.match(/[{}]/g) || []).length;
		patternComplexity += Math.min(0.2, nestedCount * 0.01);

		// Count conditional statements
		const conditionCount = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;
		patternComplexity += Math.min(0.2, conditionCount * 0.05);

		// Count complex operations
		const complexOps = (
			content.match(/try\s*{|catch\s*\(|throw\s+new|eval\s*\(|setTimeout\s*\(|setInterval\s*\(/g) || []
		).length;
		patternComplexity += Math.min(0.3, complexOps * 0.1);

		const complexity = Math.min(1, lineComplexity + patternComplexity);

		// Cache the result
		this.complexityCache.set(cacheKey, complexity);

		return complexity;
	}

	/**
	 * Analyze change velocity based on the proportion of files changed
	 * @param changes Change information from Git
	 * @returns Change velocity score (0-1)
	 */
	private analyzeChangeVelocity(changes: ChangeInfo): number {
		const totalChanged = changes.added.length + changes.modified.length + changes.deleted.length;

		// For now, we'll use a simple heuristic
		// In a real implementation, this would compare against historical data
		if (totalChanged > 20) {
			return 1.0;
		}
		if (totalChanged > 10) {
			return 0.8;
		}
		if (totalChanged > 5) {
			return 0.5;
		}
		if (totalChanged > 2) {
			return 0.3;
		}
		return 0.1;
	}

	/**
	 * Identify sensitive files based on file paths and extensions
	 * @param fileChanges Array of file change information
	 * @returns Array of sensitive file paths
	 */
	private analyzeSensitiveFiles(fileChanges: FileChangeInfo[]): string[] {
		const sensitiveFiles: string[] = [];

		for (const fileChange of fileChanges) {
			const filePath = fileChange.filePath.toLowerCase();

			// Check for sensitive file types
			if (
				filePath.endsWith(".env") ||
				filePath.endsWith("config.json") ||
				filePath.endsWith("package.json") ||
				filePath.includes("secret") ||
				filePath.includes("password") ||
				filePath.includes("credential") ||
				filePath.includes("private")
			) {
				sensitiveFiles.push(fileChange.filePath);
			}
		}

		return sensitiveFiles;
	}

	/**
	 * Detect pattern-based triggers for automatic snapshots
	 * @param fileChanges Array of file change information
	 * @returns Array of pattern trigger descriptions
	 */
	private detectPatternTriggers(fileChanges: FileChangeInfo[]): string[] {
		const triggers: string[] = [];

		for (const fileChange of fileChanges) {
			const filePath = fileChange.filePath.toLowerCase();
			const _content = fileChange.content;

			// Check for dependency changes
			if (
				filePath.endsWith("package.json") ||
				filePath.endsWith("package-lock.json") ||
				filePath.endsWith("yarn.lock") ||
				filePath.endsWith("pnpm-lock.yaml")
			) {
				triggers.push("Pattern trigger: Dependency changes detected");
			}

			// Check for build configuration changes
			if (
				filePath.includes("webpack.config") ||
				filePath.includes("vite.config") ||
				filePath.includes("rollup.config") ||
				filePath.includes("gulpfile") ||
				filePath.includes("gruntfile") ||
				filePath.endsWith(".babelrc") ||
				filePath.endsWith("tsconfig.json")
			) {
				triggers.push("Pattern trigger: Build configuration changes detected");
			}

			// Check for database schema changes
			if (
				filePath.endsWith(".sql") ||
				filePath.includes("schema") ||
				filePath.includes("migration") ||
				filePath.includes("prisma")
			) {
				triggers.push("Pattern trigger: Database schema changes detected");
			}

			// Check for environment configuration changes
			if (
				filePath.includes("docker") ||
				filePath.endsWith(".yml") ||
				filePath.endsWith(".yaml") ||
				filePath.includes("kubernetes") ||
				filePath.includes("k8s")
			) {
				triggers.push("Pattern trigger: Environment configuration changes detected");
			}

			// Check for testing configuration changes
			if (
				filePath.includes("jest.config") ||
				filePath.includes("mocha") ||
				filePath.includes("karma") ||
				filePath.includes("cypress") ||
				filePath.includes("playwright")
			) {
				triggers.push("Pattern trigger: Testing configuration changes detected");
			}

			// Check for security configuration changes
			if (
				filePath.includes("oauth") ||
				filePath.includes("auth") ||
				filePath.includes("security") ||
				filePath.includes("permission")
			) {
				triggers.push("Pattern trigger: Security configuration changes detected");
			}
		}

		// Remove duplicates using a more compatible approach
		const uniqueTriggers: string[] = [];
		const seen = new Set<string>();
		for (const trigger of triggers) {
			if (!seen.has(trigger)) {
				seen.add(trigger);
				uniqueTriggers.push(trigger);
			}
		}

		return uniqueTriggers;
	}

	/**
	 * Analyze temporal change velocity based on recent change history
	 * @param fileCount Number of files changed in current operation
	 * @returns Temporal velocity score (0-1)
	 */
	private analyzeTemporalVelocity(fileCount: number): number {
		const now = Date.now();
		const timeWindow = 5 * 60 * 1000; // 5 minutes

		// Add current change to history
		this.changeHistory.push({ timestamp: now, fileCount });

		// Remove old entries outside the time window
		this.changeHistory = this.changeHistory.filter((entry) => now - entry.timestamp <= timeWindow);

		// Limit history size
		if (this.changeHistory.length > this.maxHistorySize) {
			this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
		}

		// Calculate average changes per minute in the time window
		if (this.changeHistory.length < 2) {
			return 0; // Not enough data
		}

		const totalTimeMinutes = (now - this.changeHistory[0].timestamp) / (60 * 1000);
		const totalFiles = this.changeHistory.reduce((sum, entry) => sum + entry.fileCount, 0);
		const avgFilesPerMinute = totalTimeMinutes > 0 ? totalFiles / totalTimeMinutes : 0;

		// Normalize to 0-1 scale (assuming normal rate is 10 files/minute)
		return Math.min(1, avgFilesPerMinute / 10);
	}

	/**
	 * Get Git context for enhanced analysis
	 * @returns Commit context or null if not available
	 */
	async getGitContext(): Promise<CommitContext | null> {
		try {
			return await this.gitIntegration.getCommitContext();
		} catch (error) {
			console.warn("Failed to get Git context for risk analysis:", error);
			return null;
		}
	}

	/**
	 * Clear all caches to free memory
	 */
	clearCaches(): void {
		this.patternMatchCache.clear();
		this.complexityCache.clear();
	}
}
