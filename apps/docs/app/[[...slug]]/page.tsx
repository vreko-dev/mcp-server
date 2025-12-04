import { DocsBody, DocsPage } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { source } from "@/lib/source";
import type { BreadcrumbItem } from "@/lib/source-types";
import { useMDXComponents } from "../mdx-components";

// Generate breadcrumbs from the page tree
function getBreadcrumbs(slug: string[]) {
	const breadcrumbs: BreadcrumbItem[] = [];

	// Add root breadcrumb
	breadcrumbs.push({ title: "Docs", url: "/" });

	// Build breadcrumbs for each segment
	for (let i = 0; i < slug.length; i++) {
		const path = slug.slice(0, i + 1);
		const page = source.getPage(path);
		if (page) {
			breadcrumbs.push({
				title: page.data.title || "",
				url: page.url,
			});
		}
	}

	// Remove the first breadcrumb if it's the same as the root
	if (breadcrumbs.length > 1 && breadcrumbs[0] && breadcrumbs[1] && breadcrumbs[0].title === breadcrumbs[1].title) {
		breadcrumbs.shift();
	}

	return breadcrumbs;
}

export default async function DocsPageWrapper({ params }: { params: Promise<{ slug?: string[] }> }) {
	const { slug = [] } = await params;
	const page = source.getPage(slug);

	if (!page) { notFound(); }

	const pageData: any = page.data;
	const MDX = pageData.body;
	const components = useMDXComponents();

	// Generate breadcrumb data on the server side
	const breadcrumbItems = getBreadcrumbs(slug);

	return (
		<DocsPage toc={pageData.toc}>
			<Breadcrumbs items={breadcrumbItems} />
			<DocsBody>
				<MDX components={components} />
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.getPages().map((page) => ({
		slug: page.slugs,
	}));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
	const { slug = [] } = await params;
	const page = source.getPage(slug);

	if (!page) { notFound(); }

	const pageData: any = page.data;
	const url = `https://docs.snapback.dev/${slug.join("/")}`;
	const ogImage = pageData.image || "/og-docs.png";

	return {
		title: pageData.title,
		description: pageData.description,
		alternates: {
			canonical: url,
		},
		openGraph: {
			title: pageData.title,
			description: pageData.description,
			url,
			siteName: "SnapBack Documentation",
			images: [{ url: ogImage }],
			locale: "en_US",
			type: "article",
		},
		twitter: {
			card: "summary_large_image",
			title: pageData.title,
			description: pageData.description,
			images: [ogImage],
		},
	};
}
