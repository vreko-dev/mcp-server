// Content Types for SnapBack Blog System
// Adapted from Astro content collections for Next.js

export interface BlogPostMetadata {
	// Enhanced Title Strategy
	title: {
		main: string;
		emotional?: string; // Alternative emotional title
		seo?: string; // SEO-optimized version
		social?: string; // Social media version
	};

	// Multi-layered Description
	description: {
		meta: string; // For meta description (120-160 chars)
		hook: string; // Twitter-length hook (280 chars)
		tldr: string; // Quick summary (500 chars)
		abstract?: string; // Academic-style abstract (1000 chars)
	};

	// Content Type & Format
	format: {
		type:
			| "data-study" // "We tracked 10,000 sessions"
			| "incident-report" // "$12,000 disaster story"
			| "technical-guide" // "How to implement X"
			| "thought-leadership" // "Why X matters"
			| "case-study" // "How Company Y saved $Z"
			| "comparison" // "SnapBack vs Git"
			| "announcement" // "Launch week"
			| "transparency"; // "Our metrics"
		structure:
			| "narrative" // Story-driven
			| "analytical" // Data-driven
			| "tutorial" // Step-by-step
			| "listicle" // Numbered points
			| "investigative"; // Deep dive
		tone: "technical" | "conversational" | "urgent" | "educational";
	};

	// Reading Experience Enhancements
	experience: {
		difficulty: "beginner" | "intermediate" | "advanced";
		readingTime: number; // in minutes
		scannable: {
			highlights: string[]; // Key takeaways (max 5)
			pullQuotes: string[]; // Emphasized quotes (max 3)
			dataPoints: Array<{
				stat: string;
				context: string;
			}>; // max 5
		};
		progression: {
			prerequisites?: string[]; // reference to other posts
			nextSteps?: string[]; // reference to other posts
			relatedReading: string[]; // reference to other posts (max 3)
		};
	};

	// Enhanced SEO Strategy
	seo: {
		primaryKeyword: string;
		secondaryKeywords: string[]; // max 5
		longTailVariations: string[]; // max 10
		featuredSnippet?: {
			target: string; // The question to target
			answer: string; // Direct answer (320 chars)
			format: "paragraph" | "list" | "table";
		};
		voiceSearchOptimized?: string; // Natural language answer
	};

	// Enhanced Structured Data
	schema: {
		type: "BlogPosting" | "TechArticle" | "NewsArticle" | "Report" | "HowTo" | "FAQPage" | "Case Study";

		// Rich Results Optimization
		howTo?: {
			totalTime: string; // "PT30M"
			supply: string[];
			steps: Array<{
				name: string;
				text: string;
				image?: string;
			}>;
		};

		faq?: Array<{
			question: string;
			answer: string;
		}>;

		// Author Authority
		author: {
			name: string;
			role: string;
			company: string;
			expertise: string[];
			socialProof?: {
				twitterFollowers?: number;
				githubStars?: number;
				linkedInConnections?: number;
			};
		};
	};

	// Performance Tracking
	metrics: {
		targetMetrics: {
			pageviews: number;
			avgTimeOnPage: number; // seconds
			shareRate: number; // percentage
			conversionRate: number; // percentage
		};
		serp?: {
			targetPosition: number; // max 10
			currentPosition?: number;
			impressions?: number;
			ctr?: number;
		};
	};

	// YC & Investor Signals (Strategic)
	signals: {
		founderStory: boolean; // Shows founder grit
		marketSize: boolean; // Demonstrates TAM
		traction: boolean; // Shows growth
		moat: boolean; // Technical defensibility
		vision: boolean; // Long-term thinking
		dataPoint?: string; // Key metric to highlight
	};

	// Publishing Workflow
	workflow: {
		status: "draft" | "review" | "scheduled" | "published" | "updated";
		publishDate: string; // ISO date string
		updateDate?: string; // ISO date string
		expiryDate?: string; // For time-sensitive content
		featured: {
			homepage: boolean;
			newsletter: boolean;
			socialMedia: boolean;
		};
		distribution: Array<
			"blog" | "newsletter" | "linkedin" | "twitter" | "hackernews" | "reddit" | "devto" | "producthunt"
		>;
	};

	// Visual elements
	visuals?: {
		heroImage?: string;
		heroVideo?: string;
		heroAnimation?: "disaster" | "protection" | "recovery";
		scrollProgress?: boolean;
		tableOfContents?: boolean;
		stickyNav?: boolean;
	};

