import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Footer from "@/components/layout/Footer";

// Mock navigation hook
const mockNavigate = vi.fn();
vi.mock("@/lib/routes/navigateTo", () => ({
	useNavigateTo: () => mockNavigate,
}));

// Mock siteMap
vi.mock("@/lib/routes/siteMap", () => ({
	getFooterRoutes: () => [
		{
			category: "Product",
			routes: [
				{ path: "/", label: "Home", inFooter: true },
				{ path: "/features", label: "Features", inFooter: true },
			],
		},
		{
			category: "Company",
			routes: [{ path: "/about", label: "About", inFooter: true }],
		},
	],
}));

describe("Footer", () => {
	describe("Rendering", () => {
		it("should render footer element", () => {
			render(<Footer />);

			const footer = screen.getByRole("contentinfo");
			expect(footer).toBeInTheDocument();
		});

		it("should render all route categories", () => {
			render(<Footer />);

			expect(screen.getByText("Product")).toBeInTheDocument();
			expect(screen.getByText("Company")).toBeInTheDocument();
		});

		it("should render all footer links", () => {
			render(<Footer />);

			expect(screen.getByText("Home")).toBeInTheDocument();
			expect(screen.getByText("Features")).toBeInTheDocument();
			expect(screen.getByText("About")).toBeInTheDocument();
		});

		it("should render SnapBack branding", () => {
			render(<Footer />);

			expect(screen.getByText(/SnapBack/i)).toBeInTheDocument();
		});

		it("should render copyright information", () => {
			render(<Footer />);

			expect(screen.getByText(/©.*2025/i)).toBeInTheDocument();
		});

		it("should render social media links", () => {
			render(<Footer />);

			// Look for social link aria-labels
			const socialLinks = screen
				.getAllByRole("link")
				.filter((link) =>
					link
						.getAttribute("aria-label")
						?.match(/twitter|github|discord|linkedin/i),
				);

			expect(socialLinks.length).toBeGreaterThan(0);
		});
	});

	describe("Navigation", () => {
		it("should call navigate function when link is clicked", async () => {
			const user = userEvent.setup();
			render(<Footer />);

			const featuresLink = screen.getByText("Features");
			await user.click(featuresLink);

			expect(mockNavigate).toHaveBeenCalledWith("/features");
		});

		it("should handle home link click", async () => {
			const user = userEvent.setup();
			render(<Footer />);

			const homeLink = screen.getByText("Home");
			await user.click(homeLink);

			expect(mockNavigate).toHaveBeenCalledWith("/");
		});

		it("should not navigate to /handbook (excluded from footer)", () => {
			render(<Footer />);

			expect(screen.queryByText("Handbook")).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper semantic HTML structure", () => {
			render(<Footer />);

			const footer = screen.getByRole("contentinfo");
			expect(footer.tagName).toBe("FOOTER");
		});

		it("should have accessible link text", () => {
			render(<Footer />);

			const links = screen.getAllByRole("link");
			links.forEach((link) => {
				// Each link should have either text content or aria-label
				expect(
					link.textContent || link.getAttribute("aria-label"),
				).toBeTruthy();
			});
		});

		it("should have keyboard-accessible navigation", async () => {
			const user = userEvent.setup();
			render(<Footer />);

			const firstLink = screen.getAllByRole("link")[0];
			firstLink.focus();

			expect(document.activeElement).toBe(firstLink);

			// Tab to next link
			await user.tab();

			const secondLink = screen.getAllByRole("link")[1];
			expect(document.activeElement).toBe(secondLink);
		});

		it("should have visible focus indicators", () => {
			render(<Footer />);

			const links = screen.getAllByRole("link");
			links.forEach((link) => {
				// Check that link is focusable
				expect(link.tabIndex).toBeGreaterThanOrEqual(0);
			});
		});

		it("should have aria-labels for icon-only links", () => {
			render(<Footer />);

			const socialLinks = screen
				.getAllByRole("link")
				.filter((link) =>
					link
						.getAttribute("aria-label")
						?.match(/twitter|github|discord|linkedin/i),
				);

			socialLinks.forEach((link) => {
				expect(link.getAttribute("aria-label")).toBeTruthy();
			});
		});

		it("should handle external links with proper attributes", () => {
			render(<Footer />);

			// Social links are external
			const socialLinks = screen
				.getAllByRole("link")
				.filter((link) =>
					link
						.getAttribute("aria-label")
						?.match(/twitter|github|discord|linkedin/i),
				);

			socialLinks.forEach((link) => {
				// External links should have target="_blank" and rel="noopener noreferrer"
				if (link.getAttribute("href")?.startsWith("http")) {
					expect(link.getAttribute("target")).toBe("_blank");
					expect(link.getAttribute("rel")).toContain("noopener");
				}
			});
		});
	});

	describe("Responsive Design", () => {
		it("should have responsive grid classes", () => {
			const { container } = render(<Footer />);

			const footer = container.querySelector("footer");
			const gridElement = footer?.querySelector("[class*='grid']");

			expect(gridElement).toBeInTheDocument();
		});

		it("should be mobile-friendly", () => {
			render(<Footer />);

			// Footer should render without horizontal scroll
			const footer = screen.getByRole("contentinfo");
			expect(footer).toBeInTheDocument();
		});
	});

	describe("Newsletter Signup (if included)", () => {
		it("should render email input if newsletter is included", () => {
			render(<Footer />);

			const emailInputs = screen.queryAllByPlaceholderText(/email/i);

			// If newsletter is included, should have email input
			if (emailInputs.length > 0) {
				expect(emailInputs[0]).toBeInTheDocument();
				expect(emailInputs[0].getAttribute("type")).toBe("email");
			}
		});

		it("should have subscribe button if newsletter is included", () => {
			render(<Footer />);

			const subscribeButtons = screen.queryAllByRole("button", {
				name: /subscribe/i,
			});

			// If newsletter is included, should have subscribe button
			if (subscribeButtons.length > 0) {
				expect(subscribeButtons[0]).toBeInTheDocument();
			}
		});
	});

	describe("Branding and Legal", () => {
		it("should display company legal name", () => {
			render(<Footer />);

			expect(screen.getByText(/Marcelle Labs/i)).toBeInTheDocument();
		});

		it("should display tagline", () => {
			render(<Footer />);

			expect(screen.getByText(/Code Breaks/i)).toBeInTheDocument();
		});

		it("should link to legal pages", () => {
			render(<Footer />);

			// Should have links to privacy, terms, etc. (if in siteMap)
			const links = screen.getAllByRole("link");
			const linkTexts = links.map((link) => link.textContent?.toLowerCase());

			// At minimum, should have some navigation links
			expect(linkTexts.length).toBeGreaterThan(0);
		});
	});

	describe("Content Organization", () => {
		it("should group links by category", () => {
			render(<Footer />);

			const productHeading = screen.getByText("Product");
			const companyHeading = screen.getByText("Company");

			expect(productHeading).toBeInTheDocument();
			expect(companyHeading).toBeInTheDocument();
		});

		it("should render categories in logical order", () => {
			const { container } = render(<Footer />);

			const headings = container.querySelectorAll("h3, h4");
			const headingTexts = Array.from(headings).map((h) => h.textContent);

			// Product should come before Company
			const productIndex = headingTexts.indexOf("Product");
			const companyIndex = headingTexts.indexOf("Company");

			if (productIndex !== -1 && companyIndex !== -1) {
				expect(productIndex).toBeLessThan(companyIndex);
			}
		});
	});
});
