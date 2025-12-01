#!/usr/bin/env tsx

/**
 * Environment Variable Validation Script
 *
 * This script validates that all required environment variables are present
 * and correctly formatted. It's used in CI to prevent deployment issues.
 */

import { env } from "../packages/config/src/env";

console.log("✅ Environment variables validation passed!");
console.log("\n📋 Environment Summary:");
console.log(`NODE_ENV: ${env.NODE_ENV}`);
console.log(`PORT: ${env.PORT}`);
console.log(`DATABASE_URL: ${env.DATABASE_URL ? "✓ Set" : "✗ Not set"}`);
console.log(`GOOGLE_CLIENT_ID: ${env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Not set"}`);
console.log(`SENTRY_DSN: ${env.SENTRY_DSN ? "✓ Set" : "Not set (optional)"}`);
console.log(`STRIPE_SECRET_KEY: ${env.STRIPE_SECRET_KEY ? "✓ Set" : "Not set (optional)"}`);
