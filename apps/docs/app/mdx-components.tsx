import defaultMdxComponents from "fumadocs-ui/mdx";
import Image from "next/image";
import Link from "next/link";
import { CustomMDXComponents } from "@/components/CustomMDXComponents";
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

	// Override heading components to render without anchor links
	// fumadocs adds anchor links via its Heading component, which causes
	// nested <a> tags in the TOC (TOCItem wraps content in <a>, but the
	// heading content already has <a> tags from fumadocs)
	// Solution: Use plain heading tags, fumadocs will still add IDs via rehypeSlug
	h1: (props: any) => <h1 {...props} />,
	h2: (props: any) => <h2 {...props} />,
	h3: (props: any) => <h3 {...props} />,
	h4: (props: any) => <h4 {...props} />,
	h5: (props: any) => <h5 {...props} />,
	h6: (props: any) => <h6 {...props} />,

	// Custom component overrides for links and images
	a: (props: AnchorProps) => {
		const { href, children, className, ...rest } = props;

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

		const isInternal = href.startsWith("/") || href.startsWith("#");
		const isHash = href.startsWith("#");

		// For hash links (anchor links to headings), fumadocs already handles this
		// Rendering another <a> tag would create nested anchors and hydration errors
		// Just return the children without any wrapper
		if (isHash) {
			// Return just a span to avoid nested anchor tags
			// fumadocs' Heading component already wraps headings with proper anchor links
			return <>{children}</>;
		}

		return isInternal ? (
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

	// Custom MDX components - spread LAST to ensure they override everything else
	// Includes: CopyButton, ExpandableSection, StatusBadge, pre, card, callout, alert variants
	...CustomMDXComponents,
};

export function useMDXComponents(): MDXComponents {
	return components;
}
