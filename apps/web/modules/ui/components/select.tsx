"use client";

import { CheckIcon } from "@radix-ui/react-icons";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@ui/lib";
import { ChevronsUpDownIcon } from "lucide-react";
import type * as React from "react";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) => (
	<SelectPrimitive.Trigger
		className={cn(
			"flex h-9 w-full items-center justify-between rounded-md bg-card shadow-xs border border-input px-3 py-2 text-base ring-offset-background placeholder:text-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
			className,
		)}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<ChevronsUpDownIcon className="size-4 opacity-50" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
);

const SelectContent = ({
	className,
	children,
	position = "popper",
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			className={cn(
				"relative z-[9999] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-[#1a1a1a] text-white shadow-lg",
				"data-[state=open]:animate-in data-[state=closed]:animate-out",
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
				"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
				"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				className,
			)}
			position={position}
			sideOffset={sideOffset}
			{...props}
		>
			<SelectPrimitive.Viewport
				className={cn(
					"p-1",
					position === "popper" &&
						"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
);

const SelectLabel = ({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) => (
	<SelectPrimitive.Label className={cn("px-2 py-1.5 font-semibold text-sm", className)} {...props} />
);

const SelectItem = ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) => (
	<SelectPrimitive.Item
		className={cn(
			"relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pr-8 pl-3 text-sm outline-none",
			"focus:bg-[#34D399]/10 focus:text-[#34D399]",
			"hover:bg-[#34D399]/5",
			"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			"transition-colors",
			className,
		)}
		{...props}
	>
		<span className="absolute right-2 flex h-4 w-4 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<CheckIcon className="h-4 w-4 text-[#34D399]" />
			</SelectPrimitive.ItemIndicator>
		</span>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
);

const SelectSeparator = ({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) => (
	<SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue };
