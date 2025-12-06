"use client";

import { cn } from "@marketing/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface CyclingChipProps {
	items: string[];
	interval?: number;
	className?: string;
}

export function CyclingChip({ items, interval = 3000, className }: CyclingChipProps) {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setIndex((current) => (current + 1) % items.length);
		}, interval);
		return () => clearInterval(timer);
	}, [items.length, interval]);

	return (
		<div className={cn("relative h-6 overflow-hidden flex items-center", className)}>
			<AnimatePresence mode="wait">
				<motion.div
					key={index}
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -20, opacity: 0 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
				>
					<span className="px-2 py-0.5 rounded-full bg-[var(--snapback-green)]/10 text-[var(--snapback-green)] text-xs font-medium border border-[var(--snapback-green)]/20">
						{items[index]}
					</span>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
