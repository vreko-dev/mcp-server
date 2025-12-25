/**
 * Knowledge Base Types
 *
 * Type definitions for framework configurations, pattern expectations,
 * and workspace fingerprinting.
 *
 * @module knowledge/types
 */

// =============================================================================
// FRAMEWORK CONFIGURATION
// =============================================================================

/**
 * Framework-specific configuration for pattern detection and gap analysis
 */
export interface FrameworkConfig {
	/** Unique framework identifier */
	id: FrameworkId;
	/** Human-readable name */
	name: string;
	/** Framework category */
	category: FrameworkCategory;
	/** Files that indicate this framework is in use */
	indicators: FrameworkIndicator[];
	/** Expected patterns for this framework */
	expectedPatterns: ExpectedPattern[];
	/** Risk zones - areas that need extra attention */
	riskZones: RiskZone[];
	/** Context files to look for */
	contextFiles: ContextFileConfig[];
	/** Recommended .llm-context structure */
	recommendedStructure: RecommendedStructure;
}

export type FrameworkId =
	| "nextjs"
	| "react-vite"
	| "express"
	| "nestjs"
	| "astro"
	| "remix"
	| "nuxt"
	| "sveltekit"
	| "hono"
	| "fastify"
	| "unknown";

export type FrameworkCategory = "fullstack" | "frontend" | "backend" | "static" | "hybrid";

// =============================================================================
// FRAMEWORK INDICATORS
// =============================================================================

export interface FrameworkIndicator {
	/** Type of indicator to check */
	type: "dependency" | "file" | "config" | "script";
	/** What to look for */
	pattern: string;
	/** How strongly this indicates the framework (0-1) */
	weight: number;
	/** Optional version extraction pattern */
	versionPattern?: string;
}

// =============================================================================
// EXPECTED PATTERNS
// =============================================================================

export interface ExpectedPattern {
	/** Pattern identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** What this pattern does */
	description: string;
	/** Pattern category */
	category: PatternCategory;
	/** How to detect this pattern */
	detection: PatternDetection;
	/** Importance level */
	importance: "critical" | "recommended" | "optional";
	/** Documentation link */
	docs?: string;
}

export type PatternCategory =
	| "error-handling"
	| "data-fetching"
	| "routing"
	| "state-management"
	| "authentication"
	| "validation"
	| "testing"
	| "security"
	| "performance"
	| "logging"
	| "configuration";

export interface PatternDetection {
	/** Detection method */
	method: "ast" | "file-exists" | "content-match" | "dependency";
	/** Pattern to look for (varies by method) */
	pattern: string;
	/** Files to search in (glob patterns) */
	files?: string[];
	/** Additional context for detection */
	context?: Record<string, unknown>;
}

// =============================================================================
// RISK ZONES
// =============================================================================

export interface RiskZone {
	/** Zone identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Why this zone is risky */
	reason: string;
	/** File patterns in this zone */
	patterns: string[];
	/** Risk level */
	severity: "critical" | "high" | "medium" | "low";
	/** What to document about this zone */
	requiredDocumentation: string[];
}

// =============================================================================
// CONTEXT FILES
// =============================================================================

export interface ContextFileConfig {
	/** File path relative to workspace root */
	path: string;
	/** What this file should document */
	purpose: string;
	/** Is this file required or optional? */
	required: boolean;
	/** Template content for this file */
	template?: string;
	/** Sections that should be in this file */
	expectedSections?: string[];
}

export interface RecommendedStructure {
	/** Root directory for LLM context */
	root: string;
	/** Subdirectories to create */
	directories: string[];
	/** Files to create with their purposes */
	files: ContextFileConfig[];
}

// =============================================================================
// WORKSPACE PROFILE
// =============================================================================

/**
 * Complete workspace profile from fingerprinting
 */
export interface WorkspaceProfile {
	/** Workspace root path */
	root: string;
	/** Detected framework */
	framework: DetectedFramework;
	/** Detected languages */
	languages: DetectedLanguage[];
	/** Package manager in use */
	packageManager: PackageManagerInfo;
	/** Project structure analysis */
	structure: ProjectStructure;
	/** Existing context documentation */
	existingContext: ExistingContext;
	/** Detected patterns in the codebase */
	detectedPatterns: DetectedPattern[];
	/** Gap analysis results */
	gaps: PatternGap[];
	/** Overall workspace health score (0-100) */
	healthScore: number;
	/** Timestamp of profile creation */
	createdAt: string;
}

