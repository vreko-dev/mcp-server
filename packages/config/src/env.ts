import { z } from "zod";

// Environment variable schema validation
const envSchema = z
	.object({
		// Database (optional for web app - uses API instead)
		DATABASE_URL: z.string().optional(),
		DIRECT_URL: z.string().optional(),

		// Auth (optional for development, but both ID and SECRET must be set together)
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(20).optional(), // Google secrets are typically 24+ chars
		GITHUB_CLIENT_ID: z.string().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().min(20).optional(), // GitHub secrets are typically 40 chars

		// API Keys
		STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
		STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
		STRIPE_WEBHOOK_SECRET: z.string().optional(),
		SENTRY_DSN: z.string().url().or(z.literal("")).optional(),
		POSTHOG_API_KEY: z.string().optional(),

		// App
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		PORT: z.coerce.number().default(3000),
		APP_URL: z.string().url().or(z.literal("")).optional(),
		ENABLE_SIGNUP: z.string().optional(), // Add this line

		// Redis
		REDIS_URL: z.string().url().or(z.literal("")).optional(),

		// Email
		RESEND_API_KEY: z.string().optional(),

		// Rules Signing
		RULES_SIGNING_KEY: z.string().min(32).optional(), // MVP Note: Added for secure JWS signing of rules bundles

		// Logging
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	})
	.refine(
		(data) => {
			// Google OAuth: If client ID is set, client secret must be set too
			if (data.GOOGLE_CLIENT_ID && !data.GOOGLE_CLIENT_SECRET) {
				return false;
			}
			if (data.GOOGLE_CLIENT_SECRET && !data.GOOGLE_CLIENT_ID) {
				return false;
			}
			return true;
		},
		{
			message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
			path: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
		},
	)
	.refine(
		(data) => {
			// GitHub OAuth: If client ID is set, client secret must be set too
			if (data.GITHUB_CLIENT_ID && !data.GITHUB_CLIENT_SECRET) {
				return false;
			}
			if (data.GITHUB_CLIENT_SECRET && !data.GITHUB_CLIENT_ID) {
				return false;
			}
			return true;
		},
		{
			message: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together",
			path: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
		},
	)
	.refine(
		(data) => {
			// In production, require at least one OAuth provider
			if (data.NODE_ENV === "production") {
				const hasGoogle = data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET;
				const hasGithub = data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET;
				return hasGoogle || hasGithub;
			}
			return true;
		},
		{
			message: "At least one OAuth provider (Google or GitHub) is required in production",
			path: ["GOOGLE_CLIENT_ID", "GITHUB_CLIENT_ID"],
		},
	);

// Validate environment variables at startup (server-side only)
// Skip validation in browser context where process.env is not fully available
const isBrowser = typeof window !== "undefined";
const envParseResult = isBrowser
	? { success: true as const, data: process.env as any }
	: envSchema.safeParse(process.env);

// Handle validation errors
if (!envParseResult.success && !isBrowser) {
	const errors = envParseResult.error.flatten().fieldErrors;
	const missingFields = Object.entries(errors)
		.filter(([_, err]) => err?.includes("Required"))
		.map(([field]) => field);

	const invalidFields = Object.entries(errors)
		.filter(([_, err]) => !err?.includes("Required"))
		.map(([field]) => field);

	console.error("\n❌ Invalid environment variables:");

	if (missingFields.length > 0) {
		console.error(`\n📋 Missing required variables: ${missingFields.join(", ")}`);
	}

	if (invalidFields.length > 0) {
		console.error(`\n⚠️  Invalid values for: ${invalidFields.join(", ")}`);
	}

	console.error("\nFull validation errors:");
	console.error(JSON.stringify(errors, null, 2));

	// In production, fail fast. In development, allow continuation with warnings
	if (process.env.NODE_ENV === "production") {
		console.error("\n🚨 Production mode: Configuration is invalid. Exiting.\n");
		process.exit(1);
	}

	console.warn("\n⚠️  Development mode: Continuing despite validation errors");
	console.warn("These errors must be fixed before production deployment!\n");
}

// Export validated environment variables
export const env = envParseResult.data;

// Export types
export type Env = z.infer<typeof envSchema>;
