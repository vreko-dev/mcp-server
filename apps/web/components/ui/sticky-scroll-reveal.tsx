"use client";
import { cn } from "@ui/lib";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import type React from "react";
import { useRef, useState } from "react";

export const StickyScrollReveal = ({
	content,
	contentClassName,
	className,
}: {
	content: {
		title: string;
		description: string;
		content?: React.ReactNode;
	}[];
	contentClassName?: string;
	className?: string;
}) => {
	const [activeCard, setActiveCard] = useState(0);
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		container: ref,
		offset: ["start start", "end start"],
	});
	const cardLength = content.length;

	useMotionValueEvent(scrollYProgress, "change", (latest) => {
		const cardsBreakpoints = content.map((_, index) => index / cardLength);
		const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
			const currentBreakpoint = cardsBreakpoints[acc];
			if (currentBreakpoint === undefined) {
				return acc;
			}
			const distance = Math.abs(latest - breakpoint);
			if (distance < Math.abs(latest - currentBreakpoint)) {
				return index;
			}
			return acc;
		}, 0);
		setActiveCard(closestBreakpointIndex);
	});

	const backgroundColors = ["var(--slate-900)", "var(--black)", "var(--neutral-900)"];

	return (
		<motion.div
			animate={{
				backgroundColor: backgroundColors[activeCard % backgroundColors.length],
			}}
			className={cn(
				"h-[30rem] overflow-y-auto flex justify-center relative space-x-10 rounded-md p-10 py-0 no-visible-scrollbar",
				className,
			)}
			ref={ref}
		>
			<div className="div relative flex items-start px-4">
				<div className="max-w-2xl">
					{content.map((item, index) => (
						<div key={item.title + index} className="my-20">
							<motion.h2
								initial={{
									opacity: 0,
								}}
								animate={{
									opacity: activeCard === index ? 1 : 0.3,
								}}
								className="text-2xl font-bold text-slate-100"
							>
								{item.title}
							</motion.h2>
							<motion.div
								initial={{
									opacity: 0,
								}}
								animate={{
									opacity: activeCard === index ? 1 : 0.3,
								}}
								className="text-kg text-slate-300 max-w-sm mt-10"
							>
								{item.description}
							</motion.div>
							{/* Mobile Only Content */}
							<div
								className={cn(
									"block lg:hidden h-60 w-full mt-4 rounded-md bg-white sticky overflow-hidden",
									contentClassName,
								)}
							>
								{content[index]?.content ?? null}
							</div>
						</div>
					))}
					<div className="h-40" />
				</div>
			</div>
			<div
				className={cn(
					"hidden lg:block h-60 w-80 rounded-md bg-white sticky top-0 overflow-hidden",
					contentClassName,
				)}
			>
				<AnimatePresence mode="wait">
					{content[activeCard] && (
						<motion.div
							key={content[activeCard].title + activeCard}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="h-full w-full flex items-center justify-center text-slate-950"
						>
							{content[activeCard].content ?? null}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
};
