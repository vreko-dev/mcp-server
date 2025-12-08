import type { ReactElement } from "react";

/**
 * Type definition for Table of Contents
 */
export interface TableOfContents {
	items: Array<{
		id: string;
		title: string;
		level: number;
		children?: Array<{
			id: string;
			title: string;
			level: number;
		}>;
	}>;
}

/**
 * Type definitions for Fumadocs collections
 */
export interface DocsCollection {
	[key: string]: unknown;
}

export interface MetaCollection {
	[key: string]: unknown;
}

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
	[key: string]: any;
}
