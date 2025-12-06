export const AnalyticsEvents = {
	HERO_VIDEO_PLAYED: "hero_video_played",
	HERO_CTA_CLICKED_SECONDARY: "hero_cta_clicked_secondary",
	INSTALL_BUTTON_CLICKED: "install_button_clicked",
	DEMO_SNAPSHOT_SELECTED: "demo_snapshot_selected",
	DEMO_TIMELINE_DRAGGED: "demo_timeline_dragged",
	DEMO_VIDEO_PLAYED: "demo_video_played",
	PRICING_TOGGLE_CHANGED: "pricing_toggle_changed",
	PRICING_CARD_CLICKED: "pricing_card_clicked",
	ALPHA_SIGNUP_STARTED: "alpha_signup_started",
	ALPHA_SIGNUP_COMPLETED: "alpha_signup_completed",
	SCROLL_DEPTH: "scroll_depth",
	TIME_ON_PAGE: "time_on_page",
	// Dashboard events (legacy)
	DASHBOARD_VIEWED: "dashboard_viewed",
	DASHBOARD_HELP_ACCESSED: "dashboard_help_accessed",
	SAVE_STORY_SHARED: "save_story_shared",
} as const;

export type AnalyticsEventKey = keyof typeof AnalyticsEvents;
export type AnalyticsEvent = (typeof AnalyticsEvents)[AnalyticsEventKey];
