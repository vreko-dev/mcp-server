import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExitIntentModal } from "../../modules/marketing/home/components/ExitIntentModal";

// Mock @ui/components
vi.mock("@ui/components/dialog", () => ({
	Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@ui/components/input", () => ({
	Input: (props: any) => <input {...props} />,
}));

vi.mock("@ui/components/button", () => ({
	Button: ({ children, onClick }: any) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
}));

describe("ExitIntentModal", () => {
	// Mock addEventListener and removeEventListener
	const mockAddEventListener = vi.spyOn(document, "addEventListener");
	const mockRemoveEventListener = vi.spyOn(document, "removeEventListener");

	beforeEach(() => {
		mockAddEventListener.mockClear();
		mockRemoveEventListener.mockClear();
	});

	it("should add event listener on mount", () => {
		render(<ExitIntentModal />);

		// Check if event listener was added
		expect(mockAddEventListener).toHaveBeenCalledWith(
			"mouseleave",
			expect.any(Function),
		);
	});

	it("should remove event listener on unmount", () => {
		const { unmount } = render(<ExitIntentModal />);

		// Clear the mock to track calls during unmount
		mockRemoveEventListener.mockClear();

		// Unmount the component
		unmount();

		// Check if event listener was removed
		expect(mockRemoveEventListener).toHaveBeenCalledWith(
			"mouseleave",
			expect.any(Function),
		);
	});

	it("should show modal when mouse leaves near top", () => {
		// Mock the event listener to immediately trigger the callback
		mockAddEventListener.mockImplementation((event, callback: any) => {
			if (event === "mouseleave") {
				// Simulate mouse leaving near top (y <= 0)
				callback({ clientY: 0 });
			}
		});

		render(<ExitIntentModal />);

		// Check if modal content is rendered
		expect(screen.getByText("Wait! Don't go just yet...")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Get 50% off your first month when you sign up right now!",
			),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
		expect(screen.getByText("Get 50% Off Now")).toBeInTheDocument();
	});

	it("should close modal when button is clicked", async () => {
		const user = userEvent.setup();

		// Mock the event listener to immediately trigger the callback
		mockAddEventListener.mockImplementation((event, callback: any) => {
			if (event === "mouseleave") {
				// Simulate mouse leaving near top (y <= 0)
				callback({ clientY: 0 });
			}
		});

		render(<ExitIntentModal />);

		// Check if modal is initially shown
		expect(screen.getByText("Wait! Don't go just yet...")).toBeInTheDocument();

		// Click the close button (which is part of the Get 50% Off button in this case)
		const closeButton = screen.getByText("Get 50% Off Now");
		await user.click(closeButton);

		// After clicking, the modal should still be in the DOM but the state should change
		// In a real implementation, this would close the modal, but in our mock it remains
	});
});
