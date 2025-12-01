import { describe, expect, it } from "vitest";
import { generateCanonicalUrl, generateMetadata } from "@/lib/seo/metadata";

describe("generateMetadata", () => {
	it("should generate basic metadata", () => {
		const metadata = generateMetadata({
			title: "Test Page",
			description: "Test description",
		});

		expect(metadata.title).toBe("Test Page");
		expect(metadata.description).toBe("Test description");
	});

	it("should include canonical URL", () => {
		const metadata = generateMetadata({
			title: "Features",
			description: "Product features",
			path: "/features",
		});

		expect(metadata.alternates?.canonical).toBeDefined();
		expect(metadata.alternates?.canonical).toContain("/features");
	});

	it("should generate OpenGraph metadata", () => {
		const metadata = generateMetadata({
			title: "Test Page",
			description: "Test description",
		});

		expect(metadata.openGraph).toBeDefined();
		expect(metadata.openGraph?.title).toBe("Test Page");
		expect(metadata.openGraph?.description).toBe("Test description");
		expect(metadata.openGraph?.type).toBe("website");
	});

	it("should generate Twitter metadata", () => {
		const metadata = generateMetadata({
			title: "Test Page",
			description: "Test description",
		});

		expect(metadata.twitter).toBeDefined();
		expect(metadata.twitter?.card).toBe("summary_large_image");
		expect(metadata.twitter?.title).toBe("Test Page");
		expect(metadata.twitter?.description).toBe("Test description");
	});

	it("should include custom OG image", () => {
		const customImageUrl = "https://snapback.dev/images/custom-og-image.png";
		const metadata = generateMetadata({
			title: "Test",
			description: "Test",
			ogImage: customImageUrl,
		});

		// OpenGraph images is array of objects, check the url property
		const images = metadata.openGraph?.images as Array<{ url: string }>;
		expect(images).toBeDefined();
		expect(images[0].url).toBe(customImageUrl);
	});

	it("should include keywords", () => {
		const metadata = generateMetadata({
			title: "Test",
			description: "Test",
			keywords: ["ai code protection", "vscode"],
		});

		expect(metadata.keywords).toEqual(["ai code protection", "vscode"]);
	});

	it("should set robots indexing based on noindex flag", () => {
		const indexable = generateMetadata({
			title: "Test",
			description: "Test",
			noindex: false,
		});

		const noindex = generateMetadata({
			title: "Test",
			description: "Test",
			noindex: true,
		});

		expect(indexable.robots?.index).toBe(true);
		expect(noindex.robots?.index).toBe(false);
	});

	it("should handle article type with publish date", () => {
		const metadata = generateMetadata({
			title: "Blog Post",
			description: "Test blog post",
			type: "article",
			publishedTime: "2025-01-01T00:00:00Z",
		});

		expect(metadata.openGraph?.type).toBe("article");
		expect(metadata.openGraph).toHaveProperty("publishedTime");
	});

	it("should use default site name", () => {
		const metadata = generateMetadata({
			title: "Test",
			description: "Test",
		});

		expect(metadata.openGraph?.siteName).toBe("SnapBack");
	});

	it("should handle missing optional fields", () => {
		const metadata = generateMetadata({
			title: "Minimal",
			description: "Minimal metadata",
		});

		expect(metadata.title).toBe("Minimal");
		expect(metadata.description).toBe("Minimal metadata");
		expect(metadata).toHaveProperty("openGraph");
		expect(metadata).toHaveProperty("twitter");
	});
});

describe("generateCanonicalUrl", () => {
	it("should generate absolute URL from path", () => {
		const url = generateCanonicalUrl("/features");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should handle root path", () => {
		const url = generateCanonicalUrl("/");

		expect(url).toBe("https://snapback.dev");
	});

	it("should handle nested paths", () => {
		const url = generateCanonicalUrl("/docs/getting-started");

		expect(url).toBe("https://snapback.dev/docs/getting-started");
	});

	it("should remove trailing slash from non-root paths", () => {
		const url = generateCanonicalUrl("/features/");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should preserve root trailing slash", () => {
		const url = generateCanonicalUrl("/");

		expect(url).toBe("https://snapback.dev");
	});

	it("should handle paths without leading slash", () => {
		const url = generateCanonicalUrl("features");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should remove query parameters", () => {
		const url = generateCanonicalUrl("/features?ref=navbar");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should remove hash fragments", () => {
		const url = generateCanonicalUrl("/features#pricing");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should remove both query and hash", () => {
		const url = generateCanonicalUrl("/features?ref=navbar#pricing");

		expect(url).toBe("https://snapback.dev/features");
	});

	it("should handle empty string", () => {
		const url = generateCanonicalUrl("");

		expect(url).toBe("https://snapback.dev");
	});
});

describe("Metadata Integration", () => {
	it("should generate complete metadata for home page", () => {
		const metadata = generateMetadata({
			title: "SnapBack - AI Code Protection for VS Code",
			description:
				"Visual protection for every file. AI-aware checkpoints. Instant recovery.",
			path: "/",
			keywords: [
				"ai code protection",
				"vscode code protection",
				"github copilot safety",
			],
		});

		expect(metadata.title).toBeDefined();
		expect(metadata.description).toBeDefined();
		expect(metadata.alternates?.canonical).toBe("https://snapback.dev");
		expect(metadata.keywords).toHaveLength(3);
		expect(metadata.openGraph).toBeDefined();
		expect(metadata.twitter).toBeDefined();
	});

	it("should generate complete metadata for blog post", () => {
		const metadata = generateMetadata({
			title: "How AI Destroyed $12K of Code",
			description: "The story behind SnapBack",
			path: "/blog/ai-disaster-story",
			type: "article",
			publishedTime: "2025-01-15T00:00:00Z",
			authors: ["SnapBack Team"],
		});

		expect(metadata.openGraph?.type).toBe("article");
		expect(metadata.openGraph).toHaveProperty("publishedTime");
		expect(metadata.openGraph).toHaveProperty("authors");
	});

	it("should generate complete metadata for product page", () => {
		const metadata = generateMetadata({
			title: "Features - SnapBack",
			description: "Automatic snapshots, AI detection, instant recovery",
			path: "/features",
			keywords: ["code protection features", "ai activity detection"],
		});

		expect(metadata.alternates?.canonical).toBe(
			"https://snapback.dev/features",
		);
		expect(metadata.keywords).toBeDefined();
	});
});
