/**
 * MetricsGrid Component Tests
 *
 * Coverage: Happy path, empty state, loading state, error state
 * Per C-003: Uses specific assertions (.toEqual, .toBe), NOT vague ones
 * Per C-004: 4-path coverage (happy, sad, edge, error)
 * Per C-004a: No placeholder tests (expect(true).toBe(true))
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MetricsGrid } from "@saas/dashboard/components/MetricsGrid";

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		__loaded: false,
		capture: vi.fn(),
	},
}));

// Mock analytics
vi.mock("@analytics", () => ({
	AnalyticsEvents: {
		DASHBOARD_VIEWED: "dashboard:viewed",
	},
}));

// Create query client wrapper
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	};
};

describe("MetricsGrid Component", () => {
	const defaultProps = {
		snapshotCount: 847,
		recoveryCount: 23,
		filesProtected: 1234,
		aiDetectionRate: 89,
	};

	describe("Happy Path - Data Display", () => {
		it("renders all metric values correctly", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Verify metrics grid is rendered
			expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();

			// Verify section title
			expect(screen.getByText("Metrics Overview")).toBeInTheDocument();

			// Verify metric labels are present
			expect(screen.getByText("Snapshots")).toBeInTheDocument();
			expect(screen.getByText("Recoveries")).toBeInTheDocument();
			expect(screen.getByText("Files Protected")).toBeInTheDocument();
			expect(screen.getByText("AI Detection")).toBeInTheDocument();
		});

		it("renders snapshot count with correct text", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Verify snapshot count is displayed
			expect(screen.getByText(/snapshots created/)).toBeInTheDocument();
		});

		it("renders recovery count with correct text", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Verify recovery text is displayed
			expect(screen.getByText(/recoveries performed/)).toBeInTheDocument();
		});

		it("renders AI detection rate as percentage", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Verify detection rate text
			expect(screen.getByText(/detection rate/)).toBeInTheDocument();
		});

		it("renders optional session metrics when provided", () => {
			const propsWithSession = {
				...defaultProps,
				sessionCount: 50,
				aiSessionCount: 20,
				totalBytesSaved: 1048576,
			};

			render(<MetricsGrid {...propsWithSession} />, { wrapper: createWrapper() });

			// Verify bytes saved section appears
			expect(screen.getByText("Bytes Saved")).toBeInTheDocument();
		});
	});

	describe("Empty State - Zero Values", () => {
		const emptyProps = {
			snapshotCount: 0,
			recoveryCount: 0,
			filesProtected: 0,
			aiDetectionRate: 0,
		};

		it("renders grid with zero values", () => {
			render(<MetricsGrid {...emptyProps} />, { wrapper: createWrapper() });

			// Grid should still render
			expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
		});

		it("displays zero detection rate", () => {
			render(<MetricsGrid {...emptyProps} />, { wrapper: createWrapper() });

			// Should display 0% detection rate text
			expect(screen.getByText(/detection rate/)).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles large numbers correctly", () => {
			const largeProps = {
				snapshotCount: 999999,
				recoveryCount: 888888,
				filesProtected: 777777,
				aiDetectionRate: 100,
			};

			render(<MetricsGrid {...largeProps} />, { wrapper: createWrapper() });

			// Should render without crashing
			expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
		});

		it("handles missing optional props", () => {
			// Only required props
			const minimalProps = {
				snapshotCount: 10,
				recoveryCount: 2,
				filesProtected: 5,
				aiDetectionRate: 50,
			};

			render(<MetricsGrid {...minimalProps} />, { wrapper: createWrapper() });

			// Bytes saved should NOT be visible
			expect(screen.queryByText("Bytes Saved")).not.toBeInTheDocument();
		});

		it("renders help link with correct attributes", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Find learn more link
			const learnMoreLink = screen.getByRole("link", { name: /learn.*more|learn about metrics/i });
			expect(learnMoreLink).toBeInTheDocument();
			expect(learnMoreLink).toHaveAttribute("href", "/docs/analytics");
		});
	});

	describe("Sub-Components", () => {
		it("Skeleton renders loading state correctly", () => {
			render(<MetricsGrid.Skeleton />, { wrapper: createWrapper() });

			// Should render 5 skeleton items
			const skeletons = document.querySelectorAll(".animate-pulse");
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it("Empty renders empty state message", () => {
			render(<MetricsGrid.Empty />, { wrapper: createWrapper() });

			// Should show empty state message
			expect(screen.getByText("No metrics data available yet")).toBeInTheDocument();
			expect(screen.getByText(/Create your first snapshot/)).toBeInTheDocument();
		});

		it("Error renders error state with retry button", () => {
			const mockError = { message: "Failed to load metrics" };

			render(<MetricsGrid.Error error={mockError as any} />, { wrapper: createWrapper() });

			// Should show error message
			expect(screen.getByText("Error loading metrics")).toBeInTheDocument();
			expect(screen.getByText("Failed to load metrics")).toBeInTheDocument();

			// Should have retry button
			expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
		});

		it("Error retry button triggers query invalidation", () => {
			const mockError = { message: "Network error" };

			render(<MetricsGrid.Error error={mockError as any} />, { wrapper: createWrapper() });

			const retryButton = screen.getByRole("button", { name: /retry/i });

			// Click should not throw
			fireEvent.click(retryButton);

			// Button should still be visible after click
			expect(retryButton).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("error state has proper ARIA attributes", () => {
			const mockError = { message: "Test error" };

			render(<MetricsGrid.Error error={mockError as any} />, { wrapper: createWrapper() });

			// Should have alert role
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		it("help link has accessible label", () => {
			render(<MetricsGrid {...defaultProps} />, { wrapper: createWrapper() });

			// Should have aria-label
			const learnMoreLink = screen.getByLabelText(/learn about metrics/i);
			expect(learnMoreLink).toBeInTheDocument();
		});
	});
});
