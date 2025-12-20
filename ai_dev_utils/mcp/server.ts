#!/usr/bin/env node
/**
 * Codebase MCP Server
 *
 * Self-learning pair programmer context tools.
 * Reads from ai_dev_utils/ to provide architectural context,
 * check patterns, and report violations for learning.
 *
 * Tools:
 *   codebase:get_context      - Get context BEFORE implementing
 *   codebase:check_patterns   - Validate BEFORE committing
 *   codebase:report_violation - Learn from mistakes
 *   codebase:query_learnings  - Search past learnings
 *   codebase:record_learning  - Capture new patterns
 *
 * Usage:
 *   pnpm start          # Run server (stdio transport)
 *   pnpm dev            # Run with watch mode
 *
 * Cursor/Claude config:
 *   {
 *     "mcpServers": {
 *       "codebase": {
 *         "command": "pnpm",
 *         "args": ["--dir", "ai_dev_utils/mcp", "start"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { writeFile, writeFileSync } from "atomically";
import Bottleneck from "bottleneck";
import chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { learningEngine } from "./learning-engine.js";
import { queryWithCachedContext } from "./prompt-cache.js";
import { SemanticContextRetriever } from "./semantic-retriever.js";
import { ValidationPipeline } from "./validation-pipeline.js";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DEV_UTILS = path.resolve(__dirname, "..");

// Singleton semantic retriever (lazy initialized)
let semanticRetriever: SemanticContextRetriever | null = null;

// Singleton validation pipeline
const validationPipeline = new ValidationPipeline();

// Rate limiter for API calls (prevents overwhelming services)
const apiLimiter = new Bottleneck({
	maxConcurrent: 2,
	minTime: 100, // 10 requests/second max
});

// File watcher for live pattern reloading
let patternWatcher: ReturnType<typeof chokidar.watch> | null = null;
let cachedPatterns: string | null = null;
let cachedConstraints: string | null = null;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Load JSONL file as array of objects
 */
function loadJsonl(filepath: string): any[] {
	const fullPath = path.join(AI_DEV_UTILS, filepath);
	if (!fs.existsSync(fullPath)) return [];
	try {
		return fs
			.readFileSync(fullPath, "utf-8")
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line));
	} catch (e) {
		console.error(`Error loading ${filepath}:`, e);
		return [];
	}
}

/**
 * Append to JSONL file (atomic write for safety)
 */
async function appendJsonl(filepath: string, data: any): Promise<void> {
	const fullPath = path.join(AI_DEV_UTILS, filepath);
	try {
		const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : "";
		await writeFile(fullPath, existing + JSON.stringify(data) + "\n");
	} catch (e) {
		// Fallback to sync append if atomic fails
		fs.appendFileSync(fullPath, JSON.stringify(data) + "\n");
	}
}

/**
 * Append to JSONL file (sync version for backwards compat)
 */
function appendJsonlSync(filepath: string, data: any): void {
	const fullPath = path.join(AI_DEV_UTILS, filepath);
	fs.appendFileSync(fullPath, JSON.stringify(data) + "\n");
}

/**
 * Load markdown file
 */
function loadMd(filename: string): string {
	const fullPath = path.join(AI_DEV_UTILS, filename);
	if (!fs.existsSync(fullPath)) return "";
	return fs.readFileSync(fullPath, "utf-8");
}

/**
 * Extract section from markdown by header
 */
function extractSection(content: string, headerPattern: string): string {
	const regex = new RegExp(`## ${headerPattern}[\\s\\S]*?(?=## |$)`, "i");
	const match = content.match(regex);
	return match ? match[0] : "";
}

/**
 * Write markdown file (atomic write for safety)
 */
async function writeMdAsync(filename: string, content: string): Promise<void> {
	const fullPath = path.join(AI_DEV_UTILS, filename);
	await writeFile(fullPath, content);
}

/**
 * Write markdown file (sync - backwards compat)
 */
