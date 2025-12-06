import { describe, expect, it } from "vitest";
import { getPlanPermissions, mapUserToPlan } from "../src/plan";

describe("Plan Mapping", () => {
	it("should return correct permissions for each plan", () => {
		const freePermissions = getPlanPermissions("free");
		expect(freePermissions.maxSnapshots).toBe(100);
		expect(freePermissions.cloudBackup).toBe(false);
		expect(freePermissions.advancedDetection).toBe(false);
		expect(freePermissions.customRules).toBe(false);
		expect(freePermissions.teamSharing).toBe(false);

		const soloPermissions = getPlanPermissions("solo");
		expect(soloPermissions.maxSnapshots).toBe(1000);
		expect(soloPermissions.cloudBackup).toBe(true);
		expect(soloPermissions.advancedDetection).toBe(true);
		expect(soloPermissions.customRules).toBe(false);
		expect(soloPermissions.teamSharing).toBe(false);

		const teamPermissions = getPlanPermissions("team");
		expect(teamPermissions.maxSnapshots).toBe(5000);
		expect(teamPermissions.cloudBackup).toBe(true);
		expect(teamPermissions.advancedDetection).toBe(true);
		expect(teamPermissions.customRules).toBe(true);
		expect(teamPermissions.teamSharing).toBe(true);

		const enterprisePermissions = getPlanPermissions("enterprise");
		expect(enterprisePermissions.maxSnapshots).toBe(999999);
		expect(enterprisePermissions.cloudBackup).toBe(true);
		expect(enterprisePermissions.advancedDetection).toBe(true);
		expect(enterprisePermissions.customRules).toBe(true);
		expect(enterprisePermissions.teamSharing).toBe(true);
	});

	it("should map user to plan preferring subscription.plan", () => {
		const user1 = {
			subscription: { plan: "team" },
			metadata: { plan: "solo" },
		};
		expect(mapUserToPlan(user1)).toBe("team");

		const user2 = {
			metadata: { plan: "solo" },
		};
		expect(mapUserToPlan(user2)).toBe("solo");

		const user3 = {};
		expect(mapUserToPlan(user3)).toBe("free");
	});

	it("should default to free plan when no plan is specified", () => {
		const user1 = {};
		expect(mapUserToPlan(user1)).toBe("free");

		const user2 = { subscription: {} };
		expect(mapUserToPlan(user2)).toBe("free");

		const user3 = { metadata: {} };
		expect(mapUserToPlan(user3)).toBe("free");
	});
});
