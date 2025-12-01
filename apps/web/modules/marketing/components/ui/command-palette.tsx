"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Command } from "cmdk";
import { useEffect, useRef } from "react";

interface CommandPaletteProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
	const commandInputRef = useRef<HTMLInputElement>(null);

	const navItems = [
		{ name: "Product", link: "#product", label: "View product features" },
		{ name: "Features", link: "#features", label: "Explore capabilities" },
		{ name: "Pricing", link: "#pricing", label: "View pricing plans" },
		{
			name: "Docs",
			link: "https://docs.snapback.dev",
			label: "Read documentation",
			external: true,
		},
		{
			name: "GitHub",
			link: "https://github.com/snapback",
			label: "View on GitHub",
			external: true,
		},
	];

	// Focus management for command palette
	useEffect(() => {
		if (isOpen) {
			// Small delay to ensure dialog is mounted
			setTimeout(() => {
				commandInputRef.current?.focus();
			}, 0);
		}
	}, [isOpen]);

	const handleSelect = (value: string) => {
		const item = navItems.find((item) => item.name === value);
		if (item) {
			if (item.external) {
				window.open(item.link, "_blank", "noopener,noreferrer");
			} else {
				window.location.href = item.link;
			}
			onOpenChange(false);
		}
	};

	const handleCopyInstall = () => {
		navigator.clipboard.writeText("npm install snapback");
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />

				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
					aria-describedby="command-description"
				>
					<VisuallyHidden.Root asChild>
						<Dialog.Title>Command Menu</Dialog.Title>
					</VisuallyHidden.Root>

					<VisuallyHidden.Root asChild>
						<Dialog.Description id="command-description">
							Search for pages, actions, and settings
						</Dialog.Description>
					</VisuallyHidden.Root>

					<Command
						className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
						loop
					>
						<Command.Input
							ref={commandInputRef}
							placeholder="Search for anything..."
							className="w-full px-4 py-3 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
						/>

						<Command.List
							className="max-h-96 overflow-y-auto p-2"
							role="listbox"
						>
							<Command.Empty className="p-6 text-center text-gray-500">
								No results found
							</Command.Empty>

							<Command.Group heading="Navigation" role="group">
								{navItems.map((item) => (
									<Command.Item
										key={item.name}
										value={item.name}
										onSelect={handleSelect}
										className="px-3 py-2 rounded hover:bg-white/5 cursor-pointer"
										role="option"
									>
										{item.name}
									</Command.Item>
								))}
							</Command.Group>

							<Command.Group heading="Actions" role="group">
								<Command.Item
									value="copy-install"
									onSelect={handleCopyInstall}
									className="px-3 py-2 rounded hover:bg-white/5 cursor-pointer"
									role="option"
								>
									Copy: npm install snapback
								</Command.Item>
							</Command.Group>
						</Command.List>
					</Command>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
