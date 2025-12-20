/**
 * Learning Engine
 *
 * Implements Multiplier 4 from unified_context_system.md:
 * - Interaction logging for analysis
 * - Human feedback recording
 * - Golden dataset building (5+ perfect examples → add to context)
 * - Query classification for pattern matching
 *
 * Libraries:
 * - atomically: Safe file writes to prevent corruption
 *
 * Accuracy Impact:
 * - Day 1: 60% accuracy
 * - Month 2: 95% accuracy (via continuous learning)
 */

import { writeFile } from "atomically";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DEV_UTILS = path.resolve(__dirname, "..");

// ============================================================================
// TYPES
// ============================================================================

export interface Interaction {
	id: string;
	timestamp: string;
	query: string;
	contextUsed: string[];
	toolsCalled: string[];
	output: string;
	validationPassed?: boolean;
	confidence?: number;
	humanFeedback?: HumanFeedback;
}

export interface HumanFeedback {
	correct: boolean;
	confidence: number;
	corrections?: string[];
	timeSpent?: number;
	timestamp: string;
}

export interface GoldenExample {
	id: string;
	queryType: string;
	query: string;
	output: string;
	contextUsed: string[];
	addedAt: string;
}

export interface LearningStats {
	totalInteractions: number;
	feedbackReceived: number;
	correctRate: number;
	goldenExamples: number;
	queryTypeBreakdown: Record<string, number>;
}

// ============================================================================
// UTILITIES
// ============================================================================

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

