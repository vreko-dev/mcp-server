import { withSentryConfig } from "@sentry/nextjs";
import webpack from "webpack";

// Add bundle analyzer (only for Webpack builds when TURBOPACK=false)
// For Turbopack (default), use: npx next experimental-analyze
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
	enabled:
		process.env.ANALYZE === "true" && process.env.TURBOPACK === "false",
});

const nextConfig = {
	/* config options here */
	pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "assets.aceternity.com",
			},
		],
	},
	transpilePackages: [
		"@snapback/contracts",
		"@snapback/sdk",
		"@snapback/events",
	],
	serverExternalPackages: ["@snapback/infrastructure"],
	experimental: {
		// Next.js 16: Enable Turbopack filesystem caching for faster dev rebuilds
		turbopackFileSystemCacheForDev: true,
		optimizePackageImports: [
			"zod",
			"@tanstack/react-query",
			"lucide-react",
			"@radix-ui/react-*",
			"recharts",
			"date-fns",
			"react-hook-form",
			"@react-email/components",
		],
	},
	// Enable standalone output for Docker optimization
	output: "standalone",
	// Security headers
	async headers() {
		const isDev = process.env.NODE_ENV === "development";

		// In production, use strict CSP without unsafe-eval
		// In development, allow unsafe-eval for Next.js hot reload
		const scriptSrc = isDev
			? "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://va.vercel-scripts.com https://www.googletagmanager.com https://us-assets.i.posthog.com"
			: "'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com https://va.vercel-scripts.com https://www.googletagmanager.com https://us-assets.i.posthog.com";

		// In development, allow HTTP connections to local subdomains
		// Note: Sentry uses /monitoring tunnel route, so no external Sentry domain needed in CSP
		const connectSrc = isDev
			? "'self' http://snapback.dev:* http://*.snapback.dev:* http://localhost:* https://api.snapback.dev https://challenges.cloudflare.com https://vitals.vercel-insights.com https://i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com https://analytics.google.com"
			: "'self' https://api.snapback.dev https://challenges.cloudflare.com https://vitals.vercel-insights.com https://i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com https://analytics.google.com";

		// Build CSP directives
		const cspDirectives = [
			"default-src 'self'",
			`script-src ${scriptSrc}`,
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https: blob:",
			"font-src 'self' data:",
			`connect-src ${connectSrc}`,
			"frame-src https://challenges.cloudflare.com https://js.stripe.com",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
		];

		// Only upgrade to HTTPS in production
		if (!isDev) {
			cspDirectives.push("upgrade-insecure-requests");
		}

		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{
						key: "Content-Security-Policy",
						value: cspDirectives.join("; "),
					},
				],
			},
		];
	},
	// Reverse proxy for PostHog analytics (hides API key from client)
	async rewrites() {
		const isDev = process.env.NODE_ENV === "development";

		// In development, skip PostHog proxy to avoid SSL errors
		// PostHog will be disabled if NEXT_PUBLIC_POSTHOG_KEY is not set
		if (isDev) {
			return [];
		}

		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	// Redirect docs routes to standalone docs app
	async redirects() {
		return [
			{
				source: "/docs/:path*",
				destination: "https://docs.snapback.dev/:path*",
				permanent: true,
				statusCode: 301,
			},
		];
	},
	webpack: (config, { isServer }) => {
		// Add extensionAlias to handle .js imports for .ts files (ES modules pattern)
		config.resolve.extensionAlias = {
			".js": [".js", ".ts", ".tsx"],
			".jsx": [".jsx", ".tsx"],
		};

		// Handle native modules on client and server side
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^piscina$/,
				contextRegExp: /./,
			})
		);

		// Suppress client-side warnings for server-only packages
		if (!isServer) {
			config.resolve.alias = {
				...config.resolve.alias,
				"@snapback/infrastructure": false,
			};
		}

		return config;
	},
};

// Wrap with Bundle Analyzer
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

// Sentry configuration options
const sentryBuildOptions = {
	// Suppress Sentry CLI logs during build
	silent: true,

	// Organization and project for source map uploads
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,

	// Upload wider set of source maps for better stack traces
	widenClientFileUpload: true,

	// Hide source maps from client bundles
	hideSourceMaps: true,

	// Disable Sentry telemetry
	telemetry: false,

	// Route Sentry requests through /monitoring to avoid ad blockers
	tunnelRoute: "/monitoring",

	// Disable automatic instrumentation of API routes (we handle this manually)
	autoInstrumentServerFunctions: false,

	// Disable automatic instrumentation of middleware
	autoInstrumentMiddleware: false,

	// Disable automatic instrumentation of app directory
	autoInstrumentAppDirectory: false,
};

// Wrap with Sentry (only if SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is set)
const hasSentry = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
export default hasSentry
	? withSentryConfig(configWithAnalyzer, sentryBuildOptions)
	: configWithAnalyzer;
