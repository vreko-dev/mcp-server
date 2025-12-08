import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "../../modules/marketing/shared/components/NavBar";

// Mocks
vi.mock("@saas/auth/hooks/use-session", () => ({
	useSession: vi.fn(() => ({ user: null })),
}));

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(() => "/"),
}));

describe("NavBar", () => {
	it("renders 'Get Started' link pointing to /waitlist when user is not logged in", () => {
		render(<NavBar />);

		const getStartedLink = screen.getByRole("link", { name: /Get Started/i });
		expect(getStartedLink).toHaveAttribute("href", "/waitlist");
	});
});
