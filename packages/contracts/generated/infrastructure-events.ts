/**
 * Generated Infrastructure Event Types
 *
 * This file is auto-generated from event definitions. Do not edit manually.
 */

// Analytics Events Enum
export const AnalyticsEvents = {
	PAGE_VIEW: "page_view",
	BUTTON_CLICK: "button_click",
	FORM_SUBMIT: "form_submit",
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
