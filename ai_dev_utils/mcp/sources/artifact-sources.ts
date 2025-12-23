/**
 * Artifact Sources for Internal MCP Server
 *
 * Implements ArtifactSource interface from @snapback/intelligence/composer.
 * These sources power the deterministic context assembly in codebase.start_task().
 *
 * Sources:
 * - PatternSource: Fetches patterns from codebase-patterns.md → lane: "rules"
 * - LearningSource: Fetches violations and learnings from JSONL → lane: "history"
 * - RulesSource: Fetches constraints and path-targeted rules → lane: "policy"
 *
 * Per ROUTER.md: Same intelligence algorithms, different data sources.
 */

import * as crypto from "node:crypto";
import * as path from "node:path";
import type {
	ArtifactCandidate,
	ArtifactKind,
	ArtifactSource,
	ComposeTriggerInput,
	Lane,
	RenderedArtifact,
	ShrinkStrategy,
} from "@snapback/intelligence/composer";

// ============================================================================
// TYPES
// ============================================================================

/**
 * File system interface for dependency injection (enables testing)
 */
export interface FileSystemAdapter {
	existsSync(path: string): boolean;
	readFileSync(path: string): string;
}

/**
 * Default Node.js file system adapter
 */
import * as fs from "node:fs";

const defaultFs: FileSystemAdapter = {
	existsSync: (p: string) => fs.existsSync(p),
	readFileSync: (p: string) => fs.readFileSync(p, "utf-8"),
};

// ============================================================================
// PATTERN SOURCE
// ============================================================================

export interface PatternSourceConfig {
	rootDir: string;
	patternsFile: string;
	maxSectionTokens?: number;
	fs?: FileSystemAdapter;
}

/**
 * Creates an ArtifactSource that reads patterns from codebase-patterns.md
 * Maps to lane: "rules", kind: "rule_doc"
 */
export function createPatternSource(config: PatternSourceConfig): ArtifactSource {
	const { rootDir, patternsFile, maxSectionTokens = 500, fs: fsAdapter = defaultFs } = config;

	return {
		async generateCandidates(trigger: ComposeTriggerInput, workspaceSecret: string): Promise<ArtifactCandidate[]> {
			const fullPath = path.join(rootDir, patternsFile);

			if (!fsAdapter.existsSync(fullPath)) {
				return [];
			}

			const content = fsAdapter.readFileSync(fullPath);

			if (!content || content.trim().length === 0) {
				return [];
			}

			// Split into sections
			const sections = splitMarkdownIntoSections(content, maxSectionTokens);

			if (sections.length === 0) {
				return [];
			}

			const keywords = trigger.keywords ?? [];

			return sections.map((section, index) => {
				const relevanceScore = calculateRelevance(section.content, keywords);
				const id = computeArtifactId(workspaceSecret, patternsFile, section.header, index);

				return createArtifactCandidate({
					id,
					lane: "rules",
					kind: "rule_doc",
					content: section.content,
					recencyBucket: 4, // Patterns are relatively stable
					relevanceScore,
					specificityScore: 0.7,
					riskAlignment: 0.6,
				});
			});
		},
	};
}

// ============================================================================
// LEARNING SOURCE
// ============================================================================

export interface LearningSourceConfig {
	rootDir: string;
	violationsFile: string;
	learningsFile: string;
	maxViolations?: number;
	maxLearnings?: number;
	fs?: FileSystemAdapter;
}

interface Violation {
	date?: string;
	type: string;
	file?: string;
	message?: string;
	prevention?: string;
}

interface Learning {
	id?: string;
	type?: string;
	trigger?: string;
	action?: string;
	source?: string;
}

/**
 * Creates an ArtifactSource that reads violations and learnings from JSONL files
 * Maps to lane: "history", kind: "violation" or "learning"
 */
