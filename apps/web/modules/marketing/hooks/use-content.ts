import { useMemo } from "react";
import contentData from "../content/snapback.json";

export interface HeroSequenceItem {
	type: "terminal" | "counter" | "text";
	delay: number;
	content?: string;
	sound?: string;
	start?: number;
	end?: number;
	prefix?: string;
	duration?: number;
	animation?: string;
}

export interface StoryChapter {
	id: string;
	title: string;
	content: string;
	visual: string;
	emotion: string;
	metric?: {
		value: number;
		label: string;
	};
	stat?: string;
	demo?: string;
}

export interface Feature {
	name: string;
	description: string;
	icon: string;
	proof: string;
}

export interface Testimonial {
	quote: string;
	author: string;
	role: string;
	saved: number;
}

export interface Stat {
	value: number;
	label: string;
	prefix?: string;
	suffix?: string;
}

export interface PricingTier {
	id: string;
	name: string;
	price: number | string;
	unit: string;
	description: string;
	highlight: string;
	features: {
		[key: string]: string[] | undefined;
	};
	cta: string;
	ctaStyle: string;
	popular?: boolean;
	savings?: string;
}

export interface Content {
	meta: {
		title: string;
		description: string;
	};
	hero: {
		sequence: HeroSequenceItem[];
		cta: {
			primary: string;
			secondary: string;
		};
	};
	story: {
		chapters: StoryChapter[];
	};
	features: {
		core: Feature[];
	};
	social_proof: {
		stats: Stat[];
		testimonials: Testimonial[];
	};
	pricing: {
		header: {
			title: string;
			description: string;
		};
		tiers: PricingTier[];
		trust_signals: {
			stats: Stat[];
			incentive: string;
		};
	};
	urgency: {
		message: string;
		countdown: string;
		subtext: string;
	};
}

export function useContent(): Content {
	return useMemo(() => contentData as Content, []);
}
