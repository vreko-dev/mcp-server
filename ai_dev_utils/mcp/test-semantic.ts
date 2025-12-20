#!/usr/bin/env tsx
/**
 * Test script for semantic context retriever
 *
 * Usage:
 *   pnpm test:semantic
 */

import { testSemanticRetriever } from "./semantic-retriever.js";

testSemanticRetriever().catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
