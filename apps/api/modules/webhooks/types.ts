// PostHog webhook event types
export interface PostHogWebhookEvent {
	event: string;
	properties: Record<string, any>;
	person: {
		id: string;
		created_at: string;
		properties: Record<string, any>;
		distinct_ids: string[];
	};
	timestamp: string;
	uuid: string;
}

// Cohort events
export interface CohortEvent extends PostHogWebhookEvent {
	event: "user_entered_cohort" | "user_left_cohort";
	properties: {
		cohort: string;
		cohort_id: number;
		cohort_name: string;
	};
}

// Feature flag events
export interface FeatureFlagEvent extends PostHogWebhookEvent {
	event: "$feature_flag_called";
	properties: {
		$feature_flag: string;
		$feature_flag_response: string | boolean;
	};
}

// HubSpot contact properties
export interface HubSpotContactProperties {
	email: string;
	firstname?: string;
	lastname?: string;
	plan?: string;
	subscription_status?: string;
	total_snapshots?: number;
	total_recoveries?: number;
	mrr?: number;
	[key: string]: any;
}

// Email campaign types
export interface EmailCampaign {
	id: string;
	name: string;
	trigger: {
		type: "event" | "cohort_entry" | "time_based" | "property_change";
		condition: any;
	};
	sequence: EmailStep[];
}

export interface EmailStep {
	delay: string; // "0d", "1d", "3d", etc.
	template: string;
	subject: string;
	preheader?: string;
	data: (user: any) => any;
	condition?: (user: any) => boolean;
}

// In-app message types
export interface InAppMessage {
	id: string;
	type: "toast" | "modal" | "banner" | "tooltip";
	targeting: {
		cohorts?: string[];
		properties?: Record<string, any>;
		events?: { name: string; count: number; timeframe: string }[];
		flags?: string[];
	};
	content: {
		title: string;
		body: string;
		cta?: { label: string; action: string };
		image?: string;
	};
	timing: {
		trigger: "immediate" | "delay" | "exit_intent" | "scroll";
		delay?: number;
		scrollPercent?: number;
	};
	frequency: {
		max_impressions: number;
		cooldown_hours: number;
	};
}
