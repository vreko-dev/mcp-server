import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "../../modules/marketing/home/components/CountdownTimer";

// Mock the useEffect to control the timer
vi.useFakeTimers();

describe("CountdownTimer", () => {
	it("should render time elements correctly", () => {
		// Set a specific date for testing
		const testDate = "2025-10-30"; // 5 days from the end date
		render(<CountdownTimer endDate={testDate} />);

		// Check if time elements are rendered
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("should update time after advancing timers", () => {
		const testDate = "2025-10-30";
		render(<CountdownTimer endDate={testDate} />);

		// Advance time by 1 second
		vi.advanceTimersByTime(1000);

		// The component should still render time elements
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("should show 0 values for past dates", () => {
		// Set a date in the past
		const pastDate = "2020-01-01";
		render(<CountdownTimer endDate={pastDate} />);

		// All time values should be 0
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});
});
