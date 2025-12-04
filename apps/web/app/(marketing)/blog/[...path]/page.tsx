import { PostContent } from "@marketing/blog/components/PostContent";
import { getPostBySlug } from "@marketing/blog/utils/lib/posts";
import { getActivePathFromUrlParam } from "@shared/lib/content";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Helper function to get base URL
 * Used for constructing absolute URLs for OG images
 */
function getBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_URL || "https://snapback.dev";
	return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

type Params = {
	path: string;
};

export async function generateMetadata(props: { params: Promise<Params> }) {
	const params = await props.params;

	const { path } = params;

	const slug = getActivePathFromUrlParam(path);
	const post = await getPostBySlug(slug);

	return {
		title: post?.title,
		description: post?.excerpt,
		openGraph: {
			title: post?.title,
			description: post?.excerpt,
			images: post?.image
				? [
						post.image.startsWith("http")
							? post.image
							: new URL(post.image, getBaseUrl()).toString(),
					]
				: [],
		},
	};
}

export default async function BlogPostPage(props: { params: Promise<Params> }) {
	const { path } = await props.params;

	const slug = getActivePathFromUrlParam(path);
	const post = await getPostBySlug(slug);

	if (!post) {
		return redirect("/blog");
	}

	const { title, date, authorName, authorImage, tags, image, body } = post;

	return (
		<main className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900">
			<div className="container max-w-6xl mx-auto pt-24 pb-24 px-4">
				<div className="mx-auto max-w-3xl">
					<div className="mb-8">
						<Link
							href="/blog"
							className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
						>
							&larr; Back to blog
						</Link>
					</div>

					<h1 className="font-bold text-4xl lg:text-5xl text-white mb-6">
						{title}
					</h1>

					<div className="flex flex-wrap items-center gap-6 mb-8">
						{authorName && (
							<div className="flex items-center">
								{authorImage && (
									<div className="relative mr-3 size-10 overflow-hidden rounded-full">
										<Image
											src={authorImage}
											alt={authorName}
											fill
											sizes="96px"
											className="object-cover object-center"
										/>
									</div>
								)}
								<div>
									<p className="font-semibold text-white">{authorName}</p>
								</div>
							</div>
						)}

						<div>
							<p className="text-gray-400">
								{Intl.DateTimeFormat("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								}).format(new Date(date))}
							</p>
						</div>

						{tags && (
							<div className="flex flex-wrap gap-2">
								{tags.map((tag: string) => (
									<span
										key={tag}
										className="px-3 py-1 bg-slate-800/50 border border-white/10 rounded-full text-xs font-medium text-emerald-400"
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</div>

					{image && (
						<div className="relative my-8 aspect-16/9 overflow-hidden rounded-xl max-w-4xl mx-auto">
							<Image
								src={image}
								alt={title}
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								className="object-cover object-center"
								onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
									// Handle image loading errors by hiding the parent container
									const target = e.target as HTMLImageElement;
									if (target.parentElement) {
										target.parentElement.style.display = "none";
									}
								}}
							/>
						</div>
					)}

					<div className="pb-8">
						<PostContent content={body} />
					</div>
				</div>
			</div>
		</main>
	);
}
