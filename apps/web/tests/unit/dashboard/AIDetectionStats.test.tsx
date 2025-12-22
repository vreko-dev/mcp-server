/**
 * AIDetectionStats Component Tests
 *
 * Test Coverage:
 * - Happy Path: Stats display with data
 * - Empty State: No detections yet
 * - Edge Cases: Single stat, many stats, confidence edge values
 * - Error State: Error display and retry functionality
 * - Sub-Components: Skeleton, Empty, Error states
 * - Accessibility: ARIA attributes, focus management
 *
 * @see packages/contracts/src/testing/README.md - C-003, C-004, C-004a compliance
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { AIDetectionStats } from "@/modules/saas/dashboard/components/AIDetectionStats";
import type { AppError } from "@/lib/error-handler";

// Mock dependencies
vi.mock("posthog-js", () => ({
	default: {
		__loaded: true,
		capture: vi.fn(),
	},
}));

vi.mock("@analytics", () => ({
	AnalyticsEvents: {
		DASHBOARD_VIEWED: "dashboard_viewed",
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	Bot: ({ className }: { className?: string }) => (
		<svg data-testid="bot-icon" className={className} />
	),
	HelpCircle: ({ className }: { className?: string }) => (
		<svg data-testid="help-icon" className={className} />
	),
	TrendingUp: ({ className }: { className?: string }) => (
		<svg data-testid="trending-icon" className={className} />
	),
}));

interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

// Test fixtures
const defaultStats: AIDetectionStat[] = [
	{ tool: "ChatGPT", count: 150, avgConfidence: 0.92 },
	{ tool: "GitHub Copilot", count: 85, avgConfidence: 0.88 },
	{ tool: "Claude", count: 45, avgConfidence: 0.95 },
];

const singleStat: AIDetectionStat[] = [{ tool: "ChatGPT", count: 1, avgConfidence: 0.5 }];

const manyStats: AIDetectionStat[] = Array.from({ length: 10 }, (_, i) => ({
	tool: `AI Tool ${i + 1}`,
	count: (i + 1) * 10,
	avgConfidence: 0.7 + i * 0.02,
}));

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("AIDetectionStats Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Happy Path - Stats Display", () => {
		it("renders all AI detection stats correctly", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			// Verify card header
			expect(screen.getByText("AI Tools Detected")).toBeInTheDocument();
			expect(screen.getByTestId("bot-icon")).toBeInTheDocument();

			// Verify each stat is rendered
			expect(screen.getByText("ChatGPT")).toBeInTheDocument();
			expect(screen.getByText("GitHub Copilot")).toBeInTheDocument();
			expect(screen.getByText("Claude")).toBeInTheDocument();
		});

		it("displays correct detection counts for each tool", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			expect(screen.getByText("150 detections")).toBeInTheDocument();
			expect(screen.getByText("85 detections")).toBeInTheDocument();
			expect(screen.getByText("45 detections")).toBeInTheDocument();
		});

		it("displays confidence percentages correctly rounded", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			expect(screen.getByText("92% confidence")).toBeInTheDocument();
			expect(screen.getByText("88% confidence")).toBeInTheDocument();
			expect(screen.getByText("95% confidence")).toBeInTheDocument();
		});

		it("renders help link with correct href and aria-label", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			const helpLink = screen.getByRole("link", { name: "Learn about AI detection analytics" });
			expect(helpLink).toHaveAttribute("href", "/docs/analytics");
		});

		it("renders trending up indicators for each stat", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			const trendingIcons = screen.getAllByTestId("trending-icon");
			expect(trendingIcons).toHaveLength(3);

			const accuracyLabels = screen.getAllByText("High accuracy");
			expect(accuracyLabels).toHaveLength(3);
		});
	});

	describe("Empty State - No Detections", () => {
		it("renders empty state when no stats provided to main component", () => {
			render(<AIDetectionStats stats={[]} />, { wrapper: createWrapper() });

			// Main component with empty array still renders the grid, but no items
			expect(screen.getByText("AI Tools Detected")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles single stat correctly", () => {
			render(<AIDetectionStats stats={singleStat} />, { wrapper: createWrapper() });

			expect(screen.getByText("ChatGPT")).toBeInTheDocument();
			expect(screen.getByText("1 detections")).toBeInTheDocument();
			expect(screen.getByText("50% confidence")).toBeInTheDocument();
		});

		it("handles many stats (10+) without performance issues", () => {
			render(<AIDetectionStats stats={manyStats} />, { wrapper: createWrapper() });

			expect(screen.getByText("AI Tool 1")).toBeInTheDocument();
			expect(screen.getByText("AI Tool 10")).toBeInTheDocument();

			// Verify all 10 are rendered
			const trendingIcons = screen.getAllByTestId("trending-icon");
			expect(trendingIcons).toHaveLength(10);
		});

		it("handles 0% confidence correctly", () => {
			const zeroConfidence: AIDetectionStat[] = [{ tool: "TestTool", count: 10, avgConfidence: 0 }];
			render(<AIDetectionStats stats={zeroConfidence} />, { wrapper: createWrapper() });

			expect(screen.getByText("0% confidence")).toBeInTheDocument();
		});

		it("handles 100% confidence correctly", () => {
			const fullConfidence: AIDetectionStat[] = [{ tool: "TestTool", count: 10, avgConfidence: 1 }];
			render(<AIDetectionStats stats={fullConfidence} />, { wrapper: createWrapper() });

			expect(screen.getByText("100% confidence")).toBeInTheDocument();
		});

		it("rounds confidence values correctly (0.876 -> 88%)", () => {
			const preciseConfidence: AIDetectionStat[] = [
				{ tool: "TestTool", count: 10, avgConfidence: 0.876 },
			];
			render(<AIDetectionStats stats={preciseConfidence} />, { wrapper: createWrapper() });

			expect(screen.getByText("88% confidence")).toBeInTheDocument();
		});

		it("handles tool names with special characters", () => {
			const specialChars: AIDetectionStat[] = [
				{ tool: "AI Tool (v2.0) - Beta", count: 5, avgConfidence: 0.9 },
			];
			render(<AIDetectionStats stats={specialChars} />, { wrapper: createWrapper() });

			expect(screen.getByText("AI Tool (v2.0) - Beta")).toBeInTheDocument();
		});

		it("handles very large detection counts", () => {
			const largeCount: AIDetectionStat[] = [
				{ tool: "HighVolume", count: 1000000, avgConfidence: 0.99 },
			];
			render(<AIDetectionStats stats={largeCount} />, { wrapper: createWrapper() });

			expect(screen.getByText("1000000 detections")).toBeInTheDocument();
		});
	});

	describe("Sub-Components", () => {
		describe("AIDetectionStats.Skeleton", () => {
			it("renders skeleton loading state with correct structure", () => {
				render(<AIDetectionStats.Skeleton />, { wrapper: createWrapper() });

				expect(screen.getByText("AI Tools Detected")).not.toBeInTheDocument;
				// Skeleton should have pulse animations
				const container = document.querySelector(".animate-pulse");
				expect(container).toBeInTheDocument();
			});

			it("renders 3 skeleton items", () => {
				const { container } = render(<AIDetectionStats.Skeleton />, { wrapper: createWrapper() });

				// Find skeleton rows (opacity-50 class indicates skeleton items)
				const skeletonItems = container.querySelectorAll(".opacity-50");
				expect(skeletonItems).toHaveLength(3);
			});
		});

		describe("AIDetectionStats.Empty", () => {
			it("renders empty state message", () => {
				render(<AIDetectionStats.Empty />, { wrapper: createWrapper() });

				expect(screen.getByText("No AI detections yet")).toBeInTheDocument();
				expect(
					screen.getByText("Start using AI tools to see detection statistics")
				).toBeInTheDocument();
			});

			it("renders AI Tools Detected header", () => {
				render(<AIDetectionStats.Empty />, { wrapper: createWrapper() });

				expect(screen.getByText("AI Tools Detected")).toBeInTheDocument();
			});
		});

		describe("AIDetectionStats.Error", () => {
			const mockError: AppError = {
				message: "Failed to fetch AI detection stats",
				code: "FETCH_ERROR",
				status: 500,
			};

			it("renders error message and retry button", () => {
				render(<AIDetectionStats.Error error={mockError} />, { wrapper: createWrapper() });

				expect(screen.getByText("Error loading AI detection stats")).toBeInTheDocument();
				expect(screen.getByText("Failed to fetch AI detection stats")).toBeInTheDocument();
				expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
			});

			it("calls invalidateQueries when retry button clicked", () => {
				const queryClient = new QueryClient();
				const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

				render(
					<QueryClientProvider client={queryClient}>
						<AIDetectionStats.Error error={mockError} />
					</QueryClientProvider>
				);

				fireEvent.click(screen.getByRole("button", { name: "Retry" }));

				expect(invalidateSpy).toHaveBeenCalled();
			});

			it("has correct ARIA attributes for accessibility", () => {
				render(<AIDetectionStats.Error error={mockError} />, { wrapper: createWrapper() });

				const errorContainer = screen.getByRole("alert");
				expect(errorContainer).toHaveAttribute("aria-live", "polite");
				expect(errorContainer).toHaveAttribute("tabindex", "-1");
			});

			it("focuses error message on mount for screen readers", () => {
				render(<AIDetectionStats.Error error={mockError} />, { wrapper: createWrapper() });

				const errorContainer = screen.getByRole("alert");
				expect(document.activeElement).toBe(errorContainer);
			});
		});
	});

	describe("Accessibility", () => {
		it("help link has descriptive aria-label", () => {
			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			const helpLink = screen.getByRole("link");
			expect(helpLink).toHaveAttribute("aria-label", "Learn about AI detection analytics");
		});

		it("stat items have semantic structure", () => {
			const { container } = render(<AIDetectionStats stats={defaultStats} />, {
				wrapper: createWrapper(),
			});

			// Each stat should be in a distinct container
			const statContainers = container.querySelectorAll(".group");
			expect(statContainers).toHaveLength(3);
		});

		it("error state is keyboard accessible", () => {
			const mockError: AppError = { message: "Error", code: "ERR", status: 500 };
			render(<AIDetectionStats.Error error={mockError} />, { wrapper: createWrapper() });

			const retryButton = screen.getByRole("button", { name: "Retry" });
			expect(retryButton).toBeVisible();

			// Button should be focusable
			retryButton.focus();
			expect(document.activeElement).toBe(retryButton);
		});
	});

	describe("Analytics Integration", () => {
		it("captures dashboard viewed event on mount", async () => {
			const posthog = await import("posthog-js");

			render(<AIDetectionStats stats={defaultStats} />, { wrapper: createWrapper() });

			expect(posthog.default.capture).toHaveBeenCalledWith("dashboard_viewed", {
				page: "overview",
			});
		});
	});
});
