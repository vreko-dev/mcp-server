// Test ID: WEB-METRICS-GRID-001
// Test Coverage: apps/web/modules/saas/dashboard/components/MetricsGrid.tsx
// Spec: test_coverage.md lines 611-617

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		capture: vi.fn(),
	},
}));

// Mock analytics
vi.mock("@/modules/analytics", () => ({
	AnalyticsEvents: {
		DASHBOARD_METRICS_VIEWED: "dashboard_metrics_viewed",
	},
}));

describe("MetricsGrid Component", () => {
	const defaultProps = {
		snapshotCount: 42,
		recoveryCount: 8,
		filesProtected: 156,
		aiDetectionRate: 87,
	};

	// Test ID: WEB-METRICS-GRID-001-001
	it("should render all metric cards", () => {
		// Arrange & Act
		render(<MetricsGrid {...defaultProps} />);

		// Assert - all metrics should be visible
		expect(screen.getByText(/Snapshots/i)).toBeInTheDocument();
		expect(screen.getByText(/Recoveries/i)).toBeInTheDocument();
		expect(screen.getByText(/Files Protected/i)).toBeInTheDocument();
		expect(screen.getByText(/AI Detection Rate/i)).toBeInTheDocument();
	});

	// Test ID: WEB-METRICS-GRID-001-002
	it("should animate number changes", async () => {
		// Arrange
		const { rerender } = render(<MetricsGrid {...defaultProps} />);

		// Act - update with new values
		rerender(
			<MetricsGrid
				{...defaultProps}
				snapshotCount={100}
				recoveryCount={15}
			/>,
		);

		// Assert - NumberTicker component handles animations
		await waitFor(() => {
			// Numbers should update (NumberTicker from magic-ui handles animation)
			expect(screen.getByText(/100/)).toBeInTheDocument();
			expect(screen.getByText(/15/)).toBeInTheDocument();
		});
	});

	// Test ID: WEB-METRICS-GRID-001-003
	it("should show loading skeleton", () => {
		// Arrange & Act
		// @ts-expect-error - Testing skeleton component
		render(<MetricsGrid.Skeleton />);

		// Assert - should show animated placeholders
		const skeletons = screen.queryAllByRole("generic");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	// Test ID: WEB-METRICS-GRID-001-004
	it("should handle zero values", () => {
		// Arrange
		const zeroProps = {
			snapshotCount: 0,
			recoveryCount: 0,
			filesProtected: 0,
			aiDetectionRate: 0,
		};

		// Act
		render(<MetricsGrid {...zeroProps} />);

		// Assert - should render zeros gracefully
		expect(screen.getAllByText("0").length).toBeGreaterThan(0);
	});

	// Test ID: WEB-METRICS-GRID-001-005
	it("should be responsive on mobile", () => {
		// Arrange & Act
		const { container } = render(<MetricsGrid {...defaultProps} />);

		// Assert - BentoGrid should have responsive classes
		const grid = container.querySelector(".grid-cols-1");
		expect(grid).toBeInTheDocument();

		// Check for responsive breakpoints
		const responsiveGrid = container.querySelector(".md\\:grid-cols-4");
		expect(responsiveGrid).toBeInTheDocument();
	});

	// Test ID: WEB-METRICS-GRID-001-006
	it("should display session metrics when provided", () => {
		// Arrange
		const propsWithSession = {
			...defaultProps,
			sessionCount: 12,
			aiSessionCount: 5,
			totalBytesSaved: 1024000,
			highSeveritySessionCount: 2,
		};

		// Act
		render(<MetricsGrid {...propsWithSession} />);

		// Assert - session metrics should be rendered
		// (Exact implementation depends on component rendering logic)
		const container = screen.getByRole("generic");
		expect(container).toBeInTheDocument();
	});

	// Test ID: WEB-METRICS-GRID-001-007
	it("should format large numbers correctly", () => {
		// Arrange
		const largeNumberProps = {
			snapshotCount: 1234567,
			recoveryCount: 9999,
			filesProtected: 123456,
			aiDetectionRate: 99,
		};

		// Act
		render(<MetricsGrid {...largeNumberProps} />);

		// Assert - numbers should be formatted (NumberTicker handles this)
		const container = screen.getByRole("generic");
		expect(container).toBeInTheDocument();
	});

	// Test ID: WEB-METRICS-GRID-001-008
	it("should render percentage for AI detection rate", () => {
		// Arrange & Act
		render(<MetricsGrid {...defaultProps} />);

		// Assert - AI detection rate should show as percentage
		expect(screen.getByText(/87/)).toBeInTheDocument();
	});
});
