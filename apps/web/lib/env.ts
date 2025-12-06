import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment Variable Validation
 *
 * Validates all environment variables at build time using Zod schemas.
 * This ensures that required variables are present and have correct formats,
 * preventing runtime errors in production.
 *
 * Usage:
 * import { env } from "@/lib/env";
 * console.log(env.NEXT_PUBLIC_POSTHOG_KEY);
 */

export const env = createEnv({
	/**
	 * Server-side environment variables
	 * These are only available on the server and never exposed to the client
	 */
	server: {
		// Database
		DATABASE_URL: z.string().url(),

		// Auth
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
		GITHUB_CLIENT_ID: z.string().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

		// Email
		RESEND_API_KEY: z.string().min(1).optional(),

		// Payments
		STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
		STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

		// Storage
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
		S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		S3_ENDPOINT: z.string().url().optional(),
		S3_REGION: z.string().min(1).optional(),

		// Monitoring
		SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
		SENTRY_ORG: z.string().min(1).optional(),
		SENTRY_PROJECT: z.string().min(1).optional(),

		// CRM
		HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional(),

		// AI Services
		OPENAI_API_KEY: z.string().startsWith("sk-").optional(),

		// Redis
		REDIS_URL: z.string().url().optional(),

		// Node environment
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	},

	/**
	 * Client-side environment variables
	 * These are exposed to the client and must be prefixed with NEXT_PUBLIC_
	 */
	client: {
		// Site Configuration
		NEXT_PUBLIC_SITE_URL: z.string().url(),
		NEXT_PUBLIC_APP_URL: z.string().url().optional(),
		NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1),

		// Analytics
		NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
		NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
		NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().startsWith("G-").optional(),

		// Monitoring
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

		// Storage
		NEXT_PUBLIC_AVATARS_BUCKET_NAME: z.string().min(1).optional(),

		// Payments (Price IDs)
		NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY: z.string().min(1).optional(),
		NEXT_PUBLIC_PRICE_ID_PRO_YEARLY: z.string().min(1).optional(),
		NEXT_PUBLIC_PRICE_ID_LIFETIME: z.string().min(1).optional(),
	},

	/**
	 * Runtime environment variables
	 * You need to destructure all the keys manually here for validation
	 */
	runtimeEnv: {
		// Server
		DATABASE_URL: process.env.DATABASE_URL,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
		S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
		S3_ENDPOINT: process.env.S3_ENDPOINT,
		S3_REGION: process.env.S3_REGION,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		REDIS_URL: process.env.REDIS_URL,
		NODE_ENV: process.env.NODE_ENV,

		// Client
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_AVATARS_BUCKET_NAME: process.env.NEXT_PUBLIC_AVATARS_BUCKET_NAME,
		NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY: process.env.NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY,
		NEXT_PUBLIC_PRICE_ID_PRO_YEARLY: process.env.NEXT_PUBLIC_PRICE_ID_PRO_YEARLY,
		NEXT_PUBLIC_PRICE_ID_LIFETIME: process.env.NEXT_PUBLIC_PRICE_ID_LIFETIME,
	},

	/**
	 * Skip validation in build phase to allow for environment-specific builds
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,

	/**
	 * Makes it so that empty strings are treated as undefined
	 */
	emptyStringAsUndefined: true,
});
