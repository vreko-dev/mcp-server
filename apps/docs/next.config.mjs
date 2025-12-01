import { createMDX } from "fumadocs-mdx/next";

// Configure Fumadocs MDX
const withFumadocsMDX = createMDX({
	configPath: "./source.config.ts",
	outDir: "./.source",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

	experimental: {
		optimizePackageImports: ["fumadocs-ui", "lucide-react"],
	},

	outputFileTracingIncludes: {
		"/api/**": ["./node_modules/**"],
	},

	// Security headers
	async headers() {
		const isDev = process.env.NODE_ENV === "development";

		const scriptSrc = isDev
			? "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com"
			: "'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com";

		const cspDirectives = [
			"default-src 'self'",
			`script-src ${scriptSrc}`,
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https: blob:",
			"font-src 'self' data:",
			"connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://vitals.vercel-insights.com",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
		];

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
};

export default withFumadocsMDX(nextConfig);
