/**
 * PioneerProgressCard Component Tests
 * 4-path coverage: happy, empty/null, edge, error
 * @see C-003, C-004 compliance
 */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PioneerProgressCard } from "@/modules/pioneer/components/PioneerProgressCard";
import type { PioneerProgress } from "@/modules/pioneer/hooks/use-pioneer-progress";

vi.mock("posthog-js", () => ({
	default: { __loaded: true, capture: vi.fn() },
}));

vi.mock("lucide-react", () => ({
	ArrowRight: ({ className }: { className?: string }) => (
		<svg data-testid="arrow-right-icon" className={className} />
	),
	Check: ({ className }: { className?: string }) => (
		<svg data-testid="check-icon" className={className} />
	),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		href: string;
		"aria-label"?: string;
	}) => (
		<a href={href} data-testid="next-link" aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

const mockPioneerProgress: PioneerProgress = {
	pioneer: {
		id: "pioneer-123",
		userId: "user-456",
		githubUsername: "testuser",
		contactEmail: "test@example.com",
		tier: "grower",
		totalPoints: 350,
		referralCode: "REF123",
		createdAt: "2024-01-01T00:00:00.000Z",
		lastActivityAt: "2024-12-01T00:00:00.000Z",
	},
	progress: {
		currentTier: "grower",
		nextTier: "cultivator",
		pointsToNext: 400,
		percentToNext: 40,
	},
	completedActions: ["github_starred", "referral"],
	availableActions: ["twitter_follow", "feedback"],
};

const guardianProgress: PioneerProgress = {
	pioneer: {
		id: "pioneer-789",
		userId: "user-999",
		githubUsername: "guardian_user",
		contactEmail: "guardian@example.com",
		tier: "guardian",
		totalPoints: 1500,
		referralCode: "GUARD123",
		createdAt: "2024-01-01T00:00:00.000Z",
		lastActivityAt: "2024-12-20T00:00:00.000Z",
	},
	progress: {
		currentTier: "guardian",
		nextTier: null,
		pointsToNext: 0,
		percentToNext: 100,
	},
	completedActions: ["github_starred", "referral", "feedback", "twitter_follow"],
	availableActions: [],
};

const seedlingProgress: PioneerProgress = {
	pioneer: {
		id: "pioneer-new",
		userId: "user-new",
		githubUsername: "newuser",
		contactEmail: null,
		tier: "seedling",
		totalPoints: 0,
		referralCode: "NEW123",
		createdAt: "2024-12-20T00:00:00.000Z",
		lastActivityAt: "2024-12-20T00:00:00.000Z",
	},
	progress: {
		currentTier: "seedling",
		nextTier: "grower",
		pointsToNext: 250,
		percentToNext: 0,
	},
	completedActions: [],
	availableActions: ["github_starred", "referral", "feedback"],
};

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("PioneerProgressCard Component", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders pioneer status card with correct tier emoji", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("Pioneer Status")).toBeInTheDocument();
			expect(screen.getByText("🌿")).toBeInTheDocument(); // grower emoji
		});

		it("displays total points correctly", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("350")).toBeInTheDocument();
			expect(screen.getByText("Points")).toBeInTheDocument();
		});

		it("shows tier badge with correct tier name", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("grower")).toBeInTheDocument();
		});

		it("displays points to next tier when not at max tier", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText(/400 points to cultivator/i)).toBeInTheDocument();
		});

		it("renders link to pioneer page with correct aria-label", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			const link = screen.getByRole("link", { name: /view all pioneer actions/i });
			expect(link).toHaveAttribute("href", "/pioneer");
		});

		it("has correct accessibility attributes on card", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} />, { wrapper: createWrapper() });
			const card = screen.getByRole("region");
			expect(card).toHaveAttribute("aria-label", expect.stringContaining("grower tier"));
		});
	});

	describe("Sad Path (No Data)", () => {
		it("returns null when data is null", () => {
			const { container } = render(<PioneerProgressCard data={null} />, { wrapper: createWrapper() });
			expect(container.firstChild).toBeNull();
		});

		it("returns null when data is undefined", () => {
			const { container } = render(<PioneerProgressCard data={undefined} />, { wrapper: createWrapper() });
			expect(container.firstChild).toBeNull();
		});

		it("does not crash with missing optional fields", () => {
			const minimalProgress: PioneerProgress = {
				...mockPioneerProgress,
				pioneer: {
					...mockPioneerProgress.pioneer,
					contactEmail: null,
				},
			};
			render(<PioneerProgressCard data={minimalProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("Pioneer Status")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles seedling tier (0 points) correctly", () => {
			render(<PioneerProgressCard data={seedlingProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("🌱")).toBeInTheDocument();
			expect(screen.getByText("seedling")).toBeInTheDocument();
			expect(screen.getByText("0")).toBeInTheDocument();
			expect(screen.getByText(/250 points to grower/i)).toBeInTheDocument();
		});

		it("handles guardian tier (max tier) without next tier message", () => {
			render(<PioneerProgressCard data={guardianProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("🌲")).toBeInTheDocument();
			expect(screen.getByText("guardian")).toBeInTheDocument();
			expect(screen.getByText("1500")).toBeInTheDocument();
			expect(screen.queryByText(/points to/i)).not.toBeInTheDocument();
		});

		it("handles boundary point values at tier thresholds", () => {
			const boundaryProgress: PioneerProgress = {
				...mockPioneerProgress,
				pioneer: { ...mockPioneerProgress.pioneer, tier: "cultivator", totalPoints: 750 },
				progress: { currentTier: "cultivator", nextTier: "guardian", pointsToNext: 750, percentToNext: 0 },
			};
			render(<PioneerProgressCard data={boundaryProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("🌳")).toBeInTheDocument();
			expect(screen.getByText("750")).toBeInTheDocument();
		});

		it("handles very large point values", () => {
			const largePointsProgress: PioneerProgress = {
				...guardianProgress,
				pioneer: { ...guardianProgress.pioneer, totalPoints: 999999 },
			};
			render(<PioneerProgressCard data={largePointsProgress} />, { wrapper: createWrapper() });
			expect(screen.getByText("999999")).toBeInTheDocument();
		});
	});

	describe("Loading State", () => {
		it("renders skeleton loading state when isLoading is true", () => {
			render(<PioneerProgressCard isLoading={true} />, { wrapper: createWrapper() });
			const loadingCard = screen.getByRole("generic", { busy: true });
			expect(loadingCard).toHaveAttribute("aria-label", "Loading pioneer progress");
		});

		it("does not render content when loading", () => {
			render(<PioneerProgressCard isLoading={true} />, { wrapper: createWrapper() });
			expect(screen.queryByText("Pioneer Status")).not.toBeInTheDocument();
			expect(screen.queryByText("Points")).not.toBeInTheDocument();
		});

		it("prioritizes loading state over data", () => {
			render(<PioneerProgressCard data={mockPioneerProgress} isLoading={true} />, {
				wrapper: createWrapper(),
			});
			expect(screen.queryByText("Pioneer Status")).not.toBeInTheDocument();
		});
	});
});
