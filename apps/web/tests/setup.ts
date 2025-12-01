import React from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw/server";

/**
 * MSW server lifecycle hooks
 * Ensures all network requests are mocked during tests
 */
beforeAll(() => {
	server.listen({
		onUnhandledRequest: "warn", // Warn about unmocked requests
	});
});

afterEach(() => {
	server.resetHandlers(); // Reset handlers after each test for isolation
});

afterAll(() => {
	server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
Object.defineProperty(window, "IntersectionObserver", {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	})),
});

// Mock usehooks-ts
vi.mock("usehooks-ts", () => ({
	useMounted: () => true,
}));

// Mock motion components
vi.mock("motion/react", () => ({
	motion: {
		div: (props: any) => {
			const { children, ...rest } = props;
			return React.createElement("div", rest, children);
		},
	},
	AnimatePresence: (props: any) => {
		const { children } = props;
		return React.createElement("div", null, children);
	},
}));
