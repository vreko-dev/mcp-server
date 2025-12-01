import Navbar from "@marketing/components/sections/navbar";
import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", async () => {
	const actual = await vi.importActual("next/link");
	return {
		...actual,
		default: ({
			children,
			href,
			...props
		}: {
			children: React.ReactNode;
			href: string;
			[key: string]: any;
		}) => (
			<a href={href} {...props}>
				{children}
			</a>
		),
	};
});

// Mock the Logo component
vi.mock("@shared/components/Logo", () => ({
	Logo: () => <div data-testid="logo">SnapBack Logo</div>,
}));

// Mock the MagneticHover component
vi.mock("@marketing/components/ui/magnetic-hover", () => ({
	MagneticHover: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: any;
	}) => <div {...props}>{children}</div>,
}));

// Mock the CommandPalette component
vi.mock("@marketing/components/ui/command-palette", () => ({
	CommandPalette: () => (
		<div data-testid="command-palette">Command Palette</div>
	),
}));

// Mock the hooks
vi.mock("@marketing/hooks/use-mobile-optimization", () => ({
	useMobileOptimization: () => ({
		isMobile: true,
		shouldReduceAnimations: false,
	}),
}));

vi.mock("@marketing/hooks/use-mobile-performance", () => ({
	useMobilePerformance: () => ({
		lockScroll: vi.fn(),
		unlockScroll: vi.fn(),
	}),
}));

describe("Mobile Menu", () => {
	it("should render mobile menu button", () => {
		render(<Navbar />);

		const menuButton = screen.getByLabelText("Open menu");
		expect(menuButton).toBeInTheDocument();
	});

	it("should toggle menu when button is clicked", () => {
		render(<Navbar />);

		const menuButton = screen.getByLabelText("Open menu");

		// Initially should show menu icon
		expect(menuButton.querySelector("svg")).toBeInTheDocument();

		// Click to open
		fireEvent.click(menuButton);

		// Should now show close icon
		expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
	});

	it("should not have hidden elements with opacity 0 and transform rotation", () => {
		render(<Navbar />);

		const menuButton = screen.getByLabelText("Open menu");

		// Check that the button doesn't have problematic styles
		const buttonStyle = window.getComputedStyle(menuButton);
		expect(buttonStyle.opacity).not.toBe("0");

		// Check that SVG inside button is visible
		const svgElement = menuButton.querySelector("svg");
		expect(svgElement).toBeInTheDocument();

		if (svgElement) {
			const svgStyle = window.getComputedStyle(svgElement);
			expect(svgStyle.opacity).not.toBe("0");
		}
	});
});
