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
	},
}));

import { TerminalVitals } from "../../../modules/saas/dashboard/components/vitals/TerminalVitals";

const defaultVitals = {
	pulse: 0,
	temperature: 0,
	pressure: 0,
	oxygen: 100,
	score: 100,
};

describe("TerminalVitals", () => {
	describe("Rendering", () => {
		it("should render terminal container", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const container = screen.getByTestId("terminal-vitals");
			expect(container).toBeInTheDocument();
		});

		it("should display command prompt", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText("$")).toBeInTheDocument();
			expect(screen.getByText("snapback status")).toBeInTheDocument();
		});

		it("should display score badge", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const scoreBadge = screen.getByTestId("terminal-score");
			expect(scoreBadge).toHaveTextContent("100");
		});
	});

	describe("Vital Lines", () => {
		it("should display pulse line", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText("pulse:")).toBeInTheDocument();
		});

		it("should display temperature line", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText("temp:")).toBeInTheDocument();
		});

		it("should display pressure line", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText("pressure:")).toBeInTheDocument();
		});

		it("should display oxygen line", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText("oxygen:")).toBeInTheDocument();
		});
	});

	describe("Resting State Values", () => {
		it("should show 'resting' for zero pulse", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, pulse: 0 }} />);
			expect(screen.getByText("resting")).toBeInTheDocument();
		});

		it("should show 'cold' for zero temperature", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, temperature: 0 }} />);
			expect(screen.getByText("cold")).toBeInTheDocument();
		});

		it("should show 'nominal' for zero pressure", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, pressure: 0 }} />);
			expect(screen.getByText(/nominal/)).toBeInTheDocument();
		});
	});

	describe("Active State Values", () => {
		it("should show pulse rate when active", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, pulse: 5 }} />);
			expect(screen.getByText("5/min")).toBeInTheDocument();
		});

		it("should show AI percentage when temperature is active", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, temperature: 30 }} />);
			expect(screen.getByText("30% AI")).toBeInTheDocument();
		});

		it("should show pressure percentage when active", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, pressure: 60 }} />);
			expect(screen.getByText("60%")).toBeInTheDocument();
		});

		it("should show oxygen coverage percentage", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, oxygen: 85 }} />);
			expect(screen.getByText("85% coverage")).toBeInTheDocument();
		});
	});

	describe("Status Summary", () => {
		it("should show healthy message when score is 100", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			expect(screen.getByText(/workspace healthy/i)).toBeInTheDocument();
		});

		it("should show elevated message when score is not 100", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, score: 75 }} />);
			expect(screen.getByText(/elevated activity/i)).toBeInTheDocument();
		});
	});

	describe("Visual Indicators", () => {
		it("should show checkmark for healthy pressure", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, pressure: 0 }} />);
			const pressureLine = screen.getByText(/nominal/).parentElement;
			expect(pressureLine?.textContent).toContain("✓");
		});

		it("should show checkmark for full oxygen", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, oxygen: 100 }} />);
			const oxygenLine = screen.getByText(/100% coverage/).parentElement;
			expect(oxygenLine?.textContent).toContain("✓");
		});
	});

	describe("Styling", () => {
		it("should use monospace font", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const container = screen.getByTestId("terminal-vitals");
			expect(container).toHaveClass("font-mono");
		});

		it("should apply healthy score badge styling", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const scoreBadge = screen.getByTestId("terminal-score");
			expect(scoreBadge).toHaveClass("bg-emerald-500/20");
		});

		it("should apply elevated score badge styling", () => {
			render(<TerminalVitals vitals={{ ...defaultVitals, score: 75 }} />);
			const scoreBadge = screen.getByTestId("terminal-score");
			expect(scoreBadge).toHaveClass("bg-amber-500/20");
		});
	});

	describe("Accessibility", () => {
		it("should have semantic structure", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const container = screen.getByTestId("terminal-vitals");
			expect(container).toHaveAttribute("role", "region");
		});

		it("should have aria-label", () => {
			render(<TerminalVitals vitals={defaultVitals} />);
			const container = screen.getByTestId("terminal-vitals");
			expect(container).toHaveAttribute("aria-label", "Workspace vitals status");
		});
	});
});
