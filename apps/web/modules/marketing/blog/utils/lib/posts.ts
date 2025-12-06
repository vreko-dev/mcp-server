import fs from "node:fs";
import path from "node:path";
import type { Post } from "@marketing/blog/types";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "content/posts");

function loadAllPosts(): Post[] {
	if (!fs.existsSync(contentDirectory)) {
		return [];
	}

	const fileNames = fs.readdirSync(contentDirectory);

	const allPosts = fileNames
		.filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
		.map((fileName) => {
			// Extract locale from filename (e.g., "first-post.de.mdx" -> "de", "first-post.mdx" -> "en")
			const match = fileName.match(/^(.+?)(?:\.([a-z]{2}))?\.mdx?$/);
			if (!match) {
				return null;
			}

			const [, baseName, locale] = match;
			const postPath = baseName || "";
			const postLocale = locale || "en";

			const fullPath = path.join(contentDirectory, fileName);
			const fileContents = fs.readFileSync(fullPath, "utf8");
			const { data, content } = matter(fileContents);

			return {
				path: postPath,
				locale: postLocale,
				title: (data.title as string) || baseName || "",
				date: (data.date as string) || new Date().toISOString(),
				image: data.image as string | undefined,
				authorName: data.authorName as string | undefined,
				authorImage: data.authorImage as string | undefined,
				excerpt: data.excerpt as string | undefined,
				tags: data.tags as string[] | undefined,
				published: (data.published as boolean) ?? false,
				body: content,
			};
		})
		.filter(Boolean) as Post[];

	return allPosts;
}

export async function getAllPosts(): Promise<Post[]> {
	const posts = loadAllPosts();
	const publishedPosts = posts.filter((post) => post.published);
	return publishedPosts;
}

export async function getPostBySlug(
	slug: string,
	options?: {
		locale?: string;
	},
): Promise<Post | null> {
	const posts = loadAllPosts();
	return (
		posts.find(
			(post) => post.path === slug && (!options?.locale || post.locale === options.locale) && post.published,
		) ?? null
	);
}
