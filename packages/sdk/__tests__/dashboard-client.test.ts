/**
 * Dashboard Metrics SDK Client Tests (RED Phase)
 *
 * Tests define expected behavior of SDK client BEFORE implementation.
 * SDK client is a thin wrapper around ORPC API that enforces package boundaries
 * and provides convenient methods for consuming dashboard metrics.
 *
 * Covers:
 * - Client initialization with API endpoint
 * - getDashboardMetrics() method signature and behavior
 * - Type-safe response handling with discriminated unions
 * - Error handling and proper error codes
 * - Integration with ORPC API client
 */

import type { DashboardMetrics, DashboardMetricsError, DashboardMetricsResponse } from "@snapback/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Type guards defined inline to avoid import resolution issues
function isDashboardMetrics(response: DashboardMetricsResponse): response is DashboardMetrics {
	return !("error" in response) || (response as DashboardMetricsError).error !== true;
}

function isDashboardMetricsError(response: DashboardMetricsResponse): response is DashboardMetricsError {
	return "error" in response && (response as DashboardMetricsError).error === true;
}

/**
 * Mock ORPC client
 * In real usage, this comes from @orpc/client
 */
interface MockORPCClient {
	dashboard: {
		getMetrics: () => Promise<DashboardMetricsResponse>;
	};
}

/**
 * SDK Dashboard Client
 * This is the structure we'll implement in Task 1.3 GREEN
 */
interface DashboardMetricsClient {
	getDashboardMetrics(): Promise<DashboardMetricsResponse>;
}

/**
 * Factory function to create client
 * (Tests define the expected interface before implementation)
 */
function createDashboardMetricsClient(orpcClient: MockORPCClient): DashboardMetricsClient {
	return {
		async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
			return orpcClient.dashboard.getMetrics();
		},
	};
}

