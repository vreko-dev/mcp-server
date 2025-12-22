import { notFound } from "next/navigation";
import { blogSource } from "@/lib/source";
import { useMDXComponents } from "../../mdx-components";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const page = blogSource.getPage([slug]);

	if (!page) {
		notFound();
	}

	const MDX = (page.data as any).body;
	const components = useMDXComponents();

	return (
		<article className="container max-w-[800px] mx-auto px-4 py-12">
			<header className="mb-8">
				<h1 className="text-3xl font-bold mb-2">{page.data.title}</h1>
				{(page.data as any).date && (
					<p className="text-sm text-neutral-500">{new Date((page.data as any).date).toLocaleDateString()}</p>
				)}
			</header>
			<div className="prose prose-invert max-w-none">
				<MDX components={components} />
			</div>
		</article>
	);
}

export async function generateStaticParams() {
	return blogSource.getPages().map((page) => ({
		slug: page.slugs[0],
	}));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const page = blogSource.getPage([slug]);

	if (!page) {
		notFound();
	}

	return {
		title: page.data.title,
		description: page.data.description,
	};
}
