import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuardianService } from "@/src/services/guardian";
import analyzeRoute from "../analyze";

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

describe("POST /api/v1/analyze", () => {
	const testId = "analyze-001";
	const testId2 = "analyze-002";
	const testId3 = "analyze-003";

	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route("/api/v1", analyzeRoute);

		// Reset mocks
		vi.clearAllMocks();
	});

	it(`${testId}: should return 401 when no API key is provided`, async () => {
		const mockAuthGetSession = vi.mocked((await import("@snapback/auth")).auth.api.getSession);
		mockAuthGetSession.mockResolvedValue({
			user: { id: "test-user-id" },
		} as any);

		const req = new Request("http://localhost:3000/api/v1/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				files: [{ path: "test.ts", content: "test content" }],
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "API key required" });
	});

	it(`${testId2}: should return analysis results when valid request is made`, async () => {
		// Mock auth session
		const mockAuthGetSession = vi.mocked((await import("@snapback/auth")).auth.api.getSession);
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
			},
		]);

		// Mock Guardian service
		const mockAnalyze = vi.spyOn(GuardianService.prototype, "analyze").mockResolvedValue({
			analysisId: "test-analysis-id",
			riskScore: 25,
			riskLevel: "low",
			riskFactors: [],
			summary: "Low risk: 0 factors detected",
			recommendations: [],
			violations: [],
			timestamp: new Date().toISOString(),
		});

		const req = new Request("http://localhost:3000/api/v1/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": "test-api-key",
			},
			body: JSON.stringify({
				files: [{ path: "test.ts", content: "test content" }],
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.analysisId).toBe("test-analysis-id");
		expect(body.riskScore).toBe(25);
		expect(body.riskLevel).toBe("low");

		// Verify that the analyze method was called with correct parameters
		expect(mockAnalyze).toHaveBeenCalledWith({
			files: [{ path: "test.ts", content: "test content" }],
			userId: "test-user-id",
			apiKeyId: "test-api-key-id",
		});

		// Restore the original method
		mockAnalyze.mockRestore();
	});

	it(`${testId3}: should return 401 when invalid API key is provided`, async () => {
		// Mock auth session
		const mockAuthGetSession = vi.mocked((await import("@snapback/auth")).auth.api.getSession);
		mockAuthGetSession.mockResolvedValue({
			user: { id: "test-user-id" },
		} as any);

		// Mock API key validation to return no results
		const mockDb = (await import("@snapback/platform")).db as any;
		mockDb.select.mockReturnThis();
		mockDb.from.mockReturnThis();
		mockDb.where.mockReturnThis();
		mockDb.limit.mockResolvedValue([]);

		const req = new Request("http://localhost:3000/api/v1/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": "invalid-api-key",
			},
			body: JSON.stringify({
				files: [{ path: "test.ts", content: "test content" }],
			}),
		});

		const res = await app.request(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Invalid API key" });
	});
});