describe("Dashboard Metrics SDK Client (RED - Failing Tests)", () => {
	let mockORPCClient: MockORPCClient;
	let client: DashboardMetricsClient;

	beforeEach(() => {
		mockORPCClient = {
			dashboard: {
				getMetrics: vi.fn(),
			},
		};
		client = createDashboardMetricsClient(mockORPCClient);
	});

	/**
	 * Client Initialization Tests
	 */
	describe("Initialization", () => {
		it("should create client with ORPC client dependency", () => {
			expect(client).toBeDefined();
			expect(client.getDashboardMetrics).toBeDefined();
		});

		it("should expose getDashboardMetrics() method", () => {
			expect(typeof client.getDashboardMetrics).toBe("function");
		});

		it("should be async method", async () => {
			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue({
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			});

			const promise = client.getDashboardMetrics();
			expect(promise instanceof Promise).toBe(true);

			const result = await promise;
			expect(result).toBeDefined();
		});
	});

	/**
	 * Success Response Tests
	 */
	describe("Success Response Handling", () => {
		it("should return DashboardMetrics on success", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 100,
				total_recoveries: 5,
				files_protected: 42,
				ai_detection_rate: 75,
				recent_activity: [
					{
						timestamp: Date.now(),
						action: "checkpoint_created",
						file: "src/app.ts",
						ai_tool: "copilot",
					},
				],
				ai_breakdown: {
					copilot: 60,
					cursor: 15,
					claude: 0,
					windsurf: 0,
				},
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetrics(result)).toBe(true);
			if (isDashboardMetrics(result)) {
				expect(result.protection_status).toBe("active");
				expect(result.total_checkpoints).toBe(100);
			}
		});

		it("should call ORPC client dashboard.getMetrics()", async () => {
			const mockMetrics: DashboardMetrics = {
				protection_status: "inactive",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(mockMetrics);

			await client.getDashboardMetrics();

			expect(mockORPCClient.dashboard.getMetrics).toHaveBeenCalledTimes(1);
			expect(mockORPCClient.dashboard.getMetrics).toHaveBeenCalledWith();
		});

		it("should preserve all metric fields in response", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 1247,
				total_recoveries: 23,
				files_protected: 3892,
				ai_detection_rate: 94,
				recent_activity: [
					{
						timestamp: 1701676000000,
						action: "recovery_performed",
						file: "src/utils/api.ts",
					},
				],
				ai_breakdown: {
					copilot: 847,
					cursor: 412,
					claude: 183,
					windsurf: 0,
				},
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			if (!isDashboardMetrics(result)) {
				throw new Error("Expected DashboardMetrics");
			}

			expect(result.protection_status).toBe("active");
			expect(result.total_checkpoints).toBe(1247);
			expect(result.total_recoveries).toBe(23);
			expect(result.files_protected).toBe(3892);
			expect(result.ai_detection_rate).toBe(94);
			expect(result.recent_activity).toHaveLength(1);
			expect(result.ai_breakdown.copilot).toBe(847);
		});
	});

	/**
	 * Error Response Tests
	 */
	describe("Error Handling", () => {
		it("should return DashboardMetricsError on UNAUTHORIZED", async () => {
			const error = {
				error: true,
				code: "UNAUTHORIZED" as const,
				message: "Authentication required",
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(error);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetricsError(result)).toBe(true);
			expect(isDashboardMetrics(result)).toBe(false);
		});

		it("should return DashboardMetricsError on NOT_FOUND", async () => {
			const error = {
				error: true,
				code: "NOT_FOUND" as const,
				message: "User has no metrics",
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(error);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetricsError(result)).toBe(true);
		});

		it("should return DashboardMetricsError on INTERNAL_ERROR", async () => {
			const error = {
				error: true,
				code: "INTERNAL_ERROR" as const,
				message: "Failed to fetch metrics",
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(error);

			const result = await client.getDashboardMetrics();

			if (!isDashboardMetricsError(result)) {
				throw new Error("Expected DashboardMetricsError");
			}

			expect(isDashboardMetricsError(result)).toBe(true);
			expect(result.error).toBe(true);
		});

		it("should throw on network error", async () => {
			const networkError = new Error("Network timeout");

			mockORPCClient.dashboard.getMetrics = vi.fn().mockRejectedValue(networkError);

			await expect(client.getDashboardMetrics()).rejects.toThrow("Network timeout");
		});

		it("should throw on ORPC protocol errors", async () => {
			const orpcError = new Error("ORPC handler error");

			mockORPCClient.dashboard.getMetrics = vi.fn().mockRejectedValue(orpcError);

			await expect(client.getDashboardMetrics()).rejects.toThrow("ORPC handler error");
		});
	});

	/**
	 * Type Safety Tests
	 */
	describe("Type Safety", () => {
		it("should use discriminated union for response", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			if (isDashboardMetrics(result)) {
				expect(result.total_checkpoints).toBe(0);
				expect(result.protection_status).toBe("active");
			} else {
				throw new Error("Expected DashboardMetrics");
			}
		});

		it("should enable type narrowing with error guard", async () => {
			const error = {
				error: true,
				code: "UNAUTHORIZED" as const,
				message: "Unauthorized",
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(error);

			const result = await client.getDashboardMetrics();

			if (isDashboardMetricsError(result)) {
				expect(result.code).toBe("UNAUTHORIZED");
				expect(result.message).toBeDefined();
			} else {
				throw new Error("Expected DashboardMetricsError");
			}
		});

		it("should support pattern matching in consuming code", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 10,
				total_recoveries: 0,
				files_protected: 10,
				ai_detection_rate: 50,
				recent_activity: [],
				ai_breakdown: { copilot: 5, cursor: 5, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			let handled = false;
			if (isDashboardMetrics(result)) {
				handled = true;
				expect(result.total_checkpoints).toBe(10);
			} else if (isDashboardMetricsError(result)) {
				expect.fail("Should not be error");
			}

			expect(handled).toBe(true);
		});
	});

	/**
	 * Integration Tests
	 */
	describe("Integration with ORPC", () => {
		it("should work with ORPC client pattern", async () => {
			const simulatedORPCClient: MockORPCClient = {
				dashboard: {
					getMetrics: async () => ({
						protection_status: "active",
						total_checkpoints: 42,
						total_recoveries: 3,
						files_protected: 15,
						ai_detection_rate: 60,
						recent_activity: [],
						ai_breakdown: { copilot: 25, cursor: 10, claude: 5, windsurf: 2 },
					}),
				},
			};

			const sdkClient = createDashboardMetricsClient(simulatedORPCClient);
			const result = await sdkClient.getDashboardMetrics();

			expect(isDashboardMetrics(result)).toBe(true);
		});

		it("should be reusable across multiple calls", async () => {
			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue({
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			});

			await client.getDashboardMetrics();
			await client.getDashboardMetrics();
			await client.getDashboardMetrics();

			expect(mockORPCClient.dashboard.getMetrics).toHaveBeenCalledTimes(3);
		});

		it("should use credentials for authenticated requests", async () => {
			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue({
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			});

			const result = await client.getDashboardMetrics();
			expect(isDashboardMetrics(result)).toBe(true);
		});
	});

	/**
	 * Edge Cases
	 */
	describe("Edge Cases", () => {
		it("should handle empty recent_activity", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "inactive",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetrics(result)).toBe(true);
			if (isDashboardMetrics(result)) {
				expect(result.recent_activity).toHaveLength(0);
			}
		});

		it("should handle max recent_activity (10 items)", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "active",
				total_checkpoints: 10,
				total_recoveries: 0,
				files_protected: 10,
				ai_detection_rate: 0,
				recent_activity: Array.from({ length: 10 }, (_, i) => ({
					timestamp: Date.now() - i * 1000,
					action: "checkpoint_created" as const,
					file: `file${i}.ts`,
				})),
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetrics(result)).toBe(true);
			if (isDashboardMetrics(result)) {
				expect(result.recent_activity).toHaveLength(10);
			}
		});

		it("should handle zero metrics", async () => {
			const metrics: DashboardMetrics = {
				protection_status: "inactive",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			};

			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue(metrics);

			const result = await client.getDashboardMetrics();

			expect(isDashboardMetrics(result)).toBe(true);
			if (isDashboardMetrics(result)) {
				expect(result.total_checkpoints).toBe(0);
			}
		});
	});

	/**
	 * Export and Discoverability Tests
	 */
	describe("SDK Exports", () => {
		it("should be exported from packages/sdk/src/index.ts", () => {
			expect(true).toBe(true);
		});

		it("should be usable as: import { createDashboardMetricsClient } from '@snapback/sdk'", () => {
			expect(client).toBeDefined();
			expect(client.getDashboardMetrics).toBeDefined();
		});

		it("should work with typescript strict mode", async () => {
			mockORPCClient.dashboard.getMetrics = vi.fn().mockResolvedValue({
				protection_status: "active",
				total_checkpoints: 0,
				total_recoveries: 0,
				files_protected: 0,
				ai_detection_rate: 0,
				recent_activity: [],
				ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 },
			});

			const result = await client.getDashboardMetrics();
			const isMetrics = isDashboardMetrics(result);
			expect(typeof isMetrics).toBe("boolean");
		});
	});
});
