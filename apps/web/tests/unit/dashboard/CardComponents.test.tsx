/**
 * BenefitMetricCard, CollapsibleMetrics, DashboardHeroCard Component Tests
 * 4-path coverage: happy, edge cases
 * @see C-003, C-004 compliance
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock motion/react
vi.mock("motion/react", () => ({
	m: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
		span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
	},
}));

vi.mock("@marketing/components/ui/bento-grid", () => ({
	BentoGridItem: ({ title, description, icon, className }: any) => (
		<div className={className} data-testid="bento-grid-item">
			{icon}
			{title}
			{description}
		</div>
	),
}));

vi.mock("@ui/components/magic/number-ticker", () => ({
	default: ({ value }: { value: number }) => <span data-testid="number-ticker">{value}</span>,
}));

vi.mock("lucide-react", () => ({
	ChevronDown: () => <svg data-testid="chevron-down" />,
	Share2: () => <svg data-testid="share-icon" />,
}));

// Import after mocks
import { BenefitMetricCard } from "@/modules/saas/dashboard/components/BenefitMetricCard";
import { CollapsibleMetrics } from "@/modules/saas/dashboard/components/CollapsibleMetrics";
import { DashboardHeroCard } from "@/modules/saas/dashboard/components/DashboardHeroCard";

describe("BenefitMetricCard Component", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders label, value, and subtext", () => {
			render(
				<BenefitMetricCard
					icon={<span>🛡️</span>}
					label="Protection"
					value={100}
					subtext="Files protected"
				/>
			);
			expect(screen.getByText("Protection")).toBeInTheDocument();
			expect(screen.getByText("Files protected")).toBeInTheDocument();
		});

		it("displays unit when provided", () => {
			render(
				<BenefitMetricCard
					icon={<span>⏱️</span>}
					label="Time Saved"
					value={42}
					unit="hrs"
					subtext="This month"
				/>
			);
			expect(screen.getByText("hrs")).toBeInTheDocument();
		});

		it("shows trend indicator when provided", () => {
			render(
				<BenefitMetricCard
					icon={<span>📈</span>}
					label="Growth"
					value={50}
					subtext="Weekly"
					trend={{ direction: "up", amount: 12, period: "this week" }}
				/>
			);
			expect(screen.getByText(/↑/)).toBeInTheDocument();
			expect(screen.getByText(/12/)).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles zero value", () => {
			render(
				<BenefitMetricCard icon={<span>📊</span>} label="Metrics" value={0} subtext="No data" />
			);
			expect(screen.getByText("0")).toBeInTheDocument();
		});

		it("handles large values", () => {
			render(
				<BenefitMetricCard icon={<span>📊</span>} label="Big" value={1000000} subtext="Large" />
			);
			expect(screen.getByText("1000000")).toBeInTheDocument();
		});

		it("applies correct color class", () => {
			const { container } = render(
				<BenefitMetricCard icon={<span>🔵</span>} label="Blue" value={10} subtext="Test" color="blue" />
			);
			expect(container.innerHTML).toContain("sky");
		});

		it("handles down trend", () => {
			render(
				<BenefitMetricCard
					icon={<span>📉</span>}
					label="Down"
					value={5}
					subtext="Declining"
					trend={{ direction: "down", amount: 8, period: "today" }}
				/>
			);
			expect(screen.getByText(/↓/)).toBeInTheDocument();
		});
	});
});

describe("CollapsibleMetrics Component", () => {
	describe("Happy Path", () => {
		it("renders title and content", () => {
			render(
				<CollapsibleMetrics title="System Health">
					<div>Content here</div>
				</CollapsibleMetrics>
			);
			expect(screen.getByText("System Health")).toBeInTheDocument();
		});

		it("toggles content visibility on click", () => {
			render(
				<CollapsibleMetrics title="Toggle Test" defaultOpen={false}>
					<div>Hidden content</div>
				</CollapsibleMetrics>
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-expanded", "false");
			fireEvent.click(button);
			expect(button).toHaveAttribute("aria-expanded", "true");
		});

		it("starts open when defaultOpen is true", () => {
			render(
				<CollapsibleMetrics title="Open Test" defaultOpen={true}>
					<div>Visible content</div>
				</CollapsibleMetrics>
			);
			expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
		});

		it("renders icon when provided", () => {
			render(
				<CollapsibleMetrics title="With Icon" icon="⚙️">
					<div>Content</div>
				</CollapsibleMetrics>
			);
			expect(screen.getByText("⚙️")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has aria-controls linking to content", () => {
			render(
				<CollapsibleMetrics title="A11y Test">
					<div>Content</div>
				</CollapsibleMetrics>
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-controls", "collapsible-content-A11y Test");
		});

		it("section has aria-label", () => {
			render(
				<CollapsibleMetrics title="Section Test">
					<div>Content</div>
				</CollapsibleMetrics>
			);
			expect(screen.getByRole("region", { name: "Section Test" })).toBeInTheDocument();
		});
	});
});

describe("DashboardHeroCard Component", () => {
	const defaultProps = {
		threatsPreventedCount: 42,
		protectionLevelPercent: 95,
		confidenceLevel: "excellent" as const,
		period: "week" as const,
	};

	describe("Happy Path", () => {
		it("renders protection status and count", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText("You're Protected")).toBeInTheDocument();
			expect(screen.getByText("42")).toBeInTheDocument();
		});

		it("displays protection level percentage", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText("95%")).toBeInTheDocument();
		});

		it("shows confidence level with emoji", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText(/Excellent/)).toBeInTheDocument();
			expect(screen.getByText("✨")).toBeInTheDocument();
		});

		it("displays period correctly", () => {
			render(<DashboardHeroCard {...defaultProps} />);
			expect(screen.getByText(/This week/)).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles zero threats", () => {
			render(<DashboardHeroCard {...defaultProps} threatsPreventedCount={0} />);
			expect(screen.getByText("0")).toBeInTheDocument();
		});

		it("handles warning confidence level", () => {
			render(<DashboardHeroCard {...defaultProps} confidenceLevel="warning" />);
			expect(screen.getByText(/Warning/)).toBeInTheDocument();
			expect(screen.getByText("⚠️")).toBeInTheDocument();
		});

		it("handles good confidence level", () => {
			render(<DashboardHeroCard {...defaultProps} confidenceLevel="good" />);
			expect(screen.getByText(/Good/)).toBeInTheDocument();
			expect(screen.getByText("⭐")).toBeInTheDocument();
		});

		it("handles month period", () => {
			render(<DashboardHeroCard {...defaultProps} period="month" />);
			expect(screen.getByText(/This month/)).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("calls onViewDetails when button clicked", () => {
			const onViewDetails = vi.fn();
			render(<DashboardHeroCard {...defaultProps} onViewDetails={onViewDetails} />);
			fireEvent.click(screen.getByText("View Details"));
			expect(onViewDetails).toHaveBeenCalled();
		});
	});
});
