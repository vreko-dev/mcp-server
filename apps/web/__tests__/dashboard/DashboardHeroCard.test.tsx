import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardHeroCard } from "../../modules/saas/dashboard/components";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, ...props }: any) => (
			<div className={className} data-testid="motion-div" {...props}>
				{children}
			</div>
		),
	},
}));

const defaultProps = {
	threatsPreventedCount: 12,
	protectionLevelPercent: 98,
	confidenceLevel: "excellent" as const,
	period: "week" as const,
};

describe("DashboardHeroCard", () => {
	describe("Rendering", () => {
		it("should render hero card container", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const container = screen.getByTestId("motion-div");
			expect(container).toBeInTheDocument();
		});

		it("should display main headline", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const headline = screen.getByRole("heading", { level: 1 });
			expect(headline).toHaveTextContent("You're Protected");
		});

		it("should display threats prevented count", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText("12")).toBeInTheDocument();
		});

		it("should display protection level percentage", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText(/98%/)).toBeInTheDocument();
		});

		it("should display confidence level indicator", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
		});

		it("should render CTA buttons", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const viewDetailsBtn = screen.getByRole("button", {
				name: /view details/i,
			});
			const winsBtn = screen.getByRole("button", { name: /recent wins/i });
			expect(viewDetailsBtn).toBeInTheDocument();
			expect(winsBtn).toBeInTheDocument();
		});
	});

	describe("Visibility & Animation", () => {
		it("should render with visible content", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const headline = screen.getByText("You're Protected");
			expect(headline).toBeVisible();
		});

		it("should have motion div with whileInView", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const motionDivs = screen.getAllByTestId("motion-div");
			expect(motionDivs.length).toBeGreaterThan(0);
		});
	});

	describe("Micro-interactions", () => {
		it("should have buttons that are interactive", () => {
			const onViewDetails = vi.fn();
			render(
				<DashboardHeroCard {...defaultProps} onViewDetails={onViewDetails} />
			);
			const btn = screen.getByRole("button", { name: /view details/i });
			fireEvent.click(btn);
			expect(onViewDetails).toHaveBeenCalled();
		});
	});

	describe("Data Display", () => {
		it("should display different threat counts", () => {
			const { rerender } = render(
				<DashboardHeroCard {...defaultProps} threatsPreventedCount={12} />
			);
			expect(screen.getByText("12")).toBeInTheDocument();
			rerender(
				<DashboardHeroCard {...defaultProps} threatsPreventedCount={5} />
			);
			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("should display different protection levels", () => {
			render(
				<DashboardHeroCard {...defaultProps} protectionLevelPercent={98} />
			);
			expect(screen.getByText(/98%/)).toBeInTheDocument();
		});

		it("should display period label", () => {
			render(<DashboardHeroCard {...defaultProps} period="week" />);
			expect(screen.getByText(/This week/i)).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper semantic heading", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const heading = screen.getByRole("heading", { level: 1 });
			expect(heading).toBeInTheDocument();
		});

		it("should have accessible buttons", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				expect(button).not.toHaveAttribute("disabled");
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero threat count", () => {
			render(<DashboardHeroCard {...defaultProps} threatsPreventedCount={0} />);
			expect(screen.getByText("0")).toBeInTheDocument();
		});

		it("should handle 100% protection", () => {
			render(
				<DashboardHeroCard {...defaultProps} protectionLevelPercent={100} />
			);
			expect(screen.getByText(/100%/)).toBeInTheDocument();
		});

		it("should handle different confidence levels", () => {
			const { rerender } = render(
				<DashboardHeroCard {...defaultProps} confidenceLevel="excellent" />
			);
			expect(screen.getByText(/Excellent/i)).toBeInTheDocument();

			rerender(
				<DashboardHeroCard {...defaultProps} confidenceLevel="good" />
			);
			expect(screen.getByText(/Good/i)).toBeInTheDocument();

			rerender(
				<DashboardHeroCard {...defaultProps} confidenceLevel="warning" />
			);
			expect(screen.getByText(/Warning/i)).toBeInTheDocument();
		});
	});
});
