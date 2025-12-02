import { describe, expect, it } from "vitest";
import { DURATION, EASING, fadeInUp, scaleIn, slideInLeft, slideInRight } from "../index";

describe("Motion Package", () => {
	describe("Constants", () => {
		it("should export DURATION constants", () => {
			expect(DURATION.instant).toBe(0);
			expect(DURATION.fast).toBe(150);
			expect(DURATION.normal).toBe(300);
			expect(DURATION.moderate).toBe(500);
			expect(DURATION.slow).toBe(800);
		});

		it("should export EASING constants", () => {
			expect(EASING.apple).toEqual([0.16, 1, 0.3, 1]);
			expect(EASING.standard).toEqual([0.4, 0.0, 0.2, 1]);
			expect(EASING.snapback).toEqual([0.34, 1.56, 0.64, 1]);
		});
	});

	describe("Animation Presets", () => {
		it("should export fadeInUp preset", () => {
			expect(fadeInUp.initial).toEqual({ opacity: 0, y: 20 });
			expect(fadeInUp.animate).toEqual({ opacity: 1, y: 0 });
			expect(fadeInUp.exit).toEqual({ opacity: 0, y: -20 });
		});

		it("should export scaleIn preset", () => {
			expect(scaleIn.initial).toEqual({ scale: 0.95, opacity: 0 });
			expect(scaleIn.animate).toEqual({ scale: 1, opacity: 1 });
			expect(scaleIn.exit).toEqual({ scale: 0.95, opacity: 0 });
		});

		it("should export slideInLeft preset", () => {
			expect(slideInLeft.initial).toEqual({ x: -20, opacity: 0 });
			expect(slideInLeft.animate).toEqual({ x: 0, opacity: 1 });
			expect(slideInLeft.exit).toEqual({ x: -20, opacity: 0 });
		});

		it("should export slideInRight preset", () => {
			expect(slideInRight.initial).toEqual({ x: 20, opacity: 0 });
			expect(slideInRight.animate).toEqual({ x: 0, opacity: 1 });
			expect(slideInRight.exit).toEqual({ x: 20, opacity: 0 });
		});
	});
});
