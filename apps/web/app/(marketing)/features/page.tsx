import type { Metadata } from "next";
import {
	getSoftwareApplicationSchema,
	serializeSchema,
} from "@/lib/seo/structuredData";
import FeaturesClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Features | SnapBack - AI Code Protection",
	description:
		"Explore SnapBack's powerful features: 3-level protection, session time-travel, Guardian AI detection, severity analysis, MCP integration, and lightning-fast performance.",
	keywords: [
		"code protection features",
		"ai detection",
		"session snapshots",
		"guardian analysis",
		"mcp integration",
		"vscode extension",
	],
	openGraph: {
		title: "Features | SnapBack - AI Code Protection",
		description:
			"3-level protection • Session time-travel • Guardian AI detection • MCP integration",
		url: `${SITE_URL}/features`,
		siteName: "SnapBack",
		type: "website",
		images: [
			{
				url: `${SITE_URL}/og-features.png`,
				width: 1200,
				height: 630,
				alt: "SnapBack Features Overview",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Features | SnapBack - AI Code Protection",
		description:
			"3-level protection • Session time-travel • Guardian AI detection • MCP integration",
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
			"Guardian AI detection with 94% accuracy",
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
