/**
 * OAuth Social Provider Helpers
 *
 * Consolidated OAuth flow utilities for Better Auth social providers.
 * Reduces duplication and provides consistent error handling across all OAuth flows.
 *
 * @security
 * - CSRF protection via Better Auth state parameter (automatic)
 * - Session cookie: HttpOnly, Secure, SameSite=Lax
 * - OAuth code is short-lived (typically 10 minutes)
 * - No tokens exposed to client-side JavaScript
 */

import { authClient } from "@snapback/auth/client";
import type { AuthResult } from "./helpers";

/**
 * OAuth provider type
 */
type OAuthProvider = "github" | "google";

/**
 * Initiate OAuth social sign-in flow
 *
 * This function handles the unified OAuth flow for any supported provider.
 * Better Auth automatically manages:
 * 1. State parameter generation (CSRF protection)
 * 2. Redirect to OAuth provider
 * 3. Code exchange for access token
 * 4. Session creation with httpOnly cookie
 * 5. Redirect back to callback URL
 *
 * @param provider - OAuth provider name ("github" or "google")
 * @param callbackURL - URL to redirect to after successful OAuth
 * @returns Result indicating if OAuth was initiated successfully
 *
 * @throws Never throws - errors are returned as AuthResult
 *
 * @example
 * ```ts
 * const result = await initiateOAuthFlow("github", "/dashboard");
 * if (result.success) {
 *   // OAuth has been initiated, user is being redirected
 * } else {
 *   console.error("Failed to initiate GitHub OAuth:", result.error);
 * }
 * ```
 */
export async function initiateOAuthFlow(provider: OAuthProvider, callbackURL = "/dashboard"): Promise<AuthResult> {
	try {
		const { error } = await authClient.signIn.social({
			provider,
			callbackURL,
		});

		if (error) {
			// Better Auth error type is not exposed, so we safely extract message
			const errorMessage =
				typeof error === "object" && error !== null && "message" in error
					? String((error as { message: unknown }).message)
					: `${provider} sign in failed`;

			return {
				success: false,
				error: errorMessage,
			};
		}

		// OAuth redirect will happen automatically via Better Auth
		// This indicates the OAuth flow was initiated successfully
		return { success: true };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : `${provider} authentication failed`;
		console.error(`${provider} OAuth error:`, err);

		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Sign in with GitHub OAuth
 *
 * Initiates GitHub OAuth 2.0 flow via Better Auth.
 * Better Auth handles the complete OAuth exchange including:
 * - State parameter for CSRF protection
 * - OAuth authorization URL generation
 * - Callback handling and code exchange
 * - Session creation and persistence
 *
 * @param callbackURL - Optional callback URL after OAuth success (defaults to /dashboard)
 * @returns Authentication result
 *
 * @example
 * ```ts
 * const result = await signInWithGithub("/app/dashboard");
 * if (!result.success) {
 *   console.error("GitHub sign in failed:", result.error);
 * }
 * // If successful, user is redirected automatically
 * ```
 */
export async function signInWithGithub(callbackURL = "/dashboard"): Promise<AuthResult> {
	return initiateOAuthFlow("github", callbackURL);
}

/**
 * Sign in with Google OAuth
 *
 * Initiates Google OAuth 2.0 flow via Better Auth.
 * Better Auth handles the complete OAuth exchange including:
 * - State parameter for CSRF protection
 * - OAuth authorization URL generation
 * - Callback handling and code exchange
 * - Session creation and persistence
 *
 * @param callbackURL - Optional callback URL after OAuth success (defaults to /dashboard)
 * @returns Authentication result
 *
 * @example
 * ```ts
 * const result = await signInWithGoogle("/app/dashboard");
 * if (!result.success) {
 *   console.error("Google sign in failed:", result.error);
 * }
 * // If successful, user is redirected automatically
 * ```
 */
export async function signInWithGoogle(callbackURL = "/dashboard"): Promise<AuthResult> {
	return initiateOAuthFlow("google", callbackURL);
}
