import { describe, expect, it } from "vitest";
import { hoverEffects } from "../../modules/marketing/lib/hoverEffects.js";

describe("hoverEffects", () => {
	it("should return correct CSS classes", () => {
		expect(hoverEffects.lift).toBe(
			"transition-transform hover:-translate-y-1 hover:shadow-lg",
		);
		expect(hoverEffects.glow).toBe(
			"transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
		);
		expect(hoverEffects.pulse).toBe("hover:animate-pulse");
		expect(hoverEffects.scale).toBe("transition-transform hover:scale-105");
	});

	it("should create magnetic effect with correct structure", () => {
		const magneticEffect = hoverEffects.magnetic(0.5);

		// Check if the returned object has the correct structure
		expect(magneticEffect).toHaveProperty("onMouseMove");
		expect(magneticEffect).toHaveProperty("onMouseLeave");

		// Check that onMouseMove is a function
		expect(typeof magneticEffect.onMouseMove).toBe("function");
		expect(typeof magneticEffect.onMouseLeave).toBe("function");
	});

	it("should apply magnetic effect on mouse move", () => {
		const magneticEffect = hoverEffects.magnetic(0.3);

		// Create a mock element
		const mockElement = {
			getBoundingClientRect: () => ({
				left: 100,
				top: 100,
				width: 200,
				height: 100,
			}),
			style: {
				transform: "",
			},
		};

		// Create a mock event
		const mockEvent = {
			clientX: 200,
			clientY: 150,
			currentTarget: mockElement,
		};

		// Call the onMouseMove function
		magneticEffect.onMouseMove(mockEvent as any);

		// Check if transform was applied
		expect(mockElement.style.transform).toContain("translate");
	});

	it("should reset magnetic effect on mouse leave", () => {
		const magneticEffect = hoverEffects.magnetic(0.3);

		// Create a mock element with existing transform
		const mockElement = {
			style: {
				transform: "translate(10px, 20px)",
			},
		};

		// Create a mock event
		const mockEvent = {
			currentTarget: mockElement,
		};

		// Call the onMouseLeave function
		magneticEffect.onMouseLeave(mockEvent as any);

		// Check if transform was reset
		expect(mockElement.style.transform).toBe("");
	});

	it("should create magnetic effect with default strength", () => {
		const magneticEffect = hoverEffects.magnetic();

		// Check if the returned object has the correct structure
		expect(magneticEffect).toHaveProperty("onMouseMove");
		expect(magneticEffect).toHaveProperty("onMouseLeave");
	});
});
