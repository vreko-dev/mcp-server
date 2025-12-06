/**
 * MCP Server Test Setup
 *
 * Centralized Vitest setup file for MCP Server tests.
 * Configures MSW for network mocking and global test utilities.
 *
 * Based on MSW v2 best practices from mswjs.io
 */

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Default MSW handlers for common API endpoints
 */
const handlers = [
	// Mock SnapBack API endpoints
	http.post("https://api.snapback.dev/analyze/fast", () => {
		return HttpResponse.json({
			riskLevel: "low",
			score: 0.2,
			factors: [],
			analysisTimeMs: 45,
			issues: [],
		});
	}),

	// Mock Context7 API
	http.post("https://api.context7.com/resolve", () => {
		return HttpResponse.json({
			libraryId: "/test/library",
			name: "Test Library",
			description: "Mock library for testing",
		});
	}),

	http.post("https://api.context7.com/docs", () => {
		return HttpResponse.json({
			content: [
				{
					type: "text",
					text: "Mock documentation content",
				},
			],
		});
	}),

	// Mock PostHog telemetry
	http.post("https://telemetry.snapback.dev/capture", () => {
		return new HttpResponse(null, { status: 200 });
	}),

	http.post("https://telemetry.snapback.dev/batch", () => {
		return new HttpResponse(null, { status: 200 });
	}),
];

/**
 * MSW server instance for Node.js test environment
 */
export const server = setupServer(...handlers);

/**
 * MSW Lifecycle Hooks
 *
 * Following MSW v2 best practices:
 * - beforeAll: Start intercepting requests
 * - afterEach: Reset handlers to prevent test pollution
 * - afterAll: Clean up and restore native modules
 */
beforeAll(() => {
	server.listen({
		onUnhandledRequest: "warn", // Warn on unmocked requests (use 'error' in strict mode)
	});
});

afterEach(() => {
	// Reset any runtime handlers added in individual tests
	server.resetHandlers();
});

afterAll(() => {
	// Clean up and restore native modules
	server.close();
});

/**
 * Helper: Add custom handlers for specific tests
 *
 * @example
 * ```typescript
 * import { addHandlers } from '../setup';
 * import { http, HttpResponse } from 'msw';
 *
 * it('handles API errors', async () => {
 *   addHandlers(
 *     http.post('https://api.snapback.dev/analyze/fast', () => {
 *       return new HttpResponse(null, { status: 500 });
 *     })
 *   );
 *   // Test error handling...
 * });
 * ```
 */
export function addHandlers(...customHandlers: Parameters<typeof server.use>) {
	server.use(...customHandlers);
}

/**
 * Helper: Create server boundary for concurrent tests
 *
 * Use with Vitest's it.concurrent for isolated handler overrides.
 */
export const boundary = server.boundary;
