import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, ...props }: any) => (
			<div className={className} data-testid="motion-div" {...props}>
				{children}
			</div>
		),
		span: ({ children, className, ...props }: any) => (
			<span className={className} data-testid="motion-span" {...props}>
				{children}
			</span>
		),
	},
	useSpring: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
	useTransform: vi.fn(() => ({ get: vi.fn(() => 0) })),
}));

vi.mock("../../../modules/saas/dashboard/components/vitals/HealthBadge", () => ({
	HealthBadge: ({ score, status }: any) => (
		<div data-testid="health-badge" data-score={score} data-status={status}>
			Health: {score} ({status})
		</div>
	),
}));

vi.mock("../../../modules/saas/dashboard/components/vitals/TerminalVitals", () => ({
	TerminalVitals: ({ vitals }: any) => (
		<div data-testid="terminal-vitals" data-score={vitals.score}>
			Terminal Vitals
		</div>
	),
}));

import { WorkspaceVitals, type WorkspaceVitalsProps, getVitalsStatus } from "../../../modules/saas/dashboard/components/vitals/WorkspaceVitals";

const healthyVitals = {
	pulse: 0,
	temperature: 0,
	pressure: 0,
	oxygen: 100,
	score: 100,
};

const elevatedVitals = {
	pulse: 5,
	temperature: 30,
	pressure: 40,
	oxygen: 85,
	score: 75,
};

const criticalVitals = {
	pulse: 20,
	temperature: 60,
	pressure: 80,
	oxygen: 50,
	score: 40,
};

describe("WorkspaceVitals", () => {
	describe("Rendering", () => {
		it("should render main container", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const container = screen.getByTestId("workspace-vitals");
			expect(container).toBeInTheDocument();
		});

		it("should render header with title", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			expect(screen.getByText("Workspace Vitals")).toBeInTheDocument();
		});

		it("should render health badge", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toBeInTheDocument();
		});

		it("should render terminal vitals", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const terminal = screen.getByTestId("terminal-vitals");
			expect(terminal).toBeInTheDocument();
		});
	});

	describe("Health Badge Integration", () => {
		it("should pass score to health badge", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("data-score", "100");
		});

		it("should pass healthy status to badge", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("data-status", "healthy");
		});

		it("should pass elevated status to badge", () => {
			render(<WorkspaceVitals vitals={elevatedVitals} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("data-status", "elevated");
		});

		it("should pass critical status to badge", () => {
			render(<WorkspaceVitals vitals={criticalVitals} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("data-status", "critical");
		});
	});

	describe("Terminal Vitals Integration", () => {
		it("should pass vitals to terminal", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const terminal = screen.getByTestId("terminal-vitals");
			expect(terminal).toHaveAttribute("data-score", "100");
		});
	});

	describe("Optional Guidance", () => {
		it("should render guidance when provided", () => {
			const guidance = { message: "Consider creating a snapshot" };
			render(<WorkspaceVitals vitals={elevatedVitals} guidance={guidance} />);
			expect(screen.getByText("Consider creating a snapshot")).toBeInTheDocument();
		});

		it("should not render guidance section when not provided", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			expect(screen.queryByTestId("agent-guidance")).not.toBeInTheDocument();
		});
	});

	describe("Init Prompt", () => {
		it("should show init prompt when not initialized", () => {
			render(<WorkspaceVitals vitals={{ ...healthyVitals }} showInitPrompt={true} />);
			const initPrompt = screen.getByTestId("init-prompt");
			expect(initPrompt).toBeInTheDocument();
		});

		it("should not show init prompt when initialized", () => {
			render(<WorkspaceVitals vitals={healthyVitals} showInitPrompt={false} />);
			expect(screen.queryByTestId("init-prompt")).not.toBeInTheDocument();
		});
	});

	describe("Layout", () => {
		it("should have proper spacing", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const container = screen.getByTestId("workspace-vitals");
			expect(container).toHaveClass("space-y-4");
		});

		it("should have header with flex layout", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const header = screen.getByTestId("workspace-vitals-header");
			expect(header).toHaveClass("flex");
			expect(header).toHaveClass("items-center");
			expect(header).toHaveClass("justify-between");
		});
	});

	describe("Accessibility", () => {
		it("should have section role", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const container = screen.getByTestId("workspace-vitals");
			expect(container).toHaveAttribute("role", "region");
		});

		it("should have aria-labelledby", () => {
			render(<WorkspaceVitals vitals={healthyVitals} />);
			const container = screen.getByTestId("workspace-vitals");
			expect(container).toHaveAttribute("aria-labelledby", "workspace-vitals-heading");
		});
	});
});

describe("getVitalsStatus helper", () => {
	it("should return healthy for score >= 90", () => {
		expect(getVitalsStatus(healthyVitals)).toBe("healthy");
		expect(getVitalsStatus({ ...healthyVitals, score: 90 })).toBe("healthy");
	});

	it("should return elevated for score >= 60 and < 90", () => {
		expect(getVitalsStatus(elevatedVitals)).toBe("elevated");
		expect(getVitalsStatus({ ...healthyVitals, score: 60 })).toBe("elevated");
		expect(getVitalsStatus({ ...healthyVitals, score: 89 })).toBe("elevated");
	});

	it("should return critical for score < 60", () => {
		expect(getVitalsStatus(criticalVitals)).toBe("critical");
		expect(getVitalsStatus({ ...healthyVitals, score: 59 })).toBe("critical");
	});
});
