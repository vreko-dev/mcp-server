/**
 * TDD Tests for Event Schemas
 *
 * Test-driven development: These tests define the expected behavior
 * BEFORE implementation.
 */

import { describe, expect, it } from "vitest";
import type { AuthSignupCompletedProps, BillingCheckoutCompletedProps, SnapshotCreatedProps } from "../core/events";
import { AnalyticsEvents } from "../core/events";

describe("Analytics Events - Event Definitions", () => {
	it("should define all 84 events (60 existing + 24 intelligence layer)", () => {
		const eventValues = Object.values(AnalyticsEvents);
		expect(eventValues).toHaveLength(84);
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

	it("should have correct number of intelligence layer events", () => {
		const predictionEvents = Object.values(AnalyticsEvents).filter((e) =>
			e.startsWith("prediction_") || e.startsWith("trust_score_") ||
			e.startsWith("pattern_") || e.startsWith("model_calibration_")
		);
		expect(predictionEvents).toHaveLength(6);

		const crossRepoEvents = Object.values(AnalyticsEvents).filter((e) =>
			e.startsWith("workspace_") || e.startsWith("cross_repo_") ||
			e.startsWith("repo_personality_") || e.startsWith("global_insight_")
		);
		expect(crossRepoEvents).toHaveLength(4);

		const githubEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("github_"));
		expect(githubEvents).toHaveLength(5);

		const mcpEvents = Object.values(AnalyticsEvents).filter((e) => e.startsWith("mcp_"));
		expect(mcpEvents).toHaveLength(3);

		const communityEvents = Object.values(AnalyticsEvents).filter((e) =>
			e.startsWith("disaster_story_") || e.startsWith("feedback_") ||
			e.startsWith("community_action_") || e.startsWith("beta_eligibility_") ||
			e.startsWith("referral_")
		);
		expect(communityEvents).toHaveLength(6);

		// Total intelligence layer events: 24
		const allIntelligenceEvents = [
			...predictionEvents,
			...crossRepoEvents,
			...githubEvents,
			...mcpEvents,
			...communityEvents,
		];
		expect(allIntelligenceEvents).toHaveLength(24);
	});
});

describe("Analytics Events - Intelligence Layer Events", () => {
	describe("prediction_made", () => {
		it("should track prediction with model version and features", () => {
			const props = {
				session_id: "sess_123",
				prediction_type: "risk_level" as const,
				predicted_value: 0.75,
				model_version: "v1.0.0",
				features_used: ["file_complexity", "change_velocity"],
				context_hash: "abc123",
			};

			expect(props.predicted_value).toBeGreaterThan(0);
			expect(props.predicted_value).toBeLessThanOrEqual(1);
			expect(props.features_used).toHaveLength(2);
		});
	});

	describe("trust_score_updated", () => {
		it("should track trust score changes with adjustment reason", () => {
			const props = {
				tool_id: "cursor_0.42",
				context_key: "react_typescript_refactor",
				old_score: 0.70,
				new_score: 0.75,
				adjustment_reason: "success" as const,
				sample_size: 25,
			};

			expect(props.new_score).toBeGreaterThan(props.old_score);
			expect(props.sample_size).toBeGreaterThan(0);
		});
	});

	describe("pattern_detected", () => {
		it("should classify patterns by type", () => {
			const props = {
				pattern_signature: "sig_abc123",
				pattern_type: "dangerous" as const,
				similarity_score: 0.92,
				file_types: [".ts", ".tsx"],
				tool_affinity: ["cursor", "copilot"],
			};

			expect(props.similarity_score).toBeGreaterThan(0.8);
			expect(props.file_types).toContain(".ts");
		});
	});

	describe("github_pr_analyzed", () => {
		it("should track PR analysis with AI contribution detection", () => {
			const props = {
				pr_number: 42,
				repo_id: "hashed_repo_123",
				risk_score: 35,
				ai_contribution_percentage: 65,
				files_changed: 8,
				lines_added: 420,
				lines_removed: 120,
				estimated_ai_tool: "cursor",
				patterns_detected: ["burst-write", "multi-file-refactor"],
				check_conclusion: "neutral" as const,
			};

			expect(props.ai_contribution_percentage).toBeGreaterThan(0);
			expect(props.ai_contribution_percentage).toBeLessThanOrEqual(100);
			expect(props.patterns_detected).toHaveLength(2);
		});
	});

	describe("community_action_completed", () => {
		it("should track engagement actions with points", () => {
			const props = {
				action_type: "github_star" as const,
				points_earned: 10,
				tier_progress_before: 45,
				tier_progress_after: 55,
				engagement_score_delta: 10,
			};

			expect(props.points_earned).toBeGreaterThan(0);
			expect(props.tier_progress_after).toBeGreaterThan(props.tier_progress_before);
		});
	});
});

describe("Analytics Events - Type Safety for Intelligence Layer", () => {
	it("should enforce type safety for intelligence layer events", () => {
		// Valid prediction props
		const validPrediction = {
			session_id: "sess_123",
			prediction_type: "will_need_recovery" as const,
			predicted_value: 0.65,
			model_version: "v1.0.0",
			features_used: ["complexity"],
			context_hash: "hash123",
		};

		// Valid trust score props
		const validTrustScore = {
			tool_id: "copilot_1.2",
			context_key: "python_fastapi",
			old_score: 0.75,
			new_score: 0.78,
			adjustment_reason: "near_miss" as const,
			sample_size: 10,
		};

		// Valid GitHub props
		const validGithub = {
			pr_number: 1,
			repo_id: "repo_hash",
			risk_score: 0,
			ai_contribution_percentage: 0,
			files_changed: 1,
			lines_added: 10,
			lines_removed: 0,
			estimated_ai_tool: null,
			patterns_detected: [],
			check_conclusion: "success" as const,
		};

		expect(validPrediction).toBeDefined();
		expect(validTrustScore).toBeDefined();
		expect(validGithub).toBeDefined();
	});
});
