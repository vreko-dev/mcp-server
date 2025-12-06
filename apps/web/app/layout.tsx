import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import "./globals.css";
import "cropperjs/dist/cropper.css";
import { ASSETS } from "@marketing/lib/assets";
import { ClientProviders } from "@shared/components/ClientProviders";
import { cn } from "@ui/lib";
import { GeistSans } from "geist/font/sans";
import { NuqsAdapter } from "nuqs/adapters/next/app";

// TODO: Replace with actual config from environment/app settings
const config = {
	appName: "SnapBack",
};

const sansFont = GeistSans;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		absolute: `${config.appName} - Code Breaks.\nSnap Back.`,
		default: `${config.appName} - Code Breaks.\nSnap Back.`,
		template: `%s | ${config.appName}`,
	},
	description: "Visual protection for every file. AI-aware checkpoints. Instant recovery.",
	alternates: {
		canonical: siteUrl,
	},
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		title: `${config.appName} - Code Breaks.\nSnap Back.`,
		description: "Visual protection for every file. AI-aware checkpoints. Instant recovery.",
		url: siteUrl,
		images: [
			{
				url: ASSETS.social.ogDefault,
				width: 1200,
				height: 630,
				alt: "Code Breaks.\nSnap Back.",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: `${config.appName} - Code Breaks.\nSnap Back.`,
		description: "Visual protection for every file. AI-aware checkpoints. Instant recovery.",
		images: [ASSETS.social.ogTwitter],
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#020617",
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en" suppressHydrationWarning className={sansFont.className}>
			<body className={cn("min-h-screen bg-background text-foreground antialiased")}>
				<NuqsAdapter>
					<ClientProviders>{children}</ClientProviders>
				</NuqsAdapter>
			</body>
		</html>
	);
}