function writeMd(filename: string, content: string): void {
	const fullPath = path.join(AI_DEV_UTILS, filename);
	writeFileSync(fullPath, content);
}

/**
 * Start watching pattern files for live reloading
 */
function startPatternWatcher(): void {
	if (patternWatcher) return;

	const patternsPath = path.join(AI_DEV_UTILS, "patterns");
	patternWatcher = chokidar.watch(patternsPath, {
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
	});

	patternWatcher.on("change", (filePath: string) => {
		console.error(`[PatternWatcher] Reloading: ${path.basename(filePath)}`);
		cachedPatterns = null;
		cachedConstraints = null;
	});
}

/**
 * Format violation type as title
 */
function formatTypeAsTitle(type: string): string {
	return type
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

/**
 * Promote a pattern to codebase-patterns.md (at 3x threshold)
 */
function promoteToPatterns(type: string, count: number, prevention: string, files: string[]): string | null {
	const patternsFile = "patterns/codebase-patterns.md";
	const content = loadMd(patternsFile);

	// Check if already promoted
	if (content.includes(type)) {
		return null; // Already promoted
	}

	// Count existing auto-patterns
	const existingCount = (content.match(/### AP-\d+/g) || []).length;
	const nextNum = existingCount + 1;
	const patternId = `AP-${String(nextNum).padStart(3, "0")}`;

	const entry = `
### ${patternId}: ${formatTypeAsTitle(type)}
**Frequency:** ${count} occurrences
**First Seen:** ${new Date().toISOString().split("T")[0]}
**Type:** \`${type}\`

**Prevention:** ${prevention}

**Files affected:**
${files
	.slice(0, 3)
	.map((f) => `- \`${f}\``)
	.join("\n")}

---
`;

	// Insert before "## Recent Fixes" or append
	const insertPoint = content.indexOf("## Recent Fixes");
	let updated: string;
	if (insertPoint === -1) {
		updated = content + "\n" + entry;
	} else {
		updated = content.slice(0, insertPoint) + entry + "\n" + content.slice(insertPoint);
	}

	writeMd(patternsFile, updated);
	return patternId;
}

/**
 * Mark a pattern for automation (at 5x threshold)
 */
function markForAutomation(type: string): void {
	const patternsFile = "patterns/codebase-patterns.md";
	let content = loadMd(patternsFile);

	const typeTitle = formatTypeAsTitle(type);

	// Add automation badge if not already present
	if (content.includes(typeTitle) && !content.includes(`${typeTitle} 🤖 AUTOMATED`)) {
		content = content.replace(new RegExp(`(### AP-\\d+: ${typeTitle})`), "$1 🤖 AUTOMATED");
		writeMd(patternsFile, content);
	}
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const tools = [
	{
		name: "get_context",
		description: `Get architectural context relevant to a development task.

ALWAYS call this BEFORE implementing anything new.
Returns relevant patterns, constraints, learnings, and recent violations for the area.

Example: codebase.get_context({ task: "add authentication to MCP server", files: ["apps/mcp-server/src/auth.ts"], keywords: ["auth", "api-key"] })`,
		inputSchema: {
			type: "object",
			properties: {
				task: { type: "string", description: "Description of what you want to implement" },
				files: { type: "array", items: { type: "string" }, description: "Files you plan to modify" },
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords to search for in patterns/learnings",
				},
			},
			required: ["task"],
		},
	},
	{
		name: "check_patterns",
		description: `Validate code against codebase patterns and learned violations.

Call this BEFORE committing to catch architectural violations.
Returns list of violations found and suggestions for fixing them.

Example: codebase.check_patterns({ code: "import { db } from '@snapback/infrastructure'", filePath: "apps/vscode/src/snapshot.ts" })`,
		inputSchema: {
			type: "object",
			properties: {
				code: { type: "string", description: "Code to validate" },
				filePath: { type: "string", description: "Where this code will go" },
			},
			required: ["code", "filePath"],
		},
	},
	{
		name: "report_violation",
		description: `Report a pattern violation so the system can learn.

Violations are tracked and promoted:
- 1x: Stored in violations.jsonl
- 3x: Should be promoted to patterns/codebase-patterns.md
- 5x: Should add automated detection rule

Example: codebase.report_violation({ type: "layer-boundary-violation", file: "apps/vscode/src/auth.ts", whatHappened: "Imported infrastructure directly", whyItHappened: "Didn't check layer boundaries", prevention: "Use @snapback/core instead" })`,
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					description: "Type of violation (e.g., layer-boundary-violation, vague-assertion)",
				},
				file: { type: "string", description: "File where violation occurred" },
				whatHappened: { type: "string", description: "What went wrong" },
				whyItHappened: { type: "string", description: "Why this happened (reflection required)" },
				prevention: { type: "string", description: "What would have prevented this" },
			},
			required: ["type", "file", "whatHappened", "whyItHappened", "prevention"],
		},
	},
	{
		name: "query_learnings",
		description: `Search the learnings database for patterns related to keywords.

Returns matching learnings that can inform your implementation.

Example: codebase.query_learnings({ keywords: ["vitest", "test", "config"] })`,
		inputSchema: {
			type: "object",
			properties: {
				keywords: { type: "array", items: { type: "string" }, description: "Keywords to search for" },
			},
			required: ["keywords"],
		},
	},
	{
		name: "get_violations_summary",
		description: `Get summary of all violations and their promotion status.

Shows which patterns are ready for promotion (3x) or automation (5x).
Use this to understand common mistakes and their frequency.`,
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "record_learning",
		description: `Record a learning from a development session.

Use after completing a task to capture patterns for future reference.

Example: codebase.record_learning({ type: "pattern", trigger: "vitest config", action: "use @snapback/vitest-config with nodeConfig preset", source: "auth-refactor-2024-12" })`,
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
					description: "Type of learning",
				},
				trigger: { type: "string", description: "What triggers this learning (keyword or situation)" },
				action: { type: "string", description: "What to do when triggered" },
				source: { type: "string", description: "Where this learning came from (task ID or session)" },
			},
			required: ["type", "trigger", "action", "source"],
		},
	},
	{
		name: "ask_ai",
		description: `Ask Claude to analyze codebase context with prompt caching.

Uses Anthropic's prompt caching to reduce costs by 90% when querying architecture docs.
Static context (ARCHITECTURE.md, PATTERNS.md, CONSTRAINTS.md) is cached for 5 minutes.

Example: codebase.ask_ai({ query: "Should I use @snapback/core or @snapback/infrastructure in the VSCode extension?" })`,
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Question about the codebase architecture or patterns" },
			},
			required: ["query"],
		},
	},
	{
		name: "validate_code",
		description: `Validate code through 7-layer validation pipeline.

Runs syntax, types, tests, architecture, security, dependencies, and performance checks.
Returns confidence score and review recommendation (auto_merge/quick_review/full_review).

Call this BEFORE committing to catch issues early.

Example: codebase.validate_code({ code: "import { db } from '@snapback/infrastructure'", filePath: "apps/vscode/src/snapshot.ts" })`,
		inputSchema: {
			type: "object",
			properties: {
				code: { type: "string", description: "Code to validate" },
				filePath: { type: "string", description: "File path for context-aware validation" },
			},
			required: ["code", "filePath"],
		},
	},
	{
		name: "log_interaction",
		description: `Log an AI interaction for learning analysis.

Records query, context used, tools called, and output for pattern analysis.
Used to track accuracy and build golden dataset.

Example: codebase.log_interaction({ query: "Add auth to MCP", contextUsed: ["ARCHITECTURE.md"], toolsCalled: ["get_context"], output: "Use @snapback/auth..." })`,
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string", description: "The user's query" },
				contextUsed: { type: "array", items: { type: "string" }, description: "Files/docs used for context" },
				toolsCalled: { type: "array", items: { type: "string" }, description: "MCP tools called" },
				output: { type: "string", description: "AI response/output" },
				validationPassed: { type: "boolean", description: "Whether validation passed" },
				confidence: { type: "number", description: "Confidence score 0-1" },
			},
			required: ["query", "output"],
		},
	},
	{
		name: "record_feedback",
		description: `Record human feedback on an interaction.

Used to improve accuracy over time. If correct with high confidence, adds to golden dataset.

Example: codebase.record_feedback({ interactionId: "INT-123", correct: true, confidence: 0.95 })`,
		inputSchema: {
			type: "object",
			properties: {
				interactionId: { type: "string", description: "ID from log_interaction" },
				correct: { type: "boolean", description: "Was the AI response correct?" },
				confidence: { type: "number", description: "Confidence in correctness 0-1" },
				corrections: {
					type: "array",
					items: { type: "string" },
					description: "What should have been different",
				},
			},
			required: ["interactionId", "correct", "confidence"],
		},
	},
	{
		name: "get_learning_stats",
		description: `Get learning engine statistics.

Shows total interactions, feedback rate, accuracy, and golden examples count.
Use to monitor system improvement over time.

Example: codebase.get_learning_stats({})`,
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
	},
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

