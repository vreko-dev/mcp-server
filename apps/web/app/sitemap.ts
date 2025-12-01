import { getAllPosts } from "@marketing/blog/utils/lib/posts";
import type { MetadataRoute } from "next";
import { getAllLegalPages } from "@/lib/legal-loader";

function getBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
	return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

const baseUrl = getBaseUrl();
const locales = ["en"];

const staticMarketingPages = ["", "/changelog"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const posts = await getAllPosts();
	const legalPages = getAllLegalPages();

	return [
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(`/${locale}${page}`, baseUrl).href,
				lastModified: new Date(),
			})),
		),
		...posts.map((post) => ({
			url: new URL(`/${post.locale}/blog/${post.path}`, baseUrl).href,
			lastModified: new Date(),
		})),
		...legalPages.map((page) => ({
			url: new URL(`/${page.locale}/legal/${page.path}`, baseUrl).href,
			lastModified: new Date(),
		})),
		// TODO: Re-enable when Fumadocs integration is complete
		// ...docsSource.getLanguages().flatMap((locale) =>
		// 	docsSource.getPages(locale.language).map((page) => ({
		// 		url: new URL(
		// 			`/${locale.language}/docs/${page.slugs.join("/")}`,
		// 			baseUrl,
		// 		).href,
		// 		lastModified: new Date(),
		// 	})),
		// ),
	];
}
