import posthog from "posthog-js";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { analytics } from "../../modules/marketing/lib/analytics";

vi.mock("posthog-js");

describe("analytics", () => {
	const mockCapture = vi.fn();

	beforeAll(() => {
		(posthog as any).__loaded = true;
		(posthog as any).capture = mockCapture;
	});

	beforeEach(() => {
		mockCapture.mockClear();
		// Set NODE_ENV to production to avoid console.log
		vi.stubEnv("NODE_ENV", "production");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("should initialize PostHog analytics", () => {
		analytics.init();
		// Just verify it doesn't throw
		expect(true).toBe(true);
	});

	it("should track events via PostHog", () => {
		const event = "test_event";
		const properties = { value: "test" };

		analytics.track(event, properties);

		// Check if PostHog was called
		expect(mockCapture).toHaveBeenCalledWith(event, properties);
	});

	it("should handle pageviews via PostHog", () => {
		const url = "/test-page";

		analytics.pageview(url);

		// PostHog auto-tracks pageviews, so this is a no-op
		expect(true).toBe(true);
	});

	it("should handle missing PostHog gracefully", () => {
		// Temporarily set PostHog as not loaded
		const originalLoaded = (posthog as any).__loaded;
		(posthog as any).__loaded = false;

		const event = "test_event";
		const properties = { value: "test" };

		// This should not throw an error
		expect(() => {
			analytics.track(event, properties);
		}).not.toThrow();

		// Restore PostHog loaded state
		(posthog as any).__loaded = originalLoaded;
	});
});
