/**
 * MSW Handlers Index
 *
 * Centralized export of all MSW mock handlers.
 * Import specific handlers or use the combined `handlers` export.
 *
 * @example
 * ```typescript
 * import { handlers } from "@snapback/testing/msw/handlers";
 * import { githubHandlers, errorHandlers } from "@snapback/testing/msw/handlers";
 * import { authHandlers, authErrorHandlers } from "@snapback/testing/msw/handlers";
 * ```
 */

export {
	errorHandlers as oauthErrorHandlers,
	githubHandlers,
	googleHandlers,
	oauthHandlers,
} from "./oauth";

export { posthogHandlers } from "./posthog";

export {
	resendErrorHandlers,
	resendHandlers,
} from "./resend";

export {
	authErrorHandlers,
	authHandlers,
	loginHandlers,
	passwordResetHandlers,
	registrationHandlers,
	sessionHandlers,
} from "./auth";

import { authHandlers } from "./auth";
import { oauthHandlers } from "./oauth";
import { posthogHandlers } from "./posthog";
import { resendHandlers } from "./resend";

/**
 * All default handlers combined
 * Includes Auth, OAuth, PostHog, and Resend handlers
 */
export const handlers = [
	...authHandlers,
	...oauthHandlers,
	...posthogHandlers,
	...resendHandlers,
];
