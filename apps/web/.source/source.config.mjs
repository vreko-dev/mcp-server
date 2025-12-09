// source.config.ts
import rehypeShiki from "@shikijs/rehype";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";

var docs = defineDocs({
	dir: "app/(docs)",
});
var source_config_default = defineConfig({
	mdxOptions: {
		remarkPlugins: [
			remarkGfm,
			// GitHub Flavored Markdown (tables, task lists, strikethrough)
			remarkSmartypants,
			// Smart typography (curly quotes, em dashes, ellipses)
		],
		rehypePlugins: [
			rehypeSlug,
			// Add IDs to headings for anchor links
			[rehypeAutolinkHeadings, { behavior: "wrap" }],
			// Wrap headings with anchor links
			[
				rehypeShiki,
				{
					theme: "github-dark",
				},
			],
		],
	},
});
export { source_config_default as default, docs };
