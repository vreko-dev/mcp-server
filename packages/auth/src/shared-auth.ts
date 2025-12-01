export type UserRole = "user" | "admin";
export type PlanId = "free" | "solo" | "team" | "enterprise";

export interface SnapbackAuthContext {
	// Identity
	userId: string;
	email: string;
	role: UserRole;
	name?: string; // From better-auth user table
	createdAt?: Date; // From better-auth user table

	// Multi-tenant
	orgId?: string;
	orgRole?: "owner" | "admin" | "member";

	// Auth mechanism
	sessionId?: string;
	expiresAt?: Date;
	authenticatedVia: "session" | "accessToken" | "apiKey";

	// API key metadata (only if authenticatedVia === "apiKey")
	apiKeyId?: string;
	apiKeyScopes?: string[];

	// Commercial
	plan: PlanId;

	// Auth state enrichment (optional, non-breaking)
	emailVerified?: boolean;
	twoFactorEnabled?: boolean;
	passkeyRegistered?: boolean;
}

export interface SnapbackAuth {
	getContextFromRequest(req: Request): Promise<SnapbackAuthContext | null>;

	requireAuth(
		req: Request,
		options?: {
			roles?: UserRole[];
			scopes?: string[];
		},
	): Promise<SnapbackAuthContext>;

	getOrganizationContext(ctx: SnapbackAuthContext): Promise<{
		id: string;
		name: string;
		slug: string;
		role: string;
	} | null>;
}
