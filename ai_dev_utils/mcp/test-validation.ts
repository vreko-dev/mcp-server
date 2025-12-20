#!/usr/bin/env tsx
/**
 * Test script for validation pipeline
 *
 * Usage:
 *   pnpm test:validation
 */

import { testValidationPipeline } from "./validation-pipeline.js";

testValidationPipeline().catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
