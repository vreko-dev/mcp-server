"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";

export type ToastType = "success" | "error" | "info";

export interface TerminalToastProps {
	message: string;
	type: ToastType;
	className?: string;
}

const prefixes: Record<ToastType, string> = {
	success: "✓",
	error: "✗",
	info: "→",
};

export function TerminalToast({ message, type, className }: TerminalToastProps) {
	return (
		<motion.div
			initial={{ x: 300, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: 300, opacity: 0 }}
			className={cn(
				"bg-terminal-bg border border-terminal-border rounded p-4 font-code text-sm shadow-lg",
				className,
			)}
		>
			<span
				className={cn(
					type === "success" && "text-snapback-400",
					type === "error" && "text-red-400",
					type === "info" && "text-blue-400",
				)}
			>
				{prefixes[type]}
			</span>
			<span className="ml-2 text-terminal-text">{message}</span>
			<span className="animate-pulse ml-1">_</span>
		</motion.div>
	);
}
