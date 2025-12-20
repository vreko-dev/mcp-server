#!/usr/bin/env tsx
/**
 * Test script for prompt caching
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key pnpm test:cache
 */

import { testPromptCaching } from "./prompt-cache.js";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
	console.error("❌ Error: ANTHROPIC_API_KEY environment variable not set");
	console.error("\nUsage:");
	console.error("  ANTHROPIC_API_KEY=your-key pnpm test:cache");
	process.exit(1);
}

testPromptCaching(apiKey).catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
