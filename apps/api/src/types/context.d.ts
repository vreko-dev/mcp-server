import type { Session } from "better-auth/types";

// Type for Better Auth user object
export interface BetterAuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string;
	createdAt: Date;
	updatedAt: Date;
	// Add other properties as needed
	[key: string]: unknown;
}

// Type for Better Auth session object (based on Session type from better-auth)
export interface BetterAuthSession extends Session {
	activeOrganizationId?: string;
	// Add other properties as needed
	[key: string]: unknown;
}

declare module "hono" {
	interface ContextVariableMap {
		user: BetterAuthUser;
		session: BetterAuthSession;
		// Add other custom variables as needed
		passkeyEnrollmentRequired?: boolean;
	}
}
