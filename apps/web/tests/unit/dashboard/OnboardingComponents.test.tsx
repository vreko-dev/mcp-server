/**
 * GettingStarted, QuickActions Component Tests
 * 4-path coverage per C-003, C-004
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("posthog-js", () => ({
	default: { __loaded: true, capture: vi.fn() },
}));

vi.mock("@analytics", () => ({
	AnalyticsEvents: {
		DASHBOARD_HELP_ACCESSED: "dashboard_help_accessed",
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, href, onClick, ...props }: any) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	Download: () => <svg data-testid="download-icon" />,
	Key: () => <svg data-testid="key-icon" />,
	Play: () => <svg data-testid="play-icon" />,
	Terminal: () => <svg data-testid="terminal-icon" />,
	Book: () => <svg data-testid="book-icon" />,
}));

import { GettingStarted } from "@/modules/saas/dashboard/components/GettingStarted";
import { QuickActions } from "@/modules/saas/dashboard/components/QuickActions";

describe("GettingStarted Component", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders title and description", () => {
			render(<GettingStarted />);
			expect(screen.getByText("Getting Started")).toBeInTheDocument();
			expect(screen.getByText(/Follow these steps/)).toBeInTheDocument();
		});

		it("renders all three steps with numbers", () => {
			render(<GettingStarted />);
			expect(screen.getByText("1")).toBeInTheDocument();
			expect(screen.getByText("2")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument();
		});

		it("displays step titles correctly", () => {
			render(<GettingStarted />);
			expect(screen.getByText("Install VS Code Extension")).toBeInTheDocument();
			expect(screen.getByText("Add Your API Key")).toBeInTheDocument();
			expect(screen.getByText("Start Coding")).toBeInTheDocument();
		});

		it("has correct links for each step", () => {
			render(<GettingStarted />);
			expect(screen.getByRole("link", { name: /Download Extension/ })).toHaveAttribute("href", "/download/vscode");
			expect(screen.getByRole("link", { name: /Create API Key/ })).toHaveAttribute("href", "/app/api-keys");
		});
	});

	describe("Analytics Tracking", () => {
		it("tracks extension download click", async () => {
			const posthog = await import("posthog-js");
			render(<GettingStarted />);
			fireEvent.click(screen.getByRole("link", { name: /Download Extension/ }));
			expect(posthog.default.capture).toHaveBeenCalledWith("dashboard_help_accessed", expect.objectContaining({
				doc_page: "getting_started_install_extension",
			}));
		});

		it("tracks API key creation click", async () => {
			const posthog = await import("posthog-js");
			render(<GettingStarted />);
			fireEvent.click(screen.getByRole("link", { name: /Create API Key/ }));
			expect(posthog.default.capture).toHaveBeenCalledWith("dashboard_help_accessed", expect.objectContaining({
				doc_page: "getting_started_create_api_key",
			}));
		});
	});
});

describe("QuickActions Component", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("Happy Path", () => {
		it("renders title and description", () => {
			render(<QuickActions />);
			expect(screen.getByText("Quick Actions")).toBeInTheDocument();
			expect(screen.getByText(/Get started with SnapBack/)).toBeInTheDocument();
		});

		it("renders all action items", () => {
			render(<QuickActions />);
			expect(screen.getByText("Download VS Code Extension")).toBeInTheDocument();
			expect(screen.getByText("Install CLI Tool")).toBeInTheDocument();
			expect(screen.getByText("Documentation")).toBeInTheDocument();
		});

		it("displays CLI install command", () => {
			render(<QuickActions />);
			expect(screen.getByText("npm install -g @snapback/cli")).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("VS Code download link has correct href", () => {
			render(<QuickActions />);
			expect(screen.getByRole("link", { name: /Download VS Code Extension/i }).closest("a")).toHaveAttribute(
				"href",
				"/download/vscode"
			);
		});

		it("docs link opens in correct location", () => {
			render(<QuickActions />);
			const docsLink = screen.getByRole("link", { name: /Documentation/i }).closest("a");
			expect(docsLink).toHaveAttribute("href", "https://docs.snapback.dev");
		});
	});

	describe("Analytics Tracking", () => {
		it("tracks VS Code extension click", async () => {
			const posthog = await import("posthog-js");
			render(<QuickActions />);
			const link = screen.getByText("Download VS Code Extension").closest("a");
			if (link) fireEvent.click(link);
			expect(posthog.default.capture).toHaveBeenCalled();
		});
	});
});
