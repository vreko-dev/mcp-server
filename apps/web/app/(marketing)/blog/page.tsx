import { getAllPosts } from "@marketing/blog/utils/lib/posts";
import { BlogContent } from "./BlogContent";

export async function generateMetadata() {
	return {
		title: "Blog",
	};
}

export default async function BlogListPage() {
	const posts = await getAllPosts();
	const publishedPosts = posts.filter((post) => post.published);

	// Sort posts by date
	const sortedPosts = publishedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return (
		<main className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900">
			<div className="container max-w-6xl mx-auto pt-24 pb-16 px-4">
				<BlogContent publishedPosts={sortedPosts} />
			</div>
		</main>
	);
}
