/**
 * PostHog mock handlers for testing
 * Consolidated from test/ directory
 */

export const capturedEvents: Array<{ event: string; properties?: Record<string, unknown> }> = [];

// MSW handlers for PostHog (empty - using manual mocks instead)
export const posthogHandlers = [];

export const posthogErrorHandlers = {
	onError: (error: Error) => {
		capturedEvents.push({ event: "posthog_error", properties: { error: error.message } });
	},
};

export const resetCapturedEvents = () => {
	capturedEvents.length = 0;
};
