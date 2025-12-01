import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileFeatureTabs } from "../../modules/marketing/home/components/MobileFeatureTabs";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	AlertTriangleIcon: () => <div>AlertTriangleIcon</div>,
	FileTextIcon: () => <div>FileTextIcon</div>,
	ShieldCheckIcon: () => <div>ShieldCheckIcon</div>,
	CheckCircleIcon: () => <div>CheckCircleIcon</div>,
}));

// Mock @ui/components/accordion
vi.mock("@ui/components/accordion", () => ({
	Accordion: ({ children }: any) => <div>{children}</div>,
	AccordionContent: ({ children }: any) => <div>{children}</div>,
	AccordionItem: ({ children, value }: any) => (
		<div data-value={value}>{children}</div>
	),
	AccordionTrigger: ({ children }: any) => (
		<button type="button">{children}</button>
	),
}));

describe("MobileFeatureTabs", () => {
	it("should render all feature tabs and descriptions", () => {
		render(<MobileFeatureTabs />);

		// Check if all feature tabs are rendered
		expect(screen.getByText("Backup")).toBeInTheDocument();
		expect(screen.getByText("Security")).toBeInTheDocument();
		expect(screen.getByText("Recovery")).toBeInTheDocument();

		// Check if feature descriptions are rendered
		expect(
			screen.getByText("Automatic, secure backups of your code"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Enterprise-grade encryption and compliance"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Instant recovery with version control"),
		).toBeInTheDocument();
	});

	it("should render feature highlights", () => {
		render(<MobileFeatureTabs />);

		// Check if feature highlights are rendered
		expect(screen.getByText("Real-time sync")).toBeInTheDocument();
		expect(
			screen.getByText("Continuous backup as you code"),
		).toBeInTheDocument();

		expect(screen.getByText("End-to-end encryption")).toBeInTheDocument();
		expect(
			screen.getByText("Your data is encrypted before leaving your device"),
		).toBeInTheDocument();

		expect(screen.getByText("Git integration")).toBeInTheDocument();
		expect(
			screen.getByText("Seamless integration with Git workflows"),
		).toBeInTheDocument();
	});
});
