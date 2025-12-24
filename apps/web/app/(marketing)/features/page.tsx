import type { Metadata } from "next";
import { getSoftwareApplicationSchema, serializeSchema } from "@/lib/seo/structuredData";
import FeaturesClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Features | SnapBack - Pattern Memory & Learning",
	description:
		"SnapBack learns what breaks YOUR codebase. Pattern memory gets smarter over time. Day 1: catches common patterns. Day 30: knows your specific risks. Month 3: catches patterns you didn't see.",
	keywords: [
		"pattern memory",
		"learns from mistakes",
		"progressive improvement",
		"ai code safety",
		"vscode extension",
		"snapshot restore",
	],
	openGraph: {
		title: "Features | SnapBack - Learns Your Codebase",
		description: "Pattern Memory • Learns from Your Mistakes • Detects What Breaks • Gets Smarter Daily",
		url: `${SITE_URL}/features`,
		siteName: "SnapBack",
		type: "website",
		images: [
			{
				url: `${SITE_URL}/og-features.png`,
				width: 1200,
				height: 630,
				alt: "SnapBack - Learns What Breaks Your Code",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Features | SnapBack - Pattern Memory",
		description:
			"Day 1: catches common patterns. Day 30: knows YOUR codebase. Month 3: catches patterns before you do.",
		images: [`${SITE_URL}/og-features.png`],
		creator: "@snapbackdev",
	},
	alternates: {
		canonical: `${SITE_URL}/features`,
	},
};

export default function FeaturesPage() {
	// Enhanced SoftwareApplication schema with feature details
	const softwareSchema = getSoftwareApplicationSchema({
		name: "SnapBack",
		price: "0",
		priceCurrency: "USD",
		softwareVersion: "1.0.0",
	});

	// Add feature-specific details to schema
	const enhancedSchema = {
		...softwareSchema,
		featureList: [
			"3-level file protection (Watch/Warn/Block)",
			"Session-based multi-file time-travel",
			"Guardian AI detection that learns your patterns",
			"Risk severity analysis and recommendations",
			"MCP integration for Claude Code and Cursor",
			"Performance budgets (<200ms snapshots, <10ms checks)",
		],
		softwareHelp: `${SITE_URL}/docs`,
		applicationCategory: "DeveloperApplication",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
			availability: "https://schema.org/InStock",
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: serializeSchema(enhancedSchema),
				}}
			/>
			<FeaturesClient />
		</>
	);
}
