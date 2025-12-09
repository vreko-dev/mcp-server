/**
 * Vitest Global Setup
 *
 * Runs BEFORE any test files are loaded.
 * Sets up environment variables and global mocks required for test execution.
 */

// Set DATABASE_URL to prevent platform client initialization errors
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost:5432/test_db";

// Prevent Sentry from loading native bindings during tests
process.env.SENTRY_DSN = "";
