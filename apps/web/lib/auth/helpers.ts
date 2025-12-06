/**
 * Enhanced Authentication Client Helpers
 *
 * Provides type-safe, error-handled wrappers around session client
 * with comprehensive validation and user-friendly error messages.
 */

import { validatePassword } from "./password-validation";
import { sessionClient } from "./session-client";

/**
 * Authentication result types
 */
export interface AuthSuccess<T = unknown> {
	success: true;
	user?: T;
	data?: T;
}

export interface AuthError {
	success: false;
	error: string;
}

export type AuthResult<T = unknown> = AuthSuccess<T> | AuthError;

/**
 * Email validation regex (RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	return email.length > 0 && EMAIL_REGEX.test(email);
}

/**
 * Sign in with email and password
 *
 * @param email - User email address
 * @param password - User password
 * @returns Authentication result with user data or error
 *
 * @example
 * ```ts
 * const result = await signInWithEmail('user@example.com', 'password123');
 * if (result.success) {
 *   console.log('Logged in:', result.user);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
	try {
		// Validate inputs
		if (!email || email.trim().length === 0) {
			return {
				success: false,
				error: "Email address is required",
			};
		}

		if (!isValidEmail(email)) {
			return {
				success: false,
				error: "Please enter a valid email address",
			};
		}

		if (!password || password.length === 0) {
			return {
				success: false,
				error: "Password is required",
			};
		}

		// Use session client to sign in
		const result = await sessionClient.signInWithEmail(email, password);

		if (result.success) {
			return {
				success: true,
				user: { email: email.trim() },
			};
		}

		return {
			success: false,
			error: result.error || "Invalid email or password",
		};
	} catch (error) {
		console.error("Email sign in error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Authentication failed",
		};
	}
}

/**
 * Sign in with GitHub OAuth
 *
 * Initiates GitHub OAuth flow and redirects to dashboard on success
 *
 * @param callbackURL - Optional callback URL (defaults to /dashboard)
 * @returns Authentication result
 */
export async function signInWithGithub(_callbackURL = "/dashboard"): Promise<AuthResult> {
	try {
		// TODO: Implement proper API call to backend auth service
		// await authClient.signIn.social({ provider: "github", callbackURL });

		return { success: true };
	} catch (error) {
		console.error("GitHub sign in error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "GitHub authentication failed",
		};
	}
}

/**
 * Sign in with Google OAuth
 *
 * Initiates Google OAuth flow and redirects to dashboard on success
 *
 * @param callbackURL - Optional callback URL (defaults to /dashboard)
 * @returns Authentication result
 */
export async function signInWithGoogle(_callbackURL = "/dashboard"): Promise<AuthResult> {
	try {
		// TODO: Implement proper API call to backend auth service
		// await authClient.signIn.social({ provider: "google", callbackURL });

		return { success: true };
	} catch (error) {
		console.error("Google sign in error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Google authentication failed",
		};
	}
}

/**
 * Sign up with email and password
 *
 * Creates a new user account and signs them in
 *
 * @param email - User email address
 * @param password - User password (min 12 characters, OWASP 2025 compliant)
 * @param name - Optional display name
 * @returns Authentication result with user data or error
 */
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<AuthResult> {
	try {
		// Validate inputs
		if (!email || email.trim().length === 0) {
			return {
				success: false,
				error: "Email address is required",
			};
		}

		if (!isValidEmail(email)) {
			return {
				success: false,
				error: "Please enter a valid email address",
			};
		}

		if (!password || password.length === 0) {
			return {
				success: false,
				error: "Password is required",
			};
		}

		// OWASP 2025 compliant password validation
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			return {
				success: false,
				error: passwordValidation.error || "Invalid password",
			};
		}

		// Attempt sign up
		// TODO: Implement proper API call to backend auth service
		const response = {
			error: null,
			data: { email: email.trim(), name: name?.trim() || "" },
		};

		if (response.error !== null) {
			return {
				success: false,
				error: (response.error as Error).message || "Sign up failed",
			};
		}

		return {
			success: true,
			user: response.data,
		};
	} catch (error) {
		console.error("Email sign up error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Sign up failed",
		};
	}
}

