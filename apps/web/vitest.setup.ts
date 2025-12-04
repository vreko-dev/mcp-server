import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./tests/msw/server";

/**
 * MSW server lifecycle hooks
 * Ensures all network requests are mocked during tests
 */
import React from "react";

// Mock UI components
vi.mock("@ui/components/checkbox", () => ({
	Checkbox: React.forwardRef((props: any, ref: any) =>
		React.createElement("input", { type: "checkbox", ref, ...props })
	),
}));

beforeAll(() => {
	server.listen({
		onUnhandledRequest: "error", // Fail on unmocked requests for test reliability
	});
});

afterEach(() => {
	server.resetHandlers(); // Reset handlers after each test for isolation
	cleanup(); // Cleanup React Testing Library
});

afterAll(() => {
	server.close();
});

// Mock Next.js modules
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(),
	}),
	usePathname: () => "/",
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(() => ({
		get: vi.fn(),
		set: vi.fn(),
	})),
}));
