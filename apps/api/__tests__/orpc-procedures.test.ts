import { describe, expect, it } from "vitest";
import { planProtectedProcedure, stepUpProtectedProcedure, verifiedProcedure } from "../orpc/procedures";

describe("ORPC Procedures", () => {
	it("should export verifiedProcedure", () => {
		expect(verifiedProcedure).toBeDefined();
		expect(typeof verifiedProcedure).toBe("object");
	});

	it("should export stepUpProtectedProcedure", () => {
		expect(stepUpProtectedProcedure).toBeDefined();
		expect(typeof stepUpProtectedProcedure).toBe("object");
	});

	it("should export planProtectedProcedure as a function", () => {
		expect(planProtectedProcedure).toBeDefined();
		expect(typeof planProtectedProcedure).toBe("function");
	});

	it("should create planProtectedProcedure with correct configuration", () => {
		const procedure = planProtectedProcedure("team");
		expect(procedure).toBeDefined();
		expect(typeof procedure).toBe("object");
	});
});
