import useIntersectionObserver, {
	useInView,
} from "@marketing/hooks/use-intersection-observer";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useIntersectionObserver", () => {
	let observeMock: ReturnType<typeof vi.fn>;
	let unobserveMock: ReturnType<typeof vi.fn>;
	let disconnectMock: ReturnType<typeof vi.fn>;
	let IntersectionObserverMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		observeMock = vi.fn();
		unobserveMock = vi.fn();
		disconnectMock = vi.fn();

		IntersectionObserverMock = vi.fn((_callback) => ({
			observe: observeMock,
			unobserve: unobserveMock,
			disconnect: disconnectMock,
			root: null,
			rootMargin: "",
			thresholds: [],
			takeRecords: vi.fn(),
		}));

		Object.defineProperty(window, "IntersectionObserver", {
			writable: true,
			configurable: true,
			value: IntersectionObserverMock,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("with IntersectionObserver support", () => {
		it("should create observer when element ref is provided", () => {
			const { result } = renderHook(() => {
				const ref = useRef<HTMLDivElement>(document.createElement("div"));
				useIntersectionObserver(ref);
				return ref;
			});

			expect(IntersectionObserverMock).toHaveBeenCalled();
			expect(observeMock).toHaveBeenCalled();
		});

		it("should disconnect observer on unmount", () => {
			const { unmount } = renderHook(() => {
				const ref = useRef<HTMLDivElement>(document.createElement("div"));
				useIntersectionObserver(ref);
				return ref;
			});

			unmount();

			expect(disconnectMock).toHaveBeenCalled();
		});

		it("should pass correct options to IntersectionObserver", () => {
			const options = {
				threshold: 0.5,
				rootMargin: "10px",
			};

			renderHook(() => {
				const ref = useRef<HTMLDivElement>(document.createElement("div"));
				useIntersectionObserver(ref, options);
				return ref;
			});

			expect(IntersectionObserverMock).toHaveBeenCalledWith(
				expect.any(Function),
				expect.objectContaining({
					threshold: 0.5,
					rootMargin: "10px",
				}),
			);
		});

		it("should not create observer if element is null", () => {
			renderHook(() => {
				const ref = useRef<HTMLDivElement>(null);
				return useIntersectionObserver(ref);
			});

			expect(observeMock).not.toHaveBeenCalled();
		});
	});

	describe("without IntersectionObserver support", () => {
		beforeEach(() => {
			// Remove IntersectionObserver support
			Object.defineProperty(window, "IntersectionObserver", {
				writable: true,
				configurable: true,
				value: undefined,
			});
		});

		it("should not crash when IntersectionObserver is not available", () => {
			expect(() => {
				renderHook(() => {
					const ref = useRef<HTMLDivElement>(document.createElement("div"));
					useIntersectionObserver(ref);
					return ref;
				});
			}).not.toThrow();
		});

		it("should return null when IntersectionObserver is not supported", () => {
			const { result } = renderHook(() => {
				const ref = useRef<HTMLDivElement>(document.createElement("div"));
				return useIntersectionObserver(ref);
			});

			expect(result.current).toBeNull();
		});
	});

	describe("useInView", () => {
		beforeEach(() => {
			// Restore IntersectionObserver
			Object.defineProperty(window, "IntersectionObserver", {
				writable: true,
				configurable: true,
				value: IntersectionObserverMock,
			});
		});

		it("should return ref and visibility state", () => {
			const { result } = renderHook(() => useInView());

			expect(result.current).toHaveLength(2);
			expect(result.current[0]).toBeDefined(); // ref
			expect(typeof result.current[1]).toBe("boolean"); // isVisible
		});

		it("should initialize with not visible state", () => {
			const { result } = renderHook(() => useInView());

			const [, isVisible] = result.current;
			expect(isVisible).toBe(false);
		});

		it("should handle freezeOnceVisible option", () => {
			const { result } = renderHook(() =>
				useInView({ freezeOnceVisible: true }),
			);

			expect(result.current).toBeDefined();
		});
	});
});
