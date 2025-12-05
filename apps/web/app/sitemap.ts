import { getAllPosts } from "@marketing/blog/utils/lib/posts";
import type { MetadataRoute } from "next";
import { getAllLegalPages } from "@/lib/legal-loader";

/**
 * Sitemap generation for SnapBack web app
 * 
 * Industry best practices:
 * - Includes changeFrequency for crawl optimization
 * - Priority scores guide crawler importance
 * - lastModified uses actual dates when available
 * - Organized by content type for maintainability
 */

function getBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
	return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

const baseUrl = getBaseUrl();
const locales = ["en"];

// High-value marketing pages with priority scores
const staticMarketingPages = [
	{ path: "", priority: 1.0, changeFrequency: "weekly" as const },
	{ path: "/features", priority: 0.9, changeFrequency: "weekly" as const },
	{ path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
	{ path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
	{ path: "/changelog", priority: 0.8, changeFrequency: "weekly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const posts = await getAllPosts();
	const legalPages = getAllLegalPages();

	return [
		// Marketing pages - highest priority
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(`/${locale}${page.path}`, baseUrl).href,
				lastModified: new Date(),
				changeFrequency: page.changeFrequency,
				priority: page.priority,
			})),
		),
		// Blog posts - high priority for SEO
		...posts.map((post) => ({
			url: new URL(`/${post.locale}/blog/${post.path}`, baseUrl).href,
			// Use actual post date if available, fallback to current date
			lastModified: post.date ? new Date(post.date) : new Date(),
			changeFrequency: "monthly" as const,
			priority: 0.8,
		})),
		// Legal pages - lower priority but necessary
		...legalPages.map((page) => ({
			url: new URL(`/${page.locale}/legal/${page.path}`, baseUrl).href,
			lastModified: new Date(),
			changeFrequency: "yearly" as const,
			priority: 0.3,
		})),
	];
}
