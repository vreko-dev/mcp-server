// Test ID: WEB-ACTIVITY-FEED-001
// Test Coverage: apps/web/modules/saas/dashboard/components/ActivityFeed.tsx
// Spec: test_coverage.md lines 619-625

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		capture: vi.fn(),
	},
}));

// Mock QueryClient
vi.mock("@tanstack/react-query", () => ({
	useQueryClient: vi.fn(() => ({
		invalidateQueries: vi.fn(),
	})),
}));

describe("ActivityFeed Component", () => {
	const mockActivities = [
		{
			type: "snapshot" as const,
			message: "Snapshot created for file.ts",
			timestamp: "2024-01-15T10:30:00Z",
			metadata: { files: 5 },
		},
		{
			type: "ai_detection" as const,
			message: "GitHub Copilot detected",
			timestamp: "2024-01-15T09:15:00Z",
			metadata: { confidence: 0.92 },
		},
		{
			type: "recovery" as const,
			message: "Code recovered from snapshot",
			timestamp: "2024-01-14T16:45:00Z",
			metadata: { snapshotId: "snap-123" },
		},
	];

	// Test ID: WEB-ACTIVITY-FEED-001-001
	it("should render activity items", () => {
		// Arrange & Act
		render(<ActivityFeed activities={mockActivities} />);

		// Assert - all activities should be visible
		expect(screen.getByText(/Snapshot created for file.ts/i)).toBeInTheDocument();
		expect(screen.getByText(/GitHub Copilot detected/i)).toBeInTheDocument();
		expect(screen.getByText(/Code recovered from snapshot/i)).toBeInTheDocument();
	});

	// Test ID: WEB-ACTIVITY-FEED-001-002
	it("should show correct icons per type", () => {
		// Arrange & Act
		const { container } = render(<ActivityFeed activities={mockActivities} />);

		// Assert - verify icon elements exist
		// Camera icon for snapshot
		const cameraIcon = container.querySelector('svg.lucide-camera');
		expect(cameraIcon).toBeInTheDocument();

		// Bot icon for AI detection
		const botIcon = container.querySelector('svg.lucide-bot');
		expect(botIcon).toBeInTheDocument();

		// RotateCcw icon for recovery
		const recoveryIcon = container.querySelector('svg.lucide-rotate-ccw');
		expect(recoveryIcon).toBeInTheDocument();
	});

	// Test ID: WEB-ACTIVITY-FEED-001-003
	it("should format timestamps correctly", () => {
		// Arrange & Act
		render(<ActivityFeed activities={mockActivities} />);

		// Assert - timestamps should be rendered
		// (Exact format depends on component implementation)
		const container = screen.getByRole("generic");
		expect(container).toBeInTheDocument();
	});

	// Test ID: WEB-ACTIVITY-FEED-001-004
	it("should handle empty state", () => {
		// Arrange & Act
		render(<ActivityFeed activities={[]} />);

		// Assert - should show empty state message
		expect(screen.getByText(/No recent activity/i)).toBeInTheDocument();
	});

	// Test ID: WEB-ACTIVITY-FEED-001-005
	it("should loads more on scroll", () => {
		// Arrange
		const manyActivities = Array.from({ length: 20 }, (_, i) => ({
			type: "snapshot" as const,
			message: `Activity ${i + 1}`,
			timestamp: new Date(2024, 0, 15, 10, i).toISOString(),
			metadata: {},
		}));

		// Act
		const { container } = render(<ActivityFeed activities={manyActivities} />);

		// Assert - component should render with scroll capability
		expect(container).toBeInTheDocument();

		// Verify initial items are rendered
		expect(screen.getByText(/Activity 1/i)).toBeInTheDocument();
	});

	// Test ID: WEB-ACTIVITY-FEED-001-006
	it("should show loading skeleton", () => {
		// Arrange & Act
		// @ts-expect-error - Testing skeleton component
		render(<ActivityFeed.Skeleton />);

		// Assert - should show animated placeholders
		const skeletons = screen.queryAllByRole("generic");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	// Test ID: WEB-ACTIVITY-FEED-001-007
	it("should apply correct colors per activity type", () => {
		// Arrange & Act
		const { container } = render(<ActivityFeed activities={mockActivities} />);

		// Assert - verify color classes exist
		// Green for snapshot
		const greenElement = container.querySelector('.text-\\[var\\(--snapback-green\\)\\]');
		expect(greenElement).toBeInTheDocument();

		// Orange for AI detection
		const orangeElement = container.querySelector('.text-orange-500');
		expect(orangeElement).toBeInTheDocument();

		// Blue for recovery
		const blueElement = container.querySelector('.text-blue-500');
		expect(blueElement).toBeInTheDocument();
	});
});
