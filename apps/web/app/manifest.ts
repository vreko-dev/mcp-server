import type { MetadataRoute } from "next";

/**
 * Web App Manifest for SnapBack
 * 
 * Provides PWA metadata and enhances mobile experience
 * Industry best practices for installable web apps
 */

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "SnapBack - AI Code Protection",
		short_name: "SnapBack",
		description:
			"Automatic code protection before AI changes. Time-travel through coding sessions, restore any version, detect risky changes.",
		start_url: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#000000",
		orientation: "portrait-primary",
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		categories: ["productivity", "utilities", "development"],
		screenshots: [
			{
				src: "/screenshots/desktop-1.png",
				sizes: "2560x1440",
				type: "image/png",
				form_factor: "wide",
			},
			{
				src: "/screenshots/mobile-1.png",
				sizes: "750x1334",
				type: "image/png",
				form_factor: "narrow",
			},
		],
	};
}
