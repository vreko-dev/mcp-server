import type { MetadataRoute } from "next";

/**
 * Robots.txt configuration for SnapBack web app
 * 
 * Best practices:
 * - Explicitly reference sitemap
 * - Block non-public routes
 * - Allow all SEO-valuable content
 */

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/",
					"/_next/",
					"/auth/",
					"/dashboard/",
				],
			},
			// Specific rules for aggressive crawlers
			{
				userAgent: "GPTBot",
				allow: "/blog/",
				disallow: ["/api/", "/auth/", "/dashboard/"],
			},
			{
				userAgent: "ChatGPT-User",
				allow: "/blog/",
				disallow: ["/api/", "/auth/", "/dashboard/"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