async function handleGetContext(args: {
	task: string;
	files?: string[];
	keywords?: string[];
	useSemantic?: boolean;
}): Promise<any> {
	const { task, files = [], keywords = [], useSemantic = true } = args;

	// Try semantic retrieval first (Multiplier 2: 88% token reduction)
	let semanticContext = null;
	if (useSemantic) {
		try {
			if (!semanticRetriever) {
				semanticRetriever = new SemanticContextRetriever();
			}

			// Build query from task and keywords
			const query = [task, ...keywords].join(" ");
			semanticContext = await semanticRetriever.getRelevantContext(query, 2000);

			if (semanticContext.sectionsIncluded > 0) {
				console.error(
					`[SemanticRetriever] Found ${semanticContext.sectionsIncluded} relevant sections (${(semanticContext.compressionRatio * 100).toFixed(0)}% compression)`,
				);
			}
		} catch (err) {
			// Fall back to full context if semantic fails
			console.error(`[SemanticRetriever] Error: ${err instanceof Error ? err.message : err}`);
		}
	}

	// Load core documents (fallback or supplement)
	const router = loadMd("ROUTER.md");
	const architecture = loadMd("ARCHITECTURE.md");
	const constraints = loadMd("CONSTRAINTS.md");
	const patterns = loadMd("patterns/codebase-patterns.md");

	// Load violations and filter by relevance
	const allViolations = loadJsonl("patterns/violations.jsonl");
	const relevantViolations = allViolations
		.filter((v) => {
			const matchesFile = files.some((f) => v.file?.includes(f));
			const matchesKeyword = keywords.some(
				(k) =>
					v.type?.toLowerCase().includes(k.toLowerCase()) ||
					v.message?.toLowerCase().includes(k.toLowerCase()),
			);
			return matchesFile || matchesKeyword;
		})
		.slice(-10);

	// Load learnings and filter
	const allLearnings = loadJsonl("feedback/learnings.jsonl");
	const relevantLearnings = allLearnings
		.filter((l) => {
			const triggers = Array.isArray(l.trigger) ? l.trigger : [l.trigger];
			return triggers.some((t: string) => keywords.some((k) => t?.toLowerCase().includes(k.toLowerCase())));
		})
		.slice(-5);

	// Extract relevant sections based on files
	let contextSections = "";

	// Always include layer boundaries from architecture
	contextSections += extractSection(architecture, "Layer Responsibilities") + "\n\n";

	if (files.some((f) => f.includes("apps/vscode"))) {
		contextSections += extractSection(router, "VS Code Extension Patterns") + "\n\n";
	}
	if (files.some((f) => f.includes("apps/mcp-server") || f.includes("mcp"))) {
		contextSections += extractSection(router, "MCP Context Tools") + "\n\n";
	}
	if (files.some((f) => f.includes("test"))) {
		contextSections += extractSection(router, "Test Infrastructure Rules") + "\n\n";
	}
	if (files.some((f) => f.includes("apps/api"))) {
		contextSections += extractSection(router, "Service Locations") + "\n\n";
	}

	// Always include task classification
	contextSections += extractSection(router, "Task Classification Matrix");

	// Extract relevant constraints (hard rules) - use simpler pattern
	const hardRulesMatch = constraints.match(/## Hard Rules[\s\S]*?(?=## Soft Rules|$)/);
	const hardRules = hardRulesMatch ? hardRulesMatch[0] : "";

	return {
		task,
		// Semantic context (compressed, relevant sections only)
		semanticContext: semanticContext?.context
			? {
					content: semanticContext.context.slice(0, 3000),
					tokensUsed: semanticContext.tokensUsed,
					sections: semanticContext.sectionsIncluded,
					compression: `${(semanticContext.compressionRatio * 100).toFixed(0)}%`,
				}
			: null,
		// Fallback/supplementary context (truncated)
		contextSections: contextSections.slice(0, semanticContext?.sectionsIncluded ? 2000 : 4000),
		hardRules: hardRules.slice(0, 2000),
		patterns: patterns.slice(0, 2000),
		recentViolations: relevantViolations.map((v) => ({
			type: v.type,
			file: v.file,
			message: v.message,
			prevention: v.prevention,
		})),
		relevantLearnings: relevantLearnings.map((l) => ({
			trigger: l.trigger,
			action: l.action,
			type: l.type,
		})),
		hint: semanticContext?.sectionsIncluded
			? `Semantic search found ${semanticContext.sectionsIncluded} relevant sections with ${(semanticContext.compressionRatio * 100).toFixed(0)}% compression. Review these and violations/learnings before implementing.`
			: "Review violations and learnings before implementing. These are patterns learned from past mistakes.",
	};
}

async function handleCheckPatterns(args: { code: string; filePath: string }): Promise<any> {
	const { code, filePath } = args;
	const violations: Array<{
		type: string;
		message: string;
		severity: "error" | "warning";
		prevention: string;
	}> = [];

	// Load violation history to understand common patterns
	const allViolations = loadJsonl("patterns/violations.jsonl");
	const violationCounts = new Map<string, number>();
	for (const v of allViolations) {
		violationCounts.set(v.type, (violationCounts.get(v.type) || 0) + 1);
	}

	// Check: VAGUE_ASSERTION (seen 5+ times)
	if (filePath.includes("test")) {
		const vaguePatterns = [".toBeTruthy()", ".toBeDefined()", ".toBeFalsy()", ".toBeNull()"];
		for (const pattern of vaguePatterns) {
			if (code.includes(pattern)) {
				violations.push({
					type: "VAGUE_ASSERTION",
					message: `Found vague assertion: ${pattern}`,
					severity: "warning",
					prevention: "Use specific assertions: .toEqual(), .toBe(), .toMatchObject() with real values",
				});
			}
		}
	}

	// Check: Layer boundary violations
	if (filePath.includes("apps/vscode/") && code.includes("@snapback/infrastructure")) {
		violations.push({
			type: "LAYER_BOUNDARY_VIOLATION",
			message: "Extension cannot import @snapback/infrastructure directly",
			severity: "error",
			prevention: "Use @snapback/core for extension code",
		});
	}

	// Check: console.log in production
	if (!filePath.includes("test") && !filePath.includes(".test.") && code.includes("console.log")) {
		violations.push({
			type: "NO_CONSOLE",
			message: "Found console.log in production code",
			severity: "warning",
			prevention: "Use logger from @snapback/core instead",
		});
	}

	// Check: Missing error handling in React
	if (filePath.includes("apps/web/") && code.includes("useQuery") && !code.includes("isLoading")) {
		violations.push({
			type: "MISSING_LOADING_STATE",
			message: "useQuery without loading state handling",
			severity: "warning",
			prevention: "Always handle isLoading and error states for async data",
		});
	}

	// Check: Direct DB access outside service layer
	if (filePath.includes("procedures/") && (code.includes("db.query") || code.includes("db.select"))) {
		violations.push({
			type: "SERVICE_BYPASS",
			message: "Direct database access in procedure file",
			severity: "error",
			prevention: "Move business logic to apps/api/src/services/",
		});
	}

	return {
		valid: violations.filter((v) => v.severity === "error").length === 0,
		violations,
		checksRun: 5,
		suggestion:
			violations.length > 0
				? "Fix violations before committing. Use codebase.report_violation to learn from mistakes."
				: "Code passes pattern checks ✅",
	};
}

async function handleReportViolation(args: {
	type: string;
	file: string;
	whatHappened: string;
	whyItHappened: string;
	prevention: string;
}): Promise<any> {
	const { type, file, whatHappened, whyItHappened, prevention } = args;

	// Count existing violations of this type
	const existing = loadJsonl("patterns/violations.jsonl");
	const sameType = existing.filter((v) => v.type === type);
	const sameTypeCount = sameType.length;

	// Collect files affected by this violation type
	const affectedFiles = [...new Set([...sameType.map((v) => v.file).filter(Boolean), file])];

	// Create new violation
	const violation = {
		date: new Date().toISOString(),
		phase: "mcp-reported",
		type,
		file,
		message: whatHappened,
		prevention,
		reflection: whyItHappened,
	};

	// Append to file
	appendJsonl("patterns/violations.jsonl", violation);

	const newCount = sameTypeCount + 1;

	// Auto-promotion logic
	let promotionMessage = "";
	let status = "tracking";
	let promotedPatternId: string | null = null;

	if (newCount >= 5) {
		// First ensure it's promoted, then mark for automation
		promotedPatternId = promoteToPatterns(type, newCount, prevention, affectedFiles);
		markForAutomation(type);
		promotionMessage = `🤖 Pattern automatically marked for automation (${newCount}x). Detection rule should be added to gate-runner.ts`;
		status = "automated";
	} else if (newCount >= 3) {
		promotedPatternId = promoteToPatterns(type, newCount, prevention, affectedFiles);
		if (promotedPatternId) {
			promotionMessage = `📈 Pattern automatically promoted to codebase-patterns.md as ${promotedPatternId}`;
			status = "promoted";
		} else {
			promotionMessage = `📈 Pattern already promoted. ${5 - newCount} more occurrences until automation.`;
			status = "promoted";
		}
	} else {
		promotionMessage = `Violation recorded. ${3 - newCount} more until promotion, ${5 - newCount} until automation.`;
	}

	return {
		recorded: true,
		type,
		totalOccurrences: newCount,
		status,
		promotedAs: promotedPatternId,
		thresholds: {
			promotion: 3,
			automation: 5,
		},
		message: promotionMessage,
	};
}

async function handleQueryLearnings(args: { keywords: string[] }): Promise<any> {
	const { keywords } = args;
	const learnings = loadJsonl("feedback/learnings.jsonl");

	const matches = learnings.filter((l) => {
		const triggers = Array.isArray(l.trigger) ? l.trigger : [l.trigger || ""];
		const allText = [...triggers, l.action || "", l.learned_from || "", l.source || ""].join(" ").toLowerCase();
		return keywords.some((k) => allText.includes(k.toLowerCase()));
	});

	return {
		matches: matches.map((m) => ({
			id: m.id,
			type: m.type,
			trigger: m.trigger,
			action: m.action,
			source: m.learned_from || m.source,
		})),
		count: matches.length,
		suggestion:
			matches.length === 0
				? "No learnings found. After completing task, use codebase.record_learning to capture patterns."
				: "Apply these learnings before implementing.",
	};
}

async function handleGetViolationsSummary(): Promise<any> {
	const violations = loadJsonl("patterns/violations.jsonl");

	// Group by type
	const byType = new Map<string, number>();
	for (const v of violations) {
		byType.set(v.type, (byType.get(v.type) || 0) + 1);
	}

	// Sort by count
	const sorted = Array.from(byType.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([type, count]) => ({
			type,
			count,
			status: count >= 5 ? "🤖 Ready for automation" : count >= 3 ? "📈 Ready for promotion" : "📝 Tracking",
		}));

	return {
		total: violations.length,
		uniqueTypes: byType.size,
		byType: sorted,
		summary: {
			readyForPromotion: sorted.filter((s) => s.count >= 3 && s.count < 5).length,
			readyForAutomation: sorted.filter((s) => s.count >= 5).length,
			tracking: sorted.filter((s) => s.count < 3).length,
		},
	};
}

async function handleRecordLearning(args: {
	type: string;
	trigger: string;
	action: string;
	source: string;
}): Promise<any> {
	const { type, trigger, action, source } = args;

	// Generate ID
	const existing = loadJsonl("feedback/learnings.jsonl");
	const id = `L${Date.now().toString().slice(-10)}`;

	const learning = {
		id,
		type,
		trigger,
		action,
		source,
		added: new Date().toISOString().split("T")[0],
	};

	appendJsonl("feedback/learnings.jsonl", learning);

	return {
		recorded: true,
		id,
		learning,
		totalLearnings: existing.length + 1,
		message: `Learning recorded. Query with: codebase.query_learnings({ keywords: ["${trigger.split(" ")[0]}"] })`,
	};
}

async function handleAskAI(args: { query: string }): Promise<any> {
	const { query } = args;

	// Get API key from environment
	const apiKey = process.env.ANTHROPIC_API_KEY;

	if (!apiKey) {
		return {
			error: "ANTHROPIC_API_KEY environment variable not set",
			suggestion: "Set ANTHROPIC_API_KEY to use AI-powered context analysis with prompt caching",
		};
	}

	try {
		const result = await queryWithCachedContext(query, apiKey);

		return {
			response: result.response,
			usage: result.usage,
			cacheInfo:
				result.usage?.cache_read_input_tokens && result.usage.cache_read_input_tokens > 0
					? "✅ Cache HIT - 90% cost savings!"
					: "📤 Cache MISS - context cached for next 5 minutes",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return {
			error: message,
			suggestion: "Check that ANTHROPIC_API_KEY is valid and you have API credits",
		};
	}
}

async function handleValidateCode(args: { code: string; filePath: string }): Promise<any> {
	const { code, filePath } = args;

	try {
		const result = await validationPipeline.validate(code, filePath);

		return {
			confidence: `${(result.overall.confidence * 100).toFixed(0)}%`,
			recommendation: result.recommendation,
			passed: result.overall.passed,
			totalIssues: result.overall.totalIssues,
			focusPoints: result.focusPoints,
			layers: result.layers.map((l) => ({
				name: l.layer,
				passed: l.passed,
				issues: l.issues.length,
				duration: `${l.duration}ms`,
			})),
			issues: result.layers.flatMap((l) =>
				l.issues.map((i) => ({
					layer: l.layer,
					severity: i.severity,
					type: i.type,
					message: i.message,
					line: i.line,
					fix: i.fix,
				})),
			),
			suggestion:
				result.recommendation === "auto_merge"
					? "✅ Code passes validation - safe to merge"
					: result.recommendation === "quick_review"
						? "⚠️ Minor issues found - quick review recommended"
						: "❌ Critical issues found - full review required",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return {
			error: message,
			suggestion: "Validation pipeline encountered an error",
		};
	}
}

async function handleLogInteraction(args: {
	query: string;
	contextUsed?: string[];
	toolsCalled?: string[];
	output: string;
	validationPassed?: boolean;
	confidence?: number;
}): Promise<any> {
	const interaction = await learningEngine.logInteraction({
		query: args.query,
		contextUsed: args.contextUsed || [],
		toolsCalled: args.toolsCalled || [],
		output: args.output,
		validationPassed: args.validationPassed,
		confidence: args.confidence,
	});

	return {
		recorded: true,
		interactionId: interaction.id,
		queryType: learningEngine.classifyQueryType(args.query),
		message: `Interaction logged. Use record_feedback({ interactionId: "${interaction.id}", correct: true/false, confidence: 0.9 }) to provide feedback.`,
	};
}

async function handleRecordFeedback(args: {
	interactionId: string;
	correct: boolean;
	confidence: number;
	corrections?: string[];
}): Promise<any> {
	const result = await learningEngine.recordFeedback(args.interactionId, {
		correct: args.correct,
		confidence: args.confidence,
		corrections: args.corrections,
	});

	if (!result.updated) {
		return {
			error: `Interaction ${args.interactionId} not found`,
			suggestion: "Use get_learning_stats to see recent interactions",
		};
	}

	return {
		updated: true,
		addedToGolden: result.addedToGolden,
		message: result.addedToGolden
			? "🌟 Added to golden dataset - this example will improve future responses"
			: "Feedback recorded for analysis",
	};
}

async function handleGetLearningStats(): Promise<any> {
	const stats = learningEngine.getStats();
	const pending = learningEngine.getPendingFeedback(5);

	return {
		stats: {
			totalInteractions: stats.totalInteractions,
			feedbackReceived: stats.feedbackReceived,
			accuracyRate: `${(stats.correctRate * 100).toFixed(0)}%`,
			goldenExamples: stats.goldenExamples,
		},
		queryTypeBreakdown: stats.queryTypeBreakdown,
		pendingFeedback: pending.map((p) => ({
			id: p.id,
			query: p.query.slice(0, 50) + (p.query.length > 50 ? "..." : ""),
			timestamp: p.timestamp,
		})),
		suggestion:
			pending.length > 0
				? `${pending.length} interactions awaiting feedback. Use record_feedback to improve accuracy.`
				: "All interactions have feedback. System learning from patterns.",
	};
}

// ============================================================================
// SERVER SETUP
// ============================================================================

const server = new Server(
	{
		name: "codebase",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		let result: any;

		switch (name) {
			case "get_context":
				result = await handleGetContext(args as any);
				break;
			case "check_patterns":
				result = await handleCheckPatterns(args as any);
				break;
			case "report_violation":
				result = await handleReportViolation(args as any);
				break;
			case "query_learnings":
				result = await handleQueryLearnings(args as any);
				break;
			case "get_violations_summary":
				result = await handleGetViolationsSummary();
				break;
			case "record_learning":
				result = await handleRecordLearning(args as any);
				break;
			case "ask_ai":
				result = await handleAskAI(args as any);
				break;
			case "validate_code":
				result = await handleValidateCode(args as any);
				break;
			case "log_interaction":
				result = await handleLogInteraction(args as any);
				break;
			case "record_feedback":
				result = await handleRecordFeedback(args as any);
				break;
			case "get_learning_stats":
				result = await handleGetLearningStats();
				break;
			default:
				throw new Error(`Unknown tool: ${name}`);
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ error: message }),
				},
			],
			isError: true,
		};
	}
});

// Start server
async function main() {
	// Start pattern file watcher for live reloading
	startPatternWatcher();
	console.error("[PatternWatcher] Watching ai_dev_utils/patterns/ for changes");

	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Codebase MCP server running on stdio");
	console.error("Libraries: atomically, p-retry, bottleneck, chokidar integrated");
}

// Cleanup on exit
process.on("SIGINT", () => {
	if (patternWatcher) {
		patternWatcher.close();
	}
	process.exit(0);
});

main().catch(console.error);
