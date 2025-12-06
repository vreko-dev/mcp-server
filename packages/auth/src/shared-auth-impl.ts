import {
	type BetterAuthAdapter,
	betterAuthAdapter,
} from "./better-auth-adapter";
import {
	AuthError,
	InsufficientRoleError,
	InsufficientScopesError,
} from "./errors";
import { mapUserToPlan } from "./plan";
import type {
	SnapbackAuth,
	SnapbackAuthContext,
	UserRole,
} from "./shared-auth";

export class SnapbackAuthImpl implements SnapbackAuth {
	constructor(private adapter: BetterAuthAdapter = betterAuthAdapter) {}

	async getContextFromRequest(
		req: Request,
	): Promise<SnapbackAuthContext | null> {
		// 1) x-auth-context header (pre-injected, e.g. from middleware)
		const injected = req.headers.get("x-auth-context");
		if (injected) {
			try {
				return JSON.parse(injected) as SnapbackAuthContext;
			} catch {
				// ignore and fall through
			}
		}

		// 2) Session via cookies
		const richSession = await this.adapter.getRichSessionFromHeaders(
			req.headers,
		);
		if (richSession?.session && richSession?.user) {
			return this.fromSession(richSession, "session");
		}

		// 3) Authorization: Bearer <token>
		const authHeader = req.headers.get("authorization");
		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.slice(7);

			// 3a) Try API key first
			const keyResult = await this.adapter.verifyApiKeyOrNull(token);
			if (keyResult) {
				return this.fromApiKey(keyResult);
			}

			// 3b) Try access token
			const tokenRichSession = await this.adapter.getRichSessionFromHeaders(
				new Headers({ Authorization: `Bearer ${token}` }),
			);
			if (tokenRichSession?.session && tokenRichSession?.user) {
				return this.fromSession(tokenRichSession, "accessToken");
			}
		}

		// 4) x-api-key header
		const apiKeyHeader = req.headers.get("x-api-key");
		if (apiKeyHeader) {
			const keyResult = await this.adapter.verifyApiKeyOrNull(apiKeyHeader);
			if (keyResult) {
				return this.fromApiKey(keyResult);
			}
		}

		return null;
	}

	async requireAuth(
		req: Request,
		options?: { roles?: UserRole[]; scopes?: string[] },
	): Promise<SnapbackAuthContext> {
		const ctx = await this.getContextFromRequest(req);

		if (!ctx) {
			throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
		}

		if (options?.roles && !options.roles.includes(ctx.role)) {
			throw new InsufficientRoleError(options.roles, ctx.role);
		}

		if (options?.scopes) {
			const scopes = ctx.apiKeyScopes ?? [];
			const hasAll = options.scopes.every((s) => scopes.includes(s));
			if (!hasAll) {
				throw new InsufficientScopesError(options.scopes, scopes);
			}
		}

		return ctx;
	}

	async getOrganizationContext(ctx: SnapbackAuthContext) {
		if (!ctx.orgId) return null;

		const org = await this.adapter.getOrganization(ctx.orgId);

		if (!org) return null;

		return {
			id: org.id,
			name: org.name,
			slug: org.slug,
			role: ctx.orgRole ?? "member",
		};
	}

	// ---------- mapping helpers ----------

	private async enrichOrgRole(
		userId: string,
		orgId?: string,
	): Promise<"owner" | "admin" | "member" | undefined> {
		if (!orgId) return undefined;

		const membership = await this.adapter.getOrgMembership(userId, orgId);

		return membership?.role;
	}

	private async fromSession(
		sessionResult: { session: any; user: any },
		via: SnapbackAuthContext["authenticatedVia"],
	): Promise<SnapbackAuthContext> {
		const { session, user } = sessionResult;
		const plan = mapUserToPlan(user);
		const orgId = session.organizationId ?? undefined;
		const orgRole = await this.enrichOrgRole(user.id, orgId);

		// Get enriched auth state with error handling
		const emailVerified = await this.adapter
			.isEmailVerified(user.id)
			.catch(() => false);
		const twoFactorEnabled = await this.adapter
			.isTwoFactorEnabled(user.id)
			.catch(() => false);
		const passkeyRegistered = await this.adapter
			.hasPasskey(user.id)
			.catch(() => false);

		return {
			userId: user.id,
			email: user.email,
			role: (user.role as UserRole) ?? "user",
			orgId,
			orgRole,
			sessionId: session.id,
			expiresAt: new Date(session.expiresAt),
			authenticatedVia: via,
			plan,
			emailVerified,
			twoFactorEnabled,
			passkeyRegistered,
		};
	}

	private async fromApiKey(result: any): Promise<SnapbackAuthContext> {
		const plan = mapUserToPlan(result.user);
		const orgId = result.session.organizationId ?? undefined;
		const orgRole = await this.enrichOrgRole(result.user.id, orgId);

		// For API keys, we can check email verification but 2FA and passkey status are not essential
		const emailVerified = await this.adapter
			.isEmailVerified(result.user.id)
			.catch(() => undefined);

		return {
			userId: result.user.id,
			email: result.user.email,
			role: (result.user.role as UserRole) ?? "user",
			orgId,
			orgRole,
			authenticatedVia: "apiKey",
			apiKeyId: result.apiKey.id,
			apiKeyScopes: result.apiKey.scopes ?? [],
			sessionId: result.session.id,
			expiresAt: new Date(result.session.expiresAt),
			plan,
			emailVerified,
			// twoFactorEnabled and passkeyRegistered remain undefined for API key auth
		};
	}
}

export const snapbackAuth = new SnapbackAuthImpl();
