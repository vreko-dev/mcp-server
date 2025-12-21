/**
 * Session Type Definitions for SnapBack Web App
 *
 * Proper types from Better Auth to replace (session as any) casts.
 * Imports from @snapback/contracts which wraps Better Auth types.
 */

import type { AuthUser } from "@snapback/contracts";

/**
 * User object from Better Auth session
 *
 * Extended with SnapBack-specific fields like role and username
 */
export interface SessionUser extends AuthUser {
	/** User role (from Better Auth admin plugin) */
	role?: string;
	/** Username (from Better Auth username plugin) */
	username?: string;
	/** Two-factor authentication enabled */
	twoFactorEnabled?: boolean;
	/** Onboarding completion status (SnapBack-specific) */
	onboardingComplete?: boolean;
}

/**
 * Session object from Better Auth
 *
 * Includes session metadata and active organization
 */
export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
	/** Active organization ID (from Better Auth organization plugin) */
	activeOrganizationId?: string;
	/** User agent string for security tracking */
	userAgent?: string | null;
	/** IP address for security tracking */
	ipAddress?: string | null;
}

/**
 * Complete session with user data
 *
 * This is what getSession() returns from Better Auth
 */
export interface SessionWithUser {
	user: SessionUser;
	session: Session;
}

/**
 * Type guard to check if session exists and has user
 */
export function hasUser(session: unknown): session is SessionWithUser {
	return (
		session !== null &&
		session !== undefined &&
		typeof session === "object" &&
		"user" in session &&
		session.user !== null &&
		session.user !== undefined
	);
}

/**
 * Type guard to check if user has specific role
 */
export function hasRole(session: SessionWithUser | null, role: string): boolean {
	return session?.user?.role === role;
}

/**
 * Type guard to check if user is admin
 */
export function isAdmin(session: SessionWithUser | null): boolean {
	return hasRole(session, "admin");
}
