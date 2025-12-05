import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareDialog } from "@saas/dashboard/components/ShareDialog";

// Mock trackEvent
const mockTrackEvent = vi.fn();
vi.mock("@analytics", () => ({
	trackEvent: (...args: any[]) => mockTrackEvent(...args),
	AnalyticsEvents: {
		SAVE_STORY_SHARED: "community:save_story_shared",
	},
}));

describe("ShareDialog Component", () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        linesRecovered: 500,
    };

    it("should render dialog content when open", () => {
        render(<ShareDialog {...defaultProps} />);
        expect(screen.getByText("Share your save")).toBeInTheDocument();
        expect(screen.getByText(/Just recovered 500 lines/)).toBeInTheDocument();
    });

    it("should generate correct story for Twitter share", async () => {
        // Mock window.open
        const mockOpen = vi.fn();
        vi.stubGlobal("open", mockOpen);

        render(<ShareDialog {...defaultProps} />);

        // Find Twitter button
        const twitterBtn = screen.getByText(/Twitter/i);
        expect(twitterBtn).toBeInTheDocument();

        // Click and verify tracking
        fireEvent.click(twitterBtn);

        expect(mockTrackEvent).toHaveBeenCalledWith(
            "community:save_story_shared",
            expect.objectContaining({
                method: "twitter",
                lines_recovered: 500,
            })
        );

        // Verify window.open was called
        expect(mockOpen).toHaveBeenCalled();
        const callArgs = mockOpen.mock.calls[0];
        expect(callArgs).toBeDefined();
        if (!callArgs) return;

        const url = new URL(callArgs[0]);
        expect(url.hostname).toBe("twitter.com");
        expect(url.searchParams.get("text")).toContain("500 lines");

        // Verify it closes dialog
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should copy to clipboard when Copy link clicked", async () => {
        // Mock clipboard API
        const mockWriteText = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });

        render(<ShareDialog {...defaultProps} />);

        const copyBtn = screen.getByText(/Copy Text/i);
        fireEvent.click(copyBtn);

        expect(mockWriteText).toHaveBeenCalled();
        const writeArgs = mockWriteText.mock.calls[0];
        expect(writeArgs).toBeDefined();
        expect(writeArgs?.[0]).toContain("500 lines");

        expect(mockTrackEvent).toHaveBeenCalledWith(
            "community:save_story_shared",
            expect.objectContaining({
                method: "copy",
            })
        );

        // Verify button text changes
        await waitFor(() => {
            expect(screen.getByText("Copied")).toBeInTheDocument();
        });
    });
});
