import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, animate, initial, transition, ...props }: any) => (
			<div className={className} data-testid="motion-div" data-animate={JSON.stringify(animate)} {...props}>
				{children}
			</div>
		),
	},
}));

import { VitalBar } from "../../../modules/saas/dashboard/components/vitals/VitalBar";

describe("VitalBar", () => {
	const defaultProps = {
		label: "OXYGEN",
		value: 75,
		subtitle: "coverage health",
	};

	describe("Rendering", () => {
		it("should render the container", () => {
			render(<VitalBar {...defaultProps} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toBeInTheDocument();
		});

		it("should display label", () => {
			render(<VitalBar {...defaultProps} />);
			expect(screen.getByText("OXYGEN")).toBeInTheDocument();
		});

		it("should display value with percentage", () => {
			render(<VitalBar {...defaultProps} />);
			expect(screen.getByText("75%")).toBeInTheDocument();
		});

		it("should display subtitle", () => {
			render(<VitalBar {...defaultProps} />);
			expect(screen.getByText("coverage health")).toBeInTheDocument();
		});
	});

	describe("Progress Bar", () => {
		it("should render progress bar track", () => {
			render(<VitalBar {...defaultProps} />);
			const track = screen.getByTestId("vital-bar-track");
			expect(track).toBeInTheDocument();
		});

		it("should render animated progress fill", () => {
			render(<VitalBar {...defaultProps} />);
			const fill = screen.getByTestId("vital-bar-fill");
			expect(fill).toBeInTheDocument();
		});

		it("should animate to correct width", () => {
			render(<VitalBar {...defaultProps} value={50} />);
			const fill = screen.getByTestId("vital-bar-fill");
			const animateData = fill.getAttribute("data-animate");
			expect(animateData).toContain("50");
		});
	});

	describe("Shimmer Effect", () => {
		it("should show shimmer when isActive is true", () => {
			render(<VitalBar {...defaultProps} isActive={true} />);
			const shimmer = screen.queryByTestId("vital-bar-shimmer");
			expect(shimmer).toBeInTheDocument();
		});

		it("should not show shimmer when isActive is false", () => {
			render(<VitalBar {...defaultProps} isActive={false} />);
			const shimmer = screen.queryByTestId("vital-bar-shimmer");
			expect(shimmer).not.toBeInTheDocument();
		});

		it("should not show shimmer when value is 0", () => {
			render(<VitalBar {...defaultProps} value={0} isActive={true} />);
			const shimmer = screen.queryByTestId("vital-bar-shimmer");
			expect(shimmer).not.toBeInTheDocument();
		});
	});

	describe("Color Variants", () => {
		it("should apply default color", () => {
			render(<VitalBar {...defaultProps} />);
			const fill = screen.getByTestId("vital-bar-fill");
			expect(fill).toHaveClass("bg-emerald-500");
		});

		it("should apply success variant", () => {
			render(<VitalBar {...defaultProps} variant="success" />);
			const fill = screen.getByTestId("vital-bar-fill");
			expect(fill).toHaveClass("bg-emerald-400");
		});

		it("should apply warning variant", () => {
			render(<VitalBar {...defaultProps} variant="warning" />);
			const fill = screen.getByTestId("vital-bar-fill");
			expect(fill).toHaveClass("bg-amber-500");
		});
	});

	describe("Value Styling", () => {
		it("should style zero value as muted", () => {
			render(<VitalBar {...defaultProps} value={0} />);
			const valueText = screen.getByText("0%");
			expect(valueText).toHaveClass("text-zinc-600");
		});

		it("should style non-zero value as highlighted", () => {
			render(<VitalBar {...defaultProps} value={75} />);
			const valueText = screen.getByText("75%");
			expect(valueText).toHaveClass("text-emerald-400");
		});
	});

	describe("Edge Cases", () => {
		it("should handle value of 0", () => {
			render(<VitalBar {...defaultProps} value={0} />);
			expect(screen.getByText("0%")).toBeInTheDocument();
		});

		it("should handle value of 100", () => {
			render(<VitalBar {...defaultProps} value={100} />);
			expect(screen.getByText("100%")).toBeInTheDocument();
		});

		it("should ensure minimum bar width for visibility", () => {
			render(<VitalBar {...defaultProps} value={0} />);
			const fill = screen.getByTestId("vital-bar-fill");
			const animateData = fill.getAttribute("data-animate");
			// Should have minimum 2% width for visibility
			expect(animateData).toContain("2");
		});
	});

	describe("Accessibility", () => {
		it("should have proper role", () => {
			render(<VitalBar {...defaultProps} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toHaveAttribute("role", "meter");
		});

		it("should have aria-valuenow", () => {
			render(<VitalBar {...defaultProps} value={75} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toHaveAttribute("aria-valuenow", "75");
		});

		it("should have aria-valuemin", () => {
			render(<VitalBar {...defaultProps} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toHaveAttribute("aria-valuemin", "0");
		});

		it("should have aria-valuemax", () => {
			render(<VitalBar {...defaultProps} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toHaveAttribute("aria-valuemax", "100");
		});

		it("should have aria-label", () => {
			render(<VitalBar {...defaultProps} />);
			const container = screen.getByTestId("vital-bar");
			expect(container).toHaveAttribute("aria-label", "OXYGEN: 75%");
		});
	});
});
