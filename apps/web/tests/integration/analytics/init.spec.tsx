import { render } from "@testing-library/react";
import posthog from "posthog-js";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsScript } from "@/modules/analytics/provider/posthog";

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		init: vi.fn(),
		capture: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
	},
}));

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
	usePathname: () => "/test-path",
	useSearchParams: () => new URLSearchParams("?foo=bar"),
}));

describe("Analytics Initialization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set PostHog key for tests
		process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key_12345";
	});

	afterEach(() => {
		delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
	});

	it("should initialize PostHog exactly once", () => {
		const initSpy = vi.spyOn(posthog, "init");

		render(<AnalyticsScript />);

		expect(initSpy).toHaveBeenCalledTimes(1);
		expect(initSpy).toHaveBeenCalledWith("phc_test_key_12345", {
			api_host: "https://us.i.posthog.com",
			person_profiles: "identified_only",
			autocapture: true,
			capture_pageview: false,
			capture_pageleave: true,
			loaded: expect.any(Function),
		});
	});

	it("should not initialize PostHog when key is missing", () => {
		delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
		const initSpy = vi.spyOn(posthog, "init");

		render(<AnalyticsScript />);

		expect(initSpy).not.toHaveBeenCalled();
	});

	it("should capture pageview on route change", () => {
		const captureSpy = vi.spyOn(posthog, "capture");

		render(<AnalyticsScript />);

		// Should capture pageview with current URL
		expect(captureSpy).toHaveBeenCalledWith("$pageview", {
			$current_url: expect.stringContaining("/test-path"),
		});
	});

	it("should use custom PostHog host when provided", () => {
		process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.posthog.com";
		const initSpy = vi.spyOn(posthog, "init");

		render(<AnalyticsScript />);

		expect(initSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				api_host: "https://eu.posthog.com",
			}),
		);

		delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
	});

	it("should have autocapture enabled", () => {
		const initSpy = vi.spyOn(posthog, "init");

		render(<AnalyticsScript />);

		expect(initSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				autocapture: true,
			}),
		);
	});

	it("should have manual pageview capture disabled", () => {
		const initSpy = vi.spyOn(posthog, "init");

		render(<AnalyticsScript />);

		expect(initSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				capture_pageview: false,
			}),
		);
	});

	it("should track pageview with query parameters", () => {
		const captureSpy = vi.spyOn(posthog, "capture");

		render(<AnalyticsScript />);

		expect(captureSpy).toHaveBeenCalledWith("$pageview", {
			$current_url: expect.stringContaining("?foo=bar"),
		});
	});
});
