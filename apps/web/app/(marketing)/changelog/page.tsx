import { ChangelogSection } from "@marketing/changelog/components/ChangelogSection";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	title: "Changelog | SnapBack - Latest Updates & Release Notes",
	description:
		"Stay updated with SnapBack releases, feature improvements, bug fixes, and product roadmap. See what's new in AI code protection.",
	openGraph: {
		title: "Changelog | SnapBack - Latest Updates",
		description: "Latest releases and updates to SnapBack AI code protection.",
		url: `${SITE_URL}/changelog`,
		type: "website",
	},
	alternates: {
		canonical: `${SITE_URL}/changelog`,
	},
};

export default async function ChangelogPage() {
	return (
		<div className="container max-w-3xl pt-32 pb-16">
			<div className="mb-12 text-balance pt-8 text-center">
				<h1 className="mb-2 font-bold text-5xl">Changelog</h1>
				<p className="text-lg opacity-50">
					Stay up to date with our latest improvements
				</p>
			</div>
			<ChangelogSection
				items={[
					{
						date: "2024-03-01",
						changes: ["🚀 Improved performance"],
					},
					{
						date: "2024-02-01",
						changes: ["🎨 Updated design", "🐞 Fixed a bug"],
					},
					{
						date: "2024-01-01",
						changes: ["🎉 Added new feature", "🐞 Fixed a bug"],
					},
				]}
			/>
		</div>
	);
}
