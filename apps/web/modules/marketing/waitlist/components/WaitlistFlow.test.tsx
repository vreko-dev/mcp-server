
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WaitlistFlow } from "./WaitlistFlow";

// Mocks
const mockRouterPush = vi.fn();
const mockUseSession = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@saas/auth/hooks/use-session", () => ({
	useSession: () => mockUseSession(),
}));

vi.mock("@marketing/components/ui/queue-tasks-preview", () => ({
  QueueTasksPreview: () => <div>Queue Mock</div>
}));

vi.mock("@marketing/components/ui/trust-signals", () => ({
  TrustSignals: () => <div>Trust Signals</div>
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: any) => {
      // Auto-succeed turnstile for tests
      setTimeout(() => onSuccess("mock-turnstile-token"), 0);
      return <div>Turnstile Mock</div>;
  }
}));

// Mock fetch
global.fetch = vi.fn();



// Better Mock for Select to allow easy testing
vi.mock("@ui/components/select", () => ({
    Select: ({ onValueChange, children }: any) => <div data-testid="select-mock" onClick={() => onValueChange("mock-value")}>{children}</div>,
    SelectTrigger: ({ children }: any) => <button>{children}</button>,
    SelectValue: () => <span>Select Value</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ value, children }: any) => <div data-value={value}>{children}</div>,
}));

describe("WaitlistFlow Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("redirects to login and saves state when unauthenticated user submits", async () => {
        mockUseSession.mockReturnValue({ user: null });
        render(<WaitlistFlow />);

        // Fill Email
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });

        // Helper to "select" items (clicking our mock)
        const selects = screen.getAllByTestId("select-mock");
        selects.forEach(select => fireEvent.click(select)); // Selects "mock-value" for all

        // Click Submit
        const submitBtn = screen.getByRole("button", { name: /Request Alpha Access/i });
        expect(submitBtn).not.toBeDisabled();

        // Need to wait for turnstile success in mock to enable button if disabled logic exists
        // Button in code: disabled={loading || !turnstileToken}
        // Our Turnstile mock calls onSuccess immediately.

        await waitFor(() => expect(submitBtn).not.toBeDisabled());
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("/auth/login"));
        });

        // Verify Storage
        expect(localStorage.getItem("waitlist_form_data")).toBeTruthy();
    });

    it("calls API when authenticated", async () => {
        mockUseSession.mockReturnValue({ user: { id: "user_123" } });
        (global.fetch as any).mockResolvedValue({
             ok: true,
             json: async () => ({ queuePosition: 1, referralCode: "REF123" })
        });

        render(<WaitlistFlow />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "auth@example.com" } });
        screen.getAllByTestId("select-mock").forEach(s => fireEvent.click(s));

        const submitBtn = screen.getByRole("button", { name: /Request Alpha Access/i });
        await waitFor(() => expect(submitBtn).not.toBeDisabled());
        fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith("/api/waitlist", expect.anything());
		});
	});
});
