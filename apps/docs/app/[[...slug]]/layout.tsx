import "./docs.css";
import { NextProvider } from "fumadocs-core/framework/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactElement } from "react";
import { PlanSwitcher } from "@/components/docs/plan-switcher";
import { PrivacyNotice } from "@/components/docs/privacy-notice";
import { TierProvider } from "@/components/docs/tier-context";
import { HomeLinkTitle } from "@/components/HomeLink";
import { ProgressBar } from "@/components/MicroInteractions";
import { source } from "@/lib/source";

export default async function DocsLayoutWrapper({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ slug?: string[] }>;
}): Promise<ReactElement> {
	const homeUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

	// Determine if Plan Switcher should be shown based on path
	const { slug: slugArray } = await params;
	const slug = "/" + (slugArray?.join("/") ?? "");
	const showSwitcher =
		slug.startsWith("/capabilities") || slug.startsWith("/guides") || slug.startsWith("/plans-limits");

	return (
		<TierProvider>
			<NextProvider>
				<ProgressBar />
				<RootProvider
					search={{
						enabled: true,
					}}
					theme={{
						enabled: false,
						defaultTheme: "dark",
					}}
				>
					<DocsLayout
						tree={source.pageTree}
						nav={{
							title: <HomeLinkTitle />,
							url: homeUrl,
							transparentMode: "top",
						}}
						links={[
							{
								text: "Home",
								url: homeUrl,
								icon: (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										role="img"
										aria-label="Home"
									>
										<title>Home</title>
										<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
										<polyline points="9 22 9 12 15 12 15 22" />
									</svg>
								),
							},
							{
								text: "GitHub",
								url: "https://github.com/snapback/snapback",
								icon: (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										role="img"
										aria-label="GitHub"
									>
										<title>GitHub</title>
										<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
										<path d="M9 18c-4.51 2-5-2-7-2" />
									</svg>
								),
								external: true,
							},
							{
								text: "Discord",
								url: "https://discord.gg/SF6Vcjzj",
								icon: (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										role="img"
										aria-label="Discord"
									>
										<title>Discord</title>
										<circle cx="12" cy="12" r="10" />
										<path d="M16 16s-1.5-2-4-2-4 2-4 2" />
										<circle cx="9" cy="10" r="1" />
										<circle cx="15" cy="10" r="1" />
									</svg>
								),
								external: true,
							},
						]}
						sidebar={{
							defaultOpenLevel: 1,
							banner: (
								<div className="px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 mb-4">
									<p className="text-sm text-emerald-400 font-medium mb-1">🧢 SnapBack Docs</p>
									<p className="text-xs text-neutral-400">
										AI-aware code protection. Automatic snapshots. Instant recovery.
									</p>
								</div>
							),
							collapsible: true,
						}}
					>
						{showSwitcher && <PlanSwitcher />}
						{children}
						<PrivacyNotice />
					</DocsLayout>
				</RootProvider>
			</NextProvider>
		</TierProvider>
	);
}
