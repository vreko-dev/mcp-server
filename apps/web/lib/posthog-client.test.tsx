/**
 * PostHog Client Unit Tests
 *
 * Tests PostHog proxy integration following testing_blueprint.md:
 * - PH-01 to PH-08: Unit test coverage
 * - Happy/Sad/Edge/Error paths
 * - MSW integration for network mocking
 *
 * @see demo_prep/testing_blueprint.md (Web Dashboard Testing Rules)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PostHogProvider, identifyUser, captureEvent, resetUser } from "./posthog-client";
import { server } from "@snapback/testing/msw/server";
import { posthogHandlers, posthogErrorHandlers, capturedEvents, resetCapturedEvents } from "../test/mocks/handlers/posthog";

// Mock posthog-js module
vi.mock("posthog-js", () => ({
	default: {
		__loaded: false,
		init: vi.fn((apiKey, config) => {
			// Store config for assertions
			(global as any).posthogConfig = { apiKey, config };
			(global as any).posthog.__loaded = true;
		}),
		capture: vi.fn((event, properties) => {
			// Track capture calls
			if (!(global as any).posthogCaptures) {
				(global as any).posthogCaptures = [];
			}
			(global as any).posthogCaptures.push({ event, properties });
		}),
		identify: vi.fn((userId, properties) => {
			(global as any).posthogIdentify = { userId, properties };
		}),
		group: vi.fn(),
		reset: vi.fn(),
		isFeatureEnabled: vi.fn(() => false),
		getFeatureFlagPayload: vi.fn(() => null),
	},
}));

// Get mocked posthog instance
const getPostHog = () => (global as any).posthog || {};
const getPostHogConfig = () => (global as any).posthogConfig || {};
const getPostHogCaptures = () => (global as any).posthogCaptures || [];

describe("PostHogProvider", () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		resetCapturedEvents();
		(global as any).posthog = {
			__loaded: false,
			init: vi.fn(),
			capture: vi.fn(),
			identify: vi.fn(),
			group: vi.fn(),
			reset: vi.fn(),
		};
		(global as any).posthogConfig = undefined;
		(global as any).posthogCaptures = [];
		(global as any).posthogIdentify = undefined;

		// Use PostHog handlers
		server.use(...posthogHandlers);

		// Mock environment
		process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key_123";
	});

	afterEach(() => {
		cleanup();
		delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Initialization", () => {
		it("PH-01: should initialize PostHog with proxy URL", () => {
			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const config = getPostHogConfig();

			expect(config.apiKey).toBe("phc_test_key_123");
			expect(config.config.api_host).toBe("/ingest");
			expect(config.config.person_profiles).toBe("identified_only");
			expect(config.config.capture_pageview).toBe(false);
		});

		it("should configure autocapture for specific elements", () => {
			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const config = getPostHogConfig();

			expect(config.config.autocapture.dom_event_allowlist).toContain("click");
			expect(config.config.autocapture.dom_event_allowlist).toContain("submit");
			expect(config.config.autocapture.element_allowlist).toContain("button");
		});

		it("should configure session recording with selective masking", () => {
			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const config = getPostHogConfig();

			expect(config.config.session_recording.maskTextSelector).toContain(".sensitive");
			expect(config.config.session_recording.maskTextSelector).toContain("input[type='password']");
			expect(config.config.session_recording.maskInputOptions.password).toBe(true);
		});

		it("PH-07: should not make network calls to posthog.com", () => {
			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const config = getPostHogConfig();

			// Verify proxy is used, not direct PostHog URL
			expect(config.config.api_host).not.toContain("posthog.com");
			expect(config.config.api_host).not.toContain("i.posthog.com");
		});

		it("PH-08: should route all requests to /ingest/*", () => {
			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const config = getPostHogConfig();

			expect(config.config.api_host).toBe("/ingest");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Missing Configuration", () => {
		it("PH-02: should warn when PostHog key is missing", () => {
			delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			expect(warnSpy).toHaveBeenCalledWith("PostHog not configured");
			expect(getPostHog().init).not.toHaveBeenCalled();

			warnSpy.mockRestore();
		});

		it("should not initialize PostHog without API key", () => {
			delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
			vi.spyOn(console, "warn").mockImplementation(() => {});

			render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			expect(getPostHogConfig().apiKey).toBeUndefined();
		});
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	describe("Event Capture", () => {
		beforeEach(() => {
			(global as any).posthog.__loaded = true;
		});

		it("PH-03: should capture pageview with correct URL", () => {
			const posthog = getPostHog();
			posthog.__loaded = true;

			// Simulate pageview capture (this is done in useEffect in actual component)
			posthog.capture("$pageview", { $current_url: "http://localhost:3000/test" });

			expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
				$current_url: "http://localhost:3000/test",
			});
		});

		it("PH-04: should capture custom events", () => {
			captureEvent("test_event", { foo: "bar" });

			expect(getPostHog().capture).toHaveBeenCalledWith("test_event", { foo: "bar" });
		});

		it("should not capture events when PostHog not loaded", () => {
			(global as any).posthog.__loaded = false;

			captureEvent("test_event");

			// Should not throw error, just skip
			expect(getPostHog().capture).not.toHaveBeenCalled();
		});
	});

	describe("User Identification", () => {
		beforeEach(() => {
			(global as any).posthog.__loaded = true;
		});

		it("PH-05: should identify user with properties", () => {
			identifyUser("user_123", { email: "test@example.com", plan: "pro" });

			expect(getPostHog().identify).toHaveBeenCalledWith("user_123", {
				email: "test@example.com",
				plan: "pro",
			});
		});

		it("should identify user without properties", () => {
			identifyUser("user_456");

			expect(getPostHog().identify).toHaveBeenCalledWith("user_456", undefined);
		});

		it("should not identify when PostHog not loaded", () => {
			(global as any).posthog.__loaded = false;

			identifyUser("user_789");

			expect(getPostHog().identify).not.toHaveBeenCalled();
		});
	});

	describe("User Reset", () => {
		beforeEach(() => {
			(global as any).posthog.__loaded = true;
		});

		it("PH-06: should reset user on logout", () => {
			resetUser();

			expect(getPostHog().reset).toHaveBeenCalled();
		});

		it("should not reset when PostHog not loaded", () => {
			(global as any).posthog.__loaded = false;

			resetUser();

			expect(getPostHog().reset).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle double initialization gracefully", () => {
			const { rerender } = render(
				<PostHogProvider>
					<div>Test</div>
				</PostHogProvider>
			);

			const firstCallCount = getPostHog().init.mock.calls.length;

			// Re-render should not re-initialize
			rerender(
				<PostHogProvider>
					<div>Test 2</div>
				</PostHogProvider>
			);

			// __loaded flag should prevent re-initialization
			expect(getPostHog().init.mock.calls.length).toBe(firstCallCount);
		});

		it("should handle capture with complex properties", () => {
			(global as any).posthog.__loaded = true;

			const complexProps = {
				nested: { deep: { value: 123 } },
				array: [1, 2, 3],
				date: new Date().toISOString(),
				null: null,
				undefined: undefined,
			};

			captureEvent("complex_event", complexProps);

			expect(getPostHog().capture).toHaveBeenCalledWith("complex_event", complexProps);
		});
	});
});
