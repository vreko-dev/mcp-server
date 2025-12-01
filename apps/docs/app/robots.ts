import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
	const docsUrl = `${baseUrl.replace("snapback.dev", "docs.snapback.dev")}`;

	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api/", "/_next/"],
		},
		sitemap: `${docsUrl}/sitemap.xml`,
	};
}
