import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNavigateTo } from "@/lib/routes/navigateTo";

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
		prefetch: mockPrefetch,
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	usePathname: () => "/current-path",
}));

describe("useNavigateTo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Navigation", () => {
		it("should return a navigation function", () => {
			const { result } = renderHook(() => useNavigateTo());

			expect(typeof result.current).toBe("function");
		});

		it("should navigate to internal path from root", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features");
			});

			expect(mockPush).toHaveBeenCalledWith("/features");
		});

		it("should ensure path starts with / for internal routes", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("features"); // Missing leading slash
			});

			expect(mockPush).toHaveBeenCalledWith("/features");
		});

		it("should handle root path", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/");
			});

			expect(mockPush).toHaveBeenCalledWith("/");
		});
	});

	describe("External Links", () => {
		it("should not call router.push for external URLs", () => {
			const { result } = renderHook(() => useNavigateTo());

			// Mock window.open
			const originalOpen = window.open;
			window.open = vi.fn();

			act(() => {
				result.current("https://example.com");
			});

			expect(mockPush).not.toHaveBeenCalled();
			expect(window.open).toHaveBeenCalledWith(
				"https://example.com",
				"_blank",
				"noopener,noreferrer",
			);

			window.open = originalOpen;
		});

		it("should detect http:// as external", () => {
			const { result } = renderHook(() => useNavigateTo());

			const originalOpen = window.open;
			window.open = vi.fn();

			act(() => {
				result.current("http://example.com");
			});

			expect(mockPush).not.toHaveBeenCalled();
			expect(window.open).toHaveBeenCalled();

			window.open = originalOpen;
		});

		it("should detect https:// as external", () => {
			const { result } = renderHook(() => useNavigateTo());

			const originalOpen = window.open;
			window.open = vi.fn();

			act(() => {
				result.current("https://example.com");
			});

			expect(mockPush).not.toHaveBeenCalled();
			expect(window.open).toHaveBeenCalled();

			window.open = originalOpen;
		});
	});

	describe("Navigation Options", () => {
		it("should support replace option", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features", { replace: true });
			});

			expect(mockReplace).toHaveBeenCalledWith("/features");
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should default to push when replace is false", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features", { replace: false });
			});

			expect(mockPush).toHaveBeenCalledWith("/features");
			expect(mockReplace).not.toHaveBeenCalled();
		});

		it("should support scroll option", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features", { scroll: false });
			});

			// Next.js router handles scroll internally
			expect(mockPush).toHaveBeenCalledWith("/features", { scroll: false });
		});
	});

	describe("Hash and Query Parameters", () => {
		it("should preserve hash fragments", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features#pricing");
			});

			expect(mockPush).toHaveBeenCalledWith("/features#pricing");
		});

		it("should preserve query parameters", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features?ref=navbar");
			});

			expect(mockPush).toHaveBeenCalledWith("/features?ref=navbar");
		});

		it("should preserve both query and hash", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/features?ref=navbar#pricing");
			});

			expect(mockPush).toHaveBeenCalledWith("/features?ref=navbar#pricing");
		});
	});

	describe("Root-Aware Behavior", () => {
		it("should not append to current path (root-aware)", () => {
			const { result } = renderHook(() => useNavigateTo());

			// Even though current path is /current-path,
			// navigation should be absolute from root
			act(() => {
				result.current("/features");
			});

			// Should navigate to /features, NOT /current-path/features
			expect(mockPush).toHaveBeenCalledWith("/features");
			expect(mockPush).not.toHaveBeenCalledWith("/current-path/features");
		});

		it("should handle nested paths correctly", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("/docs/getting-started");
			});

			expect(mockPush).toHaveBeenCalledWith("/docs/getting-started");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty string", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("");
			});

			// Should default to root
			expect(mockPush).toHaveBeenCalledWith("/");
		});

		it("should handle undefined gracefully", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				// @ts-expect-error Testing runtime behavior
				result.current(undefined);
			});

			// Should default to root or not navigate
			expect(mockPush).toHaveBeenCalled();
		});

		it("should handle null gracefully", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				// @ts-expect-error Testing runtime behavior
				result.current(null);
			});

			// Should default to root or not navigate
			expect(mockPush).toHaveBeenCalled();
		});

		it("should trim whitespace from paths", () => {
			const { result } = renderHook(() => useNavigateTo());

			act(() => {
				result.current("  /features  ");
			});

			expect(mockPush).toHaveBeenCalledWith("/features");
		});
	});

	describe("Mailto and Tel Links", () => {
		it("should handle mailto: links", () => {
			const { result } = renderHook(() => useNavigateTo());

			const originalLocation = window.location;
			delete (window as any).location;
			window.location = { href: "" } as any;

			act(() => {
				result.current("mailto:support@snapback.dev");
			});

			expect(mockPush).not.toHaveBeenCalled();
			expect(window.location.href).toBe("mailto:support@snapback.dev");

			window.location = originalLocation;
		});

		it("should handle tel: links", () => {
			const { result } = renderHook(() => useNavigateTo());

			const originalLocation = window.location;
			delete (window as any).location;
			window.location = { href: "" } as any;

			act(() => {
				result.current("tel:+1234567890");
			});

			expect(mockPush).not.toHaveBeenCalled();
			expect(window.location.href).toBe("tel:+1234567890");

			window.location = originalLocation;
		});
	});
});
