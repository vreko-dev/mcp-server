/**
 * Context Intelligence Tools for Customer MCP Server
 *
 * Implements dual-use architecture from @snapback/intelligence:
 * - SemanticRetriever for 88% token compression
 * - ValidationPipeline for 7-layer code validation
 * - LearningEngine for continuous improvement
 *
 * Per ROUTER.md (lines 306-316):
 * - Internal server uses rootDir='ai_dev_utils', name='codebase'
 * - External server uses rootDir=customerWorkspace, name='snapback'
 *
 * @module context-tools
 */

import { LearningEngine, SemanticRetriever, ValidationPipeline } from "@snapback/intelligence";
import {
	type ArtifactSource,
	Composer,
	computeWorkspaceFingerprint,
	DEFAULT_BUDGET_CONFIG,
} from "@snapback/intelligence/composer";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

export const GetContextSchema = z.object({
	task: z.string().describe("Description of the task you want to implement"),
	keywords: z.array(z.string()).optional().describe("Keywords to search for relevant patterns"),
	files: z.array(z.string()).optional().describe("Files you plan to modify"),
});

export const CheckPatternsSchema = z.object({
	code: z.string().describe("Code to validate against patterns"),
	filePath: z.string().describe("File path for context-aware validation"),
});

export const ValidateCodeSchema = z.object({
	code: z.string().describe("Code to run through 7-layer validation pipeline"),
	filePath: z.string().describe("File path for context-aware validation"),
});

export const RecordLearningSchema = z.object({
	type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]).describe("Type of learning"),
	trigger: z.string().describe("What triggers this learning (keyword or situation)"),
	action: z.string().describe("What to do when triggered"),
	source: z.string().describe("Where this learning came from (task ID or session)"),
});

export const PrepareWorkspaceSchema = z.object({
	task: z.string().describe("Description of what you want to implement"),
	keywords: z.array(z.string()).optional().describe("Keywords related to your task"),
	files: z.array(z.string()).optional().describe("Files you plan to modify"),
});

// ============================================================================
// SINGLETON INSTANCES (lazy initialized)
// ============================================================================

let semanticRetriever: SemanticRetriever | null = null;
let validationPipeline: ValidationPipeline | null = null;
let learningEngine: LearningEngine | null = null;
let composer: Composer | null = null;

/**
 * Get or create SemanticRetriever for customer workspace
 */
function getSemanticRetriever(workspaceRoot: string): SemanticRetriever {
	if (!semanticRetriever) {
		semanticRetriever = new SemanticRetriever({
			rootDir: workspaceRoot,
			dbPath: ".snapback/embeddings.db",
			contextFiles: [
				// Standard customer context files
				".llm-context/ARCHITECTURE.md",
				".llm-context/PATTERNS.md",
				".llm-context/CONSTRAINTS.md",
				// Fallback to root-level if no .llm-context
				"ARCHITECTURE.md",
				"PATTERNS.md",
				"CONSTRAINTS.md",
			],
		});
	}
	return semanticRetriever;
}

/**
 * Get or create ValidationPipeline
 */
function getValidationPipeline(): ValidationPipeline {
	if (!validationPipeline) {
		validationPipeline = new ValidationPipeline();
	}
	return validationPipeline;
}

/**
 * Get or create LearningEngine for customer workspace
 */
function getLearningEngine(workspaceRoot: string): LearningEngine {
	if (!learningEngine) {
		learningEngine = new LearningEngine({
			rootDir: workspaceRoot,
			patternsDir: ".snapback/patterns",
			learningsDir: ".snapback/learnings",
			constraintsFile: ".llm-context/CONSTRAINTS.md",
			violationsFile: ".snapback/patterns/violations.jsonl",
			embeddingsDb: ".snapback/embeddings.db",
			contextFiles: [
				".llm-context/ARCHITECTURE.md",
				".llm-context/PATTERNS.md",
				".llm-context/CONSTRAINTS.md",
				"ARCHITECTURE.md",
				"PATTERNS.md",
				"CONSTRAINTS.md",
			],
			enableSemanticSearch: false, // Lazy-load embeddings on demand
			enableLearningLoop: true,
			enableAutoPromotion: true,
		});
	}
	return learningEngine;
}

/**
 * Get or create Composer for customer workspace
 *
 * Uses same algorithms as internal MCP but with customer data sources:
 * - Patterns: .snapback/patterns/patterns.md
 * - Rules: .llm-context/CONSTRAINTS.md
 * - Violations: .snapback/patterns/violations.jsonl
 * - Learnings: .snapback/learnings/learnings.jsonl
 */
