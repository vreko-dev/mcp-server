"use client";

import type { Post } from "@marketing/blog/types";
import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";

export function PostListItem({ post }: { post: Post }) {
	const { title, excerpt, authorName, image, date, path, authorImage, tags } = post;

	return (
		<m.div whileHover={{ y: -5 }} className="group relative h-full">
			{/* Gradient glow effect */}
			<div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#34D399]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

			<div className="relative bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full hover:border-white/20 transition-all duration-300">
				{image && (
					<div className="-mx-4 -mt-4 relative mb-4 aspect-16/9 overflow-hidden rounded-xl">
						<Image
							src={image}
							alt={title}
							fill
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
							className="object-cover object-center"
							onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
								// Handle image loading errors
								const target = e.target as HTMLImageElement;
								target.style.display = "none";
							}}
						/>
						<Link href={`/blog/${path}`} className="absolute inset-0" />
					</div>
				)}

				{tags && tags.length > 0 && (
					<div className="mb-3 flex flex-wrap gap-2">
						{tags.map((tag) => (
							<span
								key={tag}
								className="px-2 py-1 bg-slate-700/50 rounded-full text-xs font-medium text-[#34D399]"
							>
								{tag}
							</span>
						))}
					</div>
				)}

				<Link
					href={`/blog/${path}`}
					className="font-semibold text-xl text-white hover:text-[#34D399] transition-colors block mb-2"
				>
					{title}
				</Link>
				{excerpt && <p className="text-gray-300 mb-4 leading-relaxed">{excerpt}</p>}

				<div className="mt-4 flex items-center justify-between">
					{authorName && (
						<div className="flex items-center">
							{authorImage && (
								<div className="relative mr-2 size-8 overflow-hidden rounded-full">
									<Image
										src={authorImage}
										alt={authorName}
										fill
										sizes="96px"
										className="object-cover object-center"
										onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
											// Handle image loading errors
											const target = e.target as HTMLImageElement;
											target.style.display = "none";
										}}
									/>
								</div>
							)}
							<div>
								<p className="font-semibold text-sm text-gray-300">{authorName}</p>
							</div>
						</div>
					)}

					<div className="mr-0 ml-auto">
						<p className="text-sm text-gray-400">{Intl.DateTimeFormat("en-US").format(new Date(date))}</p>
					</div>
				</div>
			</div>
		</m.div>
	);
}
