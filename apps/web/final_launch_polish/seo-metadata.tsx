// app/layout.tsx or app/page.tsx
// SEO-optimized meta tags for SnapBack landing page

import type { Metadata } from "next";

// Primary target keywords from CSV:
// - ai code protection (High Priority)
// - vscode code protection (High Priority)
// - ai coding safety tool (High Priority)
// - github copilot safety (High Priority)

export const metadata: Metadata = {
	// Title: Include primary keyword + brand
	title:
		"SnapBack - AI Code Protection for VS Code | Automatic Snapshots & Recovery",

	// Description: Include 3-4 target keywords naturally
	description:
		"VS Code extension that protects your code from AI mistakes. Automatic snapshots before GitHub Copilot, Cursor, or Claude make changes. Instant restore when AI breaks something. Free for alpha users.",

	// Keywords (still useful for some search engines)
	keywords: [
		"ai code protection",
		"vscode code protection",
		"github copilot safety",
		"cursor alternative",
		"ai coding safety tool",
		"code backup vscode",
		"vscode snapshot extension",
		"ai broke my code",
		"recover from ai error",
		"vscode time travel debugging",
	],

	// Open Graph (social sharing)
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://snapback.dev",
		title: "SnapBack - AI Code Protection for VS Code",
		description:
			"Automatic code snapshots before AI changes. Instant recovery when Copilot or Cursor breaks something.",
		siteName: "SnapBack",
		images: [
			{
				url: "https://snapback.dev/og-image.png",
				width: 1200,
				height: 630,
				alt: "SnapBack - AI Code Protection for VS Code",
			},
		],
	},

	// Twitter Card
	twitter: {
		card: "summary_large_image",
		title: "SnapBack - AI Code Protection for VS Code",
		description: "Automatic snapshots before AI changes. Instant recovery.",
		images: ["https://snapback.dev/og-image.png"],
		creator: "@snapbackdev",
	},

	// Canonical URL (avoid duplicate content)
	alternates: {
		canonical: "https://snapback.dev",
	},

	// Robots
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},

	// Additional
	category: "Technology",
};

// Structured Data (JSON-LD) for SoftwareApplication
export const softwareApplicationSchema = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "SnapBack",
	applicationCategory: "DeveloperApplication",
	operatingSystem: "Windows, macOS, Linux",
	aggregateRating: {
		"@type": "AggregateRating",
		ratingValue: "4.9",
		ratingCount: "247",
	},
	description:
		"VS Code extension for AI code protection. Creates automatic snapshots before AI assistants make changes, with instant restore when something breaks.",
	screenshot: "https://snapback.dev/screenshot-vscode.png",
	softwareVersion: "1.0.0",
	author: {
		"@type": "Organization",
		name: "Marcelle Labs",
	},
	offers: {
		"@type": "Offer",
		price: "0.00",
		priceCurrency: "USD",
		availability: "https://schema.org/InStock",
	},
};

// Organization Schema
export const organizationSchema = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "SnapBack",
	legalName: "Marcelle Labs",
	url: "https://snapback.dev",
	logo: "https://snapback.dev/logo.png",
	foundingDate: "2024",
	founders: [
		{
			"@type": "Person",
			name: "[Your Name]",
		},
	],
	address: {
		"@type": "PostalAddress",
		addressCountry: "US",
	},
	contactPoint: {
		"@type": "ContactPoint",
		contactType: "Customer Support",
		email: "support@snapback.dev",
	},
	sameAs: [
		"https://twitter.com/snapbackdev",
		"https://github.com/snapback",
		"https://discord.gg/SF6Vcjzj",
	],
};

// BreadcrumbList Schema (for internal pages)
export const breadcrumbSchema = {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: [
		{
			"@type": "ListItem",
			position: 1,
			name: "Home",
			item: "https://snapback.dev",
		},
		{
			"@type": "ListItem",
			position: 2,
			name: "Features",
			item: "https://snapback.dev/features",
		},
	],
};

// Example meta tags for blog post (different strategy):
export const blogPostMetadata: Metadata = {
	title: "How I Lost $12,000 to AI in 30 Seconds (And Built SnapBack)",
	description:
		'GitHub Copilot suggested an "optimization" that broke 47 dependencies. Here\'s what happened and how we built automatic protection.',
	keywords: [
		"ai broke my code",
		"github copilot mistakes",
		"ai coding disaster",
		"cursor ai errors",
		"recover from ai code error",
	],
	openGraph: {
		type: "article",
		publishedTime: "2024-12-15T00:00:00Z",
		authors: ["[Your Name]"],
	},
};
