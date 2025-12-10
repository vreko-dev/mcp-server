import { render,screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PioneerPage from "../../app/pioneer/page";
import * as usePioneerProgressHook from "../../modules/pioneer/hooks/use-pioneer-progress";
import * as useLeaderboardHook from "../../modules/pioneer/hooks/use-leaderboard";
import { ACTIONS } from "../../modules/pioneer/lib/actions";

// Mock the hooks
vi.mock("../../modules/pioneer/hooks/use-pioneer-progress");
vi.mock("../../modules/pioneer/hooks/use-leaderboard");

// Mock UI components that might have complex internal logic/animations
vi.mock("@/components/ui/particles", () => ({ Particles: () => <div data-testid="particles" /> }));
vi.mock("@/components/ui/shimmer-button", () => ({ ShimmerButton: ({ children }: any) => <button>{children}</button> }));
vi.mock("@/components/ui/number-ticker", () => ({ NumberTicker: ({ value }: any) => <span>{value}</span> }));

describe("Pioneer Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Not logged in / Loading
    (usePioneerProgressHook.usePioneerProgress as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    (useLeaderboardHook.useLeaderboard as any).mockReturnValue({
      data: { leaderboard: [], total: 2000 },
      isLoading: false,
      error: null,
    });
  });

  describe("Hero Section", () => {
    it("renders the main specific headline", () => {
      render(<PioneerPage />);
      expect(screen.getByText(/Earn Pro Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Build the Future/i)).toBeInTheDocument();
    });

    it("displays the pioneer count", () => {
        render(<PioneerPage />);
        // 2000 mocked in beforeEach
        // Ticker might render "2,000" or just "2000"
        // We mock NumberTicker to just render value
        expect(screen.getByText("2000")).toBeInTheDocument();
    });
  });

  describe("Tier Cards", () => {
    it("renders all 4 tiers", () => {
      render(<PioneerPage />);
      expect(screen.getByText("Seedling")).toBeInTheDocument();
      expect(screen.getByText("Grower")).toBeInTheDocument();
      expect(screen.getByText("Cultivator")).toBeInTheDocument();
      expect(screen.getByText("Guardian")).toBeInTheDocument();
    });

    it("displays correct point ranges", () => {
      render(<PioneerPage />);
      expect(screen.getByText("0-249 pts")).toBeInTheDocument();
      expect(screen.getByText("1500+ pts")).toBeInTheDocument();
    });
  });

  describe("How to Earn", () => {
    it("renders action list with points", () => {
      render(<PioneerPage />);
      ACTIONS.forEach(action => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
        expect(screen.getByText(`+${action.points} pts`)).toBeInTheDocument();
      });
    });
  });

  describe("Auth State", () => {
    it("renders progress bar and personalized welcome when logged in", () => {
      (usePioneerProgressHook.usePioneerProgress as any).mockReturnValue({
        data: {
          pioneer: { tier: "grower", points: 450 },
          progress: { pointsToNext: 300, nextTier: "cultivator", percentToNext: 40 }
        },
        isLoading: false,
      });

      render(<PioneerPage />);

      expect(screen.getByText(/You're a/)).toBeInTheDocument();
      expect(screen.getByText("Grower")).toBeInTheDocument();
      expect(screen.getByText("300 pts to cultivator")).toBeInTheDocument();
      // Progress bar (role=progressbar)
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "40");
    });

    it("does NOT render progress bar when logged out", () => {
      (usePioneerProgressHook.usePioneerProgress as any).mockReturnValue({
        data: null,
        isLoading: false,
      });
      render(<PioneerPage />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("Leaderboard Section", () => {
      it("renders leaderboard table headers", () => {
          render(<PioneerPage />);
          expect(screen.getByText("Rank")).toBeInTheDocument();
          expect(screen.getByText("Pioneer")).toBeInTheDocument();
          expect(screen.getByText("Tier")).toBeInTheDocument();
          expect(screen.getByText("Points")).toBeInTheDocument();
      });
  });
});
