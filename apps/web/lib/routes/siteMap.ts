/**
 * Site Map - Central source of truth for all public routes
 *
 * Defines the complete navigation structure for SnapBack,
 * including which routes appear in footer, navigation, sitemap.xml, etc.
 *
 * @module lib/routes/siteMap
 */

export interface SiteRoute {
	/** Route path (relative or absolute URL) */
	path: string;
	/** Display label for navigation */
	label: string;
	/** Optional description for SEO and accessibility */
	description?: string;
	/** Whether route should appear in footer navigation */
	inFooter: boolean;
	/** Whether this is an external link (http/https) */
	external?: boolean;
	/** SEO keywords associated with this route */
	keywords?: string[];
}

export interface RouteGroup {
	/** Category name for grouping routes */
	category: string;
	/** Routes in this category */
	routes: SiteRoute[];
}

/**
 * Complete site map with all public routes
 * Organized by category for consistent navigation structure
 */
export const siteMap: RouteGroup[] = [
	{
		category: "Product",
		routes: [
			{
				path: "/",
				label: "Home",
				description: "AI Code Protection for VS Code",
				inFooter: true,
				keywords: ["ai code protection", "vscode code protection", "snapback"],
			},
			{
				path: "/features",
				label: "Features",
				description: "Automatic snapshots, AI detection, instant recovery",
				inFooter: true,
				keywords: [
					"code protection features",
					"ai activity detection",
					"guardian code analysis",
				],
			},
			{
				path: "/pricing",
				label: "Pricing",
				description: "Simple, transparent pricing for individuals and teams",
				inFooter: true,
				keywords: ["pricing", "plans", "free trial"],
			},
			{
				path: "/integrations",
				label: "Integrations",
				description: "Works with GitHub Copilot, Cursor, Claude, and more",
				inFooter: true,
				keywords: [
					"github copilot integration",
					"cursor ai",
					"claude desktop",
					"mcp integration",
				],
			},
		],
	},
	{
		category: "Resources",
		routes: [
			{
				path: "https://new-docs.snapback.dev",
				label: "Documentation",
				description: "Complete guides, tutorials, and API reference",
				inFooter: true,
				external: true,
				keywords: ["documentation", "guides", "tutorials", "api reference"],
			},
			{
				path: "https://new-docs.snapback.dev/getting-started/first-restore",
				label: "Getting Started",
				description: "Your first restore walkthrough",
				inFooter: true,
				external: true,
				keywords: ["tutorial", "first restore", "getting started"],
			},
			{
				path: "https://new-docs.snapback.dev/why-snapback",
				label: "Why SnapBack?",
				description: "Compare to Git, Local History, and backups",
				inFooter: true,
				external: true,
				keywords: ["comparison", "vs git", "why use"],
			},
			{
				path: "https://new-docs.snapback.dev/faq",
				label: "FAQ",
				description: "Frequently asked questions",
				inFooter: true,
				external: true,
				keywords: ["faq", "questions", "help"],
			},
			{
				path: "/blog",
				label: "Blog",
				description: "AI coding tips, product updates, and developer stories",
				inFooter: true,
				keywords: ["ai coding blog", "developer tips", "product updates"],
			},
			{
				path: "/community",
				label: "Community",
				description: "Join our Discord, share stories, get help",
				inFooter: false, // Hidden per user request
				keywords: ["discord", "community", "support", "forum"],
			},
			{
				path: "/support",
				label: "Support",
				description: "Get help, report bugs, request features",
				inFooter: false, // Hidden per user request
				keywords: ["support", "help", "troubleshooting"],
			},
			{
				path: "/handbook",
				label: "Handbook",
				description: "Internal team handbook and processes",
				inFooter: false, // Excluded from footer per requirements
				keywords: ["handbook", "team", "internal"],
			},
		],
	},
	{
		category: "Company",
		routes: [
			{
				path: "/about",
				label: "About",
				description:
					"Our story, mission, and the $12K disaster that started it all",
				inFooter: true,
				keywords: ["about", "story", "mission", "team"],
			},
			{
				path: "/careers",
				label: "Careers",
				description: "Join us in building the future of AI-safe coding",
				inFooter: false, // Hidden per user request
				keywords: ["careers", "jobs", "hiring", "open positions"],
			},
		],
	},
	{
		category: "Legal",
		routes: [
			{
				path: "/legal/privacy",
				label: "Privacy Policy",
				description: "How we protect your data and respect your privacy",
				inFooter: true,
				keywords: ["privacy", "data protection", "gdpr"],
			},
			{
				path: "/legal/terms",
				label: "Terms of Service",
				description: "Terms and conditions for using SnapBack",
				inFooter: true,
				keywords: ["terms", "conditions", "legal"],
			},
			{
				path: "/legal/security",
				label: "Security",
				description: "Our security practices and vulnerability disclosure",
				inFooter: true,
				keywords: ["security", "vulnerability", "disclosure"],
			},
		],
	},
];

/**
 * Get routes filtered for footer display
 * Excludes routes where inFooter is false (e.g., /handbook)
 *
 * @returns RouteGroup[] - Only groups and routes that should appear in footer
 */
export function getFooterRoutes(): RouteGroup[] {
	return siteMap
		.map((group) => ({
			category: group.category,
			routes: group.routes.filter((route) => route.inFooter),
		}))
		.filter((group) => group.routes.length > 0); // Remove empty categories
}

/**
 * Find a route by its path
 * Useful for breadcrumbs, active link highlighting, etc.
 *
 * @param path - Route path to search for
 * @returns SiteRoute | undefined - Found route or undefined
 */
export function getRouteByPath(path: string): SiteRoute | undefined {
	for (const group of siteMap) {
		const route = group.routes.find((r) => r.path === path);
		if (route) return route;
	}
	return undefined;
}

/**
 * Get all routes flattened (without category grouping)
 * Useful for sitemap.xml generation, search indexing, etc.
 *
 * @returns SiteRoute[] - All routes flattened
 */
export function getAllRoutes(): SiteRoute[] {
	return siteMap.flatMap((group) => group.routes);
}

/**
 * Get routes by category
 *
 * @param category - Category name to filter by
 * @returns SiteRoute[] - Routes in the specified category
 */
export function getRoutesByCategory(category: string): SiteRoute[] {
	const group = siteMap.find((g) => g.category === category);
	return group?.routes ?? [];
}

/**
 * Get all internal routes (non-external)
 * Useful for Next.js router prefetching
 *
 * @returns SiteRoute[] - All internal routes
 */
export function getInternalRoutes(): SiteRoute[] {
	return getAllRoutes().filter((route) => !route.external);
}

/**
 * Get all external routes
 * Useful for special link handling (target="_blank", rel="noopener")
 *
 * @returns SiteRoute[] - All external routes
 */
export function getExternalRoutes(): SiteRoute[] {
	return getAllRoutes().filter((route) => route.external);
}