	// Content Monetization & CTA Strategy
	conversion?: {
		primaryCTA: "free-trial" | "demo" | "newsletter" | "cap-giveaway";
		ctaPlacement: Array<"after-intro" | "mid-content" | "conclusion" | "floating">;
		leadMagnet?: {
			title: string;
			description: string;
			downloadUrl: string;
		};
		exitIntent: boolean;
	};
}

export interface BlogPost {
	slug: string;
	metadata: BlogPostMetadata;
	content: string;
	excerpt: string;
}

export interface PillarContentMetadata {
	// Hero Section - First impression matters
	hero: {
		title: string; // 30-60 chars for SEO
		subtitle: string; // Hook that appears below title (160 chars)
		hook: string; // Twitter-length emotional hook (280 chars)
		readTime: number; // in minutes
		lastUpdated: string; // ISO date
		version: string;
	};

	// Visual Storytelling
	visuals: {
		heroImage?: string;
		heroVideo?: string;
		heroAnimation?: "disaster" | "protection" | "recovery";
		scrollProgress: boolean;
		tableOfContents: boolean;
		stickyNav: boolean;
	};

	// Content Authority Signals
	authority: {
		dataPoints: number; // "Based on 10,000 data points"
		timeInvested: string; // "3 months of research"
		expertQuotes?: Array<{
			expert: string;
			title: string;
			quote: string;
			linkedIn?: string;
		}>;
		originalResearch: boolean;
		peerReviewed: boolean;
	};

	// Interactive Elements (Beautiful Reading Experience)
	interactive: {
		liveDataDashboard?: string; // URL to embedded dashboard
		codePlayground: boolean;
		costCalculator: boolean;
		disasterSimulator: boolean;
		quizElements?: Array<{
			question: string;
			answers: string[];
			correct: number;
		}>;
	};

	// Topic Cluster Architecture
	cluster: {
		hub: boolean; // Is this a hub page?
		spokes: string[]; // Connected blog posts
		relatedPillars?: string[]; // Other pillar content
		clusterKeywords: string[]; // 5-15 keywords
		semanticScore: number; // Topic relevance score (0-100)
	};

	// Enhanced SEO Strategy (reuse from BlogPostMetadata)
	seo: BlogPostMetadata["seo"];

	// Content Monetization & CTA Strategy
	conversion: {
		primaryCTA: "free-trial" | "demo" | "newsletter" | "cap-giveaway";
		ctaPlacement: Array<"after-intro" | "mid-content" | "conclusion" | "floating">;
		leadMagnet?: {
			title: string;
			description: string;
			downloadUrl: string;
		};
		exitIntent: boolean;
	};
}

export interface PillarContent {
	slug: string;
	metadata: PillarContentMetadata;
	content: string;
	excerpt: string;
}

export interface DisasterStoryMetadata {
	// Story Metadata
	incident: {
		title: string; // max 100 chars
		date: string; // ISO date
		aiTool: "cursor" | "copilot" | "chatgpt" | "claude" | "other";
		damageAmount?: number; // Dollar value
		timeWasted: number; // Hours
		filesAffected: number;
		recovered: boolean;
	};

	// Contributor Info
	contributor: {
		name?: string; // Can be anonymous
		company?: string;
		role?: string;
		verified: boolean;
	};

	// Story Elements
	story: {
		summary: string; // Tweet-length (280 chars)
		full: string;
		lessons: string[]; // max 3
		preventable: boolean;
	};

	// Engagement Metrics
	engagement: {
		upvotes: number;
		shares: number;
		helpful: number;
	};
}

export interface DisasterStory {
	slug: string;
	metadata: DisasterStoryMetadata;
	content: string;
	excerpt: string;
}

export interface ResourceMetadata {
	title: string;
	description: string;
	type: "whitepaper" | "checklist" | "template" | "calculator" | "infographic" | "report" | "ebook";
	preview?: string;
	downloadUrl: string;
	gatedContent: boolean;
	leadScore: number; // Value of lead (1-10)
	targetAudience: Array<"developer" | "team-lead" | "cto" | "startup-founder">;
}

export interface Resource {
	slug: string;
	metadata: ResourceMetadata;
	content: string;
	excerpt: string;
}

// Site configuration
export interface SiteConfig {
	name: string;
	url: string;
	logo: string;
	social: {
		twitter: string;
		linkedin: string;
		github: string;
	};
}
