/**
 * Structured Data (JSON-LD) utilities for SEO
 *
 * Generates Schema.org markup for:
 * - Organization
 * - SoftwareApplication
 * - BreadcrumbList
 *
 * @module lib/seo/structuredData
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";
const SITE_NAME = "SnapBack";

/**
 * Organization schema configuration options
 */
export interface OrganizationSchemaOptions {
	name?: string;
	url?: string;
	logo?: string;
	foundingDate?: string;
	sameAs?: string[];
}

/**
 * Software Application schema configuration options
 */
export interface SoftwareApplicationSchemaOptions {
	name?: string;
	price?: string;
	priceCurrency?: string;
	ratingValue?: number;
	ratingCount?: number;
	softwareVersion?: string;
}

/**
 * Breadcrumb item for BreadcrumbList schema
 */
export interface BreadcrumbItem {
	name: string;
	url: string;
}

/**
 * Generate Organization JSON-LD schema
 *
 * Provides information about SnapBack as an organization,
 * including contact info, social media, and branding.
 *
 * @param options - Optional customization options
 * @returns Organization schema object
 */
export function getOrganizationSchema(options: OrganizationSchemaOptions = {}) {
	const {
		name = SITE_NAME,
		url = SITE_URL,
		logo = `${SITE_URL}/logo.png`,
		foundingDate = "2024",
		sameAs = [
			"https://twitter.com/snapbackdev",
			"https://github.com/snapback",
			"https://discord.gg/SF6Vcjzj",
			"https://linkedin.com/company/snapback",
		],
	} = options;

	return {
		"@context": "https://schema.org" as const,
		"@type": "Organization" as const,
		name,
		legalName: "Marcelle Labs",
		url,
		logo,
		foundingDate,
		founders: [
			{
				"@type": "Person" as const,
				name: "SnapBack Team",
			},
		],
		address: {
			"@type": "PostalAddress" as const,
			addressCountry: "US",
		},
		contactPoint: {
			"@type": "ContactPoint" as const,
			contactType: "Customer Support",
			email: "support@snapback.dev",
			availableLanguage: ["English"],
		},
		sameAs,
	};
}

/**
 * Generate SoftwareApplication JSON-LD schema
 *
 * Provides information about SnapBack as a software application,
 * including pricing, ratings, and technical details.
 *
 * @param options - Optional customization options
 * @returns SoftwareApplication schema object
 */
export function getSoftwareApplicationSchema(
	options: SoftwareApplicationSchemaOptions = {},
) {
	const {
		name = SITE_NAME,
		price = "0",
		priceCurrency = "USD",
		ratingValue,
		ratingCount,
		softwareVersion = "1.0.0",
	} = options;

	const schema: any = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name,
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Windows, macOS, Linux",
		description:
			"VS Code extension for AI code protection. Creates automatic snapshots before AI assistants make changes, with instant restore when something breaks.",
		screenshot: `${SITE_URL}/screenshot-vscode.png`,
		softwareVersion,
		author: {
			"@type": "Organization",
			name: "Marcelle Labs",
		},
		offers: {
			"@type": "Offer",
			price,
			priceCurrency,
			availability: "https://schema.org/InStock",
		},
	};

	// Only include rating if both values are provided
	if (ratingValue && ratingCount) {
		schema.aggregateRating = {
			"@type": "AggregateRating",
			ratingValue: String(ratingValue),
			ratingCount,
		};
	}

	return schema;
}

/**
 * Generate BreadcrumbList JSON-LD schema
 *
 * Provides navigation breadcrumb structure for SEO.
 * Helps search engines understand page hierarchy.
 *
 * @param items - Array of breadcrumb items (name and URL)
 * @returns BreadcrumbList schema object
 *
 * @example
 * ```ts
 * const breadcrumbs = getBreadcrumbSchema([
 *   { name: 'Home', url: 'https://snapback.dev' },
 *   { name: 'Docs', url: 'https://snapback.dev/docs' },
 *   { name: 'Getting Started', url: 'https://snapback.dev/docs/getting-started' }
 * ]);
 * ```
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
	return {
		"@context": "https://schema.org" as const,
		"@type": "BreadcrumbList" as const,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem" as const,
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

/**
 * Serialize JSON-LD schema to string for script tag
 *
 * @param schema - Schema object to serialize
 * @returns JSON string safe for embedding in HTML
 */
export function serializeSchema(schema: any): string {
	return JSON.stringify(schema);
}

/**
 * Get all default schemas for global inclusion
 *
 * @returns Array of schema objects for Organization and SoftwareApplication
 */
export function getDefaultSchemas() {
	return [getOrganizationSchema(), getSoftwareApplicationSchema()];
}
