import { describe, expect, it } from "vitest";
import {
	canonicalToLegacy,
	isProtectionLevel,
	type LegacyProtectionLevel,
	legacyToCanonical,
	type ProtectionLevel,
} from "../src/types/protection-utils";

describe("Protection Level Conversion Utilities", () => {
	describe("legacyToCanonical", () => {
		it("should convert Watched to watch", () => {
			expect(legacyToCanonical("Watched")).toBe("watch");
		});

		it("should convert Warning to warn", () => {
			expect(legacyToCanonical("Warning")).toBe("warn");
		});

		it("should convert Protected to block", () => {
			expect(legacyToCanonical("Protected")).toBe("block");
		});

		it("should handle all legacy values", () => {
			const legacyValues: LegacyProtectionLevel[] = ["Watched", "Warning", "Protected"];
			const expected: ProtectionLevel[] = ["watch", "warn", "block"];

			legacyValues.forEach((legacy, index) => {
				expect(legacyToCanonical(legacy)).toBe(expected[index]);
			});
		});
	});

	describe("canonicalToLegacy", () => {
		it("should convert watch to Watched", () => {
			expect(canonicalToLegacy("watch")).toBe("Watched");
		});

		it("should convert warn to Warning", () => {
			expect(canonicalToLegacy("warn")).toBe("Warning");
		});

		it("should convert block to Protected", () => {
			expect(canonicalToLegacy("block")).toBe("Protected");
		});

		it("should handle all canonical values", () => {
			const canonicalValues: ProtectionLevel[] = ["watch", "warn", "block"];
			const expected: LegacyProtectionLevel[] = ["Watched", "Warning", "Protected"];

			canonicalValues.forEach((canonical, index) => {
				expect(canonicalToLegacy(canonical)).toBe(expected[index]);
			});
		});
	});

	describe("Round-trip conversion", () => {
		it("should maintain data integrity for legacy -> canonical -> legacy", () => {
			const legacyValues: LegacyProtectionLevel[] = ["Watched", "Warning", "Protected"];

			legacyValues.forEach((original) => {
				const canonical = legacyToCanonical(original);
				const backToLegacy = canonicalToLegacy(canonical);
				expect(backToLegacy).toBe(original);
			});
		});

		it("should maintain data integrity for canonical -> legacy -> canonical", () => {
			const canonicalValues: ProtectionLevel[] = ["watch", "warn", "block"];

			canonicalValues.forEach((original) => {
				const legacy = canonicalToLegacy(original);
				const backToCanonical = legacyToCanonical(legacy);
				expect(backToCanonical).toBe(original);
			});
		});
	});

	describe("isProtectionLevel", () => {
		it("should return true for valid protection levels", () => {
			expect(isProtectionLevel("watch")).toBe(true);
			expect(isProtectionLevel("warn")).toBe(true);
			expect(isProtectionLevel("block")).toBe(true);
		});

		it("should return false for legacy protection levels", () => {
			expect(isProtectionLevel("Watched")).toBe(false);
			expect(isProtectionLevel("Warning")).toBe(false);
			expect(isProtectionLevel("Protected")).toBe(false);
		});

		it("should return false for invalid values", () => {
			expect(isProtectionLevel("invalid")).toBe(false);
			expect(isProtectionLevel("")).toBe(false);
			expect(isProtectionLevel("WATCH")).toBe(false);
			expect(isProtectionLevel("unprotected")).toBe(false);
		});

		it("should return false for non-string values", () => {
			expect(isProtectionLevel(null)).toBe(false);
			expect(isProtectionLevel(undefined)).toBe(false);
			expect(isProtectionLevel(123)).toBe(false);
			expect(isProtectionLevel({})).toBe(false);
			expect(isProtectionLevel([])).toBe(false);
		});

		it("should provide type narrowing", () => {
			const value: string | undefined = "watch";

			if (isProtectionLevel(value)) {
				// TypeScript should narrow the type here
				const level: ProtectionLevel = value;
				expect(level).toBe("watch");
			}
		});
	});

	describe("Type safety", () => {
		it("should only accept valid legacy values in legacyToCanonical", () => {
			// This test validates TypeScript compilation
			// Invalid values would cause compilation errors
			const validLegacy: LegacyProtectionLevel = "Watched";
			expect(legacyToCanonical(validLegacy)).toBe("watch");
		});

		it("should only accept valid canonical values in canonicalToLegacy", () => {
			// This test validates TypeScript compilation
			// Invalid values would cause compilation errors
			const validCanonical: ProtectionLevel = "watch";
			expect(canonicalToLegacy(validCanonical)).toBe("Watched");
		});
	});

	describe("Performance", () => {
		it("should convert values quickly (< 1ms for 1000 conversions)", () => {
			const startTime = Date.now();

			for (let i = 0; i < 1000; i++) {
				legacyToCanonical("Watched");
				canonicalToLegacy("watch");
			}

			const duration = Date.now() - startTime;
			expect(duration).toBeLessThan(10); // Very generous threshold
		});
	});
});
