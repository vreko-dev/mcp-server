/**
 * Authentication configuration
 * Frontend-safe configuration only (no backend dependencies)
 */

export const authConfig = {
	// Sign up
	enableSignup: true,

	// Magic link sign in
	enableMagicLink: true,

	// Social login (OAuth)
	enableSocialLogin: true,

	// Password-based sign in
	enablePasswordLogin: true,

	// Passkeys (WebAuthn)
	enablePasskeys: false,

	// Two-factor authentication
	enableTwoFactor: true,

	// Redirect after successful sign in
	redirectAfterSignIn: "/dashboard",

	// Redirect after sign out
	redirectAfterLogout: "/",

	// Session cookie max age (30 days in seconds)
	sessionCookieMaxAge: 60 * 60 * 24 * 30,
} as const;

export type AuthConfig = typeof authConfig;
