#!/usr/bin/env tsx
/**
 * Test script for learning engine
 *
 * Usage:
 *   pnpm test:learning
 */

import { testLearningEngine } from "./learning-engine.js";

testLearningEngine().catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
