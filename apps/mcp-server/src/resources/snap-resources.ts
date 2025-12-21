/**
 * MCP Resources for Customer Workspace
 *
 * Implements resources for @snap mentions in Cursor/Claude/Windsurf.
 * These provide workspace context when AI assistants reference @snap.
 *
 * Per implementation_plan.md Section 2.1:
 * - snap://context - Workspace context from .llm-context/
 * - snap://workspace - Vitals, protected files, session
 * - snap://patterns - Patterns and violations
 * - snap://preferences - User preferences
 *
 * @module resources
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ResourceContent {
	uri: string;
	mimeType: string;
	text: string;
}

export interface ResourceResponse {
	contents: ResourceContent[];
}

export interface ResourceDefinition {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}

interface WorkspaceVitals {
	framework?: string;
	frameworkConfidence?: number;
	packageManager?: string;
	typescript?: { enabled: boolean; strict?: boolean };
	criticalFiles?: string[];
	detectedAt: string;
}

interface ProtectedFile {
	pattern: string;
	addedAt: string;
	reason?: string;
}

interface SessionState {
	id: string;
	task?: string;
	startedAt: string;
	snapshotCount: number;
	filesModified?: number;
}

interface ViolationEntry {
	type: string;
	file: string;
	message: string;
	count?: number;
	date: string;
	prevention?: string;
}

interface LearningEntry {
	type: string;
	trigger: string;
	action: string;
	source: string;
	createdAt: string;
}

// =============================================================================
// RESOURCE DEFINITIONS
// =============================================================================

/**
 * Available resources for listing
 */
export const resourceDefinitions: ResourceDefinition[] = [
	{
		uri: "snap://context",
		name: "Workspace Context",
		description: "Architecture documentation from .llm-context/ or project root",
		mimeType: "text/markdown",
	},
	{
		uri: "snap://workspace",
		name: "Workspace State",
		description: "Vitals, protected files, and current session state",
		mimeType: "application/json",
	},
	{
		uri: "snap://patterns",
		name: "Patterns & Violations",
		description: "Codebase patterns and detected violations",
		mimeType: "text/markdown",
	},
	{
		uri: "snap://preferences",
		name: "User Preferences",
		description: "User configuration and preferences for this workspace",
		mimeType: "application/json",
	},
	{
		uri: "snap://learnings",
		name: "User Learnings",
		description: "Recorded learnings and discoveries from development sessions",
		mimeType: "text/markdown",
	},
];

// =============================================================================
// FILE HELPERS
// =============================================================================

/**
 * Read JSON file from .snapback/
 */
