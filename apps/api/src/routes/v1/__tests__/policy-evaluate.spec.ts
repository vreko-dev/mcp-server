import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import policyEvaluateRoute from "../policy-evaluate";

// Mock the auth module
vi.mock("@snapback/auth", async () => {
	const actual = await vi.importActual("@snapback/auth");
	return {
		...actual,
		auth: {
			api: {
				getSession: vi.fn(),
			},
		},
	};
});

// Mock the platform module
vi.mock("@snapback/platform", async () => {
	const actual = await vi.importActual("@snapback/platform");
	return {
		...actual,
		apiKeys: {
			id: "test-api-key-id",
			userId: "test-user-id",
			key: "test-api-key",
			revokedAt: null,
			expiresAt: null,
		},
		db: {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
		},
	};
});

// Mock the policy-engine module with a dynamic import approach
const mockEvaluate = vi.fn().mockReturnValue({
	action: "apply",
	reason: "No blocking issues found",
	details: {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
	},
});

vi.mock("../../../policy-engine/src/index.ts", async () => {
	return {
		evaluate: mockEvaluate,
		PolicyConfig: {},
	};
});

describe("POST /api/v1/policy/evaluate", () => {
	const testId = "policy-eval-001";
	const testId2 = "policy-eval-002";
	const testId3 = "policy-eval-003";

	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route("/api/v1", policyEvaluateRoute);

		// Reset mocks
		vi.clearAllMocks();
	});

	it(`${testId}: should return 401 when no API key is provided`, async () => {
		const mockAuthGetSession = vi.mocked(
			(await import("@snapback/auth")).auth.api.getSession,
		);
		mockAuthGetSession.mockResolvedValue({
			user: { id: "test-user-id" },
		} as any);

		const req = new Request("http://localhost:3000/api/v1/policy/evaluate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sarif: { runs: [] },
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "API key required" });
	});

	it(`${testId2}: should return policy evaluation results when valid request is made`, async () => {
		// Mock auth session
		const mockAuthGetSession = vi.mocked(
			(await import("@snapback/auth")).auth.api.getSession,
		);
		mockAuthGetSession.mockResolvedValue({
			user: { id: "test-user-id" },
		} as any);

		// Mock API key validation
		const mockDb = (await import("@snapback/platform")).db as any;
		mockDb.select.mockReturnThis();
		mockDb.from.mockReturnThis();
		mockDb.where.mockReturnThis();
		mockDb.limit.mockResolvedValue([
			{
				id: "test-api-key-id",
				userId: "test-user-id",
				key: "test-api-key",
				revokedAt: null,
				expiresAt: null,
				permissions: {
					policyEvaluation: true,
				},
			},
		]);

		// Mock policy engine
		mockEvaluate.mockReturnValue({
			action: "block",
			reason: "Critical issues (1) exceed threshold (0)",
			details: {
				critical: 1,
				high: 0,
				medium: 0,
				low: 0,
			},
		});

		const req = new Request("http://localhost:3000/api/v1/policy/evaluate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": "test-api-key",
			},
			body: JSON.stringify({
				sarif: { runs: [] },
				policy: {
					thresholds: {
						critical: 0,
					},
					blockOn: {
						critical: true,
					},
				},
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.action).toBe("block");
		expect(body.reason).toBe("Critical issues (1) exceed threshold (0)");

		// Verify that the evaluate method was called with correct parameters
		expect(mockEvaluate).toHaveBeenCalledWith(
			{ runs: [] },
			{
				thresholds: {
					critical: 0,
				},
				blockOn: {
					critical: true,
				},
				pathRules: [],
			},
			undefined,
		);

		// Restore the original method
		mockEvaluate.mockRestore();
	});

	it(`${testId3}: should return 401 when invalid API key is provided`, async () => {
		// Mock auth session
		const mockAuthGetSession = vi.mocked(
			(await import("@snapback/auth")).auth.api.getSession,
		);
		mockAuthGetSession.mockResolvedValue({
			user: { id: "test-user-id" },
		} as any);

		// Mock API key validation to return no results
		const mockDb = (await import("@snapback/platform")).db as any;
		mockDb.select.mockReturnThis();
		mockDb.from.mockReturnThis();
		mockDb.where.mockReturnThis();
		mockDb.limit.mockResolvedValue([]);

		const req = new Request("http://localhost:3000/api/v1/policy/evaluate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": "invalid-api-key",
			},
			body: JSON.stringify({
				sarif: { runs: [] },
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Invalid API key" });
	});
});
