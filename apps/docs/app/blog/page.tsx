import Link from "next/link";
import { blogSource } from "@/lib/source";

export default function BlogIndexPage() {
	const posts = [...blogSource.getPages()].sort((a, b) => {
		return new Date((b.data as any).date ?? 0).getTime() - new Date((a.data as any).date ?? 0).getTime();
	});

	return (
		<main className="container max-w-[800px] py-12">
			<h1 className="text-3xl font-bold mb-8">Blog</h1>
			<div className="flex flex-col gap-8">
				{posts.map((post) => (
					<Link
						key={post.url}
						href={post.url}
						className="group block border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors bg-white/5"
					>
						<h2 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
							{post.data.title}
						</h2>
						{post.data.description && <p className="text-muted-foreground mb-4">{post.data.description}</p>}
						{(post.data as any).date && (
							<p className="text-sm text-muted-foreground">
								{new Date((post.data as any).date).toLocaleDateString()}
							</p>
						)}
					</Link>
				))}
			</div>
		</main>
	);
}
