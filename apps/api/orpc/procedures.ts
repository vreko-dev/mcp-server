import { ORPCError, os } from "@orpc/server";
import {
	type AuthError,
	getPlanPermissions,
	type PlanId,
	type SnapbackAuthContext,
	snapbackAuth,
	type UserRole,
} from "@snapback/auth";
import { logger } from "@snapback/infrastructure";

// ... existing code ...

export interface OrpcContext {
	request: Request;
	auth: SnapbackAuthContext | null;
	user: {
		id: string;
		email: string;
		role: UserRole;
		plan: PlanId;
		name?: string;
		createdAt?: Date;
		orgId?: string;
		orgRole?: "owner" | "admin" | "member";
	} | null;
}

export const publicProcedure = os.$context<OrpcContext>();

export const protectedProcedure = publicProcedure.use(
	async ({ context, next }) => {
		try {
			const auth = await snapbackAuth.requireAuth(context.request);

			return next({
				context: {
					...context,
					auth,
					user: {
						id: auth.userId,
						email: auth.email,
						role: auth.role,
						plan: auth.plan,
						name: auth.name,
						createdAt: auth.createdAt,
						orgId: auth.orgId,
						orgRole: auth.orgRole,
					},
				},
			});
		} catch (err) {
			const error = err as AuthError;
			throw new ORPCError({
				code: error.statusCode === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
				message: error.message,
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}
	},
);

export const adminProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		if (context.user?.role !== "admin") {
			throw new ORPCError({
				code: "FORBIDDEN",
				message: "Admin access required",
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}

		return await next();
	},
);

export const verifiedProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		if (!context.auth?.emailVerified) {
			// ✅ Use proper observability logger
			logger.warn("Email verification required", {
				event: "auth_guard_denied",
				reason: "email_not_verified",
				userId: context.auth?.userId,
				email: context.auth?.email,
				path: context.request.url,
				guard: "verifiedProcedure",
			});

			throw new ORPCError({
				code: "FORBIDDEN",
				message: "Email verification required",
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}

		return next();
	},
);

export const stepUpProtectedProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		const { auth } = context;

		if (!auth?.twoFactorEnabled && !auth?.passkeyRegistered) {
			// ✅ Use proper observability logger
			logger.warn("Strong authentication required", {
				event: "auth_guard_denied",
				reason: "step_up_required",
				userId: auth?.userId,
				email: auth?.email,
				twoFactorEnabled: auth?.twoFactorEnabled,
				passkeyRegistered: auth?.passkeyRegistered,
				path: context.request.url,
				guard: "stepUpProtectedProcedure",
			});

			throw new ORPCError({
				code: "FORBIDDEN",
				message: "Strong authentication required",
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}

		return next();
	},
);

export const planProtectedProcedure = (requiredPlan: PlanId) =>
	protectedProcedure.use(async ({ context, next }) => {
		const { auth } = context;
		if (!auth) {
			throw new ORPCError({
				code: "UNAUTHORIZED",
				message: "Authentication required",
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}

		const _perms = getPlanPermissions(auth.plan);

		// Simple example: only team & enterprise can access
		const allowedPlans: PlanId[] = ["team", "enterprise"];
		if (!allowedPlans.includes(auth.plan)) {
			// ✅ Use proper observability logger
			logger.warn("Plan access denied", {
				event: "auth_guard_denied",
				reason: "insufficient_plan",
				userId: auth.userId,
				email: auth.email,
				userPlan: auth.plan,
				requiredPlan: requiredPlan,
				path: context.request.url,
				guard: "planProtectedProcedure",
			});

			throw new ORPCError({
				code: "FORBIDDEN",
				message: `Plan upgrade required (${requiredPlan})`,
				// biome-ignore lint/suspicious/noExplicitAny: ORPCError type mismatch workaround
			} as any);
		}

		return next();
	});
