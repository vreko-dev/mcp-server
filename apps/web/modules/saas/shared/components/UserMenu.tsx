"use client";

import { DropdownMenuSub } from "@radix-ui/react-dropdown-menu";
import { authClient } from "@snapback/auth/client";
import { useSession } from "@saas/auth/hooks/use-session";
import { UserAvatar } from "@shared/components/UserAvatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { BookIcon, HomeIcon, LogOutIcon, MoonIcon, MoreVerticalIcon, SettingsIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";

export function UserMenu({ showUserName }: { showUserName?: boolean }) {
	const { user } = useSession();
	const { setTheme: setCurrentTheme, theme: currentTheme } = useTheme();
	const [theme, setTheme] = useState<string>(currentTheme ?? "dark");

	const colorModeOptions = [
		{
			value: "dark",
			label: "Dark",
			icon: MoonIcon,
		},
	];

	const onLogout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: async () => {
						// Redirect to home page after successful sign out
						window.location.href = "/";
					},
				},
			});
		} catch (error) {
			console.error("Sign out failed:", error);
			// Still redirect on error to ensure user is logged out client-side
			window.location.href = "/";
		}
	};

	if (!user) {
		return null;
	}

	const { name, email, image } = user;

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex cursor-pointer w-full items-center justify-between gap-2 rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-primary md:w-[100%+1rem] md:px-2 md:py-1.5 md:hover:bg-primary/5"
					aria-label="User menu"
				>
					<span className="flex items-center gap-2">
						<UserAvatar name={name ?? ""} avatarUrl={image} />
						{showUserName && (
							<span className="text-left leading-tight">
								<span className="font-medium text-sm">{name}</span>
								<span className="block text-xs opacity-70">{email}</span>
							</span>
						)}
					</span>

					{showUserName && <MoreVerticalIcon className="size-4" />}
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuLabel>
					{name}
					<span className="block font-normal text-xs opacity-70">{email}</span>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				{/* Color mode selection */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<SunIcon className="mr-2 size-4" />
						Color Mode
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={theme}
								onValueChange={(value) => {
									setTheme(value);
									setCurrentTheme(value);
								}}
							>
								{colorModeOptions.map((option) => (
									<DropdownMenuRadioItem key={option.value} value={option.value}>
										<option.icon className="mr-2 size-4 opacity-50" />
										{option.label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>

				<DropdownMenuSeparator />

				<DropdownMenuItem asChild>
					<Link href="/app/settings/general">
						<SettingsIcon className="mr-2 size-4" />
						Account Settings
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem asChild>
					<Link href="https://docs.snapback.dev">
						<BookIcon className="mr-2 size-4" />
						Documentation
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem asChild>
					<Link href="/">
						<HomeIcon className="mr-2 size-4" />
						Home
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={onLogout}>
					<LogOutIcon className="mr-2 size-4" />
					Logout
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
