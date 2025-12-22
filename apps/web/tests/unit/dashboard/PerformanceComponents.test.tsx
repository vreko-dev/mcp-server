/**
 * PerformanceIndicator, PerformanceMetrics, ProtectionStatus Component Tests
 * 4-path coverage per C-003, C-004
 */

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
	Zap: () => <svg data-testid="zap-icon" />,
	Package: () => <svg data-testid="package-icon" />,
	Timer: () => <svg data-testid="timer-icon" />,
	Cpu: () => <svg data-testid="cpu-icon" />,
	ShieldCheck: (props: any) => <svg data-testid="shield-icon" {...props} />,
}));

import { PerformanceIndicator } from "@/modules/saas/dashboard/components/PerformanceIndicator";
import { PerformanceMetrics } from "@/modules/saas/dashboard/components/PerformanceMetrics";
import { ProtectionStatus } from "@/modules/saas/dashboard/components/ProtectionStatus";

describe("PerformanceIndicator Component", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Happy Path", () => {
		it("renders null initially before FPS calculation", () => {
			const { container } = render(<PerformanceIndicator />);
			// Before first frame count, renders null
			expect(container.firstChild).toBeNull();
		});
	});

	describe("Edge Cases", () => {
		it("handles SSR gracefully (no window)", () => {
			const originalWindow = global.window;
			// @ts-ignore
			delete global.window;
			const { container } = render(<PerformanceIndicator />);
			expect(container.firstChild).toBeNull();
			global.window = originalWindow;
		});
	});
});

describe("PerformanceMetrics Component", () => {
	const defaultProps = {
		vsixSizeMB: 1.5,
		bundleSizeMB: 0.8,
		loadTimeMs: 350,
		activationTimeMs: 200,
	};

	describe("Happy Path", () => {
		it("renders all metric labels", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			expect(screen.getByText("VSIX Size")).toBeInTheDocument();
			expect(screen.getByText("Bundle Size")).toBeInTheDocument();
			expect(screen.getByText("Load Time")).toBeInTheDocument();
			expect(screen.getByText("Activation Time")).toBeInTheDocument();
		});

		it("displays values correctly", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			expect(screen.getByText("1.50 MB")).toBeInTheDocument();
			expect(screen.getByText("0.80 MB")).toBeInTheDocument();
			expect(screen.getByText("350 ms")).toBeInTheDocument();
			expect(screen.getByText("200 ms")).toBeInTheDocument();
		});

		it("shows targets for each metric", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			expect(screen.getByText("/ 2 MB")).toBeInTheDocument();
			expect(screen.getByText("/ 1 MB")).toBeInTheDocument();
			expect(screen.getByText("/ 500 ms")).toBeInTheDocument();
			expect(screen.getByText("/ 300 ms")).toBeInTheDocument();
		});

		it("displays Excellent status for good metrics", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			const excellentLabels = screen.getAllByText("Excellent");
			expect(excellentLabels.length).toBeGreaterThan(0);
		});
	});

	describe("Edge Cases", () => {
		it("handles zero values", () => {
			render(<PerformanceMetrics vsixSizeMB={0} bundleSizeMB={0} loadTimeMs={0} activationTimeMs={0} />);
			expect(screen.getByText("0.00 MB")).toBeInTheDocument();
			expect(screen.getByText("0 ms")).toBeInTheDocument();
		});

		it("handles values at target threshold", () => {
			render(<PerformanceMetrics vsixSizeMB={2.0} bundleSizeMB={1.0} loadTimeMs={500} activationTimeMs={300} />);
			const goodLabels = screen.getAllByText("Good");
			expect(goodLabels.length).toBeGreaterThan(0);
		});

		it("handles values exceeding budget", () => {
			render(<PerformanceMetrics vsixSizeMB={3.0} bundleSizeMB={2.0} loadTimeMs={700} activationTimeMs={500} />);
			const needsImprovementLabels = screen.getAllByText("Needs Improvement");
			expect(needsImprovementLabels.length).toBeGreaterThan(0);
		});

		it("shows percentage of budget correctly", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			expect(screen.getByText("75.0% of budget")).toBeInTheDocument(); // 1.5/2.0
			expect(screen.getByText("80.0% of budget")).toBeInTheDocument(); // 0.8/1.0
		});
	});

	describe("Accessibility", () => {
		it("has learn more link", () => {
			render(<PerformanceMetrics {...defaultProps} />);
			expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute("href", "/docs/performance");
		});
	});
});

describe("ProtectionStatus Component", () => {
	describe("Happy Path", () => {
		it("renders when active with snapshot count", () => {
			render(<ProtectionStatus snapshotCount={42} isActive={true} />);
			expect(screen.getByText("Protection Active")).toBeInTheDocument();
			expect(screen.getByText("42")).toBeInTheDocument();
			expect(screen.getByText("Snapshots Created")).toBeInTheDocument();
		});

		it("displays status message", () => {
			render(<ProtectionStatus snapshotCount={10} isActive={true} />);
			expect(screen.getByText("Your code is being monitored and protected")).toBeInTheDocument();
		});

		it("shows shield icon with aria-label", () => {
			render(<ProtectionStatus snapshotCount={5} isActive={true} />);
			expect(screen.getByTestId("shield-icon")).toHaveAttribute("aria-label", "Protection active");
		});
	});

	describe("Edge Cases", () => {
		it("returns null when not active", () => {
			const { container } = render(<ProtectionStatus snapshotCount={100} isActive={false} />);
			expect(container.firstChild).toBeNull();
		});

		it("handles zero snapshots", () => {
			render(<ProtectionStatus snapshotCount={0} isActive={true} />);
			expect(screen.getByText("0")).toBeInTheDocument();
		});

		it("handles large snapshot count", () => {
			render(<ProtectionStatus snapshotCount={999999} isActive={true} />);
			expect(screen.getByText("999999")).toBeInTheDocument();
		});
	});
});
