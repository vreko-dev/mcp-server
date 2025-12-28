import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("motion/react", () => ({
	m: {
		span: ({ children, className, ...props }: any) => (
			<span className={className} data-testid="motion-span" {...props}>
				{children}
			</span>
		),
	},
	useSpring: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
	useTransform: vi.fn(() => ({ get: vi.fn(() => 0) })),
}));

vi.mock(
	"../../../modules/saas/dashboard/components/vitals/AnimatedScore",
	() => ({
		AnimatedScore: ({ value, className }: any) => (
			<span data-testid="animated-score" className={className}>
				{value}
			</span>
		),
	}),
);

import { HealthBadge } from "../../../modules/saas/dashboard/components/vitals/HealthBadge";

describe("HealthBadge", () => {
	describe("Rendering", () => {
		it("should render badge container", () => {
			render(<HealthBadge score={85} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toBeInTheDocument();
		});

		it("should display the score", () => {
			render(<HealthBadge score={85} />);
			const score = screen.getByTestId("animated-score");
			expect(score).toHaveTextContent("85");
		});

		it("should display status label", () => {
			render(<HealthBadge score={85} status="healthy" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge.textContent).toContain("stable");
		});
	});

	describe("Status Variants", () => {
		it("should apply healthy styles by default", () => {
			render(<HealthBadge score={100} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveClass("bg-emerald-500/10");
		});

		it("should apply healthy glow effect", () => {
			render(<HealthBadge score={100} status="healthy" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge.className).toContain("shadow-");
		});

		it("should apply elevated styles", () => {
			render(<HealthBadge score={75} status="elevated" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveClass("bg-amber-500/10");
		});

		it("should display elevated label", () => {
			render(<HealthBadge score={75} status="elevated" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge.textContent).toContain("elevated");
		});

		it("should apply critical styles", () => {
			render(<HealthBadge score={50} status="critical" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveClass("bg-red-500/10");
		});

		it("should display critical label", () => {
			render(<HealthBadge score={50} status="critical" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge.textContent).toContain("critical");
		});
	});

	describe("Score Display", () => {
		it("should use AnimatedScore component", () => {
			render(<HealthBadge score={85} />);
			const animatedScore = screen.getByTestId("animated-score");
			expect(animatedScore).toBeInTheDocument();
		});

		it("should pass score to AnimatedScore", () => {
			render(<HealthBadge score={42} />);
			const animatedScore = screen.getByTestId("animated-score");
			expect(animatedScore).toHaveTextContent("42");
		});
	});

	describe("Edge Cases", () => {
		it("should handle score of 0", () => {
			render(<HealthBadge score={0} status="critical" />);
			const score = screen.getByTestId("animated-score");
			expect(score).toHaveTextContent("0");
		});

		it("should handle score of 100", () => {
			render(<HealthBadge score={100} status="healthy" />);
			const score = screen.getByTestId("animated-score");
			expect(score).toHaveTextContent("100");
		});
	});

	describe("Accessibility", () => {
		it("should have accessible role", () => {
			render(<HealthBadge score={85} />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("role", "status");
		});

		it("should have aria-label", () => {
			render(<HealthBadge score={85} status="healthy" />);
			const badge = screen.getByTestId("health-badge");
			expect(badge).toHaveAttribute("aria-label");
		});
	});
});
