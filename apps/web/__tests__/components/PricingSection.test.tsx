/**
 * Tests for the deprecated PricingSection component
 * @deprecated This tests the deprecated home/components/PricingSection.tsx
 *
 * For the active pricing implementation, see:
 * - apps/web/app/(marketing)/pricing/client.tsx
 * - @marketing/components/ui/pricing-card.tsx
 */
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

		// Check if the section title is rendered (using partial text match)
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Simple.*Transparent.*Pricing/i);

		// Check if all pricing plans are rendered (matching actual component content)
		expect(screen.getByText("Starter")).toBeInTheDocument();
		expect(screen.getByText("Pro")).toBeInTheDocument();
		expect(screen.getByText("Enterprise")).toBeInTheDocument();

		// Check if pricing plan descriptions are rendered (matching actual component)
		expect(screen.getByText("Perfect for individual developers")).toBeInTheDocument();
		expect(screen.getByText("For professional developers and teams")).toBeInTheDocument();
		expect(screen.getByText("For organizations with advanced needs")).toBeInTheDocument();
	});

	it("should render CTAs with correct text", () => {
		render(<PricingSection />);

		// Check if CTAs have correct text (matching actual component)
		expect(screen.getByText("Get Started Free")).toBeInTheDocument();
		expect(screen.getByText("Start Free Trial")).toBeInTheDocument();
		expect(screen.getByText("Contact Sales")).toBeInTheDocument();
	});

	it("should render statistics", () => {
		render(<PricingSection />);

		// Check if statistics are rendered (matching actual component stats)
		expect(screen.getByText("10k+")).toBeInTheDocument();
		expect(screen.getByText("Developers Protected")).toBeInTheDocument();

		expect(screen.getByText("99.9%")).toBeInTheDocument();
		expect(screen.getByText("Uptime")).toBeInTheDocument();

		expect(screen.getByText("500k+")).toBeInTheDocument();
		expect(screen.getByText("Checkpoints Created")).toBeInTheDocument();

		expect(screen.getByText("24/7")).toBeInTheDocument();
		expect(screen.getByText("Support")).toBeInTheDocument();
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
