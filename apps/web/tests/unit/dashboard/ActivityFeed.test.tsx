/**
 * ActivityFeed Component Tests
 * 4-path coverage: happy, empty, edge, error
 * @see C-003, C-004 compliance
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";
import type { AppError } from "@/lib/error-handler";

vi.mock("posthog-js", () => ({
	default: { __loaded: true, capture: vi.fn() },
}));

vi.mock("@analytics", () => ({
	AnalyticsEvents: { DASHBOARD_VIEWED: "dashboard_viewed" },
}));

vi.mock("lucide-react", () => ({
	Activity: ({ className }: { className?: string }) => <svg data-testid="activity-icon" className={className} />,
	Bot: ({ className }: { className?: string }) => <svg data-testid="bot-icon" className={className} />,
	Camera: ({ className }: { className?: string }) => <svg data-testid="camera-icon" className={className} />,
	RotateCcw: ({ className }: { className?: string }) => <svg data-testid="rotate-icon" className={className} />,
}));

interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

const mockActivities: Activity[] = [
	{ type: "snapshot", message: "Created snapshot", timestamp: "2 min ago", metadata: { files: 5 } },
	{ type: "ai_detection", message: "AI activity detected", timestamp: "5 min ago", metadata: { confidence: 0.92 } },
	{ type: "recovery", message: "Recovered file", timestamp: "10 min ago", metadata: { snapshot: "snap-123" } },
];

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("ActivityFeed Component", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders all activities with correct icons", () => {
			render(<ActivityFeed activities={mockActivities} />, { wrapper: createWrapper() });
			expect(screen.getByText("Recent Activity")).toBeInTheDocument();
			expect(screen.getByText("Created snapshot")).toBeInTheDocument();
			expect(screen.getByText("AI activity detected")).toBeInTheDocument();
			expect(screen.getByText("Recovered file")).toBeInTheDocument();
		});

		it("displays metadata correctly for each activity type", () => {
			render(<ActivityFeed activities={mockActivities} />, { wrapper: createWrapper() });
			expect(screen.getByText("5 files")).toBeInTheDocument();
			expect(screen.getByText("92% confidence")).toBeInTheDocument();
			expect(screen.getByText("From snap-123")).toBeInTheDocument();
		});

		it("shows timestamps for all activities", () => {
			render(<ActivityFeed activities={mockActivities} />, { wrapper: createWrapper() });
			expect(screen.getByText("2 min ago")).toBeInTheDocument();
			expect(screen.getByText("5 min ago")).toBeInTheDocument();
			expect(screen.getByText("10 min ago")).toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("renders empty state when no activities", () => {
			render(<ActivityFeed activities={[]} />, { wrapper: createWrapper() });
			expect(screen.getByText("No recent activity")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles single activity", () => {
			render(<ActivityFeed activities={[mockActivities[0]]} />, { wrapper: createWrapper() });
			expect(screen.getByText("Created snapshot")).toBeInTheDocument();
		});

		it("handles activity without metadata", () => {
			const noMetadata: Activity[] = [{ type: "snapshot", message: "Simple snapshot", timestamp: "1 min ago" }];
			render(<ActivityFeed activities={noMetadata} />, { wrapper: createWrapper() });
			expect(screen.getByText("Simple snapshot")).toBeInTheDocument();
		});

		it("handles many activities (20+)", () => {
			const manyActivities = Array.from({ length: 20 }, (_, i) => ({
				type: "snapshot" as const,
				message: `Activity ${i}`,
				timestamp: `${i} min ago`,
			}));
			render(<ActivityFeed activities={manyActivities} />, { wrapper: createWrapper() });
			expect(screen.getByText("Activity 0")).toBeInTheDocument();
			expect(screen.getByText("Activity 19")).toBeInTheDocument();
		});
	});

	describe("Sub-Components", () => {
		describe("ActivityFeed.Skeleton", () => {
			it("renders skeleton loading state", () => {
				const { container } = render(<ActivityFeed.Skeleton />, { wrapper: createWrapper() });
				expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
			});
		});

		describe("ActivityFeed.Empty", () => {
			it("renders empty message", () => {
				render(<ActivityFeed.Empty />, { wrapper: createWrapper() });
				expect(screen.getByText("No recent activity")).toBeInTheDocument();
				expect(screen.getByText("Your activity will appear here")).toBeInTheDocument();
			});
		});

		describe("ActivityFeed.Error", () => {
			const mockError: AppError = { message: "Failed to load", code: "ERR", status: 500 };

			it("renders error state with message", () => {
				render(<ActivityFeed.Error error={mockError} />, { wrapper: createWrapper() });
				expect(screen.getByText("Error loading activity feed")).toBeInTheDocument();
				expect(screen.getByText("Failed to load")).toBeInTheDocument();
			});

			it("has retry button that invalidates queries", () => {
				const queryClient = new QueryClient();
				const spy = vi.spyOn(queryClient, "invalidateQueries");
				render(
					<QueryClientProvider client={queryClient}>
						<ActivityFeed.Error error={mockError} />
					</QueryClientProvider>
				);
				fireEvent.click(screen.getByRole("button", { name: "Retry" }));
				expect(spy).toHaveBeenCalled();
			});

			it("has accessible error alert", () => {
				render(<ActivityFeed.Error error={mockError} />, { wrapper: createWrapper() });
				expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
			});
		});
	});

	describe("Accessibility", () => {
		it("has semantic section with aria-label", () => {
			render(<ActivityFeed activities={mockActivities} />, { wrapper: createWrapper() });
			expect(screen.getByRole("region", { name: "Recent Activity" })).toBeInTheDocument();
		});
	});
});
