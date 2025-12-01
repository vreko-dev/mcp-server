import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuardianService } from "../guardian";

// Mock the database operations
vi.mock("drizzle-orm/postgres-js", () => ({
	drizzle: vi.fn(),
}));

vi.mock("postgres", () => ({
	default: vi.fn(),
}));

describe("GuardianService", () => {
	let guardianService: GuardianService;

	beforeEach(() => {
		guardianService = new GuardianService();
	});

	describe("analyze", () => {
		it("should create an instance of GuardianService", () => {
			expect(guardianService).toBeInstanceOf(GuardianService);
		});
	});
});
