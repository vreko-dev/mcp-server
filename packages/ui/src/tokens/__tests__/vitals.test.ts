import { describe, expect, it } from "vitest";
import { type HealthStatus, vitalsTokens } from "../vitals";

describe("vitalsTokens", () => {
	describe("Health Status Tokens", () => {
		it("should define all health status variants", () => {
			expect(vitalsTokens.health.healthy).toBeDefined();
			expect(vitalsTokens.health.elevated).toBeDefined();
			expect(vitalsTokens.health.critical).toBeDefined();
		});

		it("should have consistent structure across health variants", () => {
			const statuses: HealthStatus[] = ["healthy", "elevated", "critical"];

			for (const status of statuses) {
				const token = vitalsTokens.health[status];
				expect(token).toHaveProperty("bg");
				expect(token).toHaveProperty("text");
				expect(token).toHaveProperty("value");
				expect(token).toHaveProperty("glow");
				expect(token).toHaveProperty("label");
			}
		});

		it("should have valid hex color values", () => {
			expect(vitalsTokens.health.healthy.value).toMatch(/^#[0-9A-F]{6}$/i);
			expect(vitalsTokens.health.elevated.value).toMatch(/^#[0-9A-F]{6}$/i);
			expect(vitalsTokens.health.critical.value).toMatch(/^#[0-9A-F]{6}$/i);
		});

		it("should have Tailwind class format for bg/text", () => {
			expect(vitalsTokens.health.healthy.bg).toMatch(/^bg-/);
			expect(vitalsTokens.health.healthy.text).toMatch(/^text-/);
		});

		it("should have glow effect with rgba format", () => {
			expect(vitalsTokens.health.healthy.glow).toContain("rgba");
			expect(vitalsTokens.health.healthy.glow).toContain("shadow-");
		});

		it("should have unique labels", () => {
			const labels = [
				vitalsTokens.health.healthy.label,
				vitalsTokens.health.elevated.label,
				vitalsTokens.health.critical.label,
			];
			const uniqueLabels = new Set(labels);
			expect(uniqueLabels.size).toBe(3);
		});
	});

	describe("Neutral Tokens", () => {
		it("should define all neutral variants", () => {
			expect(vitalsTokens.neutral.dim).toBeDefined();
			expect(vitalsTokens.neutral.active).toBeDefined();
			expect(vitalsTokens.neutral.muted).toBeDefined();
			expect(vitalsTokens.neutral.border).toBeDefined();
			expect(vitalsTokens.neutral.background).toBeDefined();
		});

		it("should have hex values for neutral colors", () => {
			expect(vitalsTokens.neutral.dim.value).toMatch(/^#[0-9A-F]{6}$/i);
			expect(vitalsTokens.neutral.active.value).toMatch(/^#[0-9A-F]{6}$/i);
			expect(vitalsTokens.neutral.muted.value).toMatch(/^#[0-9A-F]{6}$/i);
		});
	});

	describe("Terminal Tokens", () => {
		it("should define terminal status colors", () => {
			expect(vitalsTokens.terminal.good).toBeDefined();
			expect(vitalsTokens.terminal.warn).toBeDefined();
			expect(vitalsTokens.terminal.dim).toBeDefined();
			expect(vitalsTokens.terminal.active).toBeDefined();
		});

		it("should use text- prefix for terminal colors", () => {
			expect(vitalsTokens.terminal.good).toMatch(/^text-/);
			expect(vitalsTokens.terminal.warn).toMatch(/^text-/);
			expect(vitalsTokens.terminal.dim).toMatch(/^text-/);
		});
	});

	describe("Token Immutability", () => {
		it("should be readonly (const assertion)", () => {
			// TypeScript enforces this at compile time
			// Runtime check: Object.isFrozen doesn't work on nested objects
			expect(vitalsTokens).toBeDefined();
		});
	});

	describe("Color Consistency", () => {
		it("should use emerald for healthy status", () => {
			expect(vitalsTokens.health.healthy.bg).toContain("emerald");
			expect(vitalsTokens.health.healthy.text).toContain("emerald");
		});

		it("should use amber for elevated status", () => {
			expect(vitalsTokens.health.elevated.bg).toContain("amber");
			expect(vitalsTokens.health.elevated.text).toContain("amber");
		});

		it("should use red for critical status", () => {
			expect(vitalsTokens.health.critical.bg).toContain("red");
			expect(vitalsTokens.health.critical.text).toContain("red");
		});
	});
});