async function readSnapbackJson<T>(relativePath: string, workspaceRoot: string): Promise<T | null> {
	try {
		const content = await readFile(join(workspaceRoot, ".snapback", relativePath), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Load JSONL file from .snapback/
 */
async function loadSnapbackJsonl<T>(relativePath: string, workspaceRoot: string): Promise<T[]> {
	try {
		const content = await readFile(join(workspaceRoot, ".snapback", relativePath), "utf-8");
		return content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as T);
	} catch {
		return [];
	}
}

/**
 * Try to read a file from multiple possible paths
 */
async function readFirstAvailable(paths: string[], workspaceRoot: string): Promise<string | null> {
	for (const path of paths) {
		try {
			const fullPath = join(workspaceRoot, path);
			const content = await readFile(fullPath, "utf-8");
			return content;
		} catch {}
	}
	return null;
}

// =============================================================================
// RESOURCE HANDLERS
// =============================================================================

/**
 * Get workspace context from documentation files
 */
async function getWorkspaceContext(workspaceRoot: string): Promise<string> {
	const parts: string[] = ["# Workspace Context\n"];

	// Try to read architecture docs from .llm-context/ or root
	const archPaths = [".llm-context/ARCHITECTURE.md", "ARCHITECTURE.md", "docs/ARCHITECTURE.md"];
	const architecture = await readFirstAvailable(archPaths, workspaceRoot);
	if (architecture) {
		parts.push("## Architecture\n");
		parts.push(architecture.slice(0, 5000)); // Limit size
		parts.push("\n");
	}

	// Try to read patterns
	const patternPaths = [".llm-context/PATTERNS.md", "PATTERNS.md", "docs/PATTERNS.md"];
	const patterns = await readFirstAvailable(patternPaths, workspaceRoot);
	if (patterns) {
		parts.push("## Patterns\n");
		parts.push(patterns.slice(0, 3000));
		parts.push("\n");
	}

	// Try to read constraints
	const constraintPaths = [".llm-context/CONSTRAINTS.md", "CONSTRAINTS.md", "docs/CONSTRAINTS.md"];
	const constraints = await readFirstAvailable(constraintPaths, workspaceRoot);
	if (constraints) {
		parts.push("## Constraints\n");
		parts.push(constraints.slice(0, 2000));
		parts.push("\n");
	}

	if (parts.length === 1) {
		parts.push(
			"No documentation found. Create `.llm-context/ARCHITECTURE.md` or run `snap init` to generate workspace docs.",
		);
	}

	return parts.join("\n");
}

/**
 * Get workspace state (vitals, protected files, session)
 */
async function getWorkspaceState(workspaceRoot: string): Promise<object> {
	const vitals = await readSnapbackJson<WorkspaceVitals>("vitals.json", workspaceRoot);
	const protected_ = await readSnapbackJson<ProtectedFile[]>("protected.json", workspaceRoot);
	const session = await readSnapbackJson<SessionState>("session/current.json", workspaceRoot);
	const config = await readSnapbackJson<Record<string, unknown>>("config.json", workspaceRoot);

	return {
		initialized: !!config,
		vitals: vitals || {},
		protectedFiles: protected_?.map((p) => p.pattern) || [],
		session: session
			? {
					id: session.id,
					task: session.task,
					startedAt: session.startedAt,
					snapshotCount: session.snapshotCount,
				}
			: null,
	};
}

/**
 * Get patterns and violations as markdown
 */
async function getPatternsAndViolations(workspaceRoot: string): Promise<string> {
	const parts: string[] = ["# Patterns & Violations\n"];

	// Read workspace patterns
	const workspacePatterns = await readSnapbackJson<Record<string, unknown>>(
		"patterns/workspace-patterns.json",
		workspaceRoot,
	);
	if (workspacePatterns) {
		parts.push("## Workspace Patterns\n");
		parts.push("```json");
		parts.push(JSON.stringify(workspacePatterns, null, 2).slice(0, 2000));
		parts.push("```\n");
	}

	// Read violations
	const violations = await loadSnapbackJsonl<ViolationEntry>("patterns/violations.jsonl", workspaceRoot);
	if (violations.length > 0) {
		parts.push("## Recent Violations\n");

		// Group by type
		const byType: Record<string, ViolationEntry[]> = {};
		for (const v of violations) {
			if (!byType[v.type]) {
				byType[v.type] = [];
			}
			byType[v.type].push(v);
		}

		for (const [type, typeViolations] of Object.entries(byType)) {
			const count = typeViolations.length;
			const promotionStatus = count >= 3 ? "🔴 PROMOTE" : count >= 2 ? "🟡 Watch" : "🟢 New";

			parts.push(`### ${type} (${count}x) ${promotionStatus}\n`);

			// Show most recent violation
			const latest = typeViolations[typeViolations.length - 1];
			parts.push(`- **Latest:** ${latest.message || "No message"}`);
			if (latest.prevention) {
				parts.push(`- **Prevention:** ${latest.prevention}`);
			}
			parts.push("");
		}
	} else {
		parts.push("No violations recorded.\n");
	}

	return parts.join("\n");
}

/**
 * Get user preferences
 */
async function getUserPreferences(workspaceRoot: string): Promise<object> {
	const config = await readSnapbackJson<Record<string, unknown>>("config.json", workspaceRoot);
	const vitals = await readSnapbackJson<WorkspaceVitals>("vitals.json", workspaceRoot);

	return {
		workspace: {
			tier: (config as { tier?: string })?.tier || "free",
			protectionLevel: (config as { protectionLevel?: string })?.protectionLevel || "standard",
			syncEnabled: (config as { syncEnabled?: boolean })?.syncEnabled || false,
		},
		stack: {
			framework: vitals?.framework,
			packageManager: vitals?.packageManager,
			typescript: vitals?.typescript?.enabled,
		},
	};
}

/**
 * Get user learnings as markdown
 */
async function getUserLearnings(workspaceRoot: string): Promise<string> {
	const parts: string[] = ["# User Learnings\n"];

	const learnings = await loadSnapbackJsonl<LearningEntry>("learnings/user-learnings.jsonl", workspaceRoot);

	if (learnings.length === 0) {
		parts.push("No learnings recorded yet. Use `snap learn` CLI command to record learnings.\n");
		return parts.join("\n");
	}

	// Group by type
	const byType: Record<string, LearningEntry[]> = {};
	for (const l of learnings) {
		if (!byType[l.type]) {
			byType[l.type] = [];
		}
		byType[l.type].push(l);
	}

	for (const [type, typeLearnings] of Object.entries(byType)) {
		const emoji =
			type === "pattern"
				? "📋"
				: type === "pitfall"
					? "⚠️"
					: type === "workflow"
						? "🔄"
						: type === "discovery"
							? "💡"
							: "📈";

		parts.push(`## ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`);

		// Show last 5 of each type
		const recent = typeLearnings.slice(-5).reverse();
		for (const l of recent) {
			parts.push(`### ${l.trigger}`);
			parts.push(l.action);
			parts.push(`_Source: ${l.source}_\n`);
		}
	}

	return parts.join("\n");
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Handle resource read request
 */
export async function handleReadResource(uri: string, workspaceRoot: string): Promise<ResourceResponse> {
	switch (uri) {
		case "snap://context":
			return {
				contents: [
					{
						uri,
						mimeType: "text/markdown",
						text: await getWorkspaceContext(workspaceRoot),
					},
				],
			};

		case "snap://workspace":
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(await getWorkspaceState(workspaceRoot), null, 2),
					},
				],
			};

		case "snap://patterns":
			return {
				contents: [
					{
						uri,
						mimeType: "text/markdown",
						text: await getPatternsAndViolations(workspaceRoot),
					},
				],
			};

		case "snap://preferences":
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(await getUserPreferences(workspaceRoot), null, 2),
					},
				],
			};

		case "snap://learnings":
			return {
				contents: [
					{
						uri,
						mimeType: "text/markdown",
						text: await getUserLearnings(workspaceRoot),
					},
				],
			};

		default:
			throw new Error(`Unknown resource: ${uri}`);
	}
}

/**
 * List available resources
 */
export function listResources(): ResourceDefinition[] {
	return resourceDefinitions;
}
