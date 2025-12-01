"use client";
import { Hero } from "@marketing/home/components/Hero";
import {
	FinalCTA,
	GitVsSnapback,
	HowItWorks,
	InteractiveDemo,
	OriginStory,
	ProblemSection,
	TeamsSection,
	CorePrinciples,
	Metrics,
	Roadmap,
	Community,
} from "@marketing/sections/launch";

export default function Home() {
	return (
		<main className="min-h-screen bg-[#0A0A0A]">
			{/* Hero Section */}
			<Hero />

			{/* Origin Story Section */}
			<OriginStory />

			{/* Interactive Demo Section */}
			<InteractiveDemo />

			{/* Problem Section */}
			<ProblemSection />

			{/* Git vs SnapBack Comparison */}
			<GitVsSnapback />

			{/* Core Principles Section */}
			<CorePrinciples />

			{/* Metrics Section */}
			<Metrics />

			{/* How It Works Section */}
			<HowItWorks />

			{/* Roadmap Section */}
			<Roadmap />

			{/* Community Section */}
			<Community />

			{/* Teams Section */}
			<TeamsSection />

			{/* Final CTA */}
			<FinalCTA />
		</main>
	);
}
