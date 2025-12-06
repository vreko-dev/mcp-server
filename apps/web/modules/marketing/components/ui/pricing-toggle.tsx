"use client";

import { cn } from "@ui/lib";
import { m } from "motion/react";

interface PricingToggleProps {
	value: "monthly" | "annual";
	onChange: (value: "monthly" | "annual") => void;
	className?: string;
}

export const PricingToggle = ({ value, onChange, className }: PricingToggleProps) => {
	return (
		<div className={cn("inline-flex items-center bg-gray-900 p-1 rounded-full border border-gray-700", className)}>
			<button
				type="button"
				onClick={() => onChange("monthly")}
				className={cn(
					"relative px-6 py-2 text-sm font-medium rounded-full transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
					value === "monthly" ? "text-black" : "text-gray-400 hover:text-white",
				)}
			>
				{value === "monthly" && (
					<m.div
						layoutId="pricing-toggle"
						className="absolute inset-0 bg-[#10B981] rounded-full shadow-lg shadow-[#10B981]/30"
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 30,
						}}
					/>
				)}
				<span className="relative z-10">Monthly</span>
			</button>

			<button
				type="button"
				onClick={() => onChange("annual")}
				className={cn(
					"relative px-6 py-2 text-sm font-medium rounded-full transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
					value === "annual" ? "text-black" : "text-gray-400 hover:text-white",
				)}
			>
				{value === "annual" && (
					<m.div
						layoutId="pricing-toggle"
						className="absolute inset-0 bg-[#10B981] rounded-full shadow-lg shadow-[#10B981]/30"
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 30,
						}}
					/>
				)}
				<span className="relative z-10 flex items-center gap-1.5">
					Annual
					<span className="text-[10px] font-bold uppercase">Save 20%</span>
				</span>
			</button>
		</div>
	);
};
