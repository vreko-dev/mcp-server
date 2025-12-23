/**
 * ArtifactSource implementations for Customer MCP Server
 *
 * Reuses internal MCP patterns but points to customer workspace data:
 * - Patterns: .snapback/patterns/patterns.md
 * - Violations: .snapback/patterns/violations.jsonl
 * - Learnings: .snapback/learnings/learnings.jsonl
 * - Constraints: .llm-context/CONSTRAINTS.md
 *
 * Per ROUTER.md: Same intelligence algorithms, different data sources.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ArtifactSource } from "@snapback/intelligence/composer";

/**
 * File system interface for dependency injection (enables testing)
 */
export interface FileSystemAdapter {
	existsSync(path: string): boolean;
	readFileSync(path: string): string;
}

const defaultFs: FileSystemAdapter = {
	existsSync: (p: string) => fs.existsSync(p),
	readFileSync: (p: string) => fs.readFileSync(p, "utf-8"),
};

/**
 * Create ArtifactSources for customer workspace
 *
 * @param workspaceRoot - Customer workspace root directory
 * @returns Array of ArtifactSource instances pointing to customer data
 */
export function createCustomerWorkspaceSources(workspaceRoot: string): ArtifactSource[] {
	// Lazy import to avoid circular dependency issues
	const intelligenceModule = require("@snapback/intelligence/composer/artifact-sources");

	const sources: ArtifactSource[] = [];

	// 1. Pattern Source: .snapback/patterns/patterns.md
	const patternsFile = path.join(workspaceRoot, ".snapback/patterns/patterns.md");
	if (defaultFs.existsSync(patternsFile)) {
		sources.push(
			intelligenceModule.createPatternSource({
				rootDir: workspaceRoot,
				patternsFile: ".snapback/patterns/patterns.md",
				maxSectionTokens: 500,
				fs: defaultFs,
			}),
		);
	}

	// 2. Learning Source: violations + learnings
	const violationsFile = path.join(workspaceRoot, ".snapback/patterns/violations.jsonl");
	const learningsFile = path.join(workspaceRoot, ".snapback/learnings/learnings.jsonl");

	if (defaultFs.existsSync(violationsFile) || defaultFs.existsSync(learningsFile)) {
		sources.push(
			intelligenceModule.createLearningSource({
				rootDir: workspaceRoot,
				violationsFile: ".snapback/patterns/violations.jsonl",
				learningsFile: ".snapback/learnings/learnings.jsonl",
				maxViolations: 20,
				maxLearnings: 20,
				fs: defaultFs,
			}),
		);
	}

	// 3. Rules Source: .llm-context/CONSTRAINTS.md
	const constraintsFile = path.join(workspaceRoot, ".llm-context/CONSTRAINTS.md");
	if (defaultFs.existsSync(constraintsFile)) {
		sources.push(
			intelligenceModule.createRulesSource({
				rootDir: workspaceRoot,
				constraintsFile: ".llm-context/CONSTRAINTS.md",
				maxSectionTokens: 600,
				fs: defaultFs,
			}),
		);
	}

	// Fallback: If no sources found, return empty array (graceful degradation)
	if (sources.length === 0) {
		console.warn("[Customer MCP] No artifact sources found. Initialize workspace with: snap init");
	}

	return sources;
}
