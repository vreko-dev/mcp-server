import { afterEach, beforeEach, vi } from "vitest";

// Global test setup
beforeEach(() => {
	// Reset all mocks before each test
	vi.clearAllMocks();
});

afterEach(() => {
	// Clean up after each test
	vi.restoreAllMocks();
});

// Global test utilities
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateTestSnapshot = (overrides = {}) => ({
	id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
	timestamp: Date.now(),
	files: [],
	fileContents: {},
	meta: {},
	...overrides,
});

export const generateTestProtectedFile = (overrides = {}) => ({
	path: "test.ts",
	level: "watch" as const,
	addedAt: new Date(),
	...overrides,
});
