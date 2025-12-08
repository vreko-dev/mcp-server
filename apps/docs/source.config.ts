import path from "node:path";
import rehypeShiki from "@shikijs/rehype";
import type { DocsCollection } from "fumadocs-mdx/config";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeMermaid from "rehype-mermaid";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";

export const docs: DocsCollection = defineDocs({
	dir: path.resolve(process.cwd(), "content/docs"),
});

export const blog: DocsCollection = defineDocs({
	dir: path.resolve(process.cwd(), "content/blog"),
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [
			remarkGfm, // GitHub Flavored Markdown
			remarkSmartypants, // Smart typography
		],
		rehypePlugins: [
			rehypeSlug, // Add IDs to headings
			// NOTE: rehype-autolink-headings removed - fumadocs-ui handles anchor links automatically
			// Adding it here causes nested <a> tags and hydration errors
			rehypeMermaid, // Mermaid diagrams
			[
				rehypeShiki,
				{
					theme: "github-dark",
				},
			],
		],
	},
});
