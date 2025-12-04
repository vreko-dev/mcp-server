import type { Metadata } from "next";
import {
	getSoftwareApplicationSchema,
	serializeSchema,
} from "@/lib/seo/structuredData";
import FeaturesClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Features | SnapBack - Multi-File Undo for AI Era",
	description:
		"Protect your code from AI mistakes. Multi-file sessions, real-time risk detection (94% accuracy), granular protection levels. Undo what AI breaks. Keep what AI improves.",
	keywords: [
		"multi-file undo",
		"ai safety",
		"risk detection",
		"session restore",
		"vscode extension",
		"code protection",
	],
	openGraph: {
		title: "Features | SnapBack - Multi-File Undo for AI Era",
		description:
			"Multi-file undo • AI risk detection • Session time-travel • Granular protection",
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
		title: "Features | SnapBack - Multi-File Undo for AI Era",
		description:
			"Multi-file undo • AI risk detection • Session time-travel • Granular protection",
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
			"Multi-file undo for AI-generated changes",
			"Automatic session grouping by timing and AI patterns",
			"Real-time AI risk detection (94% accuracy)",
			"Granular protection levels (Watch/Warn/Block)",
			"Risk severity classification and recommendations",
			"Lightning performance (<200ms snapshots, <10ms checks)",
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
