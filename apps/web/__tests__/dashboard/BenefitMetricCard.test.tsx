import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BenefitMetricCard } from "../../modules/saas/dashboard/components";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, ...props }: any) => (
			<div className={className} data-testid="motion-div" {...props}>
				{children}
			</div>
		),
	},
}));

vi.mock("@ui/components/magic/number-ticker", () => ({
	default: ({ value }: any) => <span data-testid="number-ticker">{value}</span>,
}));

vi.mock("@marketing/components/ui/bento-grid", () => ({
	BentoGridItem: ({ icon, title, description, header, className }: any) => (
		<article className={className} data-testid="bento-grid-item">
			{header && <div data-testid="header">{header}</div>}
			{icon && <div data-testid="icon">{icon}</div>}
			{title && <div data-testid="title">{title}</div>}
			{description && <div data-testid="description">{description}</div>}
		</article>
	),
}));

const defaultProps = {
	icon: "⏱️",
	label: "Time Saved",
	value: 4.2,
	unit: "hours",
	subtext: "In debugging & recovery",
};

describe("BenefitMetricCard", () => {
	describe("Rendering", () => {
		it("should render card container", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toBeInTheDocument();
		});

		it("should display metric label", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const title = screen.getByTestId("title");
			expect(title.textContent).toContain("Time Saved");
		});

		it("should display animated number", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toHaveTextContent("4.2");
		});

		it("should display unit suffix", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const title = screen.getByTestId("title");
			expect(title.textContent).toContain("hours");
		});

		it("should display subtext description", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const description = screen.getByTestId("description");
			expect(description.textContent).toContain("debugging & recovery");
		});

		it("should display trend when provided", () => {
			const trend = { direction: "up" as const, amount: 0.8, period: "vs last week" };
			render(<BenefitMetricCard {...defaultProps} trend={trend} />);
			const description = screen.getByTestId("description");
			expect(description.textContent).toContain("0.8");
		});

		it("should not display trend when not provided", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const description = screen.getByTestId("description");
			const trendDivs = description.querySelectorAll("[data-testid='motion-div']");
			expect(trendDivs.length).toBe(0);
		});
	});

	describe("Color Variants", () => {
		it("should apply green color by default", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toHaveClass("hover:border-snapback-green/50");
		});

		it("should apply blue color variant", () => {
			render(<BenefitMetricCard {...defaultProps} color="blue" />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toHaveClass("hover:border-blue-500/50");
		});

		it("should apply amber color variant", () => {
			render(<BenefitMetricCard {...defaultProps} color="amber" />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toHaveClass("hover:border-amber-500/50");
		});

		it("should apply purple color variant", () => {
			render(<BenefitMetricCard {...defaultProps} color="purple" />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toHaveClass("hover:border-purple-500/50");
		});
	});

	describe("Micro-interactions", () => {
		it("should have icon with hover animation data", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const icon = screen.getByTestId("icon");
			const motionDiv = icon.querySelector("[data-testid='motion-div']");
			expect(motionDiv).toBeDefined();
		});

		it("should have header when provided", () => {
			const header = <div>Custom Header</div>;
			render(<BenefitMetricCard {...defaultProps} header={header} />);
			const headerDiv = screen.getByTestId("header");
			expect(headerDiv.textContent).toContain("Custom Header");
		});

		it("should not render header when not provided", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const headerDiv = screen.queryByTestId("header");
			expect(headerDiv).not.toBeInTheDocument();
		});
	});

	describe("Data Display", () => {
		it("should handle whole numbers", () => {
			render(<BenefitMetricCard {...defaultProps} value={12} />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toHaveTextContent("12");
		});

		it("should handle decimal values", () => {
			render(<BenefitMetricCard {...defaultProps} value={4.2} />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toHaveTextContent("4.2");
		});

		it("should handle percentage unit", () => {
			render(<BenefitMetricCard {...defaultProps} value={98.5} unit="%" />);
			const title = screen.getByTestId("title");
			expect(title.textContent).toContain("%");
		});

		it("should render without unit", () => {
			render(<BenefitMetricCard {...defaultProps} unit="" />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toHaveTextContent("4.2");
		});
	});

	describe("Trending Indicators", () => {
		it("should show trend for up direction", () => {
			const trend = { direction: "up" as const, amount: 0.8, period: "vs last week" };
			render(<BenefitMetricCard {...defaultProps} trend={trend} />);
			const description = screen.getByTestId("description");
			const text = description.textContent || "";
			expect(text).toContain("↑");
		});

		it("should show trend for down direction", () => {
			const trend = { direction: "down" as const, amount: 0.4, period: "vs last week" };
			render(<BenefitMetricCard {...defaultProps} trend={trend} />);
			const description = screen.getByTestId("description");
			const text = description.textContent || "";
			expect(text).toContain("↓");
		});

		it("should display trend amount", () => {
			const trend = { direction: "up" as const, amount: 0.8, period: "vs last week" };
			render(<BenefitMetricCard {...defaultProps} trend={trend} />);
			const description = screen.getByTestId("description");
			expect(description.textContent).toContain("0.8");
		});

		it("should display trend period", () => {
			const trend = { direction: "up" as const, amount: 0.8, period: "vs last week" };
			render(<BenefitMetricCard {...defaultProps} trend={trend} />);
			const description = screen.getByTestId("description");
			expect(description.textContent).toContain("vs last week");
		});
	});

	describe("Accessibility", () => {
		it("should use semantic article element", () => {
			render(<BenefitMetricCard {...defaultProps} />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card.tagName).toBe("ARTICLE");
		});

		it("should have readable label", () => {
			render(<BenefitMetricCard {...defaultProps} label="Time Saved" />);
			const title = screen.getByTestId("title");
			expect(title.textContent).toContain("Time Saved");
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero value", () => {
			render(<BenefitMetricCard {...defaultProps} value={0} />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toHaveTextContent("0");
		});

		it("should handle large numbers", () => {
			render(<BenefitMetricCard {...defaultProps} value={999999} />);
			const ticker = screen.getByTestId("number-ticker");
			expect(ticker).toBeInTheDocument();
		});

		it("should handle long labels", () => {
			const longLabel = "This is a very long metric label";
			render(<BenefitMetricCard {...defaultProps} label={longLabel} />);
			const title = screen.getByTestId("title");
			expect(title.textContent).toContain(longLabel);
		});

		it("should render without icon text", () => {
			render(<BenefitMetricCard {...defaultProps} icon="" />);
			const card = screen.getByTestId("bento-grid-item");
			expect(card).toBeInTheDocument();
		});
	});
});
