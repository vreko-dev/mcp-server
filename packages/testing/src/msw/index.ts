/**
 * MSW Testing Utilities
 *
 * Centralized MSW (Mock Service Worker) utilities for network mocking in tests.
 *
 * @example
 * ```typescript
 * // Import server and handlers
 * import { server, handlers } from "@snapback/testing/msw";
 *
 * // Or import specific handlers
 * import { githubHandlers, resendHandlers } from "@snapback/testing/msw";
 * ```
 */

export {
	githubHandlers,
	googleHandlers,
	handlers,
	oauthErrorHandlers,
	oauthHandlers,
	posthogHandlers,
	resendErrorHandlers,
	resendHandlers,
} from "./handlers";
export { addHandlers, resetHandlers, server } from "./server";
