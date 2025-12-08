"use client";

import type { BlogMetadata } from "@marketing/lib/content";
import { useEffect } from "react";

interface EnhancedSEOProps {
	metadata: BlogMetadata;
	slug: string;
	content?: string;
}

export function EnhancedSEO({ metadata, slug }: Omit<EnhancedSEOProps, "content">) {
	useEffect(() => {
		// Track page view with PostHog if available
		if (window?.posthog) {
			window.posthog.capture("blog_post_view", {
				slug,
				title: metadata.title.main,
				primary_keyword: metadata.seo.primaryKeyword,
				reading_time: metadata.experience.readingTime,
				word_count: metadata.schema.wordCount,
				article_type: metadata.format.type,
				author: metadata.schema.author.name,
			});
		}

		// Track reading progress
		const trackReadingProgress = () => {
			const article = document.querySelector("article");
			if (!article) {
				return;
			}

			const scrolled = window.scrollY;
			const articleTop = article.offsetTop;
			const articleHeight = article.offsetHeight;
			const windowHeight = window.innerHeight;

			const articleProgress = Math.max(
				0,
				Math.min(100, ((scrolled + windowHeight - articleTop) / articleHeight) * 100),
			);

			// Track milestone percentages
			const milestones = [25, 50, 75, 90, 100];
			for (const milestone of milestones) {
				if (articleProgress >= milestone && !window.readingMilestones?.[milestone]) {
					window.readingMilestones = window.readingMilestones || {};
					window.readingMilestones[milestone] = true;

					if (window.posthog) {
						window.posthog.capture("blog_reading_milestone", {
							slug,
							milestone_percent: milestone,
							time_on_page: Date.now() - (window.pageStartTime || 0),
						});
					}
				}
			}
		};

		// Initialize reading tracking
		window.pageStartTime = Date.now();
		window.readingMilestones = {};

		// Throttled scroll listener
		let scrollTimeout: NodeJS.Timeout;
		const handleScroll = () => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(trackReadingProgress, 100);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		// Track time on page when leaving
		const trackTimeOnPage = () => {
			if (window.posthog && window.pageStartTime) {
				const timeOnPage = Date.now() - window.pageStartTime;
				window.posthog.capture("blog_time_on_page", {
					slug,
					time_spent_ms: timeOnPage,
					time_spent_readable: `${Math.round(timeOnPage / 1000)}s`,
				});
			}
		};

		window.addEventListener("beforeunload", trackTimeOnPage);
		window.addEventListener("pagehide", trackTimeOnPage);

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("beforeunload", trackTimeOnPage);
			window.removeEventListener("pagehide", trackTimeOnPage);
			clearTimeout(scrollTimeout);
		};
	}, [slug, metadata]);

	useEffect(() => {
		// Add structured data for the blog post
		const structuredData = {
			"@context": "https://schema.org",
			"@type": "BlogPosting",
			headline: metadata.title.main,
			description: metadata.description.meta,
			image: metadata.visuals?.heroImage ? [metadata.visuals.heroImage] : undefined,
			author: {
				"@type": "Person",
				name: metadata.schema.author.name,
				email: metadata.schema.author.email,
				description: metadata.schema.author.bio,
				sameAs: [
					metadata.schema.author.twitter
						? `https://twitter.com/${metadata.schema.author.twitter.replace("@", "")}`
						: "",
					metadata.schema.author.github ? `https://github.com/${metadata.schema.author.github}` : "",
				].filter(Boolean),
			},
			publisher: {
				"@type": "Organization",
				name: "SnapBack",
				logo: {
					"@type": "ImageObject",
					url: "https://snapback.dev/logo.png",
				},
			},
			datePublished: metadata.workflow.publishDate,
			dateModified: metadata.workflow.updateDate || metadata.workflow.publishDate,
			mainEntityOfPage: {
				"@type": "WebPage",
				"@id": `https://snapback.dev/blog/${slug}`,
			},
			keywords: metadata.seo.secondaryKeywords.join(", "),
			wordCount: metadata.schema.wordCount,
			timeRequired: `PT${metadata.experience.readingTime.replace(/\D/g, "")}M`,
			articleSection: "AI Coding Safety",
			about: {
				"@type": "Thing",
				name: metadata.seo.primaryKeyword,
			},
			mentions: metadata.seo.secondaryKeywords.map((keyword) => ({
				"@type": "Thing",
				name: keyword,
			})),
		};

		// Add FAQ structured data if the post has Q&A content
		const faqData = {
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: [
				{
					"@type": "Question",
					name: `How to prevent ${metadata.seo.primaryKeyword}?`,
					acceptedAnswer: {
						"@type": "Answer",
						text: metadata.description.tldr,
					},
				},
				{
					"@type": "Question",
					name: "What is SnapBack?",
					acceptedAnswer: {
						"@type": "Answer",
						text: "SnapBack is an AI-aware code protection system that automatically creates checkpoints before AI assistants make changes to your codebase, allowing instant recovery when things go wrong.",
					},
				},
			],
		};

		// Add breadcrumb structured data
		const breadcrumbData = {
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Home",
					item: "https://snapback.dev",
				},
				{
					"@type": "ListItem",
					position: 2,
					name: "Blog",
					item: "https://snapback.dev/blog",
				},
				{
					"@type": "ListItem",
					position: 3,
					name: metadata.title.main,
					item: `https://snapback.dev/blog/${slug}`,
				},
			],
		};

		// Insert structured data into the page
		const insertStructuredData = (data: object, id: string) => {
			const existingScript = document.getElementById(id);
			if (existingScript) {
				existingScript.remove();
			}

			const script = document.createElement("script");
			script.id = id;
			script.type = "application/ld+json";
			script.textContent = JSON.stringify(data);
			document.head.appendChild(script);
		};

		insertStructuredData(structuredData, "blog-post-structured-data");
		insertStructuredData(faqData, "blog-faq-structured-data");
		insertStructuredData(breadcrumbData, "blog-breadcrumb-structured-data");

		// Cleanup on unmount
		return () => {
			const scripts = [
				"blog-post-structured-data",
				"blog-faq-structured-data",
				"blog-breadcrumb-structured-data",
			];
			for (const id of scripts) {
				const script = document.getElementById(id);
				if (script) {
					script.remove();
				}
			}
		};
	}, [metadata, slug]);

	useEffect(() => {
		// Initialize SEO tracking if available
		if (window?.initializeSEOTracking) {
			window.initializeSEOTracking();
		}
	}, []);

	// This component doesn't render anything visible
	return null;
}

// Type declarations for global window properties
declare global {
	interface Window {
		posthog?: any;
		pageStartTime?: number;
		readingMilestones?: Record<number, boolean>;
		initializeSEOTracking?: () => void;
	}
}
