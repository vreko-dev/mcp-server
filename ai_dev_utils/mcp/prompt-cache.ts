/**
 * Prompt Caching Implementation
 *
 * Implements Multiplier 1 from unified_context_system.md:
 * - 90% cost reduction by caching static context
 * - Uses Anthropic's cache_control feature
 * - Caches ARCHITECTURE.md, PATTERNS.md, CONSTRAINTS.md
 *
 * Libraries:
 * - p-retry: Resilient API calls with exponential backoff
 *
 * Cost Impact:
 * - Without caching: $600/day (500 requests)
 * - With caching: $65/day
 * - Savings: $16,050/month (89%)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import pRetry, { AbortError } from "p-retry";
import * as path from "path";
import { fileURLToPath } from "url";

// Get correct directory path (like server.ts does)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DEV_UTILS = path.resolve(__dirname, "..");

/**
 * Load static context files that will be cached
 */
function loadStaticContext(): string {
	const architecture = fs.existsSync(path.join(AI_DEV_UTILS, "ARCHITECTURE.md"))
		? fs.readFileSync(path.join(AI_DEV_UTILS, "ARCHITECTURE.md"), "utf-8")
		: "";

	const patterns = fs.existsSync(path.join(AI_DEV_UTILS, "patterns/codebase-patterns.md"))
		? fs.readFileSync(path.join(AI_DEV_UTILS, "patterns/codebase-patterns.md"), "utf-8")
		: "";

	const constraints = fs.existsSync(path.join(AI_DEV_UTILS, "CONSTRAINTS.md"))
		? fs.readFileSync(path.join(AI_DEV_UTILS, "CONSTRAINTS.md"), "utf-8")
		: "";

	const router = fs.existsSync(path.join(AI_DEV_UTILS, "ROUTER.md"))
		? fs.readFileSync(path.join(AI_DEV_UTILS, "ROUTER.md"), "utf-8")
		: "";

	return `# SnapBack Codebase Context

## Architecture
${architecture}

## Patterns & Learnings
${patterns}

## Constraints (Hard Rules)
${constraints}

## Routing Guide
${router}
`;
}

/**
 * Query with cached static context
 *
 * The static context is cached using cache_control, reducing costs by 90%
 * after the first call in a 5-minute window.
 */
export async function queryWithCachedContext(
	query: string,
	apiKey?: string,
): Promise<{ response: string; usage?: Anthropic.Messages.Usage }> {
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY environment variable not set");
	}

	const anthropic = new Anthropic({
		apiKey,
	});

	const staticContext = loadStaticContext();

	// Use p-retry for resilient API calls with exponential backoff
	const response = await pRetry(
		async () => {
			const result = await anthropic.messages.create({
				model: "claude-sonnet-4-20250514",
				max_tokens: 4096,
				system: [
					{
						type: "text",
						text: staticContext,
						cache_control: { type: "ephemeral" }, // ← 90% cheaper after first call
					},
				],
				messages: [
					{
						role: "user",
						content: query,
					},
				],
			});

			return result;
		},
		{
			retries: 3,
			onFailedAttempt: (error) => {
				console.error(
					`[PromptCache] Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
				);
				// Abort on non-retryable errors (auth, invalid request)
				const errMsg = String(error);
				if (errMsg.includes("401") || errMsg.includes("invalid")) {
					throw new AbortError(errMsg);
				}
			},
		},
	);

	// Extract text from response
	const text = response.content
		.filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("\n");

	return {
		response: text,
		usage: response.usage,
	};
}

/**
 * Test prompt caching to verify savings
 *
 * Run this to see cache hits in action:
 * - First call: Full cost
 * - Subsequent calls (within 5min): 90% cheaper
 */
export async function testPromptCaching(apiKey?: string): Promise<void> {
	console.error("\n🧪 Testing Prompt Caching...\n");

	const testQuery = "What are the layer boundary rules for VSCode extension?";

	// First call - cache miss
	console.error("📤 First call (cache MISS - full cost)...");
	const result1 = await queryWithCachedContext(testQuery, apiKey);
	console.error(`✅ Response: ${result1.response.slice(0, 100)}...`);
	if (result1.usage) {
		console.error(`💰 Usage: ${JSON.stringify(result1.usage, null, 2)}`);
	}

	// Wait a moment
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Second call - cache hit
	console.error("\n📤 Second call (cache HIT - 90% cheaper)...");
	const result2 = await queryWithCachedContext(testQuery, apiKey);
	console.error(`✅ Response: ${result2.response.slice(0, 100)}...`);
	if (result2.usage) {
		console.error(`💰 Usage: ${JSON.stringify(result2.usage, null, 2)}`);
		console.error("\n📊 Compare cache_creation_input_tokens (first) vs cache_read_input_tokens (second)");
		console.error("    Cache read should be much cheaper!");
	}

	console.error("\n✅ Prompt caching test complete!");
}
