"use client";

import { PostListItem } from "@marketing/blog/components/PostListItem";
import type { Post } from "@marketing/blog/types";
import { m as motion } from "motion/react";

export function BlogContent({ publishedPosts }: { publishedPosts: Post[] }) {
	return (
		<>
			<motion.div
				initial={{ opacity: 1, y: 0 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="text-center mb-16"
			>
				<h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
					Latest{" "}
					<span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
						Blog
					</span>{" "}
					Posts
				</h1>
				<p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
					Insights, updates, and stories from the SnapBack team
				</p>
			</motion.div>

			{publishedPosts.length === 0 ? (
				<div className="text-center py-12">
					<h2 className="text-2xl font-semibold mb-4 text-white">No posts yet</h2>
					<p className="text-gray-500">Check back soon for updates.</p>
				</div>
			) : (
				<div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
					{publishedPosts.map((post, index) => (
						<motion.div
							key={post.path}
							initial={{ opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
						>
							<PostListItem post={post} />
						</motion.div>
					))}
				</div>
			)}
		</>
	);
}
