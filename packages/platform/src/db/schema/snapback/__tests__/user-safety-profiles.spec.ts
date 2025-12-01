import { describe, expect, it } from "vitest";
import { userSafetyProfiles } from "../user-safety-profiles.js";

describe("userSafetyProfiles schema", () => {
	it("should have the correct table structure", () => {
		expect(userSafetyProfiles).toBeDefined();
		expect(userSafetyProfiles.id).toBeDefined();
		expect(userSafetyProfiles.userId).toBeDefined();
		expect(userSafetyProfiles.totalAnalyses).toBeDefined();
		expect(userSafetyProfiles.totalViolations).toBeDefined();
		expect(userSafetyProfiles.averageRiskScore).toBeDefined();
		expect(userSafetyProfiles.createdAt).toBeDefined();
		expect(userSafetyProfiles.updatedAt).toBeDefined();
	});

	it("should have proper relationships", () => {
		// This test will be expanded once we have the relations properly set up
		expect(true).toBe(true);
	});
});