export interface DetectedFramework {
	/** Framework ID */
	id: FrameworkId;
	/** Framework name */
	name: string;
	/** Detection confidence (0-1) */
	confidence: number;
	/** Version if detected */
	version?: string;
	/** Indicators that led to this detection */
	indicators: string[];
}

export interface DetectedLanguage {
	/** Language name */
	name: string;
	/** Percentage of codebase */
	percentage: number;
	/** File count */
	fileCount: number;
	/** Primary file extensions */
	extensions: string[];
}

export interface PackageManagerInfo {
	/** Package manager name */
	name: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
	/** Lockfile path if found */
	lockfile?: string;
	/** Version if detected */
	version?: string;
}

export interface ProjectStructure {
	/** Whether this is a monorepo */
	isMonorepo: boolean;
	/** Monorepo tool if detected */
	monorepoTool?: "turborepo" | "nx" | "lerna" | "pnpm-workspaces" | "yarn-workspaces";
	/** Source directories */
	sourceDirectories: string[];
	/** Test directories */
	testDirectories: string[];
	/** Config files found */
	configFiles: string[];
	/** Total file count */
	totalFiles: number;
	/** Total lines of code (estimate) */
	totalLinesEstimate: number;
}

export interface ExistingContext {
	/** Whether .llm-context or similar exists */
	hasContextDirectory: boolean;
	/** Path to context directory if found */
	contextPath?: string;
	/** Files found in context directory */
	files: ExistingContextFile[];
	/** Overall quality score (0-100) */
	qualityScore: number;
}

export interface ExistingContextFile {
	/** File path */
	path: string;
	/** File size in bytes */
	size: number;
	/** Last modified date */
	lastModified: string;
	/** Detected sections in the file */
	sections: string[];
	/** Quality assessment */
	quality: "good" | "needs-improvement" | "outdated" | "empty";
}

// =============================================================================
// PATTERN DETECTION RESULTS
// =============================================================================

export interface DetectedPattern {
	/** Pattern ID from expected patterns */
	id: string;
	/** Pattern name */
	name: string;
	/** Category */
	category: PatternCategory;
	/** Where this pattern was found */
	locations: PatternLocation[];
	/** How strongly this pattern is implemented (0-1) */
	strength: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

export interface PatternLocation {
	/** File path */
	file: string;
	/** Line number if applicable */
	line?: number;
	/** Column if applicable */
	column?: number;
	/** Code snippet */
	snippet?: string;
}

// =============================================================================
// GAP ANALYSIS
// =============================================================================

export interface PatternGap {
	/** Expected pattern ID */
	patternId: string;
	/** Expected pattern name */
	patternName: string;
	/** Gap type */
	type: "missing" | "incomplete" | "outdated" | "inconsistent";
	/** Severity */
	severity: "critical" | "high" | "medium" | "low";
	/** Human-readable description */
	description: string;
	/** Recommendation for fixing */
	recommendation: string;
	/** Effort estimate */
	effort: "trivial" | "small" | "medium" | "large";
	/** Files affected */
	affectedFiles?: string[];
	/** Auto-fixable? */
	autoFixable: boolean;
}

// =============================================================================
// ONBOARDING RECOMMENDATIONS
// =============================================================================

export interface OnboardingRecommendation {
	/** Recommendation ID */
	id: string;
	/** Category */
	category: "context" | "pattern" | "security" | "testing" | "documentation";
	/** Priority (lower is more urgent) */
	priority: number;
	/** Title */
	title: string;
	/** Description */
	description: string;
	/** Actions to take */
	actions: RecommendedAction[];
	/** Estimated time to complete */
	estimatedTime: string;
	/** Impact on workspace health */
	healthImpact: number;
}

export interface RecommendedAction {
	/** Action type */
	type: "create-file" | "update-file" | "add-pattern" | "configure" | "install";
	/** Target path or package */
	target: string;
	/** Action description */
	description: string;
	/** Content to add (if applicable) */
	content?: string;
	/** Whether this can be auto-applied */
	autoApply: boolean;
}