function appendJsonl(filepath: string, data: any): void {
	const fullPath = path.join(AI_DEV_UTILS, filepath);
	const dir = path.dirname(fullPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.appendFileSync(fullPath, JSON.stringify(data) + "\n");
}

/**
 * Append to JSONL file (async atomic version)
 */
async function appendJsonlAsync(filepath: string, data: any): Promise<void> {
	const fullPath = path.join(AI_DEV_UTILS, filepath);
	const dir = path.dirname(fullPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	try {
		const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : "";
		await writeFile(fullPath, existing + JSON.stringify(data) + "\n");
	} catch {
		// Fallback to sync
		fs.appendFileSync(fullPath, JSON.stringify(data) + "\n");
	}
}

function generateId(): string {
	return `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// LEARNING ENGINE
// ============================================================================

export class LearningEngine {
	private interactionsPath = "feedback/interactions.jsonl";
	private goldenPath = "feedback/golden.jsonl";

	/**
	 * Log an interaction for analysis
	 */
	async logInteraction(data: {
		query: string;
		contextUsed: string[];
		toolsCalled: string[];
		output: string;
		validationPassed?: boolean;
		confidence?: number;
	}): Promise<Interaction> {
		const interaction: Interaction = {
			id: generateId(),
			timestamp: new Date().toISOString(),
			...data,
		};

		appendJsonl(this.interactionsPath, interaction);

		return interaction;
	}

	/**
	 * Record human feedback on an interaction
	 */
	async recordFeedback(
		interactionId: string,
		feedback: Omit<HumanFeedback, "timestamp">,
	): Promise<{ updated: boolean; addedToGolden: boolean }> {
		// Load interactions
		const interactions = loadJsonl(this.interactionsPath);
		const interaction = interactions.find((i) => i.id === interactionId);

		if (!interaction) {
			return { updated: false, addedToGolden: false };
		}

		// Add feedback
		interaction.humanFeedback = {
			...feedback,
			timestamp: new Date().toISOString(),
		};

		// Rewrite file with updated interaction (atomic)
		const fullPath = path.join(AI_DEV_UTILS, this.interactionsPath);
		const updated = interactions.map((i) => JSON.stringify(i)).join("\n") + "\n";
		try {
			await writeFile(fullPath, updated);
		} catch {
			// Fallback to sync
			fs.writeFileSync(fullPath, updated);
		}

		// If correct with high confidence, consider for golden dataset
		let addedToGolden = false;
		if (feedback.correct && feedback.confidence >= 0.9) {
			await this.addToGoldenDataset(interaction);
			addedToGolden = true;
		}

		return { updated: true, addedToGolden };
	}

	/**
	 * Add a perfect interaction to golden dataset
	 */
	private async addToGoldenDataset(interaction: Interaction): Promise<void> {
		const queryType = this.classifyQueryType(interaction.query);

		const goldenExample: GoldenExample = {
			id: interaction.id,
			queryType,
			query: interaction.query,
			output: interaction.output,
			contextUsed: interaction.contextUsed,
			addedAt: new Date().toISOString(),
		};

		appendJsonl(this.goldenPath, goldenExample);

		// Check if we have enough examples to promote to context
		await this.checkGoldenPromotion(queryType);
	}

	/**
	 * Check if query type has enough golden examples to promote
	 */
	private async checkGoldenPromotion(queryType: string): Promise<void> {
		const golden = loadJsonl(this.goldenPath);
		const forType = golden.filter((g) => g.queryType === queryType);

		if (forType.length >= 5) {
			console.error(
				`[LearningEngine] 🌟 ${queryType} has ${forType.length} golden examples - ready for context promotion`,
			);
			// Could auto-add to PATTERNS.md or similar
		}
	}

	/**
	 * Classify query into category for pattern matching
	 */
	classifyQueryType(query: string): string {
		const q = query.toLowerCase();

		// Authentication & Security
		if (q.includes("auth") || q.includes("login") || q.includes("session") || q.includes("permission")) {
			return "authentication";
		}

		// Testing
		if (q.includes("test") || q.includes("vitest") || q.includes("coverage") || q.includes("mock")) {
			return "testing";
		}

		// API & Backend
		if (q.includes("api") || q.includes("endpoint") || q.includes("route") || q.includes("procedure")) {
			return "api";
		}

		// Database
		if (q.includes("database") || q.includes("query") || q.includes("sql") || q.includes("migration")) {
			return "database";
		}

		// UI & Components
		if (q.includes("component") || q.includes("ui") || q.includes("react") || q.includes("button")) {
			return "ui";
		}

		// VS Code Extension
		if (q.includes("vscode") || q.includes("extension") || q.includes("command") || q.includes("activation")) {
			return "vscode";
		}

		// MCP
		if (q.includes("mcp") || q.includes("tool") || q.includes("context")) {
			return "mcp";
		}

		// Performance
		if (q.includes("performance") || q.includes("slow") || q.includes("optimize") || q.includes("speed")) {
			return "performance";
		}

		// Architecture
		if (q.includes("architecture") || q.includes("layer") || q.includes("import") || q.includes("pattern")) {
			return "architecture";
		}

		return "general";
	}

	/**
	 * Get golden examples for a query type
	 */
	getGoldenExamples(queryType: string, limit = 3): GoldenExample[] {
		const golden = loadJsonl(this.goldenPath);
		return golden.filter((g) => g.queryType === queryType).slice(-limit);
	}

	/**
	 * Get learning statistics
	 */
	getStats(): LearningStats {
		const interactions = loadJsonl(this.interactionsPath);
		const golden = loadJsonl(this.goldenPath);

		const withFeedback = interactions.filter((i) => i.humanFeedback);
		const correct = withFeedback.filter((i) => i.humanFeedback?.correct);

		// Query type breakdown
		const queryTypeBreakdown: Record<string, number> = {};
		for (const i of interactions) {
			const type = this.classifyQueryType(i.query);
			queryTypeBreakdown[type] = (queryTypeBreakdown[type] || 0) + 1;
		}

		return {
			totalInteractions: interactions.length,
			feedbackReceived: withFeedback.length,
			correctRate: withFeedback.length > 0 ? correct.length / withFeedback.length : 0,
			goldenExamples: golden.length,
			queryTypeBreakdown,
		};
	}

	/**
	 * Get recent interactions for review
	 */
	getRecentInteractions(limit = 10): Interaction[] {
		const interactions = loadJsonl(this.interactionsPath);
		return interactions.slice(-limit);
	}

	/**
	 * Get interactions needing feedback
	 */
	getPendingFeedback(limit = 5): Interaction[] {
		const interactions = loadJsonl(this.interactionsPath);
		return interactions.filter((i) => !i.humanFeedback).slice(-limit);
	}
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const learningEngine = new LearningEngine();

// ============================================================================
// TEST FUNCTION
// ============================================================================

export async function testLearningEngine(): Promise<void> {
	console.error("\n🧪 Testing Learning Engine...\n");

	const engine = new LearningEngine();

	// Log some test interactions
	const interaction1 = await engine.logInteraction({
		query: "How do I add authentication to the MCP server?",
		contextUsed: ["ARCHITECTURE.md", "patterns/codebase-patterns.md"],
		toolsCalled: ["get_context", "check_patterns"],
		output: "Use @snapback/auth package with verifyApiKey method...",
		validationPassed: true,
		confidence: 0.92,
	});
	console.error(`📝 Logged interaction: ${interaction1.id}`);
	console.error(`   Query type: ${engine.classifyQueryType(interaction1.query)}`);

	const interaction2 = await engine.logInteraction({
		query: "Fix the failing vitest tests in API package",
		contextUsed: ["CONSTRAINTS.md"],
		toolsCalled: ["get_context", "validate_code"],
		output: "Tests need specific assertions instead of toBeTruthy...",
		validationPassed: true,
		confidence: 0.85,
	});
	console.error(`📝 Logged interaction: ${interaction2.id}`);
	console.error(`   Query type: ${engine.classifyQueryType(interaction2.query)}`);

	// Record feedback on first interaction
	const feedbackResult = await engine.recordFeedback(interaction1.id, {
		correct: true,
		confidence: 0.95,
	});
	console.error(`\n✅ Recorded feedback: updated=${feedbackResult.updated}, golden=${feedbackResult.addedToGolden}`);

	// Get stats
	const stats = engine.getStats();
	console.error("\n📊 Learning Stats:");
	console.error(`   Total interactions: ${stats.totalInteractions}`);
	console.error(`   Feedback received: ${stats.feedbackReceived}`);
	console.error(`   Correct rate: ${(stats.correctRate * 100).toFixed(0)}%`);
	console.error(`   Golden examples: ${stats.goldenExamples}`);
	console.error(`   Query types: ${JSON.stringify(stats.queryTypeBreakdown)}`);

	// Get pending feedback
	const pending = engine.getPendingFeedback();
	console.error(`\n⏳ Pending feedback: ${pending.length} interactions`);

	console.error("\n✅ Learning engine test complete!");
}
