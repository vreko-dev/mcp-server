/**
 * Server-Side Auth Helpers
 *
 * NOTE: These functions are stubbed for frontend-only deployment.
 * Implement with real @snapback/auth in API service.
 */

"use server";

import { redirect } from "next/navigation";
import { cache } from "react";

// Stub type for auth context
type SnapbackAuthContext = {
	userId: string;
	email: string;
	role: string;
	emailVerified: boolean;
	twoFactorEnabled: boolean;
	passkeyRegistered: boolean;
};

/**
 * Get current authenticated context (server-side)
 *
 * NOTE: Returns null in frontend-only deployment.
 * Connect to real API service for authentication.
 */
export const getAuth = cache(async () => {
	console.warn("[Auth] getAuth() is stubbed - implement with real API");
	return null as SnapbackAuthContext | null;
});

/**
 * Require authentication (redirect if not authenticated)
 *
 * Helper function that combines getAuth() + redirect()
 * for protected pages that always require auth.
 *
 * @param redirectTo - Optional custom redirect path (default: /auth/login)
 * @returns SnapbackAuthContext (never returns null, redirects instead)
 *
 * @example
 * ```ts
 * export default async function ProtectedPage() {
 *   const auth = await requireAuth();
 *   // If we reach here, user is authenticated
 *   return <Content userId={auth.userId} />;
 * }
 * ```
 */
export async function requireAuth(redirectTo = "/auth/login") {
	const auth = await getAuth();

	if (!auth) {
		redirect(redirectTo);
	}

	return auth;
}

/**
 * Require specific role (admin, etc.)
 *
 * @param allowedRoles - Array of allowed roles
 * @param redirectTo - Where to redirect if unauthorized
 * @returns SnapbackAuthContext if user has required role
 *
 * @example
 * ```ts
 * export default async function AdminPage() {
 *   const auth = await requireRole(['admin']);
 *   return <AdminPanel userId={auth.userId} />;
 * }
 * ```
 */
export async function requireRole(allowedRoles: string[], redirectTo = "/dashboard") {
	const auth = await requireAuth();

	if (!allowedRoles.includes(auth.role)) {
		redirect(redirectTo);
	}

	return auth;
}

/**
 * Check if user is authenticated (without redirect)
 *
 * @returns true if authenticated, false otherwise
 *
 * @example
 * ```ts
 * export default async function HomePage() {
 *   const isAuthenticated = await isAuth();
 *   return (
 *     <Hero>
 *       {isAuthenticated ? (
 *         <Link href="/dashboard">Go to Dashboard</Link>
 *       ) : (
 *         <Link href="/auth/login">Sign In</Link>
 *       )}
 *     </Hero>
 *   );
 * }
 * ```
 */
export async function isAuth(): Promise<boolean> {
	const auth = await getAuth();
	return auth !== null;
}

/**
 * Sign out (server action)
 */
export async function signOut() {
	"use server";
	console.warn("[Auth] signOut() is stubbed - implement with real API");
	redirect("/auth/login");
}

/**
 * Require email verification
 * Redirects to verification page if email is not verified
 * ✅ Uses canonical security guard pattern
 */
export async function requireVerifiedEmail() {
	const auth = await requireAuth();

	if (!auth.emailVerified) {
		console.warn("Email verification required", {
			event: "auth_guard_denied",
			reason: "email_not_verified",
			userId: auth.userId,
			email: auth.email,
			destination: "/auth/verify-email",
			guard: "requireVerifiedEmail",
		});

		redirect("/auth/verify-email");
	}

	return auth;
}

/**
 * Require step-up authentication (2FA or passkey)
 * Redirects to step-up page if strong authentication is not enabled
 * ✅ Uses canonical security guard pattern
 */
export async function requireStepUp(options?: { requirePasskey?: boolean }) {
	const auth = await requireAuth();

	const hasStrongFactor = auth.twoFactorEnabled || options?.requirePasskey;

	if (!hasStrongFactor) {
		console.warn("Step-up authentication required", {
			event: "auth_guard_denied",
			reason: "step_up_required",
			userId: auth.userId,
			email: auth.email,
			twoFactorEnabled: auth.twoFactorEnabled,
			passkeyRegistered: auth.passkeyRegistered,
			requirePasskey: options?.requirePasskey,
			destination: "/auth/step-up",
			guard: "requireStepUp",
		});

		redirect("/auth/step-up");
	}

	return auth;
}