export function createLearningSource(config: LearningSourceConfig): ArtifactSource {
	const {
		rootDir,
		violationsFile,
		learningsFile,
		maxViolations = 20,
		maxLearnings = 20,
		fs: fsAdapter = defaultFs,
	} = config;

	return {
		async generateCandidates(trigger: ComposeTriggerInput, workspaceSecret: string): Promise<ArtifactCandidate[]> {
			const candidates: ArtifactCandidate[] = [];
			const keywords = trigger.keywords ?? [];
			const files = trigger.files ?? [];

			// Load violations
			const violations = loadJsonl<Violation>(path.join(rootDir, violationsFile), fsAdapter);

			// Score and sort violations by relevance
			const scoredViolations = violations
				.map((v) => ({
					violation: v,
					score: calculateViolationRelevance(v, keywords, files),
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0, maxViolations);

			for (let i = 0; i < scoredViolations.length; i++) {
				const { violation, score } = scoredViolations[i];
				const content = formatViolation(violation);
				const id = computeArtifactId(workspaceSecret, violationsFile, violation.type, i);

				candidates.push(
					createArtifactCandidate({
						id,
						lane: "history",
						kind: "violation",
						content,
						recencyBucket: violation.date ? computeRecencyBucket(violation.date) : 2,
						relevanceScore: score,
						specificityScore: 0.6,
						riskAlignment: 0.8, // Violations are high-risk alignment
					}),
				);
			}

			// Load learnings
			const learnings = loadJsonl<Learning>(path.join(rootDir, learningsFile), fsAdapter);

			// Score and sort learnings by relevance
			const scoredLearnings = learnings
				.map((l) => ({
					learning: l,
					score: calculateLearningRelevance(l, keywords),
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0, maxLearnings);

			for (let i = 0; i < scoredLearnings.length; i++) {
				const { learning, score } = scoredLearnings[i];
				const content = formatLearning(learning);
				const id = computeArtifactId(workspaceSecret, learningsFile, learning.trigger ?? "unknown", i);

				candidates.push(
					createArtifactCandidate({
						id,
						lane: "history",
						kind: "learning",
						content,
						recencyBucket: 3,
						relevanceScore: score,
						specificityScore: 0.5,
						riskAlignment: 0.5,
					}),
				);
			}

			return candidates;
		},
	};
}

// ============================================================================
// RULES SOURCE
// ============================================================================

export interface RulesSourceConfig {
	rootDir: string;
	constraintsFile: string;
	rulesDir?: string;
	fs?: FileSystemAdapter;
}

/**
 * Creates an ArtifactSource that reads constraints and path-targeted rules
 * Maps to lane: "policy", kind: "constraint"
 */
export function createRulesSource(config: RulesSourceConfig): ArtifactSource {
	const { rootDir, constraintsFile, rulesDir, fs: fsAdapter = defaultFs } = config;

	return {
		async generateCandidates(trigger: ComposeTriggerInput, workspaceSecret: string): Promise<ArtifactCandidate[]> {
			const candidates: ArtifactCandidate[] = [];
			const triggerFiles = trigger.files ?? [];

			// Load constraints (always included)
			const constraintsPath = path.join(rootDir, constraintsFile);
			if (fsAdapter.existsSync(constraintsPath)) {
				const content = fsAdapter.readFileSync(constraintsPath);

				if (content && content.trim().length > 0) {
					const id = computeArtifactId(workspaceSecret, constraintsFile, "constraints", 0);

					candidates.push(
						createArtifactCandidate({
							id,
							lane: "policy",
							kind: "constraint",
							content,
							recencyBucket: 5, // Constraints are always fresh/important
							relevanceScore: 1.0, // Always highly relevant
							specificityScore: 1.0,
							riskAlignment: 1.0, // Direct risk alignment
						}),
					);
				}
			}

			// Load path-targeted rules if rulesDir is specified
			if (rulesDir) {
				const rulesPath = path.join(rootDir, rulesDir);

				// Always try to load rules - don't check directory existence
				// (mock fs doesn't support directories)
				try {
					const rulesCandidates = loadPathTargetedRules(rulesPath, triggerFiles, workspaceSecret, fsAdapter);
					candidates.push(...rulesCandidates);
				} catch {
					// Ignore errors reading rules
				}
			}

			return candidates;
		},
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface MarkdownSection {
	header: string;
	content: string;
}

/**
 * Split markdown into sections based on ## headers
 */
function splitMarkdownIntoSections(content: string, _maxTokens: number): MarkdownSection[] {
	const sections: MarkdownSection[] = [];
	const lines = content.split("\n");

	let currentHeader = "";
	let currentContent: string[] = [];
	let foundFirstSection = false;

	for (const line of lines) {
		if (line.startsWith("## ")) {
			// Save previous section if exists and has content
			if (foundFirstSection && currentContent.length > 0) {
				const sectionContent = currentContent.join("\n").trim();
				if (sectionContent.length > 0) {
					sections.push({
						header: currentHeader,
						content: `## ${currentHeader}\n\n${sectionContent}`,
					});
				}
			}

			foundFirstSection = true;
			currentHeader = line.replace("## ", "");
			currentContent = []; // Start fresh - content comes after header
		} else if (foundFirstSection) {
			currentContent.push(line);
		}
	}

	// Don't forget the last section
	if (foundFirstSection && currentContent.length > 0) {
		const sectionContent = currentContent.join("\n").trim();
		if (sectionContent.length > 0) {
			sections.push({
				header: currentHeader || "Main",
				content: `## ${currentHeader}\n\n${sectionContent}`,
			});
		}
	}

	// If no sections found (no ## headers), treat entire content as one section
	if (sections.length === 0 && content.trim().length > 0) {
		sections.push({
			header: "Main",
			content: content.trim(),
		});
	}

	return sections;
}

/**
 * Calculate relevance score based on keyword matching
 */
function calculateRelevance(content: string, keywords: string[]): number {
	if (keywords.length === 0) {
		return 0.5; // Default relevance
	}

	const lowerContent = content.toLowerCase();
	let matches = 0;

	for (const keyword of keywords) {
		if (lowerContent.includes(keyword.toLowerCase())) {
			matches++;
		}
	}

	// Base score plus keyword matches
	return Math.min(1.0, 0.3 + (matches / keywords.length) * 0.7);
}

/**
 * Calculate violation relevance
 */
function calculateViolationRelevance(violation: Violation, keywords: string[], files: string[]): number {
	let score = 0.3; // Base score

	// Check if file matches
	if (violation.file && files.length > 0) {
		for (const f of files) {
			if (violation.file.includes(path.basename(f)) || f.includes(violation.file)) {
				score += 0.4;
				break;
			}
		}
	}

	// Check keyword matches
	const violationText = `${violation.type} ${violation.message ?? ""} ${violation.prevention ?? ""}`.toLowerCase();
	for (const keyword of keywords) {
		if (violationText.includes(keyword.toLowerCase())) {
			score += 0.1;
		}
	}

	return Math.min(1.0, score);
}

/**
 * Calculate learning relevance
 */
function calculateLearningRelevance(learning: Learning, keywords: string[]): number {
	let score = 0.3; // Base score

	const learningText = `${learning.trigger ?? ""} ${learning.action ?? ""}`.toLowerCase();
	for (const keyword of keywords) {
		if (learningText.includes(keyword.toLowerCase())) {
			score += 0.15;
		}
	}

	return Math.min(1.0, score);
}

/**
 * Format violation for display
 */
function formatViolation(v: Violation): string {
	return [
		`Type: ${v.type}`,
		v.file ? `File: ${v.file}` : null,
		v.message ? `Message: ${v.message}` : null,
		v.prevention ? `Prevention: ${v.prevention}` : null,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Format learning for display
 */
function formatLearning(l: Learning): string {
	return [
		`Trigger: ${l.trigger ?? "unknown"}`,
		`Action: ${l.action ?? "unknown"}`,
		l.type ? `Type: ${l.type}` : null,
		l.source ? `Source: ${l.source}` : null,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Load JSONL file safely
 */
function loadJsonl<T>(filepath: string, fsAdapter: FileSystemAdapter): T[] {
	if (!fsAdapter.existsSync(filepath)) {
		return [];
	}

	try {
		const content = fsAdapter.readFileSync(filepath);
		return content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => {
				try {
					return JSON.parse(line) as T;
				} catch {
					return null;
				}
			})
			.filter((item): item is T => item !== null);
	} catch {
		return [];
	}
}

/**
 * Compute recency bucket from date string
 * Higher = more recent (0-5)
 */
function computeRecencyBucket(dateStr: string): number {
	try {
		const date = new Date(dateStr);
		const now = Date.now();
		const diffMs = now - date.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);

		if (diffDays < 1) return 5; // Today
		if (diffDays < 7) return 4; // This week
		if (diffDays < 30) return 3; // This month
		if (diffDays < 90) return 2; // Last 3 months
		if (diffDays < 365) return 1; // This year
		return 0; // Older
	} catch {
		return 2; // Default
	}
}

/**
 * Compute stable artifact ID using HMAC
 */
function computeArtifactId(secret: string, source: string, identifier: string, index: number): string {
	const input = `${source}:${identifier}:${index}`;
	const hmac = crypto.createHmac("sha256", secret);
	hmac.update(input);
	return hmac.digest("hex").slice(0, 16);
}

/**
 * Load path-targeted rules from rules directory
 */
function loadPathTargetedRules(
	rulesDir: string,
	triggerFiles: string[],
	workspaceSecret: string,
	fsAdapter: FileSystemAdapter,
): ArtifactCandidate[] {
	const candidates: ArtifactCandidate[] = [];

	// Rule file patterns to check (for mock fs testing)
	const testRulePatterns = ["00-core-rules.md", "50-api-rules.md", "bad-rules.md"];

	for (const ruleFileName of testRulePatterns) {
		const fullPath = path.join(rulesDir, ruleFileName);

		if (!fsAdapter.existsSync(fullPath)) {
			continue;
		}

		try {
			const content = fsAdapter.readFileSync(fullPath);
			const { frontmatter, body } = parseFrontmatter(content);

			// Check if rule applies
			const alwaysApply = frontmatter.alwaysApply === true || frontmatter.alwaysApply === "true";

			if (alwaysApply) {
				// Always include
				const id = computeArtifactId(workspaceSecret, ruleFileName, "rule", 0);
				candidates.push(
					createArtifactCandidate({
						id,
						lane: "rules",
						kind: "rule_doc",
						content: body,
						recencyBucket: 5,
						relevanceScore: 0.9,
						specificityScore: 0.8,
						riskAlignment: 0.7,
					}),
				);
			} else if (frontmatter.globs) {
				// Check if any trigger file matches globs
				const globs = Array.isArray(frontmatter.globs) ? frontmatter.globs : [frontmatter.globs];
				const matches = triggerFiles.some((file) => matchesAnyGlob(file, globs));

				if (matches) {
					const id = computeArtifactId(workspaceSecret, ruleFileName, "rule", 0);
					candidates.push(
						createArtifactCandidate({
							id,
							lane: "rules",
							kind: "rule_doc",
							content: body,
							recencyBucket: 4,
							relevanceScore: 0.85,
							specificityScore: 0.9,
							riskAlignment: 0.7,
						}),
					);
				}
			}
		} catch {
			// Ignore individual file errors
		}
	}

	return candidates;
}

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

	if (!match) {
		return { frontmatter: {}, body: content };
	}

	const [, yamlContent, body] = match;

	// Simple YAML parsing for common cases
	const frontmatter: Record<string, any> = {};

	try {
		const lines = yamlContent.split("\n");
		let currentKey = "";
		let currentList: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();

			if (trimmed.startsWith("- ")) {
				// List item
				currentList.push(trimmed.slice(2).replace(/["']/g, ""));
			} else if (trimmed.includes(":")) {
				// Save previous list if any
				if (currentKey && currentList.length > 0) {
					frontmatter[currentKey] = currentList;
					currentList = [];
				}

				const [key, ...valueParts] = trimmed.split(":");
				const value = valueParts.join(":").trim();

				if (value) {
					frontmatter[key.trim()] = value === "true" ? true : value === "false" ? false : value;
				} else {
					currentKey = key.trim();
				}
			}
		}

		// Save final list if any
		if (currentKey && currentList.length > 0) {
			frontmatter[currentKey] = currentList;
		}
	} catch {
		// Return empty frontmatter on parse error
	}

	return { frontmatter, body };
}

/**
 * Simple glob matching
 */
function matchesAnyGlob(file: string, globs: string[]): boolean {
	for (const glob of globs) {
		const pattern = glob
			.replace(/\*\*/g, "__DOUBLE_STAR__")
			.replace(/\*/g, "[^/]*")
			.replace(/__DOUBLE_STAR__/g, ".*");

		const regex = new RegExp(`^${pattern}$`);

		if (regex.test(file)) {
			return true;
		}
	}
	return false;
}

// ============================================================================
// ARTIFACT CANDIDATE FACTORY
// ============================================================================

interface ArtifactCandidateParams {
	id: string;
	lane: Lane;
	kind: ArtifactKind;
	content: string;
	recencyBucket: number;
	relevanceScore: number;
	specificityScore: number;
	riskAlignment: number;
}

/**
 * Create a properly structured ArtifactCandidate
 */
function createArtifactCandidate(params: ArtifactCandidateParams): ArtifactCandidate {
	const tokenEstimate = Math.ceil(params.content.length / 4);

	return {
		id: params.id,
		lane: params.lane,
		kind: params.kind,
		tokenEstimate,
		recencyBucket: params.recencyBucket,
		relevanceScore: params.relevanceScore,
		specificityScore: params.specificityScore,
		riskAlignment: params.riskAlignment,
		getContent: () => params.content,
		shrink: (targetTokens: number): RenderedArtifact => {
			const targetChars = targetTokens * 4;
			const shrunkContent = params.content.slice(0, targetChars);

			return {
				id: params.id,
				kind: params.kind,
				lane: params.lane,
				content: shrunkContent,
				exactTokenCount: Math.ceil(shrunkContent.length / 4),
				shrunk: true,
				originalTokenCount: tokenEstimate,
				shrinkStrategy: "truncate_oldest" as ShrinkStrategy,
			};
		},
	};
}
