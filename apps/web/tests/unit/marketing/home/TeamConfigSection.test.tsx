import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	};
});

import { TeamConfigSection } from "@marketing/home/components/TeamConfigSection";

describe("TeamConfigSection", () => {
	test("renders headline and description", () => {
		render(<TeamConfigSection />);

		expect(
			screen.getByRole("heading", {
				name: /Standardize protection across every workspace/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(/SnapBack reads one declarative file/i),
		).toBeInTheDocument();
	});

	test("displays .snapbackrc code block", () => {
		render(<TeamConfigSection />);

		expect(screen.getByText(".snapbackrc")).toBeInTheDocument();
		expect(screen.getByText(/version: 2\.1/i)).toBeInTheDocument();
		expect(screen.getByText(/hats:/i)).toBeInTheDocument();
	});

	test("copy button triggers clipboard write and shows feedback", async () => {
		const writeTextMock = vi.fn(() => Promise.resolve());
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});

		render(<TeamConfigSection />);

		const copyButton = screen.getByRole("button", { name: /copy/i });
		await userEvent.click(copyButton);
		expect(writeTextMock).toHaveBeenCalled();
		expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
	});

	test("download button triggers file download flow", async () => {
		const createObjectURL = vi.fn(() => "blob:url");
		const revokeObjectURL = vi.fn();
		Object.defineProperty(window.URL, "createObjectURL", {
			value: createObjectURL,
		});
		Object.defineProperty(window.URL, "revokeObjectURL", {
			value: revokeObjectURL,
		});

		render(<TeamConfigSection />);

		const downloadButton = screen.getAllByRole("button", {
			name: /download/i,
		})[0];
		await act(async () => {
			fireEvent.click(downloadButton);
		});

		expect(createObjectURL).toHaveBeenCalled();
	});

	test("renders coverage metrics", () => {
		render(<TeamConfigSection />);

		expect(screen.getByText(/12 → 1/i)).toBeInTheDocument();
		expect(screen.getByText(/38%/i)).toBeInTheDocument();
		expect(screen.getByText(/42 teams/i)).toBeInTheDocument();
	});

	test("shows policy highlight cards for each hat", () => {
		render(<TeamConfigSection />);

		expect(screen.getByText(/Critical hat/i)).toBeInTheDocument();
		expect(screen.getByText(/Protected hat/i)).toBeInTheDocument();
		expect(screen.getByText(/Watched hat/i)).toBeInTheDocument();
	});

	test("CTA buttons are present", () => {
		render(<TeamConfigSection />);

		expect(
			screen.getByRole("button", { name: /Get the policy starter kit/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /View configuration docs/i }),
		).toBeInTheDocument();
	});
});
