import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

vi.mock("motion/react", () => {
	const createComponent =
		(tag: keyof JSX.IntrinsicElements) =>
		({ children, ...props }: any) =>
			React.createElement(tag, props, children);

	return {
		motion: new Proxy(
			{},
			{
				get: (_target, prop) =>
					createComponent(prop as keyof JSX.IntrinsicElements),
			},
		),
		AnimatePresence: ({ children }: { children: React.ReactNode }) => (
			<>{children}</>
		),
	};
});

import { InteractiveDemo } from "@marketing/home/components/InteractiveDemo";

describe("InteractiveDemo", () => {
	test("renders hat selector buttons and file list", () => {
		render(<InteractiveDemo />);

		expect(
			screen.getByRole("button", { name: /critical/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /protected/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /watched/i }),
		).toBeInTheDocument();

		expect(screen.getByText("package.json")).toBeInTheDocument();
	});

	test("assigning a hat logs activity", () => {
		render(<InteractiveDemo />);

		const fileButton = screen.getByLabelText(
			/Assign protected protection to package\.json/i,
		);
		fireEvent.click(fileButton);

		expect(
			screen.getByText(/hat applied to package\.json/i),
		).toBeInTheDocument();
	});
});
