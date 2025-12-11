import type React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function ShimmerButton({ children, className, size = "md", ...props }: ShimmerButtonProps) {
	return (
		<button
			className={cn(
				"relative inline-flex overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50",
				className,
			)}
			{...props}
		>
			<span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
			<span
				className={cn(
					"inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-6 py-1 text-sm font-medium text-white backdrop-blur-3xl",
					size === "lg" ? "px-8 py-3 text-lg" : "px-6 py-2",
				)}
			>
				{children}
			</span>
		</button>
	);
}
