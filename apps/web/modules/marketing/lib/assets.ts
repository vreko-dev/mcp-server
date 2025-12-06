/**
 * SnapBack Asset Constants
 * Centralized asset paths for type safety and better developer experience
 */

export const ASSETS = {
	// Brand assets
	brand: {
		logoWordmark: "/brand/logo-wordmark.svg",
		logoWordmarkDark: "/brand/logo-wordmark-dark.svg",
		logoIcon: "/brand/logo-icon.svg",
		logoDark: "/brand/logo-dark.svg",
		logoSmall: "/brand/logo-small.svg",
	},

	// Favicon and app icons
	favicon: {
		ico: "/favicon/favicon.ico",
		svg: "/favicon/favicon.svg",
		icon16: "/favicon/icon-16.png",
		icon32: "/favicon/icon-32.png",
		icon192: "/favicon/icon-192.png",
		appleTouchIcon: "/favicon/apple-touch-icon.png",
		manifest: "/manifest.webmanifest", // Next.js generated from app/manifest.ts
	},

	// Social media images
	social: {
		ogDefault: "/opengraph-image",
		ogTwitter: "/twitter-image",
		ogTwitterAlt: "/twitter-image?variant=alt",
	},

	// UI elements
	ui: {
		grid: "/ui/grid.svg",
	},

	// Content assets
	content: {
		features: {
			snapbackLogo: "/content/features/snapback-logo.svg",
		},
		illustrations: {
			demo: "/content/illustrations/2.svg",
			demoPng: "/content/illustrations/2.png",
		},
		avatars: {
			// Placeholder for future avatar assets
		},
	},
} as const;

// Type safety for asset paths
export type AssetPath = (typeof ASSETS)[keyof typeof ASSETS][keyof (typeof ASSETS)[keyof typeof ASSETS]];

// Helper functions for dynamic asset loading
export const getAssetUrl = (category: keyof typeof ASSETS, asset: string): string => {
	const categoryAssets = ASSETS[category] as Record<string, any>;
	return categoryAssets[asset] || "";
};

// Asset preloading utilities
export const CRITICAL_ASSETS = [ASSETS.brand.logoWordmark, ASSETS.favicon.ico, ASSETS.ui.grid] as const;

export const SOCIAL_ASSETS = [ASSETS.social.ogDefault, ASSETS.social.ogTwitter] as const;
