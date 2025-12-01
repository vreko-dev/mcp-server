import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OptimizedTerminal } from "../../modules/marketing/home/components/OptimizedTerminal";

// Mock next/dynamic
vi.mock("next/dynamic", () => {
	return {
		__esModule: true,
		default: () => {
			return function MockDynamicComponent() {
				return <div>SnapBackTerminalUltimate</div>;
			};
		},
	};
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

mockIntersectionObserver.mockReturnValue({
	observe: mockObserve,
	disconnect: mockDisconnect,
});

global.IntersectionObserver = mockIntersectionObserver;

// Mock window.innerWidth
Object.defineProperty(window, "innerWidth", {
	writable: true,
	configurable: true,
	value: 1024,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe("OptimizedTerminal", () => {
	beforeEach(() => {
		mockObserve.mockClear();
		mockDisconnect.mockClear();
		mockIntersectionObserver.mockClear();
	});

	it("should render the terminal container", () => {
		render(<OptimizedTerminal />);

		// Check if container is rendered
		const container = screen.getByTestId("terminal-container");
		expect(container).toBeInTheDocument();
	});

	it("should initialize IntersectionObserver", () => {
		render(<OptimizedTerminal />);

		// Check if IntersectionObserver was created
		expect(mockIntersectionObserver).toHaveBeenCalled();
		expect(mockObserve).toHaveBeenCalled();
	});

	it("should disconnect IntersectionObserver on unmount", () => {
		const { unmount } = render(<OptimizedTerminal />);

		// Clear mocks to track cleanup
		mockDisconnect.mockClear();

		// Unmount component
		unmount();

		// Check if disconnect was called
		expect(mockDisconnect).toHaveBeenCalled();
	});

	it("should render mobile optimized version", () => {
		// Mock mobile device
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 500,
		});

		render(<OptimizedTerminal />);
	});

	it("should render desktop optimized version", () => {
		// Mock desktop device
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1200,
		});

		render(<OptimizedTerminal />);
	});
});