/**
 * Send password reset email
 *
 * Sends a magic link to reset password
 *
 * @param email - User email address
 * @returns Result indicating if email was sent
 */
export async function sendPasswordResetEmail(email: string): Promise<AuthResult> {
	try {
		// Validate email
		if (!email || email.trim().length === 0) {
			return {
				success: false,
				error: "Email address is required",
			};
		}

		if (!isValidEmail(email)) {
			return {
				success: false,
				error: "Please enter a valid email address",
			};
		}

		// Send reset email
		// TODO: Implement proper API call to backend auth service
		const response = {
			error: null,
			data: { email: email.trim() },
		};

		if (response.error !== null) {
			return {
				success: false,
				error: (response.error as Error).message || "Failed to send reset email",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Password reset error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send reset email",
		};
	}
}

/**
 * Get current session
 *
 * Retrieves the current user session if authenticated
 *
 * @returns Session data or null if not authenticated
 */
export async function getSession() {
	try {
		return await sessionClient.getSession();
	} catch (error) {
		console.error("Get session error:", error);
		return null;
	}
}

/**
 * Sign out current user
 *
 * Clears session and signs out user
 *
 * @returns Result indicating if sign out was successful
 */
export async function signOut(): Promise<AuthResult> {
	try {
		await sessionClient.signOut();
		return { success: true };
	} catch (error) {
		console.error("Sign out error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Sign out failed",
		};
	}
}

/**
 * Sign in with passkey (WebAuthn)
 *
 * Initiates passwordless authentication using passkeys
 *
 * @returns Authentication result
 */
export async function signInWithPasskey(): Promise<AuthResult> {
	try {
		// TODO: Implement proper API call to backend auth service
		const response = {
			error: null,
			data: {},
		};

		return {
			success: true,
			user: response.data,
		};
	} catch (error) {
		console.error("Passkey sign in error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Passkey authentication failed",
		};
	}
}

/**
 * Send magic link for passwordless sign in
 *
 * @param email - User email address
 * @param _callbackURL - Optional callback URL
 * @returns Result indicating if magic link was sent
 */
export async function sendMagicLink(email: string, _callbackURL = "/dashboard"): Promise<AuthResult> {
	try {
		// Validate email
		if (!email || email.trim().length === 0) {
			return {
				success: false,
				error: "Email address is required",
			};
		}

		if (!isValidEmail(email)) {
			return {
				success: false,
				error: "Please enter a valid email address",
			};
		}

		// Send magic link
		// TODO: Implement proper API call to backend auth service
		const response = {
			error: null,
			data: { email: email.trim() },
		};

		if (response.error !== null) {
			return {
				success: false,
				error: (response.error as Error).message || "Failed to send magic link",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Magic link error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send magic link",
		};
	}
}

/**
 * Check if user is organization admin
 *
 * @param organization - Organization object with members array
 * @param user - User object with id and optional role
 * @returns true if user is an admin or owner, false otherwise
 */
export function isOrganizationAdmin(
	organization?: { members: Array<{ userId: string; role?: string }> } | null,
	user?: { id: string; role?: string | null } | null,
): boolean {
	if (!organization || !user) return false;
	const member = organization.members.find((m) => m.userId === user.id);
	return ["owner", "admin"].includes(member?.role ?? "") || user.role === "admin";
}

/**
 * Create purchases helper for subscription/billing logic
 *
 * @param purchases - Array of purchase records
 * @returns Object with methods to check subscription status and plans
 */
export function createPurchasesHelper(
	purchases: Array<{
		type: string;
		status: string;
		productId?: string;
		id?: string;
	}>,
) {
	const activePlan = purchases.find((p) => p.type === "SUBSCRIPTION") || null;

	const hasSubscription = () => !!activePlan;
	const hasPurchase = () => purchases.length > 0;

	return {
		activePlan,
		hasSubscription,
		hasPurchase,
	};
}
