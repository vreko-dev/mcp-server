// Content Management System for SnapBack Blog
// File-based content management with enhanced SEO and performance

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
	BlogPost,
	BlogPostMetadata,
	DisasterStory,
	DisasterStoryMetadata,
	PillarContent,
	PillarContentMetadata,
	Resource,
	ResourceMetadata,
} from "./types";

const contentDirectory = path.join(process.cwd(), "src/content");

// Generic content loader
async function loadContent<T, M>(collection: string, slug?: string): Promise<T[]> {
	const collectionPath = path.join(contentDirectory, collection);

	// Handle case where directory doesn't exist yet
	if (!fs.existsSync(collectionPath)) {
		return [];
	}

	const fileNames = fs.readdirSync(collectionPath);
	const allContent = fileNames
		.filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
		.map((fileName) => {
			const fileSlug = fileName.replace(/\.mdx?$/, "");

			// If specific slug requested, only return that one
			if (slug && fileSlug !== slug) {
				return null;
			}

			const fullPath = path.join(collectionPath, fileName);
			const fileContents = fs.readFileSync(fullPath, "utf8");
			const { data, content, excerpt } = matter(fileContents, {
				excerpt: true,
			});

			return {
				slug: fileSlug,
				metadata: data as M,
				content,
				excerpt: excerpt || `${content.substring(0, 160)}...`,
			} as T;
		})
		.filter(Boolean) as T[];

	return allContent;
}

// Blog Posts
export async function getBlogPosts(): Promise<BlogPost[]> {
	const posts = await loadContent<BlogPost, BlogPostMetadata>("blog");

	// Filter published posts and sort by date
	return posts
		.filter((post) => post.metadata.workflow.status === "published")
		.sort(
			(a, b) =>
				new Date(b.metadata.workflow.publishDate).getTime() -
				new Date(a.metadata.workflow.publishDate).getTime(),
		);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
	const posts = await loadContent<BlogPost, BlogPostMetadata>("blog", slug);
	return posts[0] || null;
}

export async function getAllBlogSlugs(): Promise<string[]> {
	const posts = await getBlogPosts();
	return posts.map((post) => post.slug);
}

export async function getFeaturedBlogPosts(): Promise<BlogPost[]> {
	const posts = await getBlogPosts();
	return posts.filter((post) => post.metadata.workflow.featured.homepage);
}

export async function getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
	const posts = await getBlogPosts();
	return posts.filter((post) => post.metadata.format.type === category);
}

export async function getBlogPostsByTag(tag: string): Promise<BlogPost[]> {
	const posts = await getBlogPosts();
	return posts.filter(
		(post) =>
			post.metadata.seo.secondaryKeywords.includes(tag) || post.metadata.seo.longTailVariations.includes(tag),
	);
}

// Pillar Content
export async function getPillarContent(): Promise<PillarContent[]> {
	const pillars = await loadContent<PillarContent, PillarContentMetadata>("pillars");

	// Sort by semantic score (relevance)
	return pillars.sort((a, b) => b.metadata.cluster.semanticScore - a.metadata.cluster.semanticScore);
}

export async function getPillarContentBySlug(slug: string): Promise<PillarContent | null> {
	const pillars = await loadContent<PillarContent, PillarContentMetadata>("pillars", slug);
	return pillars[0] || null;
}

// Disaster Stories
export async function getDisasterStories(): Promise<DisasterStory[]> {
	const disasters = await loadContent<DisasterStory, DisasterStoryMetadata>("disasters");

	// Sort by damage amount (highest first) then by date
	return disasters.sort((a, b) => {
		const damageA = a.metadata.incident.damageAmount || 0;
		const damageB = b.metadata.incident.damageAmount || 0;

		if (damageA !== damageB) {
			return damageB - damageA;
		}

		return new Date(b.metadata.incident.date).getTime() - new Date(a.metadata.incident.date).getTime();
	});
}

export async function getRecentDisasters(limit = 5): Promise<DisasterStory[]> {
	const disasters = await getDisasterStories();
	return disasters.slice(0, limit);
}

export async function getDisasterStory(slug: string): Promise<DisasterStory | null> {
	const disasters = await loadContent<DisasterStory, DisasterStoryMetadata>("disasters", slug);
	return disasters[0] || null;
}

// Resources
export async function getResources(): Promise<Resource[]> {
	const resources = await loadContent<Resource, ResourceMetadata>("resources");

	// Sort by lead score (highest value first)
	return resources.sort((a, b) => b.metadata.leadScore - a.metadata.leadScore);
}

export async function getResource(slug: string): Promise<Resource | null> {
	const resources = await loadContent<Resource, ResourceMetadata>("resources", slug);
	return resources[0] || null;
}

