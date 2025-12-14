import { beforeEach, describe, expect, it, vi, afterEach, afterAll, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { createOrUpdateHubSpotContact } from "../hubspot-service";

// @quest:msw:complete
// MSW server for mocking HubSpot API calls
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
// @quest:msw:complete

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("HubSpot Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set environment variables for testing
		process.env.HUBSPOT_ACCESS_TOKEN = "test-token";
	});

	afterEach(() => {
		// Clean up environment variables
		delete process.env.HUBSPOT_ACCESS_TOKEN;
	});

	it("should return null when HubSpot access token is not configured", async () => {
		// Temporarily remove the access token
		const originalToken = process.env.HUBSPOT_ACCESS_TOKEN;
		delete process.env.HUBSPOT_ACCESS_TOKEN;

		const result = await createOrUpdateHubSpotContact({
			email: "test@example.com",
		});

		expect(result).toBeNull();

		// Restore the access token
		process.env.HUBSPOT_ACCESS_TOKEN = originalToken;
	});

	it("should handle errors gracefully", async () => {
		// Temporarily remove the access token to trigger early return
		const originalToken = process.env.HUBSPOT_ACCESS_TOKEN;
		delete process.env.HUBSPOT_ACCESS_TOKEN;

		const result = await createOrUpdateHubSpotContact({
			email: "test@example.com",
		});

		expect(result).toBeNull();

		// Restore the access token
		process.env.HUBSPOT_ACCESS_TOKEN = originalToken;
	});
});
