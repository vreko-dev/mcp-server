/**
 * Framework Registry
 *
 * Central registry for framework configurations with detection and lookup.
 *
 * @module knowledge/registry
 */

import { astroConfig } from "./frameworks/astro.js";
import { expressConfig } from "./frameworks/express.js";
import { nestjsConfig } from "./frameworks/nestjs.js";
import { nextjsConfig } from "./frameworks/nextjs.js";
import { reactViteConfig } from "./frameworks/react-vite.js";
import type { DetectedFramework, FrameworkConfig, FrameworkId } from "./types.js";

// =============================================================================
// FRAMEWORK REGISTRY
// =============================================================================

/**
 * All registered framework configurations
 */
const FRAMEWORK_CONFIGS: FrameworkConfig[] = [nextjsConfig, reactViteConfig, expressConfig, nestjsConfig, astroConfig];

/**
 * Framework lookup by ID
 */
const FRAMEWORK_MAP = new Map<FrameworkId, FrameworkConfig>(FRAMEWORK_CONFIGS.map((config) => [config.id, config]));

// =============================================================================
// REGISTRY API
// =============================================================================

/**
 * Get all registered framework configurations
 */
export function getAllFrameworks(): FrameworkConfig[] {
	return [...FRAMEWORK_CONFIGS];
}

/**
 * Get a framework configuration by ID
 */
export function getFramework(id: FrameworkId): FrameworkConfig | undefined {
	return FRAMEWORK_MAP.get(id);
}

/**
 * Get frameworks by category
 */
export function getFrameworksByCategory(category: FrameworkConfig["category"]): FrameworkConfig[] {
	return FRAMEWORK_CONFIGS.filter((config) => config.category === category);
}

/**
 * Check if a framework ID is valid
 */
export function isValidFramework(id: string): id is FrameworkId {
	return FRAMEWORK_MAP.has(id as FrameworkId);
}

// =============================================================================
// FRAMEWORK DETECTION
// =============================================================================

export interface FrameworkDetectionContext {
	/** Contents of package.json if it exists */
	packageJson?: {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		scripts?: Record<string, string>;
	};
	/** List of file paths in the workspace (relative) */
	filePaths: string[];
	/** Function to check file content for a pattern */
	checkFileContent?: (pattern: string, files: string[]) => Promise<boolean>;
}

/**
 * Detect frameworks in a workspace
 *
 * Returns all detected frameworks sorted by confidence
 */
export async function detectFrameworks(context: FrameworkDetectionContext): Promise<DetectedFramework[]> {
	const detectedFrameworks: DetectedFramework[] = [];

	for (const config of FRAMEWORK_CONFIGS) {
		const detection = await evaluateFramework(config, context);

		if (detection.confidence > 0.3) {
			detectedFrameworks.push(detection);
		}
	}

	// Sort by confidence (highest first)
	return detectedFrameworks.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect the primary framework in a workspace
 *
 * Returns the framework with highest confidence, or unknown
 */
export async function detectPrimaryFramework(context: FrameworkDetectionContext): Promise<DetectedFramework> {
	const frameworks = await detectFrameworks(context);

	if (frameworks.length === 0) {
		return {
			id: "unknown",
			name: "Unknown",
			confidence: 0,
			indicators: [],
		};
	}

	return frameworks[0];
}

/**
 * Evaluate a single framework against the detection context
 */
async function evaluateFramework(
	config: FrameworkConfig,
	context: FrameworkDetectionContext,
): Promise<DetectedFramework> {
	let totalWeight = 0;
	let matchedWeight = 0;
	const matchedIndicators: string[] = [];
	let detectedVersion: string | undefined;

	for (const indicator of config.indicators) {
		totalWeight += indicator.weight;

		const matched = await checkIndicator(indicator, context);

		if (matched.match) {
			matchedWeight += indicator.weight;
			matchedIndicators.push(indicator.pattern);

			if (matched.version) {
				detectedVersion = matched.version;
			}
		}
	}

	// Calculate confidence as ratio of matched to total weight
	const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;

	return {
		id: config.id,
		name: config.name,
		confidence,
		version: detectedVersion,
		indicators: matchedIndicators,
	};
}

/**
 * Check a single indicator
 */
async function checkIndicator(
	indicator: FrameworkConfig["indicators"][0],
	context: FrameworkDetectionContext,
): Promise<{ match: boolean; version?: string }> {
	switch (indicator.type) {
		case "dependency": {
			const deps = {
				...context.packageJson?.dependencies,
				...context.packageJson?.devDependencies,
			};
			const version = deps[indicator.pattern];
			return {
				match: Boolean(version),
				version: version?.replace(/^[\^~]/, ""),
			};
		}

		case "file": {
			// Convert glob pattern to regex for simple matching
			const regex = new RegExp(
				`^${indicator.pattern
					.replace(/\./g, "\\.")
					.replace(/\{([^}]+)\}/g, "($1)")
					.replace(/,/g, "|")
					.replace(/\*\*/g, ".*")
					.replace(/\*/g, "[^/]*")}$`,
			);

			const match = context.filePaths.some((path) => regex.test(path));
			return { match };
		}

		case "script": {
			const scripts = context.packageJson?.scripts || {};
			const match = Object.values(scripts).some((script) => script.includes(indicator.pattern));
			return { match };
		}

		case "config": {
			// Config type would need file content checking
			if (context.checkFileContent) {
				const match = await context.checkFileContent(indicator.pattern, ["*.config.*"]);
				return { match };
			}
			return { match: false };
		}

		default:
			return { match: false };
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export { FRAMEWORK_CONFIGS };
