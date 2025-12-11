/**
 * Pioneer OAuth Hook - Re-export from API
 *
 * This file re-exports the onOAuthSuccess hook from the API module.
 * It's placed here in the auth package for clean dependency management.
 *
 * The actual implementation is in: apps/api/modules/pioneer/hooks/on-oauth-success.ts
 */

// Minimal local implementation since this runs in the auth package (not API)
// The auth package cannot import from apps/api directly

export interface BetterAuthUser {
	id: string;
	email: string;
	emailVerified?: boolean;
	name?: string;
	[key: string]: unknown;
}

/**
 * Placeholder implementation for auth package
 *
 * In a production setup, you would:
 * 1. Call the backend Pioneer signup endpoint
 * 2. Or trigger a background job to create the pioneer profile
 * 3. Or use an event emitter to notify the API layer
 */
export async function onOAuthSuccess(_user: BetterAuthUser): Promise<void> {
	// This is intentionally minimal - the actual pioneer profile creation
	// should happen on the API layer via a separate endpoint call
	// after the session is fully established.

	// The pattern would be:
	// 1. User completes OAuth
	// 2. Better Auth creates session
	// 3. Frontend calls GET /api/pioneer/me to fetch profile
	// 4. If 404, call POST /api/pioneer/signup to create

	// This avoids tight coupling between auth package and API layer
	return;
}
