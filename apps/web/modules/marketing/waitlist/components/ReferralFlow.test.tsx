
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReferralFlow } from "./ReferralFlow";

describe("ReferralFlow Component", () => {
	const mockWriteText = vi.fn();
	const mockOpen = vi.fn();

	beforeEach(() => {
		// Mock clipboard and window.open
		Object.assign(navigator, {
			clipboard: {
				writeText: mockWriteText,
			},
		});
		vi.stubGlobal("open", mockOpen);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders the referral flow with correct initial state", () => {
		render(<ReferralFlow referralCode="TEST_CODE_123" currentReferrals={0} />);

		// Check for main heading
		expect(screen.getByText(/Hack the queue/i)).toBeInTheDocument();

		// Check for referral link
		expect(screen.getByDisplayValue("https://snapback.dev/join/TEST_CODE_123")).toBeInTheDocument();

		// Check for progress indicators (Alpha Badge, etc.)
		expect(screen.getByText("Alpha Badge")).toBeInTheDocument();
		expect(screen.getByText("Instant Access")).toBeInTheDocument();
	});

	it("copies referral link to clipboard when copy button is clicked", async () => {
		render(<ReferralFlow referralCode="TEST_CODE_123" />);

		const copyButton = screen.getByRole("button", { name: "" }); // Copy button might not have text, relies on icon.
        // Better selector: find by the button inside the input group
        // Or adding aria-label to the component in implementation.
        // For now, let's assume it's the first button or use a test id if needed.
        // Checking implementation plan: "The Tools (Copy/Paste Area)"

        // Let's look for the inputs parent container's button
		const input = screen.getByDisplayValue("https://snapback.dev/join/TEST_CODE_123");
        const copyBtn = input.nextElementSibling || input.parentElement?.querySelector('button');

		if (copyBtn) {
            await act(async () => {
    			fireEvent.click(copyBtn);
            });
            expect(mockWriteText).toHaveBeenCalledWith("https://snapback.dev/join/TEST_CODE_123");
        } else {
            throw new Error("Copy button not found");
        }
	});

	it("opens twitter share when post button is clicked", () => {
		render(<ReferralFlow referralCode="TEST_CODE_123" />);

		const postButton = screen.getByText(/Post/i);
		fireEvent.click(postButton);

		expect(mockOpen).toHaveBeenCalled();
		const openArgs = mockOpen.mock.calls[0][0];
		expect(openArgs).toContain("twitter.com/intent/tweet");
		expect(openArgs).toContain("https%3A%2F%2Fsnapback.dev%2Fjoin%2FTEST_CODE_123");
	});

    it("updates progress bar based on currentReferrals", () => {
        render(<ReferralFlow currentReferrals={3} />);

        // Check if "Skip Queue" (milestone for 3) is highlighted or visible
        // The mock implementation highlights completed milestones in green.
        // We can check for a class or checkmark icon.
        // Given the complexity of checking styles in unit tests without mounting CSS, logic verification is better.
        // The component calculates 'nextMilestone'.

        // We can verify the text "Invite 2 more developers" (5 - 3 = 2)
        expect(screen.getByText(/Invite/i)).toHaveTextContent("2 more developers");
    });
});
