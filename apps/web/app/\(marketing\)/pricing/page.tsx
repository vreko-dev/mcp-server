import type { Metadata } from "next";
import {
	getSoftwareApplicationSchema,
	serializeSchema,
} from "@/lib/seo/structuredData";
import PricingClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Pricing | SnapBack - Plans for Solo Devs to Enterprise",
	description:
		"Simple, transparent pricing: Free (unlimited local snapshots), Solo $29/mo (cloud + AI detection), Team $79/seat/mo (shared protection + audit logs). 30-day money-back guarantee.",
	keywords: [
		"pricing",
		"plans",
		"free tier",
		"solo developer",
		"team pricing",
		"enterprise plans",
		"code protection pricing",
	],
	openGraph: {
		title: "Pricing | SnapBack - Plans for Everyone",
		description:
			"Free • Solo $29/mo • Team $79/seat • Enterprise custom • 30-day money-back guarantee",
		url: `${SITE_URL}/pricing`,
		siteName: "SnapBack",
		type: "website",
		images: [
			{
				url: `${SITE_URL}/og-pricing.png`,
				width: 1200,
				height: 630,
				alt: "SnapBack Pricing Plans",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Pricing | SnapBack - Plans for Everyone",
		description:
			"Free • Solo $29/mo • Team $79/seat • Enterprise custom • 30-day money-back guarantee",
		images: [`${SITE_URL}/og-pricing.png`],
		creator: "@snapbackdev",
	},
	alternates: {
		canonical: `${SITE_URL}/pricing`,
	},
};

export default function PricingPage() {
	const softwareSchema = getSoftwareApplicationSchema({
		name: "SnapBack",
		price: "0",
		priceCurrency: "USD",
		softwareVersion: "1.0.0",
	});

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: serializeSchema(softwareSchema),
				}}
			/>
			<PricingClient />
		</>
	);
}