// Analytics and Stats
export async function getBlogStats() {
	const posts = await getBlogPosts();
	const disasters = await getDisasterStories();

	const totalDamage = disasters.reduce((sum, disaster) => sum + (disaster.metadata.incident.damageAmount || 0), 0);

	const totalTimeWasted = disasters.reduce((sum, disaster) => sum + disaster.metadata.incident.timeWasted, 0);

	const totalFiles = disasters.reduce((sum, disaster) => sum + disaster.metadata.incident.filesAffected, 0);

	return {
		totalPosts: posts.length,
		totalDisasters: disasters.length,
		totalDamage,
		totalTimeWasted,
		totalFiles,
		averageDamage: disasters.length > 0 ? totalDamage / disasters.length : 0,
		recentPosts: posts.slice(0, 5),
		recentDisasters: disasters.slice(0, 5),
	};
}

// Search functionality
export async function searchContent(query: string): Promise<{
	posts: BlogPost[];
	pillars: PillarContent[];
	disasters: DisasterStory[];
}> {
	const [posts, pillars, disasters] = await Promise.all([getBlogPosts(), getPillarContent(), getDisasterStories()]);

	const searchTerm = query.toLowerCase();

	const matchingPosts = posts.filter(
		(post) =>
			post.metadata.title.main.toLowerCase().includes(searchTerm) ||
			post.metadata.description.meta.toLowerCase().includes(searchTerm) ||
			post.content.toLowerCase().includes(searchTerm) ||
			post.metadata.seo.primaryKeyword.toLowerCase().includes(searchTerm) ||
			post.metadata.seo.secondaryKeywords.some((keyword) => keyword.toLowerCase().includes(searchTerm)),
	);

	const matchingPillars = pillars.filter(
		(pillar) =>
			pillar.metadata.hero.title.toLowerCase().includes(searchTerm) ||
			pillar.metadata.hero.subtitle.toLowerCase().includes(searchTerm) ||
			pillar.content.toLowerCase().includes(searchTerm) ||
			pillar.metadata.cluster.clusterKeywords.some((keyword) => keyword.toLowerCase().includes(searchTerm)),
	);

	const matchingDisasters = disasters.filter(
		(disaster) =>
			disaster.metadata.incident.title.toLowerCase().includes(searchTerm) ||
			disaster.metadata.story.summary.toLowerCase().includes(searchTerm) ||
			disaster.content.toLowerCase().includes(searchTerm),
	);

	return {
		posts: matchingPosts,
		pillars: matchingPillars,
		disasters: matchingDisasters,
	};
}

// Content relationship functions
export async function getRelatedPosts(currentSlug: string, limit = 3): Promise<BlogPost[]> {
	const posts = await getBlogPosts();
	const currentPost = posts.find((post) => post.slug === currentSlug);

	if (!currentPost) {
		return [];
	}

	// Find related posts based on keywords and category
	const related = posts
		.filter((post) => post.slug !== currentSlug)
		.map((post) => {
			let score = 0;

			// Same category gets high score
			if (post.metadata.format.type === currentPost.metadata.format.type) {
				score += 10;
			}

			// Shared keywords
			const sharedKeywords = post.metadata.seo.secondaryKeywords.filter((keyword) =>
				currentPost.metadata.seo.secondaryKeywords.includes(keyword),
			);
			score += sharedKeywords.length * 3;

			// Similar reading time
			const timeDiff = Math.abs(
				post.metadata.experience.readingTime - currentPost.metadata.experience.readingTime,
			);
			if (timeDiff <= 5) {
				score += 2;
			}

			return { post, score };
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ post }) => post);

	return related;
}

// RSS Feed generation
export async function generateRSSFeed(): Promise<string> {
	const posts = await getBlogPosts();
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

	const rssItems = posts
		.slice(0, 20)
		.map(
			(post) => `
    <item>
      <title><![CDATA[${post.metadata.title.main}]]></title>
      <description><![CDATA[${post.metadata.description.meta}]]></description>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.metadata.workflow.publishDate).toUTCString()}</pubDate>
      <author>${post.metadata.schema.author.name}</author>
      <category>${post.metadata.format.type}</category>
    </item>
  `,
		)
		.join("");

	return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>SnapBack Blog</title>
        <link>${siteUrl}/blog</link>
        <description>AI Coding Safety and Protection Stories</description>
        <language>en-US</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
        ${rssItems}
      </channel>
    </rss>`;
}

// Sitemap generation
export async function generateSitemap(): Promise<string[]> {
	const [posts, pillars] = await Promise.all([getBlogPosts(), getPillarContent()]);

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

	const urls = [
		`${siteUrl}/blog`,
		...posts.map((post) => `${siteUrl}/blog/${post.slug}`),
		...pillars.map((pillar) => `${siteUrl}/guides/${pillar.slug}`),
	];

	return urls;
}
