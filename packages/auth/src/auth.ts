import { env } from "@snapback/config"; // Use centralized config
import { getBaseUrl } from "@snapback/config/utils/base-url";
import { logger } from "@snapback/infrastructure";
import { sendEmail } from "@snapback/integrations/email";
import { db } from "@snapback/platform";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	admin,
	apiKey,
	jwt,
	magicLink,
	openAPI,
	organization,
	twoFactor,
	username,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { parse as parseCookies } from "cookie";
import { trackEvent } from "./lib/audit.js";
import { invitationOnlyPlugin } from "./plugins/invitation-only/index.js";

const _getLocaleFromRequest = (request?: Request) => {
	const cookies = parseCookies(request?.headers.get("cookie") ?? "");
	return cookies.NEXT_LOCALE ?? "en";
};

const appUrl = env.APP_URL || getBaseUrl();

// In development, trust all localhost ports to handle Next.js dynamic port assignment
const isDevelopment = env.NODE_ENV !== "production";
const trustedOrigins = isDevelopment
	? [
			appUrl,
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:3002",
		]
	: [appUrl];

export const auth = betterAuth({
	// Extend the user schema with additional fields
	schema: {
		user: {
			fields: {
				onboardingComplete: {
					type: "boolean",
					required: false,
					defaultValue: false,
				},
			},
		},
	},
	appName: "SnapBack",
	endpoints: {
		GET: {
			"/health": {
				async handler() {
					return new Response("OK", { status: 200 });
				},
			},
		},
		// Cross-subdomain cookie configuration for Pattern B
		crossSubDomainCookies: {
			enabled: env.NODE_ENV === "production",
			// In production, set domain to .snapback.dev for cross-subdomain sharing
			domain: env.NODE_ENV === "production" ? ".snapback.dev" : undefined,
		},
		defaultCookieAttributes: {
			sameSite: "lax",
			secure: env.NODE_ENV === "production",
			httpOnly: true,
		},
	},
	emailAndPassword: {
		enabled: true,
		// Removed sendResetPassword and sendVerificationEmail as they're not valid config options
	},
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID ?? "",
			clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
		},
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	database: drizzleAdapter(db as any, {
		provider: "pg",
	}),
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google", "github"],
		},
	},
	trustedOrigins,
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
		crossSiteRequestForgery: {
			enabled: true,
			// Verify origin header matches trusted origins
			checkOrigin: true,
		},
	},
	// Rate limiting configuration (replaces 340+ lines of custom rate limit code)
	rateLimit: {
		window: 60, // 60 seconds
		max: 100, // 100 requests per window (global default)
		customRules: {
			// Strict limits for authentication endpoints
			"/sign-in/email": {
				window: 10, // 10 seconds
				max: 3, // 3 attempts per 10 seconds (brute force protection)
			},
			"/sign-in/social": {
				window: 10,
				max: 5,
			},
			"/sign-up": {
				window: 60,
				max: 5, // 5 signups per minute
			},
			"/password-reset": {
				window: 60,
				max: 3, // 3 reset attempts per minute
			},
			// Higher limits for normal API endpoints
			"/api/*": {
				window: 60,
				max: 500,
			},
			// No rate limiting for health checks
			"/health": false,
			"/health/ready": false,
			"/health/live": false,
		},
	},
	// Use database hooks for audit logging (replaces 371 lines of custom auth-audit.ts)
	// Also includes rate limiting configuration (replaces 340+ lines of custom rate limit code)
	databaseHooks: {
		session: {
			create: {
				after: async (session: any) => {
					await trackEvent("session.created", {
						userId: session.userId,
					});
				},
			},
			delete: {
				after: async (session: any) => {
					await trackEvent("session.revoked", {
						userId: session.userId,
					});
				},
			},
		},
		user: {
			create: {
				after: async (user: any) => {
					await trackEvent("auth.signup", {
						userId: user.id,
					});
				},
			},
		},
	},
	plugins: [
		admin(),
		apiKey({
			// ✅ LEVEL 3: Configure API key permissions and rate limiting via better-auth
			// Replaces 265 lines of custom RBAC logic
			permissions: {
				defaultPermissions: {
					"snapback:analyze": ["read"],
					"snapback:snapshot": ["read", "write"],
					"snapback:context": ["read"],
				},
			},
			// Enable automatic session creation for API key-authenticated requests
			enableSessionForAPIKeys: true,
			// Global rate limiting for all API keys
			rateLimit: {
				enabled: true,
				timeWindow: 1000 * 60 * 60 * 24, // 1 day
				maxRequests: 10000, // Default quota per day
			},
		}),
		// ✅ LEVEL 4: JWT plugin with device-specific token issuance
		jwt({
			issuer: appUrl,
			audience: ["vscode", "mcp", "cli"],
			expirationTime: 60 * 15, // 15 minutes for tool JWTs
		} as any),
		magicLink({
			async sendMagicLink({ email, url }) {
				await sendEmail({
					to: email,
					templateId: "magicLink",
					context: {
						url,
						name: email, // Using email as name since no user data is available in this context
					},
				});
			},
		}),
		openAPI(),
		organization({
			async sendInvitationEmail({
				invitation,
				organization,
			}: {
				invitation: { id: string; email: string };
				organization: { name: string };
			}) {
				// Added proper typing
				const { id, email } = invitation;
				const url = new URL(appUrl);
				url.pathname = "/accept-invitation";
				url.searchParams.set("invitationId", id);
				url.searchParams.set("email", email);

				await sendEmail({
					to: email,
					templateId: "organizationInvitation",
					context: {
						organizationName: organization.name,
						url: url.toString(),
						name: email, // Using email as name since no inviter data is available in this context
					},
				});
			},
		}),
		invitationOnlyPlugin(),
		twoFactor(),
		username({
			// Removed onUserUpdated as it's not a valid config option
		}),
		passkey({
			// Removed sendVerificationEmail as it's not a valid config option
		}),
	],
	onAPIError: {
		onError(error: unknown, ctx: unknown) {
			// Enhanced error logging with OAuth-specific context
			const errorDetails: Record<string, unknown> = {
				error,
				context: ctx,
			};

			// Extract additional context from error object
			if (error && typeof error === "object") {
				if ("code" in error) {
					errorDetails.errorCode = error.code;
				}
				if ("message" in error) {
					errorDetails.errorMessage = error.message;
				}
				if ("statusCode" in error) {
					errorDetails.statusCode = error.statusCode;
				}
			}

			// Extract context information (e.g., request path, method)
			if (ctx && typeof ctx === "object") {
				if ("request" in ctx) {
					const request = ctx.request as { url?: string; method?: string };
					errorDetails.requestUrl = request.url;
					errorDetails.requestMethod = request.method;

					// Check if this is an OAuth callback error
					if (request.url?.includes("/api/auth/callback/")) {
						const provider = request.url.split("/callback/")[1]?.split("?")[0];
						errorDetails.oauthProvider = provider;
						errorDetails.errorType = "OAuth Callback Error";

						logger.error("OAuth Callback Error", errorDetails);
						return;
					}
				}
			}

			logger.error("Better Auth API Error", errorDetails);
		},
	},
	// biome-ignore lint/suspicious/noExplicitAny: Better Auth type compatibility - will be properly typed in future version
}) as unknown as any;

// Temporary fix for type issues
// biome-ignore lint/suspicious/noExplicitAny: Better Auth type compatibility
export const authTyped: any = auth;

export * from "./lib/organization.js";

// Temporary type definitions
// biome-ignore lint/suspicious/noExplicitAny: Will be replaced with actual Better Auth types
export type Session = any;

// biome-ignore lint/suspicious/noExplicitAny: Will be replaced with actual Better Auth types
export type ActiveOrganization = any;

// biome-ignore lint/suspicious/noExplicitAny: Will be replaced with actual Better Auth types
export type OrganizationMemberRole = any;

export type OrganizationInvitationStatus = string; // Default to string since we can't infer the exact type

export type OrganizationMetadata = Record<string, unknown> | undefined;