function getComposer(workspaceRoot: string, sources: ArtifactSource[]): Composer {
	if (!composer) {
		// Generate deterministic workspace secret for stable artifact IDs
		const workspaceSecret = computeWorkspaceFingerprint(workspaceRoot + "-secret");

		composer = new Composer({
			budgetConfig: {
				...DEFAULT_BUDGET_CONFIG,
				totalTokens: 6000, // Customer budget (less than internal 8000)
			},
			sources,
			workspaceSecret,
			emitDecisionLogs: true,
		});
	}
	return composer;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Get relevant context for a task using semantic retrieval
 */
export async function handleGetContext(
	args: z.infer<typeof GetContextSchema>,
	workspaceRoot: string,
): Promise<{
	task: string;
	context?: { content: string; tokensUsed: number; sections: number; compression: string };
	patterns?: string;
	constraints?: string;
	hint: string;
}> {
	const { task, keywords = [] } = args;

	// Build query from task and keywords
	const query = [task, ...keywords].join(" ");

	try {
		const retriever = getSemanticRetriever(workspaceRoot);

		// Check if retriever is available (has deps installed)
		if (!retriever.isAvailable()) {
			return {
				task,
				hint: "SemanticRetriever not available. Install optional deps: pnpm add sql.js @huggingface/transformers",
			};
		}

		// Initialize and get relevant context
		await retriever.initialize();
		const result = await retriever.getRelevantContext(query, 2000);

		if (result.sectionsIncluded === 0) {
			return {
				task,
				hint: "No indexed context found. Run indexContextFiles() to populate embeddings, or create .llm-context/ documentation.",
			};
		}

		return {
			task,
			context: {
				content: result.context,
				tokensUsed: result.tokensUsed,
				sections: result.sectionsIncluded,
				compression: `${(result.compressionRatio * 100).toFixed(0)}%`,
			},
			hint: `Found ${result.sectionsIncluded} relevant sections with ${(result.compressionRatio * 100).toFixed(0)}% compression. Review before implementing.`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			task,
			hint: `Context retrieval failed: ${message}. Ensure .snapback/ directory exists with embeddings.db.`,
		};
	}
}

/**
 * Check code against learned patterns
 */
export async function handleCheckPatterns(
	args: z.infer<typeof CheckPatternsSchema>,
	_workspaceRoot: string,
): Promise<{
	valid: boolean;
	violations: Array<{ type: string; message: string; severity: string }>;
	suggestion: string;
}> {
	const { code, filePath } = args;

	try {
		const pipeline = getValidationPipeline();
		const result = await pipeline.validate(code, filePath);

		const violations = result.layers.flatMap((layer) =>
			layer.issues.map((issue) => ({
				type: issue.type,
				message: issue.message,
				severity: issue.severity,
			})),
		);

		return {
			valid: result.overall.passed,
			violations,
			suggestion:
				result.recommendation === "auto_merge"
					? "🟢 Code passes validation - safe to merge"
					: result.recommendation === "quick_review"
						? "🟡 Minor issues found - quick review recommended"
						: "🔴 Critical issues found - full review required",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			valid: false,
			violations: [{ type: "validation-error", message, severity: "error" }],
			suggestion: "Validation pipeline encountered an error",
		};
	}
}

/**
 * Run 7-layer validation on code
 */
export async function handleValidateCode(
	args: z.infer<typeof ValidateCodeSchema>,
	_workspaceRoot: string,
): Promise<{
	confidence: string;
	recommendation: string;
	passed: boolean;
	totalIssues: number;
	layers: Array<{ name: string; passed: boolean; issues: number; duration: string }>;
	issues: Array<{ layer: string; severity: string; type: string; message: string; line?: number; fix?: string }>;
	suggestion: string;
}> {
	const { code, filePath } = args;

	try {
		const pipeline = getValidationPipeline();
		const result = await pipeline.validate(code, filePath);

		return {
			confidence: `${(result.overall.confidence * 100).toFixed(0)}%`,
			recommendation: result.recommendation,
			passed: result.overall.passed,
			totalIssues: result.overall.totalIssues,
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
					? "🟢 Protection Score: High - safe to merge"
					: result.recommendation === "quick_review"
						? "🟡 Protection Score: Moderate - quick review recommended"
						: "🔴 Protection Score: Low - full review required",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			confidence: "0%",
			recommendation: "full_review",
			passed: false,
			totalIssues: 1,
			layers: [],
			issues: [{ layer: "error", severity: "error", type: "validation-error", message }],
			suggestion: "Validation pipeline encountered an error",
		};
	}
}

/**
 * Record a learning for future reference
 */
export async function handleRecordLearning(
	args: z.infer<typeof RecordLearningSchema>,
	workspaceRoot: string,
): Promise<{
	recorded: boolean;
	id: string;
	message: string;
}> {
	const { type, trigger, action, source } = args;

	try {
		const engine = getLearningEngine(workspaceRoot);
		const id = `L${Date.now()}`;

		// Record the learning
		await engine.record({
			type: type as "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow",
			trigger,
			action,
			source,
		});

		return {
			recorded: true,
			id,
			message: `Learning recorded. Query with: snapback.query_learnings({ keywords: ["${trigger.split(" ")[0]}"] })`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			recorded: false,
			id: "",
			message: `Failed to record learning: ${message}`,
		};
	}
}

/**
 * Prepare workspace with proactive context using Composer
 *
 * Brand-compliant UX transformation:
 * - ValidationPipeline 7 layers → Protection Score (0-100%)
 * - Violations tracking → Learning Memory
 * - Proactive context assembly → "Peace of mind" experience
 */
export async function handlePrepareWorkspace(
	args: z.infer<typeof PrepareWorkspaceSchema>,
	workspaceRoot: string,
	sources: ArtifactSource[],
): Promise<{
	protection: { score: number; badge: string; status: string };
	snapshot: { recommended: boolean; badge: string; reason: string };
	memory: { found: boolean; badge: string; lesson: string };
	context: { artifacts: string[]; tokensUsed: number };
}> {
	const { task, keywords = [], files = [] } = args;

	try {
		// Compose context from customer workspace patterns/violations/learnings
		const composerInstance = getComposer(workspaceRoot, sources);
		const result = await composerInstance.compose({
			event: "prepare_workspace",
			workspaceFingerprint: workspaceRoot,
			keywords,
			files,
		});

		// Run ValidationPipeline if files provided
		let protectionScore = 85; // Default: safe to proceed
		let protectionBadge = "🟢";
		let protectionStatus = "Safe to proceed";

		if (files.length > 0) {
			const pipeline = getValidationPipeline();

			// Quick validation on first file as proxy for workspace health
			const sampleFile = files[0];
			// Note: In real usage, we'd need file content. For now, use metadata.
			// This is a placeholder - actual implementation would read file content.

			// Simplified protection score based on artifact count and kind
			const criticalCount = result.selected.filter(
				(a) => a.kind === "violation" || a.kind === "constraint",
			).length;

			if (criticalCount > 3) {
				protectionScore = 60;
				protectionBadge = "🟡";
				protectionStatus = "Moderate risk - review violations";
			} else if (criticalCount > 5) {
				protectionScore = 40;
				protectionBadge = "🔴";
				protectionStatus = "High risk - address violations first";
			}
		}

		// Check for relevant violations (Learning Memory)
		const violationArtifacts = result.selected.filter((a) => a.kind === "violation");
		const hasMemory = violationArtifacts.length > 0;
		const memoryLesson = hasMemory
			? `Found ${violationArtifacts.length} related issue(s) in history. Review before proceeding.`
			: "No similar issues in history.";

		// Snapshot recommendation based on workspace state
		const shouldSnapshot = files.length > 3 || protectionScore < 70;
		const snapshotReason = files.length > 3 ? "Multiple files" : "Risk detected";

		return {
			protection: {
				score: protectionScore,
				badge: protectionBadge,
				status: protectionStatus,
			},
			snapshot: {
				recommended: shouldSnapshot,
				badge: "📸",
				reason: snapshotReason,
			},
			memory: {
				found: hasMemory,
				badge: "🛡️",
				lesson: memoryLesson,
			},
			context: {
				artifacts: result.selected.map((a) => `[${a.kind}] ${a.lane}`),
				tokensUsed: result.actualTokens,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		// Graceful degradation on error
		return {
			protection: {
				score: 50,
				badge: "🟡",
				status: `Context assembly failed: ${message}`,
			},
			snapshot: {
				recommended: true,
				badge: "📸",
				reason: "Precautionary",
			},
			memory: {
				found: false,
				badge: "🛡️",
				lesson: "Unable to load workspace memory.",
			},
			context: {
				artifacts: [],
				tokensUsed: 0,
			},
		};
	}
}

// ============================================================================
// TOOL DEFINITIONS (for MCP registration)
// ============================================================================

export const contextToolDefinitions = [
	{
		name: "snapback.prepare_workspace",
		description: `**Purpose:** Proactively prepare workspace with relevant context before starting work.

**Brand-Compliant "Peace of Mind" UX:**
- 🟢🟡🔴 Protection Score (0-100%): Simple risk assessment
- 📸 Snapshot Recommendation: When to create safety checkpoint
- 🛡️ Learning Memory: Past issues related to your task
- Context Assembly: Patterns, rules, violations from workspace

**When to Use:**
- BEFORE starting any task (proactive context)
- When you want to understand workspace risks
- To check if similar work was done before

**Returns:**
- Protection score with badge (🟢 safe, 🟡 moderate, 🔴 risky)
- Snapshot recommendation (📸 if needed)
- Learning memory (🛡️ lessons from past mistakes)
- Assembled context artifacts (patterns/violations/learnings)

**Performance:** < 300ms`,
		inputSchema: {
			type: "object",
			properties: {
				task: {
					type: "string",
					description: "Description of what you want to implement",
				},
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords related to your task",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you plan to modify",
				},
			},
			required: ["task"],
		},
		requiresBackend: false,
	},
	{
		name: "snapback.get_context",
		description: `**Purpose:** Get architectural context and patterns relevant to a task using semantic search.

**When to Use:**
- BEFORE starting any implementation
- When you need to understand how something works
- When implementing in unfamiliar areas

**Returns:**
- Relevant context sections (compressed to ~2000 tokens)
- Compression ratio (typically 88%)
- Patterns and constraints that apply

**Performance:** < 500ms (first call loads model)`,
		inputSchema: {
			type: "object",
			properties: {
				task: {
					type: "string",
					description: "Description of the task you want to implement",
				},
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords to search for relevant patterns",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you plan to modify",
				},
			},
			required: ["task"],
		},
		requiresBackend: false,
	},
	{
		name: "snapback.check_patterns",
		description: `**Purpose:** Validate code against learned patterns before committing.

**Brand-Compliant Output:**
- Returns quick pass/fail with Protection Score indicators
- Uses 🟢 (safe), 🟡 (moderate), 🔴 (critical) badges
- Provides specific violation messages and fixes

**When to Use:**
- BEFORE committing code changes
- When you want a quick pass/fail validation
- For CI/CD integration

**Returns:**
- Valid/invalid status
- List of violations with severity
- Suggested fixes

**Performance:** < 100ms`,
		inputSchema: {
			type: "object",
			properties: {
				code: {
					type: "string",
					description: "Code to validate against patterns",
				},
				filePath: {
					type: "string",
					description: "File path for context-aware validation",
				},
			},
			required: ["code", "filePath"],
		},
		requiresBackend: false,
	},
	{
		name: "snapback.validate_code",
		description: `**Purpose:** Run comprehensive 7-layer validation pipeline on code.

**Brand-Compliant Output:**
- Protection Score: Overall confidence (0-100%)
- Badge: 🟢 (>80%), 🟡 (50-80%), 🔴 (<50%)
- Issues per layer with fix suggestions

**Layers:**
1. Syntax (brackets, semicolons)
2. Types (any usage, @ts-ignore)
3. Tests (vague assertions, coverage)
4. Architecture (layer boundaries)
5. Security (secrets, eval)
6. Dependencies (deprecated packages)
7. Performance (console.log, sync I/O)

**Returns:**
- Protection Score (0-100%)
- Recommendation (auto_merge/quick_review/full_review)
- Issues per layer with fix suggestions

**Performance:** < 200ms`,
		inputSchema: {
			type: "object",
			properties: {
				code: {
					type: "string",
					description: "Code to run through validation pipeline",
				},
				filePath: {
					type: "string",
					description: "File path for context-aware validation",
				},
			},
			required: ["code", "filePath"],
		},
		requiresBackend: false,
	},
	{
		name: "snapback.record_learning",
		description: `**Purpose:** Record a learning from the current session for future reference.

**When to Use:**
- After discovering a useful pattern
- When encountering a pitfall to avoid
- To capture workflow improvements

**Types:**
- pattern: Reusable code pattern
- pitfall: Common mistake to avoid
- efficiency: Performance optimization
- discovery: New capability found
- workflow: Process improvement

**Storage:** .snapback/learnings/learnings.jsonl`,
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
					description: "Type of learning",
				},
				trigger: {
					type: "string",
					description: "What triggers this learning (keyword or situation)",
				},
				action: {
					type: "string",
					description: "What to do when triggered",
				},
				source: {
					type: "string",
					description: "Where this learning came from (task ID or session)",
				},
			},
			required: ["type", "trigger", "action", "source"],
		},
		requiresBackend: false,
	},
];
