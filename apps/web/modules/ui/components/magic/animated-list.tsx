"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { type ReactNode, useEffect, useState } from "react";

export interface AnimatedListProps {
	className?: string;
	children: React.ReactNode;
	delay?: number;
}

export const AnimatedList = React.memo(({ className, children, delay = 1000 }: AnimatedListProps) => {
	const [messages, setMessages] = useState<ReactNode[]>([]);
	const childrenArray = React.Children.toArray(children);

	useEffect(() => {
		const interval = setInterval(() => {
			if (messages.length < childrenArray.length) {
				setMessages((prev) => [childrenArray[prev.length], ...prev]);
			}
		}, delay);

		return () => clearInterval(interval);
	}, [childrenArray, delay, messages.length]);

	return (
		<div className={`flex flex-col items-center gap-4 ${className}`}>
			<AnimatePresence>
				{messages.map((item, index) => (
					<motion.div
						key={index}
						layout
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 20,
						}}
					>
						{item}
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
});

AnimatedList.displayName = "AnimatedList";
