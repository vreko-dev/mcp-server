import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecentWinsTimeline } from "../../modules/saas/dashboard/components";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, ...props }: any) => (
			<div className={className} data-testid="motion-div" {...props}>
				{children}
			</div>
		),
	},
}));

vi.mock("lucide-react", () => ({
	RotateCcw: () => <span data-testid="icon-restore">↺</span>,
	AlertCircle: () => <span data-testid="icon-prevention">⚠</span>,
	Zap: () => <span data-testid="icon-threat">⚡</span>,
}));

vi.mock("date-fns", () => ({
	formatDistanceToNow: (date: Date) => {
		const now = new Date();
		const ms = now.getTime() - date.getTime();
		const hours = Math.floor(ms / (1000 * 60 * 60));
		if (hours === 0) return "just now";
		if (hours === 1) return "1 hour ago";
		if (hours < 24) return `${hours} hours ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return "1 day ago";
		return `${days} days ago`;
	},
}));

interface Win {
	id: string;
	timestamp: Date;
	type: "restore" | "prevention" | "threat-detection";
	fileName: string;
	description: string;
	timeSaved?: number;
	severity?: "low" | "medium" | "high";
}

const mockWins: Win[] = [
	{
		id: "1",
		timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
		type: "restore",
		fileName: "dashboard.tsx",
		description: "Restored dashboard.tsx",
		timeSaved: 23,
	},
	{
		id: "2",
		timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
		type: "prevention",
		fileName: "config/auth.ts",
		description: "Prevented breaking change",
		severity: "high",
	},
	{
		id: "3",
		timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
		type: "threat-detection",
		fileName: "api/users/route.ts",
		description: "Caught security issue",
		severity: "high",
	},
];

describe("RecentWinsTimeline", () => {
	describe("Rendering", () => {
		it("should render timeline container", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const heading = screen.getByText(/Recent Wins & Recoveries/);
			expect(heading).toBeInTheDocument();
		});

		it("should display section heading", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const heading = screen.getByRole("heading", { level: 2 });
			expect(heading.textContent).toContain("Recent Wins & Recoveries");
		});

		it("should display win count", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const count = screen.getByText(/3 this week/);
			expect(count).toBeInTheDocument();
		});

		it("should render win cards for each item", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			expect(cards.length).toBeGreaterThanOrEqual(3);
		});

		it("should display empty state when no wins", () => {
			render(<RecentWinsTimeline wins={[]} />);
			const emptyState = screen.getByText(/No recent wins yet/);
			expect(emptyState).toBeInTheDocument();
		});
	});

	describe("Win Card Display", () => {
		it("should display win icons", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const icons = screen.queryAllByTestId(/icon-/);
			expect(icons.length).toBeGreaterThan(0);
		});

		it("should display win description", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const description = screen.getByText("Restored dashboard.tsx");
			expect(description).toBeInTheDocument();
		});

		it("should display file name", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const fileName = screen.getByText("dashboard.tsx");
			expect(fileName).toBeInTheDocument();
		});

		it("should display relative timestamp", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const timestamp = screen.getByText(/hours ago/);
			expect(timestamp).toBeInTheDocument();
		});

		it("should display time saved when present", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const timeSaved = screen.getByText(/Saved you/);
			expect(timeSaved).toBeInTheDocument();
		});

		it("should display severity badge", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const badges = screen.getAllByText(/High|Medium|Low/);
			expect(badges.length).toBeGreaterThan(0);
		});

		it("should not display time saved for prevention wins", () => {
			const preventionWin = mockWins[1];
			render(<RecentWinsTimeline wins={[preventionWin]} />);
			const timeSaved = screen.queryByText(/Saved you/);
			expect(timeSaved).not.toBeInTheDocument();
		});
	});

	describe("Win Type Styling", () => {
		it("should style restore wins with green", () => {
			render(<RecentWinsTimeline wins={[mockWins[0]]} />);
			const card = screen.getByTestId("motion-div");
			expect(card).toHaveClass("border-snapback-green/30");
		});

		it("should style prevention wins with amber", () => {
			render(<RecentWinsTimeline wins={[mockWins[1]]} />);
			const card = screen.getByTestId("motion-div");
			expect(card).toHaveClass("border-amber-500/30");
		});

		it("should style threat-detection with red", () => {
			render(<RecentWinsTimeline wins={[mockWins[2]]} />);
			const card = screen.getByTestId("motion-div");
			expect(card).toHaveClass("border-red-500/30");
		});

		it("should have cards clickable", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			cards.forEach((card) => {
				expect(card).toHaveClass("cursor-pointer");
			});
		});
	});

	describe("Severity Indicators", () => {
		it("should display high severity", () => {
			const highSeverityWin: Win = {
				id: "test",
				timestamp: new Date(),
				type: "prevention",
				fileName: "test.ts",
				description: "Test",
				severity: "high",
			};
			render(<RecentWinsTimeline wins={[highSeverityWin]} />);
			const badge = screen.getByText(/High/);
			expect(badge).toHaveClass("text-red-400");
		});

		it("should display medium severity", () => {
			const mediumSeverityWin: Win = {
				id: "test",
				timestamp: new Date(),
				type: "prevention",
				fileName: "test.ts",
				description: "Test",
				severity: "medium",
			};
			render(<RecentWinsTimeline wins={[mediumSeverityWin]} />);
			const badge = screen.getByText(/Medium/);
			expect(badge).toHaveClass("text-amber-400");
		});

		it("should display low severity", () => {
			const lowSeverityWin: Win = {
				id: "test",
				timestamp: new Date(),
				type: "prevention",
				fileName: "test.ts",
				description: "Test",
				severity: "low",
			};
			render(<RecentWinsTimeline wins={[lowSeverityWin]} />);
			const badge = screen.getByText(/Low/);
			expect(badge).toHaveClass("text-green-400");
		});
	});

	describe("Visibility & Animation", () => {
		it("should render with visible content", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const heading = screen.getByText(/Recent Wins/);
			expect(heading).toBeVisible();
		});

		it("should have motion divs", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const motionDivs = screen.getAllByTestId("motion-div");
			expect(motionDivs.length).toBeGreaterThan(0);
		});
	});

	describe("Micro-interactions", () => {
		it("should have hover animation capability", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			cards.forEach((card) => {
				expect(card).toHaveClass("transition-all");
			});
		});
	});

	describe("Callback Events", () => {
		it("should call onWinClick when card clicked", () => {
			const onWinClick = vi.fn();
			render(
				<RecentWinsTimeline wins={mockWins} onWinClick={onWinClick} />
			);
			const card = screen.getAllByTestId("motion-div")[0];
			fireEvent.click(card);
			expect(onWinClick).toHaveBeenCalled();
		});

		it("should pass correct win object to callback", () => {
			const onWinClick = vi.fn();
			render(
				<RecentWinsTimeline wins={[mockWins[0]]} onWinClick={onWinClick} />
			);
			const card = screen.getByTestId("motion-div");
			fireEvent.click(card);
			expect(onWinClick).toHaveBeenCalledWith(mockWins[0]);
		});

		it("should work without onWinClick callback", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const card = screen.getByTestId("motion-div");
			expect(() => fireEvent.click(card)).not.toThrow();
		});
	});

	describe("Data Formatting", () => {
		it("should format timestamps correctly", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const timestamp = screen.getByText(/hours ago|day ago/);
			expect(timestamp).toBeInTheDocument();
		});

		it("should format file paths", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const filePath = screen.getByText("config/auth.ts");
			expect(filePath).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper heading", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const heading = screen.getByRole("heading", { level: 2 });
			expect(heading).toBeInTheDocument();
		});

		it("should have readable descriptions", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const descriptions = screen.getAllByText(/Restored|Prevented|Caught/);
			expect(descriptions.length).toBeGreaterThan(0);
		});
	});

	describe("Responsive Design", () => {
		it("should have proper spacing", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const container = screen.getByText(/Recent Wins/).closest("div");
			const parentContainer = container?.parentElement;
			expect(parentContainer).toHaveClass("space-y-4");
		});

		it("should have rounded corners on cards", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			cards.forEach((card) => {
				expect(card).toHaveClass("rounded-lg");
			});
		});

		it("should have proper padding", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			cards.forEach((card) => {
				expect(card).toHaveClass("p-4");
			});
		});
	});

	describe("Performance", () => {
		it("should render multiple cards", () => {
			render(<RecentWinsTimeline wins={mockWins} />);
			const cards = screen.getAllByTestId("motion-div");
			expect(cards.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty list", () => {
			render(<RecentWinsTimeline wins={[]} />);
			const emptyState = screen.getByText(/No recent wins yet/);
			expect(emptyState).toBeInTheDocument();
		});

		it("should handle single win", () => {
			render(<RecentWinsTimeline wins={[mockWins[0]]} />);
			const description = screen.getByText("Restored dashboard.tsx");
			expect(description).toBeInTheDocument();
		});

		it("should handle long descriptions", () => {
			const longDescWin: Win = {
				id: "test",
				timestamp: new Date(),
				type: "restore",
				fileName: "test.ts",
				description: "This is a very long description that should wrap properly",
			};
			render(<RecentWinsTimeline wins={[longDescWin]} />);
			const desc = screen.getByText(/This is a very long/);
			expect(desc).toBeInTheDocument();
		});

		it("should handle missing optional fields", () => {
			const minimalWin: Win = {
				id: "test",
				timestamp: new Date(),
				type: "restore",
				fileName: "test.ts",
				description: "Test",
			};
			render(<RecentWinsTimeline wins={[minimalWin]} />);
			const description = screen.getByText("Test");
			expect(description).toBeInTheDocument();
		});
	});
});
