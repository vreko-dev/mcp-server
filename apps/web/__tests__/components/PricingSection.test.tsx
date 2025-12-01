import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PricingSection } from "../../modules/marketing/home/components/PricingSection";

// Mock next/link
vi.mock("next/link", () => ({
	__esModule: true,
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	CheckIcon: () => <div>CheckIcon</div>,
	ChevronDownIcon: () => <div>ChevronDownIcon</div>,
	ChevronUpIcon: () => <div>ChevronUpIcon</div>,
	UsersIcon: () => <div>UsersIcon</div>,
	ZapIcon: () => <div>ZapIcon</div>,
	RocketIcon: () => <div>RocketIcon</div>,
	ShieldCheckIcon: () => <div>ShieldCheckIcon</div>,
}));

// Mock motion components
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	},
	AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock 3d-card component
vi.mock("../../modules/marketing/components/ui/3d-card", () => ({
	Card3D: ({ children, className }: any) => (
		<div className={className}>{children}</div>
	),
}));

// Mock Button component
vi.mock("@ui/components/button", () => ({
	Button: ({ children, className, variant, ...props }: any) => (
		<button className={className} {...props}>
			{children}
		</button>
	),
}));

describe("PricingSection", () => {
	it("should render all pricing plans and descriptions", () => {
		render(<PricingSection />);

		// Check if the section title parts are rendered
		expect(screen.getByText("Simple,")).toBeInTheDocument();
		expect(screen.getByText("transparent pricing")).toBeInTheDocument();

		// Check if all pricing plans are rendered
		expect(screen.getByText("Starter")).toBeInTheDocument();
		expect(screen.getByText("Professional")).toBeInTheDocument();
		expect(screen.getByText("Enterprise")).toBeInTheDocument();

		// Check if pricing plan descriptions are rendered
		expect(
			screen.getByText("Perfect for individuals and small teams"),
		).toBeInTheDocument();
		expect(
			screen.getByText("For growing teams with advanced needs"),
		).toBeInTheDocument();
		expect(
			screen.getByText("For large organizations with complex requirements"),
		).toBeInTheDocument();
	});

	it("should render CTAs with correct text", () => {
		render(<PricingSection />);

		// Check if CTAs have correct text (since they're not actually links in the component)
		expect(screen.getByText("Start Free Trial")).toBeInTheDocument();
		expect(screen.getByText("Get Started")).toBeInTheDocument();
		expect(screen.getByText("Contact Sales")).toBeInTheDocument();
	});

	it("should render statistics", () => {
		render(<PricingSection />);

		// Check if statistics are rendered
		expect(screen.getByText("99.9%")).toBeInTheDocument();
		expect(screen.getByText("Uptime")).toBeInTheDocument();

		expect(screen.getByText("24/7")).toBeInTheDocument();
		expect(screen.getByText("Support")).toBeInTheDocument();

		expect(screen.getByText("GDPR")).toBeInTheDocument();
		expect(screen.getByText("Compliant")).toBeInTheDocument();

		expect(screen.getByText("90+")).toBeInTheDocument();
		expect(screen.getByText("Integrations")).toBeInTheDocument();
	});

	// Keep this test skipped for now
	it.skip("toggles plan expansion", async () => {
		const user = userEvent.setup();
		render(<PricingSection />);

		// Initially, expanded features should not be visible
		expect(
			screen.queryByText("Advanced analytics dashboard"),
		).not.toBeInTheDocument();

		// Click on "Show More Features" for Starter plan
		const showMoreButtons = screen.getAllByText("Show More Features");
		await user.click(showMoreButtons[0]);

		// Now expanded features should be visible
		expect(
			screen.getByText("Advanced analytics dashboard"),
		).toBeInTheDocument();

		// Click again to collapse
		const showLessButton = screen.getByText("Show Less Features");
		await user.click(showLessButton);

		// Expanded features should not be visible again
		expect(
			screen.queryByText("Advanced analytics dashboard"),
		).not.toBeInTheDocument();
	});
});
