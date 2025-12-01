import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
	const docsUrl = `${baseUrl.replace("snapback.dev", "docs.snapback.dev")}`;

	return source.getPages().map((page) => ({
		url: `${docsUrl}${page.url}`,
		lastModified: new Date(),
		changeFrequency: "weekly" as const,
		priority: page.url === "/" ? 1.0 : 0.8,
	}));
}
