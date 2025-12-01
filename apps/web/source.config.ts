import rehypeShiki from "@shikijs/rehype";
import type { DocsCollection } from "fumadocs-mdx/config";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";

// TODO: Custom frontmatter schema for future implementation
// const _customFrontmatterSchema = z.object({
// 	title: z.string(),
// 	description: z.string().optional(),
// 	icon: z.string().optional(),
// 	estimatedTime: z.string().optional(),
// 	priority: z.number().optional(),
// 	featured: z.boolean().optional(),
// 	tags: z.array(z.string()).optional(),
// 	lastUpdated: z.string().optional(),
// });

export const docs: DocsCollection = defineDocs({
	dir: "app/(docs)",
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [
			remarkGfm, // GitHub Flavored Markdown (tables, task lists, strikethrough)
			remarkSmartypants, // Smart typography (curly quotes, em dashes, ellipses)
		],
		rehypePlugins: [
			rehypeSlug, // Add IDs to headings for anchor links
			[rehypeAutolinkHeadings, { behavior: "wrap" }], // Wrap headings with anchor links
			[
				rehypeShiki,
				{
					theme: "github-dark",
				},
			],
		],
	},
});
