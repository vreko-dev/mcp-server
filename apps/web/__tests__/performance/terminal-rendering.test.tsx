import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnapBackTerminalUltimate } from "@/modules/ui/components/domain/terminal/snapback-terminal-ultimate";

describe("Terminal Performance", () => {
	beforeEach(() => {
		// Mock IntersectionObserver
		const mockIntersectionObserver = vi.fn();
		mockIntersectionObserver.mockReturnValue({
			observe: () => null,
			unobserve: () => null,
			disconnect: () => null,
		});
		window.IntersectionObserver = mockIntersectionObserver;

		// Mock window.innerWidth
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});
	});

	it("should render terminal component without crashing", () => {
		expect(() => {
			render(<SnapBackTerminalUltimate />);
		}).not.toThrow();
	});

	it("should render within performance budget", () => {
		const start = performance.now();
		render(<SnapBackTerminalUltimate />);
		const duration = performance.now() - start;

		// Should render in less than 100ms
		expect(duration).toBeLessThan(100);
	});

	it("should handle multiple re-renders efficiently", () => {
		const start = performance.now();

		// Render component 10 times
		for (let i = 0; i < 10; i++) {
			render(<SnapBackTerminalUltimate />);
		}

		const duration = performance.now() - start;

		// 10 renders should take less than 500ms
		expect(duration).toBeLessThan(500);
	});
});
