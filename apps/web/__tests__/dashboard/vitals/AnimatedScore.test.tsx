import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock motion/react hooks
const mockSet = vi.fn();
const mockOn = vi.fn((event: string, callback: (value: number) => void) => {
	// Simulate calling the callback with the initial value
	callback(0);
	return vi.fn(); // Return unsubscribe function
});

vi.mock("motion/react", () => ({
	useMotionValue: vi.fn(() => ({
		set: mockSet,
		get: vi.fn(() => 0),
	})),
	useSpring: vi.fn(() => ({
		on: mockOn,
		get: vi.fn(() => 0),
	})),
}));

// Import component after mocks
import { AnimatedScore } from "../../../modules/saas/dashboard/components/vitals/AnimatedScore";

describe("AnimatedScore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render a span element", () => {
			const { container } = render(<AnimatedScore value={85} />);
			const span = container.querySelector("span");
			expect(span).toBeInTheDocument();
			expect(span?.tagName).toBe("SPAN");
		});

		it("should apply custom className", () => {
			const { container } = render(<AnimatedScore value={85} className="text-emerald-400" />);
			const span = container.querySelector("span");
			expect(span).toHaveClass("text-emerald-400");
		});

		it("should render without errors", () => {
			expect(() => render(<AnimatedScore value={100} />)).not.toThrow();
		});
	});

	describe("Animation Hooks", () => {
		it("should use useMotionValue hook", async () => {
			const { useMotionValue } = await import("motion/react");
			render(<AnimatedScore value={85} />);
			expect(useMotionValue).toHaveBeenCalledWith(0);
		});

		it("should use useSpring hook", async () => {
			const { useSpring } = await import("motion/react");
			render(<AnimatedScore value={85} />);
			expect(useSpring).toHaveBeenCalled();
		});

		it("should set motion value on mount and value change", async () => {
			render(<AnimatedScore value={85} />);
			expect(mockSet).toHaveBeenCalledWith(85);
		});

		it("should subscribe to spring changes", () => {
			render(<AnimatedScore value={85} />);
			expect(mockOn).toHaveBeenCalledWith("change", expect.any(Function));
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero value", () => {
			expect(() => render(<AnimatedScore value={0} />)).not.toThrow();
		});

		it("should handle large values", () => {
			expect(() => render(<AnimatedScore value={9999} />)).not.toThrow();
		});

		it("should handle decimal values", () => {
			expect(() => render(<AnimatedScore value={85.5} />)).not.toThrow();
		});

		it("should update when value changes", () => {
			const { rerender } = render(<AnimatedScore value={50} />);
			rerender(<AnimatedScore value={100} />);
			expect(mockSet).toHaveBeenCalledWith(100);
		});
	});

	describe("Accessibility", () => {
		it("should render as semantic span element", () => {
			const { container } = render(<AnimatedScore value={85} />);
			const span = container.querySelector("span");
			expect(span).toBeInTheDocument();
			expect(span?.tagName).toBe("SPAN");
		});
	});
});
