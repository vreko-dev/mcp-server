import type { Session } from "better-auth/types";
import { auth } from "./auth";

/**
 * Adapter for Better Auth API calls to provide a stable interface
 * and avoid direct dependencies on Better Auth internals in our implementation
 */

export interface BetterAuthAdapter {
	getSessionFromHeaders(headers: Headers): Promise<Session | null>;
	verifyApiKeyOrNull(key: string): Promise<any | null>;
	getOrganization(organizationId: string): Promise<any | null>;
	getOrgMembership(userId: string, organizationId: string): Promise<any | null>;

	/**
	 * Returns a session + user object with any enriched flags that Better Auth
	 * already exposes (emailVerified, two-factor enabled, etc).
	 */
	getRichSessionFromHeaders(headers: Headers): Promise<{
		session: any | null;
		user: any | null;
	}>;

	/**
	 * Returns whether email is verified for the user id.
	 * Implement using existing Better Auth user data shape.
	 */
	isEmailVerified(userId: string): Promise<boolean>;

	/**
	 * Returns whether 2FA is enabled for the user id.
	 * Implement using the twoFactor plugin tables/API.
	 */
	isTwoFactorEnabled(userId: string): Promise<boolean>;

	/**
	 * Returns whether at least one passkey is registered for the user id.
	 * Implement using the passkey plugin.
	 */
	hasPasskey(userId: string): Promise<boolean>;
}

export const betterAuthAdapter: BetterAuthAdapter = {
	async getSessionFromHeaders(headers: Headers): Promise<Session | null> {
		try {
			return await auth.api.getSession({ headers });
		} catch (error) {
			console.error("[BetterAuthAdapter] getSessionFromHeaders error:", error);
			return null;
		}
	},

	async verifyApiKeyOrNull(key: string): Promise<any | null> {
		try {
			// Using the verified public method from Better Auth docs
			return await auth.api.verifyApiKey({ key });
		} catch (error) {
			console.error("[BetterAuthAdapter] verifyApiKeyOrNull error:", error);
			return null;
		}
	},

	// Organization methods - only if actually needed
	async getOrganization(organizationId: string) {
		if (!auth.api?.organization) {
			return null;
		}

		try {
			return await auth.api.organization.get({ organizationId });
		} catch (error) {
			console.error("[BetterAuthAdapter] getOrganization error:", error);
			return null;
		}
	},

	async getOrgMembership(userId: string, organizationId: string) {
		if (!auth.api?.organization) {
			return null;
		}

		try {
			return await auth.api.organization.getMembership({
				userId,
				organizationId,
			});
		} catch (error) {
			console.error("[BetterAuthAdapter] getOrgMembership error:", error);
			return null;
		}
	},

	async getRichSessionFromHeaders(headers: Headers): Promise<{
		session: any | null;
		user: any | null;
	}> {
		try {
			const session = await auth.api.getSession({ headers });
			return {
				session: session?.session || null,
				user: session?.user || null,
			};
		} catch (error) {
			console.error("[BetterAuthAdapter] getRichSessionFromHeaders error:", error);
			return {
				session: null,
				user: null,
			};
		}
	},

	async isEmailVerified(userId: string): Promise<boolean> {
		try {
			// Get user directly from Better Auth API
			const user = await auth.api.getUser({ userId });
			return user?.emailVerified ?? false;
		} catch (error) {
			console.error("[BetterAuthAdapter] isEmailVerified error:", error);
			return false;
		}
	},

	async isTwoFactorEnabled(userId: string): Promise<boolean> {
		try {
			// Check if user has two-factor enabled using Better Auth's twoFactor plugin
			const user = await auth.api.getUser({ userId });
			return user?.twoFactorEnabled ?? false;
		} catch (error) {
			console.error("[BetterAuthAdapter] isTwoFactorEnabled error:", error);
			return false;
		}
	},

	async hasPasskey(userId: string): Promise<boolean> {
		try {
			// Check if user has any passkeys registered using Better Auth's passkey plugin
			if (!auth.api?.passkey?.listPasskeys) {
				return false;
			}

			const passkeys = await auth.api.passkey.listPasskeys({ userId });
			return Array.isArray(passkeys) && passkeys.length > 0;
		} catch (error) {
			console.error("[BetterAuthAdapter] hasPasskey error:", error);
			return false;
		}
	},
};
