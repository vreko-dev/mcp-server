import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { RootProvider } from "fumadocs-ui/provider";
import { GeistSans } from "geist/font/sans";

const sansFont = GeistSans;
const appName = "SnapBack";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		absolute: `${appName} Documentation`,
		default: `${appName} Documentation`,
		template: `%s | ${appName} Docs`,
	},
	description:
		"Complete documentation for SnapBack - AI-aware code protection, automatic snapshots, and instant recovery.",
	alternates: {
		canonical: `${siteUrl}/docs`,
	},
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		title: `${appName} Documentation`,
		description:
			"Complete documentation for SnapBack - AI-aware code protection, automatic snapshots, and instant recovery.",
		url: `${siteUrl}/docs`,
	},
	twitter: {
		card: "summary_large_image",
		title: `${appName} Documentation`,
		description:
			"Complete documentation for SnapBack - AI-aware code protection, automatic snapshots, and instant recovery.",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#020617",
};

export default function RootLayout({ children }: PropsWithChildren) {
	const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

	return (
		<html lang="en" suppressHydrationWarning className={sansFont.className}>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<RootProvider
					theme={{
						enabled: true,
						defaultTheme: "dark",
						forcedTheme: "dark",
					}}
				>
					{gaId && <GoogleAnalytics gaId={gaId} />}
					<Analytics />
					<SpeedInsights />
					{children}
				</RootProvider>
			</body>
		</html>
	);
}
