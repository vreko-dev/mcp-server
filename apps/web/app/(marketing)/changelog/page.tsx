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
				<p className="text-lg opacity-50">Stay up to date with our latest improvements</p>
			</div>
			<ChangelogSection
				items={[
					{
						date: "2025-01-15",
						changes: [
							"🚀 Improved AI detection accuracy for Claude Code sessions",
							"⚡ Reduced snapshot creation time to <150ms",
							"🔧 Fixed session grouping edge case with rapid saves",
							"📊 Added real-time protection metrics to status bar",
						],
					},
					{
						date: "2025-01-08",
						changes: [
							"✨ Added Windsurf AI detection support",
							"🔒 Enhanced privacy: metadata-only telemetry by default",
							"🐛 Fixed restore confirmation dialog on Windows",
							"📝 Improved snapshot labels with semantic context",
						],
					},
					{
						date: "2025-01-02",
						changes: [
							"🎉 New MCP integration for Claude Code",
							"🔄 Added session time-travel for multi-file restores",
							"⚡ Performance: 40% faster activation time",
							"🛡️ Added burst edit detection for rapid AI changes",
						],
					},
					{
						date: "2024-12-20",
						changes: [
							"🚀 Major release: Guardian AI detection engine",
							"📊 New dashboard with protection metrics",
							"🔐 Pioneer Program launch",
							"✨ Added protection levels: Watch/Warn/Block",
						],
					},
				]}
			/>
		</div>
	);
}
