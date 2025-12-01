"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";

export interface ProtectionStatusProps {
	active: boolean;
	className?: string;
	label?: string;
}

export function ProtectionStatus({
	active,
	className,
	label,
}: ProtectionStatusProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="relative w-3 h-3">
				{/* Outer glow ring */}
				<motion.div
					className={cn(
						"absolute inset-0 rounded-full",
						active ? "bg-snapback-500" : "bg-gray-500",
					)}
					animate={
						active
							? {
									scale: [1, 1.2, 1],
									opacity: [0.5, 0, 0.5],
								}
							: {}
					}
					transition={{
						duration: 2,
						repeat: Number.POSITIVE_INFINITY,
					}}
				/>

				{/* Inner dot */}
				<motion.div
					className={cn(
						"w-3 h-3 rounded-full",
						active ? "bg-snapback-400" : "bg-gray-400",
					)}
					animate={
						active
							? {
									scale: [1, 1.1, 1],
								}
							: {}
					}
					transition={{
						duration: 2,
						repeat: Number.POSITIVE_INFINITY,
					}}
				/>
			</div>

			<span className="text-sm">
				{label || (active ? "Protected" : "Inactive")}
			</span>
		</div>
	);
}
