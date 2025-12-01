import { describe, expect, it } from "vitest";
import {
	AuthError,
	getPlanPermissions,
	InsufficientRoleError,
	InsufficientScopesError,
	mapUserToPlan,
	type SnapbackAuthContext,
	snapbackAuth,
} from "../src/index";

describe("Package Exports", () => {
	it("should export snapbackAuth instance", () => {
		expect(snapbackAuth).toBeDefined();
		expect(typeof snapbackAuth.getContextFromRequest).toBe("function");
		expect(typeof snapbackAuth.requireAuth).toBe("function");
		expect(typeof snapbackAuth.getOrganizationContext).toBe("function");
	});

	it("should export types", () => {
		// We can't test types at runtime, but we can verify they're imported correctly
		const context: SnapbackAuthContext = {
			userId: "test",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "session",
			plan: "free",
		};
		expect(context.userId).toBe("test");
	});

	it("should export plan functions", () => {
		expect(typeof getPlanPermissions).toBe("function");
		expect(typeof mapUserToPlan).toBe("function");
	});

	it("should export error classes", () => {
		expect(typeof AuthError).toBe("function");
		expect(typeof InsufficientRoleError).toBe("function");
		expect(typeof InsufficientScopesError).toBe("function");
	});
});
