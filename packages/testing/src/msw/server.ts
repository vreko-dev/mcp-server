/**
 * MSW Server for Node.js Test Environment
 *
 * Provides a pre-configured MSW server for testing in Node.js environments.
 * Used by Vitest to intercept network requests during tests.
 *
 * @example
 * ```typescript
 * import { server } from "@snapback/testing/msw/server";
 *
 * // In test setup (vitest.setup.ts)
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server for Node.js test environment
 * Pre-configured with all default handlers (OAuth, PostHog, Resend)
 */
export const server = setupServer(...handlers);

/**
 * Helper to add custom handlers for specific tests
 *
 * @example
 * ```typescript
 * import { server, addHandlers } from "@snapback/testing/msw/server";
 * import { oauthErrorHandlers } from "@snapback/testing/msw/handlers";
 *
 * // Override with error scenario
 * addHandlers(oauthErrorHandlers.githubTokenError);
 * ```
 */
export function addHandlers(...customHandlers: Parameters<typeof server.use>) {
	server.use(...customHandlers);
}

/**
 * Helper to reset handlers to defaults
 *
 * @example
 * ```typescript
 * import { resetHandlers } from "@snapback/testing/msw/server";
 *
 * afterEach(() => {
 *   resetHandlers();
 * });
 * ```
 */
export function resetHandlers() {
	server.resetHandlers();
}
