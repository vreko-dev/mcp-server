/**
 * RecentWinsTimeline, ShareDialog, WaitlistPositionTile Component Tests
 * 4-path coverage per C-003, C-004
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock motion/react
vi.mock("motion/react", () => ({
	m: {
		div: ({ children, onClick, ...props }: any) => <div onClick={onClick} {...props}>{children}</div>,
		span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
	},
}));

vi.mock("date-fns", () => ({
	formatDistanceToNow: (date: Date) => "5 minutes ago",
}));

vi.mock("lucide-react", () => ({
	AlertCircle: () => <svg data-testid="alert-icon" />,
	RotateCcw: () => <svg data-testid="rotate-icon" />,
	Zap: () => <svg data-testid="zap-icon" />,
	Twitter: () => <svg data-testid="twitter-icon" />,
	Copy: () => <svg data-testid="copy-icon" />,
	Check: () => <svg data-testid="check-icon" />,
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn() },
}));

vi.mock("@analytics", () => ({
	AnalyticsEvents: { SAVE_STORY_SHARED: "save_story_shared" },
	useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock("@saas/auth/hooks/use-session", () => ({
	useSession: () => ({ user: { email: "test@example.com" } }),
}));

vi.mock("@/modules/shared/lib/orpc-client", () => ({
	orpcClient: {
		waitlist: {
			getPosition: vi.fn().mockResolvedValue({ position: 42, status: "pending" }),
			getReferrals: vi.fn().mockResolvedValue({ count: 5, totalPoints: 250 }),
		},
	},
}));

import { RecentWinsTimeline } from "@/modules/saas/dashboard/components/RecentWinsTimeline";
import { ShareDialog } from "@/modules/saas/dashboard/components/ShareDialog";
import { WaitlistPositionTile } from "@/modules/saas/dashboard/components/WaitlistPositionTile";

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("RecentWinsTimeline Component", () => {
	const mockWins = [
		{
			id: "1",
			timestamp: new Date(),
			type: "restore" as const,
			fileName: "app.tsx",
			description: "Restored from snapshot",
			timeSaved: 30,
			severity: "high" as const,
		},
		{
			id: "2",
			timestamp: new Date(),
			type: "prevention" as const,
			fileName: "config.ts",
			description: "Prevented data loss",
			severity: "medium" as const,
		},
		{
			id: "3",
			timestamp: new Date(),
			type: "threat-detection" as const,
			fileName: "utils.js",
			description: "Detected AI risk",
			severity: "low" as const,
		},
	];

	describe("Happy Path", () => {
		it("renders title and win count", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			expect(screen.getByText("Recent Wins & Recoveries")).toBeInTheDocument();
			expect(screen.getByText("3 this week")).toBeInTheDocument();
		});

		it("displays all wins with descriptions", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			expect(screen.getByText("Restored from snapshot")).toBeInTheDocument();
			expect(screen.getByText("Prevented data loss")).toBeInTheDocument();
			expect(screen.getByText("Detected AI risk")).toBeInTheDocument();
		});

		it("shows file names for each win", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			expect(screen.getByText("app.tsx")).toBeInTheDocument();
			expect(screen.getByText("config.ts")).toBeInTheDocument();
			expect(screen.getByText("utils.js")).toBeInTheDocument();
		});

		it("displays time saved when available", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			expect(screen.getByText("Saved you ~30m")).toBeInTheDocument();
		});

		it("displays severity labels", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			expect(screen.getByText("High")).toBeInTheDocument();
			expect(screen.getByText("Medium")).toBeInTheDocument();
			expect(screen.getByText("Low")).toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("shows empty message when no wins", () => {
			render(<RecentWinsTimeline wins={[]} />);
			expect(screen.getByText("No recent wins yet. Create a snapshot to get started!")).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("calls onWinClick when a win is clicked", () => {
			const onWinClick = vi.fn();
			render(<RecentWinsTimeline wins={mockWins} onWinClick={onWinClick} />);
			fireEvent.click(screen.getByText("Restored from snapshot"));
			expect(onWinClick).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
		});
	});

	describe("Edge Cases", () => {
		it("handles win without timeSaved", () => {
			const winsNoTime = [{ ...mockWins[1] }];
			render(<RecentWinsTimeline wins={winsNoTime} />);
			expect(screen.queryByText(/Saved you/)).not.toBeInTheDocument();
		});

		it("handles win without severity", () => {
			const winsNoSeverity = [{ ...mockWins[0], severity: undefined }];
			render(<RecentWinsTimeline wins={winsNoSeverity as any} />);
			expect(screen.queryByText("High")).not.toBeInTheDocument();
		});
	});
});

describe("ShareDialog Component", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		linesRecovered: 150,
	};

	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders dialog title and description", () => {
			render(<ShareDialog {...defaultProps} />);
			expect(screen.getByText("Share your save")).toBeInTheDocument();
			expect(screen.getByText(/Celebrate your recovery/)).toBeInTheDocument();
		});

		it("displays share text with lines recovered", () => {
			render(<ShareDialog {...defaultProps} />);
			expect(screen.getByText(/Just recovered 150 lines/)).toBeInTheDocument();
		});

		it("has Twitter share button", () => {
			render(<ShareDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: /Share on Twitter/ })).toBeInTheDocument();
		});

		it("has copy button", () => {
			render(<ShareDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: /Copy Text/ })).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("copies text to clipboard on copy click", async () => {
			const writeTextMock = vi.fn();
			Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

			render(<ShareDialog {...defaultProps} />);
			fireEvent.click(screen.getByRole("button", { name: /Copy Text/ }));

			await waitFor(() => {
				expect(writeTextMock).toHaveBeenCalled();
			});
		});

		it("opens Twitter in new window on share click", () => {
			const openMock = vi.fn();
			vi.spyOn(window, "open").mockImplementation(openMock);

			render(<ShareDialog {...defaultProps} />);
			fireEvent.click(screen.getByRole("button", { name: /Share on Twitter/ }));

			expect(openMock).toHaveBeenCalledWith(expect.stringContaining("twitter.com"), "_blank");
		});
	});

	describe("Edge Cases", () => {
		it("does not render when closed", () => {
			render(<ShareDialog {...defaultProps} open={false} />);
			expect(screen.queryByText("Share your save")).not.toBeInTheDocument();
		});

		it("handles zero lines recovered", () => {
			render(<ShareDialog {...defaultProps} linesRecovered={0} />);
			expect(screen.getByText(/Just recovered 0 lines/)).toBeInTheDocument();
		});
	});
});

describe("WaitlistPositionTile Component", () => {
	describe("Happy Path", () => {
		it("renders position when data loads", async () => {
			render(<WaitlistPositionTile />, { wrapper: createWrapper() });
			await waitFor(() => {
				expect(screen.getByText("#42")).toBeInTheDocument();
			});
		});

		it("displays status label", async () => {
			render(<WaitlistPositionTile />, { wrapper: createWrapper() });
			await waitFor(() => {
				expect(screen.getByText("PENDING")).toBeInTheDocument();
			});
		});

		it("shows referral count when available", async () => {
			render(<WaitlistPositionTile />, { wrapper: createWrapper() });
			await waitFor(() => {
				expect(screen.getByText("5")).toBeInTheDocument();
				expect(screen.getByText("250 points earned")).toBeInTheDocument();
			});
		});
	});

	describe("Loading State", () => {
		it("renders skeleton during loading", () => {
			render(<WaitlistPositionTile.Skeleton />, { wrapper: createWrapper() });
			expect(screen.getByText("Waitlist Position")).toBeInTheDocument();
		});
	});
});
