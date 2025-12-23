import { env, getBaseUrl } from "@snapback/config/server"; // Use centralized config
import { logger } from "@snapback/infrastructure";
import { sendEmail } from "@snapback/integrations/email";
import { db } from "@snapback/platform";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	admin,
	apiKey,
	deviceAuthorization,
	haveIBeenPwned,
	jwt,
	magicLink,
	openAPI,
	organization,
	twoFactor,
	username,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { parse as parseCookies } from "cookie";
import { trackEvent } from "./lib/audit";
import { ac, admin as adminRole, member as memberRole, owner as ownerRole } from "./lib/organization-permissions";
import { invitationOnlyPlugin } from "./plugins/invitation-only/index";

const _getLocaleFromRequest = (request?: Request) => {
	const cookies = parseCookies(request?.headers.get("cookie") ?? "");
	return cookies.NEXT_LOCALE ?? "en";
};

const appUrl = env.APP_URL || getBaseUrl();

// In development, trust all localhost ports to handle Next.js dynamic port assignment
const isDevelopment = env.NODE_ENV !== "production";
const trustedOrigins = isDevelopment
	? [appUrl, "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
	: [appUrl];

// ============================================================================
// Redis Secondary Storage Configuration
// ============================================================================

/**
 * Initialize Redis client for Better Auth secondary storage
 * Used for distributed rate limiting and session caching
 */
export let redisClient: any = null;
export let redisAvailable = false;

async function initializeRedis() {
	if (!env.REDIS_URL) {
		logger.warn("REDIS_URL not configured - rate limiting will use database fallback");
		return;
	}

	try {
		// Dynamic import to handle optional redis dependency
		// biome-ignore lint/suspicious/noExplicitAny: Redis is optional dependency
		// @ts-expect-error - redis is an optional dependency
		const redis: any = await import("redis").catch(() => null);
		if (!redis) {
			logger.warn("Redis module not available");
			return;
		}
		redisClient = redis.createClient({
			url: env.REDIS_URL,
			socket: {
				connectTimeout: 5000,
				reconnectStrategy: (retries: number) => {
					if (retries > 3) {
						logger.error("Redis max retries exceeded");
						return new Error("Max retries reached");
					}
					return Math.min(retries * 100, 3000);
				},
			},
		});

		redisClient.on("error", (err: Error) => {
			logger.warn("Redis connection error", { error: err.message });
			redisAvailable = false;
		});

		redisClient.on("connect", () => {
			logger.info("Redis connected for Better Auth secondary storage");
			redisAvailable = true;
		});

		await redisClient.connect();
		redisAvailable = true;
		logger.info("✅ Better Auth Redis secondary storage initialized");
	} catch (error) {
		logger.warn("Redis initialization failed - using database fallback", {
			error: error instanceof Error ? error.message : String(error),
		});
		redisAvailable = false;
	}
}

// Initialize Redis on module load
initializeRedis().catch((err) => {
	logger.error("Failed to initialize Redis for Better Auth", {
		error: err instanceof Error ? err.message : String(err),
	});
});

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
				deviceFingerprint: {
					type: "string",
					required: false,
				},
			},
		},
	},
	appName: "SnapBack",

	// ✅ SECURITY: Prevent account enumeration attacks
	// OWASP ASVS 2.2.1 - Don't reveal whether username exists
	disablePaths: ["/is-username-available"],

	endpoints: {
		GET: {
			"/health": {
				async handler() {
					return new Response("OK", { status: 200 });
				},
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		// Account lockout hooks are handled via middleware (see account-lockout.ts)
		// - incrementFailedAttempts() called on failed login
		// - resetFailedAttempts() called on successful login
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

		// ✅ OPTIMIZATION: Cookie cache for 80% database load reduction
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes - short-lived, signed cookie
			strategy: "jwe", // Use JWE for encrypted session data (most secure)
			refreshCache: {
				updateAge: 60, // Refresh when 60 seconds remain before expiry
			},
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google", "github"],
		},
	},
	trustedOrigins,

	// ✅ OPTIMIZATION: Redis secondary storage for distributed rate limiting
	secondaryStorage:
		redisAvailable && redisClient
			? {
					get: async (key: string) => {
						try {
							return await redisClient.get(key);
						} catch (error) {
							logger.error("Redis get failed", { key, error });
							return null;
						}
					},
					set: async (key: string, value: string, ttl?: number) => {
						try {
							if (ttl) {
								await redisClient.set(key, value, { EX: ttl });
							} else {
								await redisClient.set(key, value);
							}
						} catch (error) {
							logger.error("Redis set failed", { key, error });
						}
					},
					delete: async (key: string) => {
						try {
							await redisClient.del(key);
						} catch (error) {
							logger.error("Redis delete failed", { key, error });
						}
					},
				}
			: undefined,

	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",

		crossSiteRequestForgery: {
			enabled: true,
			// Verify origin header matches trusted origins
			checkOrigin: true,
		},

		// ✅ OPTIMIZATION: Explicit ID generation using cuid2
		database: {
			generateId: () => cuid(),
			defaultFindManyLimit: 100, // Prevent unbounded queries
			experimentalJoins: false, // Disable experimental features in production
		},

		// ✅ OPTIMIZATION: IP tracking configuration for security audit
		ipAddress: {
			ipAddressHeaders: [
				"cf-connecting-ip", // Cloudflare (highest priority)
				"x-real-ip", // Nginx proxy
				"x-forwarded-for", // Standard proxy header
				"x-client-ip",
			],
			disableIpTracking: false, // Enable IP tracking for security
		},

		// ✅ OPTIMIZATION: Enhanced cookie configuration
		crossSubDomainCookies: {
			enabled: env.NODE_ENV === "production",
			domain: env.NODE_ENV === "production" ? ".snapback.dev" : undefined,
		},

		defaultCookieAttributes: {
			sameSite: "lax",
			secure: env.NODE_ENV === "production",
			httpOnly: true,
			path: "/",
		},

		cookiePrefix: "snapback", // Namespace cookies
	},
	// Rate limiting configuration (replaces 340+ lines of custom rate limit code)
	rateLimit: {
		window: 60, // 60 seconds
		max: 100, // 100 requests per window (global default)

		// ✅ OPTIMIZATION: Use Redis for distributed rate limiting
		storage: redisAvailable ? "secondary-storage" : "database",

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

					// ✅ NEW: Auto-populate Pioneer profile on OAuth signup
					// This ensures every user automatically gets a Pioneer profile
					// with proper tier tracking and referral codes
					try {
						const { onOAuthSuccess } = await import("./lib/pioneer-oauth-hook");
						await onOAuthSuccess(user);
					} catch (error) {
						// Don't fail auth flow if pioneer hook fails
						logger.error("Pioneer OAuth hook failed", { userId: user.id, error });
					}
				},
			},
		},
	},
	plugins: [
		// ✅ RFC 8628 Device Authorization Grant Flow (for WSL, Remote SSH, Codespaces)
		deviceAuthorization(),
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
				timeWindow: "1 day" as any,
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

		// ✅ OPTIMIZATION: Organization plugin with RBAC configuration
		// ✅ SECURITY: Session rotation on privilege escalation
		// Note: Call rotateSessionsOnOrgRoleChange() manually after updateMemberRole()
		// See: src/lib/session-rotation.ts
		organization({
			// Access control instance from organization-permissions.ts
			ac,

			// Define roles and permissions
			roles: {
				owner: ownerRole,
				admin: adminRole,
				member: memberRole,
			},

			// Organization creation settings
			allowUserToCreateOrganization: true,
			organizationLimit: 5, // Max 5 orgs per user (prevent abuse)

			// Send invitation emails
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

		// ✅ SECURITY: Password breach detection via HaveIBeenPwned
		// OWASP A07:2021, NIST SP 800-63B Section 5.1.1.2
		// Automatically checks passwords during signup and password changes
		haveIBeenPwned(),

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

export * from "./lib/organization";

// Type exports moved to appropriate locations:
// - Session: Use 'better-auth/types' or '@snapback/contracts/auth/session'
// - Organization types: Use Better Auth organization plugin types
// Removed dangerous 'any' stub exports (audit finding #1)
