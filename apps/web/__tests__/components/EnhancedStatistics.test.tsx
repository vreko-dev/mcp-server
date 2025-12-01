import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnhancedStatistics } from "../../modules/marketing/home/components/EnhancedStatistics";

// Mock the AnimatedNumber component directly
vi.mock("@marketing/components/ui/animated-number", () => ({
	AnimatedNumber: ({ value }: { value: number }) => (
		<span>{value.toLocaleString()}</span>
	),
}));

// Mock usehooks-ts
vi.mock("usehooks-ts", () => ({
	useMediaQuery: () => true,
	useWindowScroll: () => ({ y: 0 }),
}));

// Mock motion components
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
		h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
		p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
		span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
	},
}));

// Mock the NeonCard component
vi.mock("@marketing/components/ui/neon-card", () => ({
	NeonCard: ({ children, className }: any) => (
		<div className={className}>{children}</div>
	),
}));

describe("EnhancedStatistics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render the main heading and description", () => {
		render(<EnhancedStatistics />);

		// Check if the main heading is rendered
		expect(
			screen.getByText("Trusted by Developers Worldwide"),
		).toBeInTheDocument();

		// Check if the description is rendered
		expect(
			screen.getByText(
				"Join thousands of developers who rely on SnapBack for their backup needs",
			),
		).toBeInTheDocument();
	});

	it("should render all key statistics and summary text", () => {
		render(<EnhancedStatistics />);

		// Check if key statistic labels are rendered (simpler approach)
		expect(screen.getByText("Active Users")).toBeInTheDocument();
		expect(screen.getByText("Repositories Protected")).toBeInTheDocument();
		expect(screen.getByText("Snapshots Created")).toBeInTheDocument();
		expect(screen.getByText("Uptime")).toBeInTheDocument();
		expect(screen.getByText("Recovery Rate")).toBeInTheDocument();
		expect(screen.getByText("Security Rating")).toBeInTheDocument();

		// Check the summary text
		expect(
			screen.getByText(
				"Our commitment to excellence ensures your data is always safe and accessible",
			),
		).toBeInTheDocument();
	});
});
