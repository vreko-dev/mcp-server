import { render, screen } from "@testing-library/react";
import { InfiniteMovingCards } from "../../modules/ui/components/aceternity/infinite-moving-cards";

// Mock the cn function
vi.mock("@ui/lib", () => ({
	cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

describe("InfiniteMovingCards", () => {
	const mockItems = [
		{ name: "Company 1", title: "Enterprise" },
		{ name: "Company 2", title: "Startup" },
		{ name: "Company 3", title: "Agency" },
	];

	it("renders correctly with items", () => {
		render(
			<InfiniteMovingCards
				items={mockItems}
				direction="left"
				speed="normal"
				pauseOnHover
			/>,
		);

		// Check if items are rendered
		mockItems.forEach((item) => {
			expect(screen.getByText(item.name)).toBeInTheDocument();
			expect(screen.getByText(item.title)).toBeInTheDocument();
		});
	});

	it("applies correct CSS classes", () => {
		render(
			<InfiniteMovingCards
				items={mockItems}
				direction="right"
				speed="fast"
				pauseOnHover={false}
				className="test-class"
			/>,
		);

		const container = screen.getByRole("list").parentElement;
		expect(container).toHaveClass("scroller");
		expect(container).toHaveClass("test-class");
	});
});
