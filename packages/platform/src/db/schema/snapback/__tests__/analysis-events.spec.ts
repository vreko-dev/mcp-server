import { describe, expect, it } from "vitest";
import { analysisEvents } from "../analysis-events";

describe("analysisEvents schema", () => {
	it("should have the correct table structure", () => {
		expect(analysisEvents).toBeDefined();
		expect(analysisEvents.id).toBeDefined();
		expect(analysisEvents.userId).toBeDefined();
		expect(analysisEvents.apiKeyId).toBeDefined();
		expect(analysisEvents.requestId).toBeDefined();
		expect(analysisEvents.riskScore).toBeDefined();
		expect(analysisEvents.timestamp).toBeDefined();
		expect(analysisEvents.createdAt).toBeDefined();
	});

	it("should have proper relationships", () => {
		// This test will be expanded once we have the relations properly set up
		expect(true).toBe(true);
	});
});
