"use client";
import { AnimatePresence, m, useScroll } from "motion/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ContentItem {
	title: string;
	description: string;
	content: React.ReactNode;
}

export const StickyScrollReveal = ({
	content,
	contentClassName,
}: {
	content: ContentItem[];
	contentClassName?: string;
}) => {
	const [activeCard, setActiveCard] = useState(0);
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		container: ref,
		offset: ["start start", "end start"],
	});
	const cardLength = content.length;

	useEffect(() => {
		const unsubscribe = scrollYProgress.onChange((latest) => {
			const cardsBreakpoints = content.map((_, index) => index / Math.max(cardLength - 1, 1));
			const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
				const distance = Math.abs(latest - breakpoint);
				if (distance < Math.abs(latest - (cardsBreakpoints[acc] ?? 0))) {
					return index;
				}
				return acc;
			}, 0);
			setActiveCard(closestBreakpointIndex);
		});

		return unsubscribe;
	}, [scrollYProgress, cardLength, content]);

	const backgroundColors = useMemo(() => ["hsl(0 0% 4%)", "hsl(0 0% 5%)", "hsl(0 0% 6%)"], []);

	const linearGradients = useMemo(
		() => [
			"linear-gradient(to bottom right, hsl(140 100% 50% / 0.1), hsl(191 100% 50% / 0.1))",
			"linear-gradient(to bottom right, hsl(191 100% 50% / 0.1), hsl(15 100% 60% / 0.1))",
			"linear-gradient(to bottom right, hsl(15 100% 60% / 0.1), hsl(140 100% 50% / 0.1))",
		],
		[],
	);

	const [backgroundGradient, setBackgroundGradient] = useState(linearGradients[0]);

	useEffect(() => {
		setBackgroundGradient(linearGradients[activeCard % linearGradients.length]);
	}, [activeCard, linearGradients]);

	return (
		<m.div
			animate={{
				backgroundColor: backgroundColors[activeCard % backgroundColors.length] || "#000000",
			}}
			className="relative h-[30rem] overflow-y-auto flex justify-center"
			ref={ref}
		>
			<div className="div relative flex items-start px-10">
				<div className="max-w-2xl">
					{content.map((item, index) => (
						<div key={item.title + index} className="my-20">
							<m.h2
								initial={{
									opacity: 1,
								}}
								animate={{
									opacity: activeCard === index ? 1 : 0.3,
								}}
								transition={{ duration: 0.3 }}
								className="text-2xl font-bold text-foreground"
							>
								{item.title}
							</m.h2>
							<m.p
								initial={{
									opacity: 1,
								}}
								animate={{
									opacity: activeCard === index ? 1 : 0.3,
								}}
								transition={{ duration: 0.3 }}
								className="text-lg text-muted-foreground max-w-sm mt-10"
							>
								{item.description}
							</m.p>
						</div>
					))}
					<div className="h-60" />
				</div>
			</div>
			<div
				className={`hidden lg:block h-60 w-80 rounded-md bg-black sticky top-10 overflow-hidden border border-border/20 ${contentClassName}`}
				style={{
					background: backgroundGradient,
				}}
			>
				<AnimatePresence mode="wait">
					<m.div
						key={activeCard}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
						className="h-full w-full"
					>
						{content[activeCard]?.content ?? null}
					</m.div>
				</AnimatePresence>
			</div>
		</m.div>
	);
};
