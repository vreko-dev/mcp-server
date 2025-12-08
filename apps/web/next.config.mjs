import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add bundle analyzer (if available)
let withBundleAnalyzer = (config) => config;
try {
	withBundleAnalyzer = require("@next/bundle-analyzer")({
		enabled: process.env.ANALYZE === "true" || process.env.ANALYZE === true,
	});
} catch (_e) {
	// Bundle analyzer not available, continue without it
	console.warn("Bundle analyzer not available, continuing without it");
}

// Configure Fumadocs MDX (replaces @next/mdx)
const withFumadocsMDX = createMDX({
	configPath: "./source.config.ts",
	outDir: "./.source",
});

const nextConfig = {
	/* config options here */
	pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
	transpilePackages: [
		"@snapback/contracts",
		"@snapback/sdk",
		"@snapback/events",
	],
	serverExternalPackages: [],
	experimental: {
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

		return config;
	},
};

// Wrap with Fumadocs MDX and Bundle Analyzer
const configWithFumadocs = withFumadocsMDX(nextConfig);

// Sentry integration removed for frontend-only deployment
// Error tracking should be configured in the backend (apps/api)
export default withBundleAnalyzer(configWithFumadocs);
