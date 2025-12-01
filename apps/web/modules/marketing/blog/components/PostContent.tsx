"use client";

import type { MDXComponents } from "mdx/types";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";

// Custom components for MDX
const components: MDXComponents = {
	h1: (props) => (
		<h1 className="text-4xl font-bold mt-12 mb-8 text-white" {...props} />
	),
	h2: (props) => (
		<h2 className="text-3xl font-bold mt-12 mb-8 text-white" {...props} />
	),
	h3: (props) => (
		<h3 className="text-2xl font-bold mt-10 mb-6 text-white" {...props} />
	),
	h4: (props) => (
		<h4 className="text-xl font-bold mt-8 mb-4 text-white" {...props} />
	),
	h5: (props) => (
		<h5 className="text-lg font-bold mt-6 mb-3 text-white" {...props} />
	),
	h6: (props) => (
		<h6 className="text-base font-bold mt-4 mb-2 text-white" {...props} />
	),
	p: (props) => <p className="mb-6 leading-relaxed text-gray-300" {...props} />,
	strong: (props) => (
		<strong className="font-semibold text-[#00FF41]" {...props} />
	),
	a: (props) => (
		<a
			className="text-[#00FF41] hover:text-[#10B981] underline transition-colors"
			{...props}
		/>
	),
	ul: (props) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
	ol: (props) => <ol className="list-decimal pl-6 mb-6 space-y-2" {...props} />,
	li: (props) => <li className="text-gray-300" {...props} />,
	blockquote: (props) => (
		<blockquote
			className="border-l-4 border-[#00FF41] pl-6 italic my-6 text-gray-300 bg-slate-800/50 py-4 rounded-r-lg"
			{...props}
		/>
	),
	hr: (props) => <hr className="my-8 border-t border-white/20" {...props} />,
	code: (props) => {
		// Check if it's an inline code block
		if (!props.className) {
			return (
				<code
					className="px-1.5 py-0.5 bg-slate-800 rounded text-sm font-mono text-[#00FF41]"
					{...props}
				/>
			);
		}
		// It's a code block with a language
		return <code className="text-sm" {...props} />;
	},
	pre: (props) => (
		<pre
			className="mb-6 p-4 bg-slate-900 rounded-lg overflow-x-auto"
			{...props}
		/>
	),
	img: (props) => (
		<img
			className="rounded-lg my-6 mx-auto max-w-full h-auto"
			loading="lazy"
			{...props}
		/>
	),
};

/**
 * MDX content renderer with syntax highlighting
 * Renders MDX content with proper styling and code syntax highlighting
 */
export function PostContent({ content }: { content: string }) {
	return (
		<div className="prose prose-lg dark:prose-invert max-w-3xl mx-auto mt-6 px-4">
			<MDXRemote
				source={content}
				components={components}
				options={{
					mdxOptions: {
						remarkPlugins: [remarkGfm, remarkSmartypants],
						rehypePlugins: [
							rehypeSlug,
							[rehypeAutolinkHeadings, { behavior: "wrap" }],
							[
								rehypePrettyCode,
								{
									theme: "github-dark",
									onVisitLine(node: any) {
										// Prevent lines from collapsing in `display: grid` mode, and
										// allow empty lines to be copy/pasted
										if (node.children.length === 0) {
											node.children = [{ type: "text", value: " " }];
										}
									},
									onVisitHighlightedLine(node: any) {
										node.properties.className.push("line--highlighted");
									},
									onVisitHighlightedWord(node: any) {
										node.properties.className = ["word--highlighted"];
									},
								},
							],
						],
					},
				}}
			/>
		</div>
	);
}
