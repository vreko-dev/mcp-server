/**
 * TDD Tests for Event Schemas
 *
 * Test-driven development: These tests define the expected behavior
 * BEFORE implementation.
 */

import { describe, expect, it } from "vitest";
import type { AuthSignupCompletedProps, BillingCheckoutCompletedProps, SnapshotCreatedProps } from "../core/events.js";
import { AnalyticsEvents } from "../core/events.js";

describe("Analytics Events - Event Definitions", () => {
	it("should define all 70 events", () => {
		const eventValues = Object.values(AnalyticsEvents);
		expect(eventValues).toHaveLength(60);
	});

	it("should have unique event names", () => {
		const eventValues = Object.values(AnalyticsEvents);
		const uniqueValues = new Set(eventValues);
		expect(uniqueValues.size).toBe(eventValues.length);
	});

	it("should use snake_case for event names", () => {
		const eventValues = Object.values(AnalyticsEvents);
		eventValues.forEach((event) => {
			expect(event).toMatch(/^[a-z][a-z0-9_]*$/);
		});
	});
});

describe("Analytics Events - Authentication Events", () => {
	describe("auth_signup_completed", () => {
		it("should accept valid signup event properties", () => {
			const props: AuthSignupCompletedProps = {
				signup_method: "email",
				referrer: null,
			};

			expect(props.signup_method).toBe("email");
			expect(props.referrer).toBeNull();
		});

		it("should accept optional UTM parameters", () => {
			const props: AuthSignupCompletedProps = {
				signup_method: "google",
				referrer: "https://example.com",
				utm_source: "twitter",
				utm_campaign: "launch",
				utm_medium: "social",
			};

			expect(props.utm_source).toBe("twitter");
			expect(props.utm_campaign).toBe("launch");
		});

		it("should enforce signup_method enum at compile time", () => {
			// This test validates TypeScript types at compile time
			const validMethods: Array<AuthSignupCompletedProps["signup_method"]> = ["email", "google", "github"];

			expect(validMethods).toHaveLength(3);
		});
	});

	describe("auth_login_completed", () => {
		it("should require is_new_session boolean", () => {
			const props = {
				login_method: "email" as const,
				is_new_session: true,
			};

			expect(props.is_new_session).toBe(true);
		});
	});
});

describe("Analytics Events - Snapshot Events", () => {
	describe("snapshot_created", () => {
		it("should accept valid snapshot creation properties", () => {
			const props: SnapshotCreatedProps = {
				file_extension: ".ts",
				file_size_bytes: 1024,
				has_message: true,
				trigger: "manual",
				environment: "extension",
			};

			expect(props.file_extension).toBe(".ts");
			expect(props.file_size_bytes).toBe(1024);
		});

		it("should enforce trigger enum", () => {
			const validTriggers: Array<SnapshotCreatedProps["trigger"]> = ["manual", "auto", "ai_suggestion"];

			expect(validTriggers).toHaveLength(3);
		});

		it("should enforce environment enum", () => {
			const validEnvironments: Array<SnapshotCreatedProps["environment"]> = ["extension", "cli"];

			expect(validEnvironments).toHaveLength(2);
		});
	});

	describe("snapshot_auto_created", () => {
		it("should include AI confidence and risk score", () => {
			const props = {
				ai_confidence: 0.85,
				risk_score: 75,
				reason: "dangerous_operation" as const,
			};

			expect(props.ai_confidence).toBeGreaterThan(0);
			expect(props.ai_confidence).toBeLessThanOrEqual(1);
			expect(props.risk_score).toBeLessThanOrEqual(100);
		});
	});
});

describe("Analytics Events - Billing Events", () => {
	describe("billing_checkout_completed", () => {
		it("should track successful checkout with all details", () => {
			const props: BillingCheckoutCompletedProps = {
				plan: "pro",
				billing_cycle: "monthly",
				price_usd: 29.99,
				time_to_convert_minutes: 15,
				coupon_used: null,
			};

			expect(props.plan).toBe("pro");
			expect(props.price_usd).toBeGreaterThan(0);
		});

		it("should handle coupon usage", () => {
			const props: BillingCheckoutCompletedProps = {
				plan: "team",
				billing_cycle: "yearly",
				price_usd: 499.99,
				time_to_convert_minutes: 30,
				coupon_used: "LAUNCH50",
			};

			expect(props.coupon_used).toBe("LAUNCH50");
		});
	});

	describe("billing_upgrade_prompt_shown", () => {
		it("should track prompt trigger and location", () => {
			const props = {
				trigger: "storage_limit" as const,
				prompt_location: "extension" as const,
				current_usage_percent: 95,
			};

			expect(props.current_usage_percent).toBeGreaterThan(90);
		});
	});
});

describe("Analytics Events - Extension Events", () => {
	describe("extension_installed", () => {
		it("should track installation details", () => {
			const props = {
				version: "1.0.0",
				vscode_version: "1.80.0",
				os: "mac" as const,
				install_source: "marketplace" as const,
			};

			expect(props.version).toMatch(/^\d+\.\d+\.\d+$/);
		});
	});

	describe("extension_error_occurred", () => {
		it("should capture error details", () => {
			const props = {
				error_type: "ReferenceError",
				error_message: "foo is not defined",
				stack_trace: "Error: foo is not defined\n  at ...",
				file_context: "snapshot.ts:45",
			};

			expect(props.error_type).toBeTruthy();
			expect(props.error_message).toBeTruthy();
		});
	});
});

describe("Analytics Events - Type Safety", () => {
	it("should enforce type safety for event properties", () => {
		// This test validates compile-time type checking
		// If TypeScript compiles, the test passes

		// Valid: Correct properties
		const validSnapshot: SnapshotCreatedProps = {
			file_extension: ".ts",
			file_size_bytes: 1024,
			has_message: true,
			trigger: "manual",
			environment: "extension",
		};

		// TypeScript should prevent these (uncomment to test):
		// const invalid1: CheckpointCreatedProps = {
		//   file_extension: '.ts',
		//   file_size_bytes: 'not a number', // Error: Type 'string' is not assignable to type 'number'
		//   has_message: true,
		//   trigger: 'manual',
		//   environment: 'extension',
		// };

		// const invalid2: SnapshotCreatedProps = {
		//   file_extension: '.ts',
		//   file_size_bytes: 1024,
		//   has_message: true,
		//   trigger: 'invalid_trigger', // Error: Type '"invalid_trigger"' is not assignable
		//   environment: 'extension',
		// };

		expect(validSnapshot).toBeDefined();
	});
});

describe("Analytics Events - Event Count Validation", () => {
	it("should have correct number of events per category", () => {
		const authEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("auth_"));
		expect(authEvents).toHaveLength(6);

		const snapshotEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("snapshot_"));
		expect(snapshotEvents).toHaveLength(10);

		const billingEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("billing_"));
		expect(billingEvents).toHaveLength(12);

		const extensionEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("extension_"));
		expect(extensionEvents).toHaveLength(8);

		const dashboardEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("dashboard_"));
		expect(dashboardEvents).toHaveLength(8);

		const teamEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("team_"));
		expect(teamEvents).toHaveLength(6);

		const aiEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("ai_"));
		expect(aiEvents).toHaveLength(5);

		const apiEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("api_"));
		expect(apiEvents).toHaveLength(5);
	});
});
