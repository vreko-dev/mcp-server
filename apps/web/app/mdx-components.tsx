import defaultMdxComponents from "fumadocs-ui/mdx";
import Image from "next/image";
import Link from "next/link";
import { CustomMDXComponents } from "@/components/docs/CustomMDXComponents";
import type { AnchorProps, ImageProps, MDXComponents } from "@/lib/source-types";

/**
 * MDX Components for Fumadocs
 *
 * Provides custom component overrides for MDX content in documentation.
 *
 * Note: Motion UI libraries (Aceternity/Magic UI) removed to reduce bundle size by ~70KB.
 * If needed, they can be lazy-loaded on specific pages using next/dynamic.
 */

const components: MDXComponents = {
	// Fumadocs UI Components
	...defaultMdxComponents,

	// Custom MDX components (includes CopyButton, ExpandableSection, StatusBadge, pre, card, callout, alert variants)
	...CustomMDXComponents,

	// Custom component overrides
	a: (props: AnchorProps) => {
		const { href, children, className, ...rest } = props;
		const isInternalLink = href && (href.startsWith("/") || href.startsWith("#"));

		// Handle special card links with custom styling
		if (className?.includes("card")) {
			return (
				<Link href={href || ""} className={className} {...rest}>
					{children}
				</Link>
			);
		}

		if (!href) {
			return <a {...rest}>{children}</a>;
		}

		return isInternalLink ? (
			<Link href={href} {...rest}>
				{children}
			</Link>
		) : (
			<a target="_blank" rel="noopener noreferrer" href={href} {...rest}>
				{children}
			</a>
		);
	},
	img: (props: ImageProps) =>
		props.src ? (
			<Image
				src={props.src}
				alt={props.alt || "Documentation image"}
				width={800}
				height={400}
				sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
				style={{ width: "100%", height: "auto" }}
				className="rounded-lg"
				loading="lazy"
			/>
		) : null,
};

export function useMDXComponents(): MDXComponents {
	return components;
}
