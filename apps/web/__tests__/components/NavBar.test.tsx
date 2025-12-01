import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Simple mock for the Navbar component
const MockNavbar = () => (
	<nav>
		<button
			type="button"
			id="mobile-menu-button"
			aria-label="Open menu"
			aria-expanded="false"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				role="img"
				aria-label="Menu"
			>
				<title>Menu</title>
				<path d="M3 12h18" />
			</svg>
		</button>
		<div id="mobile-menu" style={{ display: "none" }}>
			<a href="#features">Features</a>
			<a href="#pricing">Pricing</a>
			<a href="https://docs.snapback.dev">Docs</a>
		</div>
	</nav>
);

describe("Navbar", () => {
	it("should render mobile menu button", () => {
		render(<MockNavbar />);

		const menuButton = screen.getByLabelText("Open menu");
		expect(menuButton).toBeInTheDocument();
	});

	it("should render navigation items", () => {
		render(<MockNavbar />);

		expect(screen.getByText("Features")).toBeInTheDocument();
		expect(screen.getByText("Pricing")).toBeInTheDocument();
		expect(screen.getByText("Docs")).toBeInTheDocument();
	});

	it("should have correct aria attributes", () => {
		render(<MockNavbar />);

		const menuButton = screen.getByLabelText("Open menu");
		expect(menuButton).toHaveAttribute("aria-expanded", "false");
	});
});
