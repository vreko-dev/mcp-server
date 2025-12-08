import { Hero } from "@marketing/home/components/Hero";
import { FinalCTA, HowItWorks, InteractiveDemo, Metrics, ProblemSection } from "@marketing/sections/launch";
import type { Metadata } from "next";
import { StorySection } from "@/components/landing/story-section";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "SnapBack - AI Code Protection for VS Code | Automatic Snapshots & Recovery",
	description:
		"VS Code extension that protects your code from AI mistakes. Automatic snapshots before GitHub Copilot, Cursor, or Claude make changes. Instant restore when AI breaks something. Free for alpha users.",
	keywords: [
		"ai code protection",
		"vscode code protection",
		"github copilot safety",
		"cursor safety",
		"ai coding safety tool",
		"code backup vscode",
		"vscode snapshot extension",
		"ai broke my code",
		"recover from ai error",
	],
	openGraph: {
		title: "SnapBack - AI Code Protection for VS Code",
		description:
			"Automatic code snapshots before AI changes. Instant recovery when Copilot or Cursor breaks something.",
		url: SITE_URL,
		type: "website",
		images: [
			{
				url: `${SITE_URL}/og-image.png`,
				width: 1200,
				height: 630,
				alt: "SnapBack - AI Code Protection",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "SnapBack - AI Code Protection for VS Code",
		description: "Automatic snapshots before AI changes. Instant recovery.",
		creator: "@snapbackdev",
	},
	alternates: {
		canonical: SITE_URL,
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function Home() {
	return (
		<main className="min-h-screen bg-[#0A0A0A]">
			{/* Hero Section */}
			<Hero />

			{/* Interactive Demo Section - Keeping as part of Hero flow per feedback ?? Or Section 1 was Hero (Interactive Demo) */}
			<InteractiveDemo />

			{/* Proof Section (Claude Story) */}
			<StorySection />

			{/* Intelligence Story (ProblemSection reused/moved up) */}
			<ProblemSection />

			{/* How It Works Section */}
			<HowItWorks />

			{/* Metrics Section */}
			<Metrics />

			{/* Final CTA */}
			<FinalCTA />
		</main>
	);
}
