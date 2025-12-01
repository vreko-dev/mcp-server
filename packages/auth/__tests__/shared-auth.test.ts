import { describe, expect, it } from "vitest";
import type { PlanId, SnapbackAuthContext, UserRole } from "../src/shared-auth";

describe("Shared Auth Types", () => {
	it("should compile SnapbackAuthContext with minimum required fields", () => {
		const context: SnapbackAuthContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "session",
			plan: "free",
		};

		expect(context.userId).toBe("user-123");
		expect(context.email).toBe("test@example.com");
		expect(context.role).toBe("user");
		expect(context.authenticatedVia).toBe("session");
		expect(context.plan).toBe("free");
	});

	it("should compile with optional orgId and orgRole", () => {
		const context: SnapbackAuthContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "admin",
			orgId: "org-456",
			orgRole: "owner",
			authenticatedVia: "apiKey",
			apiKeyId: "key-789",
			apiKeyScopes: ["read", "write"],
			plan: "team",
		};

		expect(context.orgId).toBe("org-456");
		expect(context.orgRole).toBe("owner");
	});

	it("should handle different user roles", () => {
		const roles: UserRole[] = ["user", "admin"];
		expect(roles).toContain("user");
		expect(roles).toContain("admin");
	});

	it("should handle different plan IDs", () => {
		const plans: PlanId[] = ["free", "solo", "team", "enterprise"];
		expect(plans).toContain("free");
		expect(plans).toContain("solo");
		expect(plans).toContain("team");
		expect(plans).toContain("enterprise");
	});
});
