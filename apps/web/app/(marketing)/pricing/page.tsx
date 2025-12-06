import type { Metadata } from "next";
import { getSoftwareApplicationSchema, serializeSchema } from "@/lib/seo/structuredData";
import PricingClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Pricing | SnapBack - AI Code Protection Plans",
	description:
		"Choose your plan: Free (get started), Solo ($29/mo - unlimited snapshots), or Team ($79/seat/mo - shared protection). 30-day money-back guarantee.",
	keywords: ["pricing", "plans", "free trial", "solo developer", "team protection", "code protection pricing"],
	openGraph: {
		title: "Pricing | SnapBack - Simple, Transparent Plans",
		description: "Free plan available • Solo $29/mo • Team $79/seat • 30-day money-back guarantee",
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
		title: "Pricing | SnapBack - Simple, Transparent Plans",
		description: "Free plan available • Solo $29/mo • Team $79/seat • 30-day money-back guarantee",
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
