"use client";

import { BackgroundBeams } from "@marketing/components/ui/background-beams";
import { FloatingNav } from "@marketing/components/ui/floating-nav";
import type { BlogAuthor } from "@marketing/lib/content";
import { formatDate } from "@marketing/lib/utils";
import { m } from "motion/react";

interface BlogLayoutProps {
	children: React.ReactNode;
	title: string;
	readingTime: string;
	publishDate: string;
	author: BlogAuthor;
}

const navItems = [
	{ name: "Home", link: "/" },
	{ name: "Features", link: "/#features" },
	{ name: "Pricing", link: "/#pricing" },
	{ name: "Blog", link: "/blog" },
];

export function BlogLayout({ children, title, readingTime, publishDate, author }: BlogLayoutProps) {
	return (
		<div className="min-h-screen bg-black">
			{/* Background effects */}
			<BackgroundBeams className="absolute inset-0 opacity-20" />

			{/* Floating navigation */}
			<FloatingNav navItems={navItems} />

			{/* Article header */}
			<header className="pt-32 pb-16 px-6 relative">
				<div className="max-w-4xl mx-auto">
					<m.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="text-center"
					>
						{/* Category badge */}
						<div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-full mb-6">
							<span className="text-primary text-sm font-semibold">AI Coding Safety</span>
						</div>

						{/* Title */}
						<h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">{title}</h1>

						{/* Meta information */}
						<div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-neutral-400">
							{/* Author info */}
							<div className="flex items-center gap-3">
								{author.avatar && (
									<img
										src={author.avatar}
										alt={author.name}
										className="w-10 h-10 rounded-full border-2 border-primary/30"
									/>
								)}
								<div className="text-left">
									<div className="text-white font-medium">{author.name}</div>
									<div className="text-sm text-neutral-500">Author</div>
								</div>
							</div>

							{/* Divider */}
							<div className="hidden sm:block w-px h-8 bg-neutral-700" />

							{/* Reading time and date */}
							<div className="flex items-center gap-6 text-sm">
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4 text-primary"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span>{readingTime}</span>
								</div>
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4 text-primary"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
									<span>{formatDate(publishDate)}</span>
								</div>
							</div>
						</div>
					</m.div>
				</div>
			</header>

			{/* Article content */}
			<main className="relative">
				<div className="max-w-4xl mx-auto px-6 pb-20">
					<m.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						{children}
					</m.div>
				</div>
			</main>

			{/* Author bio section */}
			<section className="border-t border-neutral-800 bg-neutral-900/30 py-16 px-6">
				<div className="max-w-4xl mx-auto">
					<m.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="flex flex-col sm:flex-row items-start gap-6"
					>
						{/* Author avatar */}
						{author.avatar && (
							<img
								src={author.avatar}
								alt={author.name}
								className="w-20 h-20 rounded-full border-3 border-primary/30"
							/>
						)}

						{/* Author details */}
						<div className="flex-1">
							<h3 className="text-2xl font-bold text-white mb-2">About {author.name}</h3>
							<p className="text-neutral-300 mb-4 leading-relaxed">{author.bio}</p>

							{/* Social links */}
							<div className="flex items-center gap-4">
								{author.twitter && (
									<a
										href={`https://twitter.com/${author.twitter.replace("@", "")}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-neutral-400 hover:text-primary transition-colors"
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
											aria-label="Twitter"
										>
											<title>Twitter</title>
											<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
										</svg>
										<span>{author.twitter}</span>
									</a>
								)}

								{author.github && (
									<a
										href={`https://github.com/${author.github}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-neutral-400 hover:text-primary transition-colors"
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
											aria-label="GitHub"
										>
											<title>GitHub</title>
											<path
												fillRule="evenodd"
												d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
												clipRule="evenodd"
											/>
										</svg>
										<span>@{author.github}</span>
									</a>
								)}
							</div>
						</div>
					</m.div>
				</div>
			</section>

			{/* Related articles CTA */}
			<section className="py-16 px-6 border-t border-neutral-800">
				<div className="max-w-4xl mx-auto text-center">
					<m.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<h3 className="text-2xl font-bold text-white mb-4">Want more AI coding insights?</h3>
						<p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
							Get weekly insights on AI coding safety and be the first to know about new threats and
							protection strategies.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<a
								href="/blog"
								className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
							>
								Read More Articles
							</a>
							<a
								href="/pricing"
								className="px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors"
							>
								Protect Your Code
							</a>
						</div>
					</m.div>
				</div>
			</section>
		</div>
	);
}
