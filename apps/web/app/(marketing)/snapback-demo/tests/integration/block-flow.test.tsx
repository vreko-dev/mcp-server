import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SnapBackDemo } from "../../components/SnapBackDemo";
import { SnapBackProvider } from "../../context/SnapBackContext";
import { db } from "../../persistence/db";

describe("Protection prompts", () => {
	beforeEach(async () => {
		await db.close();
		await db.delete();
		await db.open();
	});

	const renderDemo = () =>
		render(
			<SnapBackProvider>
				<SnapBackDemo useSimpleEditor />
			</SnapBackProvider>,
		);

	it("allows skip for warn level and only snapshots on confirm", async () => {
		const user = userEvent.setup();
		renderDemo();

		const fileButton = await screen.findByRole("button", {
			name: "Button.tsx",
		});
		await user.click(fileButton);

		await screen.findByRole("button", { name: /Protection: Warning/i });

		const saveButton = screen.getByRole("button", {
			name: /Save current file/i,
		});
		await user.click(saveButton);

		const prompt = await screen.findByRole("dialog");
		expect(prompt).toHaveTextContent(/Warning: Protected File/i);
		expect(
			screen.getByRole("button", { name: /Skip & Continue/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Skip & Continue/i }));

		await waitFor(() => {
			expect(screen.getByText(/Snapshots: 0/)).toBeInTheDocument();
		});

		await user.click(saveButton);
		await screen.findByRole("dialog");
		await user.click(
			screen.getByRole("button", { name: /Create Snapshot & Continue/i }),
		);

		await waitFor(() => {
			expect(screen.getByText(/Snapshots: 1/)).toBeInTheDocument();
		});
	});

	it("blocks save until snapshot is created for block level", async () => {
		const user = userEvent.setup();
		renderDemo();

		const fileButton = await screen.findByRole("button", {
			name: "webpack.config.ts",
		});
		await user.click(fileButton);

		await screen.findByRole("button", { name: /Protection: Blocking/i });

		const saveButton = screen.getByRole("button", {
			name: /Save current file/i,
		});
		await user.click(saveButton);

		const prompt = await screen.findByRole("dialog");
		expect(prompt).toHaveTextContent(/Blocked: Protected File/i);
		expect(
			screen.queryByRole("button", { name: /Skip & Continue/i }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Cancel/i }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText(/Snapshots: 0/)).toBeInTheDocument();

		await user.click(saveButton);
		await screen.findByRole("dialog");
		await user.click(
			screen.getByRole("button", { name: /Create Snapshot & Continue/i }),
		);

		await waitFor(() => {
			expect(screen.getByText(/Snapshots: 1/)).toBeInTheDocument();
		});
	});
});
