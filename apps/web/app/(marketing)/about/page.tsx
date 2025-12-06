import type { Metadata } from "next";
import AboutClient from "./client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "About | SnapBack - Our Mission",
	description:
		"SnapBack exists because we've all lost work to AI mistakes. Learn about our mission to protect developers while they ship fast.",
	keywords: ["about snapback", "company mission", "developer protection", "code safety", "ai code protection"],
	openGraph: {
		title: "About | SnapBack - Our Mission",
		description: "Developer-first safety • Performance obsessed • Community driven • Built with empathy",
		url: `${SITE_URL}/about`,
		siteName: "SnapBack",
		type: "website",
		images: [
			{
				url: `${SITE_URL}/og-about.png`,
				width: 1200,
				height: 630,
				alt: "About SnapBack",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "About | SnapBack - Our Mission",
		description: "Developer-first safety • Performance obsessed • Community driven",
		images: [`${SITE_URL}/og-about.png`],
		creator: "@snapbackdev",
	},
	alternates: {
		canonical: `${SITE_URL}/about`,
	},
};

export default function AboutPage() {
	return <AboutClient />;
}
