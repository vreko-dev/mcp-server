/**
 * Metadata generation utilities for SEO
 *
 * Provides helpers for generating Next.js Metadata objects
 * with proper OpenGraph, Twitter Cards, and canonical URLs.
 *
 * @module lib/seo/metadata
 */

import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";
const SITE_NAME = "SnapBack";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logos/snapback-logo.svg`;

/**
 * Options for generating metadata
 */
export interface MetadataOptions {
	/** Page title */
	title: string;

	/** Page description (meta description) */
	description: string;

	/** Relative path for canonical URL (e.g., "/features") */
	path?: string;

	/** SEO keywords */
	keywords?: string[];

	/** Custom OpenGraph image URL */
	ogImage?: string;

	/** OpenGraph type (default: "website") */
	type?: "website" | "article";

	/** Published time for articles */
	publishedTime?: string;

	/** Modified time for articles */
	modifiedTime?: string;

	/** Authors for articles */
	authors?: string[];

	/** Prevent search engine indexing */
	noindex?: boolean;
}

/**
 * Generate complete Next.js Metadata object with SEO best practices
 *
 * Includes:
 * - Basic meta tags (title, description)
 * - OpenGraph tags for social sharing
 * - Twitter Card tags
 * - Canonical URL
 * - Keywords
 * - Robots directives
 *
 * @param options - Metadata configuration options
 * @returns Next.js Metadata object
 *
 * @example
 * ```ts
 * export const metadata = generateMetadata({
 *   title: 'Features - SnapBack',
 *   description: 'Automatic snapshots, AI detection, instant recovery',
 *   path: '/features',
 *   keywords: ['code protection features', 'ai activity detection'],
 * });
 * ```
 */
export function generateMetadata(options: MetadataOptions): Metadata {
	const {
		title,
		description,
		path = "/",
		keywords = [],
		ogImage = DEFAULT_OG_IMAGE,
		type = "website",
		publishedTime,
		modifiedTime,
		authors,
		noindex = false,
	} = options;

	const canonical = generateCanonicalUrl(path);

	const metadata: Metadata = {
		title,
		description,
		keywords,
		alternates: {
			canonical,
		},
		robots: {
			index: !noindex,
			follow: !noindex,
			googleBot: {
				index: !noindex,
				follow: !noindex,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		openGraph: {
			type,
			locale: "en_US",
			url: canonical,
			title,
			description,
			siteName: SITE_NAME,
			images: [
				{
					url: ogImage,
					width: 1200,
					height: 630,
					alt: title,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
			creator: "@snapbackdev",
		},
	};

	// Add article-specific metadata
	if (type === "article") {
		metadata.openGraph = {
			...metadata.openGraph,
			type: "article",
			publishedTime,
			modifiedTime,
			authors,
		};
	}

	return metadata;
}

/**
 * Generate canonical URL from relative path
 *
 * Converts relative paths to absolute URLs, removing:
 * - Trailing slashes (except root)
 * - Query parameters
 * - Hash fragments
 *
 * @param path - Relative path (e.g., "/features")
 * @returns Absolute canonical URL
 *
 * @example
 * ```ts
 * generateCanonicalUrl('/features'); // https://snapback.dev/features
 * generateCanonicalUrl('/'); // https://snapback.dev
 * generateCanonicalUrl('/features?ref=nav'); // https://snapback.dev/features
 * ```
 */
export function generateCanonicalUrl(path: string): string {
	// Handle empty or root path
	if (!path || path === "/") {
		return SITE_URL;
	}

	// Ensure path starts with /
	if (!path.startsWith("/")) {
		path = `/${path}`;
	}

	// Remove query parameters and hash
	const pathParts = path.split("?");
	path = pathParts[0] || path;
	const hashParts = path.split("#");
	path = hashParts[0] || path;

	// Remove trailing slash (but keep root /)
	if (path !== "/" && path.endsWith("/")) {
		path = path.slice(0, -1);
	}

	return `${SITE_URL}${path}`;
}

/**
 * Generate OpenGraph image URL for specific page
 *
 * @param imagePath - Relative path to image (e.g., "/og-features.png")
 * @returns Absolute image URL
 */
export function generateOgImageUrl(imagePath: string): string {
	if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
		return imagePath;
	}

	if (!imagePath.startsWith("/")) {
		imagePath = `/${imagePath}`;
	}

	return `${SITE_URL}${imagePath}`;
}

/**
 * Generate metadata for blog post
 *
 * Convenience function for article-type metadata with common defaults.
 *
 * @param options - Blog post metadata options
 * @returns Next.js Metadata object configured for blog posts
 */
export function generateBlogMetadata(
	options: Omit<MetadataOptions, "type"> & {
		slug: string;
		publishedTime: string;
		authors?: string[];
	},
): Metadata {
	const { slug, ...rest } = options;

	return generateMetadata({
		...rest,
		type: "article",
		path: `/blog/${slug}`,
	});
}

/**
 * Generate metadata for documentation page
 *
 * Convenience function for docs with common defaults.
 *
 * @param options - Documentation page metadata options
 * @returns Next.js Metadata object configured for documentation
 */
export function generateDocsMetadata(
	options: Omit<MetadataOptions, "type"> & {
		slug: string;
	},
): Metadata {
	const { slug, ...rest } = options;

	return generateMetadata({
		...rest,
		type: "website",
		path: `/docs/${slug}`,
	});
}
