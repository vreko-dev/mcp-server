import type { TableOfContents } from "fumadocs-core/server";
import type { DocsCollection, MetaCollection } from "fumadocs-mdx/config";
import type { ReactElement } from "react";

/**
 * Type definitions for Fumadocs-generated source files
 * Resolves type inference issues with .source/index.ts that has @ts-nocheck
 */

export interface BreadcrumbItem {
	title: string;
	url: string;
}

export interface PageData {
	title: string;
	description?: string;
	body: () => ReactElement;
	toc: TableOfContents;
	lastModified?: Date;
	image?: string;
	icon?: string;
	estimatedTime?: string;
	priority?: number;
	featured?: boolean;
	tags?: string[];
	structuredData?: {
		headings: Array<{
			id: string;
			content: string;
		}>;
		contents: string;
	};
	breadcrumbs?: BreadcrumbItem[];
}

export interface PageInfo {
	slugs: string[];
	url: string;
	data: PageData;
}

export interface FumadocsSource {
	docs: DocsCollection;
	meta: MetaCollection;
}

/**
 * MDX component prop types
 */
export interface AnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href?: string;
	children?: React.ReactNode;
}

export interface ImageProps {
	src?: string;
	alt?: string;
	title?: string;
	width?: number;
	height?: number;
}

export interface MDXComponents {
	a?: (props: AnchorProps) => React.ReactElement;
	img?: (props: ImageProps) => React.ReactElement | null;
	// Allow any other MDX component overrides
	// biome-ignore lint/suspicious/noExplicitAny: MDX components can be any React component
	[key: string]: any;
}
