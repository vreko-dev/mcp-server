/**
 * Collapsible Metrics Component Tests
 * Phase: RED (Test-Driven Development)
 *
 * Real failing tests that drive component implementation.
 * These tests FAIL until CollapsibleMetrics is properly implemented.
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CollapsibleMetrics } from "../../modules/saas/dashboard/components/CollapsibleMetrics";

// Mock motion/react
vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, animate, initial, transition, ...props }: any) => (
			<div
				className={className}
				data-testid="motion-div"
				data-animate={JSON.stringify(animate)}
				data-initial={JSON.stringify(initial)}
				{...props}
			>
				{children}
			</div>
		),
	},
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
	ChevronDown: ({ className }: any) => (
		<svg className={className} data-testid="chevron-icon" aria-hidden="true">
			<path />
		</svg>
	),
}));

describe("CollapsibleMetrics", () => {
	const defaultProps = {
		title: "System Health",
		icon: "⚙️",
		children: <div data-testid="content">System metrics here</div>,
		defaultOpen: false,
	};

	describe("Rendering", () => {
		it("should render section with proper styling", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const section = screen.getByRole("region", { name: /System Health/ });
			expect(section).toBeInTheDocument();
			expect(section).toHaveClass(
				"border",
				"border-slate-700",
				"rounded-lg",
				"overflow-hidden",
				"bg-slate-900/20"
			);
		});

		it("should render button trigger", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const button = screen.getByRole("button", { name: /System Health/ });
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute("type", "button");
		});

		it("should display title and icon", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			expect(screen.getByText("System Health")).toBeInTheDocument();
			expect(screen.getByText("⚙️")).toBeInTheDocument();
		});

		it("should render chevron icon", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			expect(screen.getByTestId("chevron-icon")).toBeInTheDocument();
		});

		it("should render children content", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			expect(screen.getByTestId("content")).toBeInTheDocument();
		});
	});

	describe("Initial State", () => {
		it("should start collapsed (height:0, opacity:0)", () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
			expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"height":0'));
			expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"opacity":0'));
		});

		it("should start open when defaultOpen=true", () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
			expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"height":"auto"'));
			expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"opacity":1'));
		});
	});

	describe("Toggle Interaction", () => {
		it("should expand when clicked", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => {
				const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
				expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"height":"auto"'));
			});
		});

		it("should collapse when clicked while open", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => {
				const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
				expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"height":0'));
			});
		});

		it("should toggle multiple times correctly", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const button = screen.getByRole("button");

			// Open
			fireEvent.click(button);
			await waitFor(() => {
				expect(button).toHaveAttribute("aria-expanded", "true");
			});

			// Close
			fireEvent.click(button);
			await waitFor(() => {
				expect(button).toHaveAttribute("aria-expanded", "false");
			});

			// Open again
			fireEvent.click(button);
			await waitFor(() => {
				expect(button).toHaveAttribute("aria-expanded", "true");
			});
		});
	});

	describe("Chevron Animation", () => {
		it("should rotate chevron 180° on expand", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const button = screen.getByRole("button");
			const chevronMotion = button.querySelector("[data-testid='motion-div']");

			fireEvent.click(button);

			await waitFor(() => {
				expect(chevronMotion).toHaveAttribute("data-animate", expect.stringContaining('"rotate":180'));
			});
		});

		it("should rotate chevron back to 0° on collapse", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => {
				const chevronMotion = button.querySelector("[data-testid='motion-div']");
				expect(chevronMotion).toHaveAttribute("data-animate", expect.stringContaining('"rotate":0'));
			});
		});
	});

	describe("Content Animation", () => {
		it("should fade in on expand", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => {
				const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
				expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"opacity":1'));
			});
		});

		it("should fade out on collapse", async () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			const button = screen.getByRole("button");

			fireEvent.click(button);

			await waitFor(() => {
				const wrapper = screen.getByTestId("content").closest("[data-testid='motion-div']");
				expect(wrapper).toHaveAttribute("data-animate", expect.stringContaining('"opacity":0'));
			});
		});
	});

	describe("Accessibility", () => {
		it("should use semantic section element", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const section = screen.getByRole("region");
			expect(section.tagName).toBe("SECTION");
		});

		it("should have aria-label on section", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const section = screen.getByRole("region", { name: /System Health/ });
			expect(section).toHaveAttribute("aria-label", "System Health");
		});

		it("should have aria-expanded attribute", () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={false} />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-expanded", "false");

			fireEvent.click(button);
			expect(button).toHaveAttribute("aria-expanded", "true");
		});

		it("should have aria-controls link", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-controls");
		});

		it("should maintain focus after toggle", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const button = screen.getByRole("button");

			button.focus();
			fireEvent.click(button);

			expect(document.activeElement).toBe(button);
		});
	});

	describe("Content Display", () => {
		it("should render children when expanded", () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			expect(screen.getByTestId("content")).toBeInTheDocument();
		});

		it("should wrap children in padded container", () => {
			render(<CollapsibleMetrics {...defaultProps} defaultOpen={true} />);
			const container = screen.getByTestId("content").parentElement;
			expect(container).toHaveClass("px-6", "py-4", "space-y-3");
		});

		it("should support multiple child elements", () => {
			const multipleChildren = (
				<>
					<div data-testid="metric-1">Metric 1</div>
					<div data-testid="metric-2">Metric 2</div>
				</>
			);
			render(
				<CollapsibleMetrics {...defaultProps} defaultOpen={true}>
					{multipleChildren}
				</CollapsibleMetrics>
			);
			expect(screen.getByTestId("metric-1")).toBeInTheDocument();
			expect(screen.getByTestId("metric-2")).toBeInTheDocument();
		});
	});

	describe("Styling", () => {
		it("should have border and rounded styling", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const section = screen.getByRole("region");
			expect(section).toHaveClass("border", "border-slate-700", "rounded-lg");
		});

		it("should have hover effect on button", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("hover:bg-slate-800/30");
		});

		it("should have proper padding on button", () => {
			render(<CollapsibleMetrics {...defaultProps} />);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("px-6", "py-4");
		});
	});

	describe("Multiple Instances", () => {
		it("should support multiple collapsibles independently", async () => {
			render(
				<>
					<CollapsibleMetrics title="Health" defaultOpen={false}>
						<div data-testid="health">Health</div>
					</CollapsibleMetrics>
					<CollapsibleMetrics title="Storage" defaultOpen={false}>
						<div data-testid="storage">Storage</div>
					</CollapsibleMetrics>
				</>
			);

			const buttons = screen.getAllByRole("button");

			// Open first
			fireEvent.click(buttons[0]);
			await waitFor(() => {
				expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
			});

			// Second should still be closed
			expect(buttons[1]).toHaveAttribute("aria-expanded", "false");
		});
	});

	describe("Type Safety", () => {
		it("should accept string icon", () => {
			render(<CollapsibleMetrics {...defaultProps} icon="🛡️" />);
			expect(screen.getByText("🛡️")).toBeInTheDocument();
		});

		it("should accept ReactNode icon", () => {
			const icon = <span data-testid="custom-icon">✨</span>;
			render(<CollapsibleMetrics {...defaultProps} icon={icon} />);
			expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined icon gracefully", () => {
			render(<CollapsibleMetrics {...defaultProps} icon={undefined} />);
			expect(screen.getByRole("button")).toBeInTheDocument();
		});

		it("should handle long title", () => {
			const longTitle = "System Health and Performance Metrics Overview";
			render(<CollapsibleMetrics {...defaultProps} title={longTitle} />);
			expect(screen.getByText(longTitle)).toBeInTheDocument();
		});

		it("should handle special characters in title", () => {
			const specialTitle = "API Activity & Status [Live]";
			render(<CollapsibleMetrics {...defaultProps} title={specialTitle} />);
			expect(screen.getByText(specialTitle)).toBeInTheDocument();
		});
	});
});
