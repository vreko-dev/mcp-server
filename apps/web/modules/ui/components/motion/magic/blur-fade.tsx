"use client";

import { cn } from "@marketing/lib/utils";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

type BlurFadeProps = {
	children: React.ReactNode;
	className?: string;
	variant?: {
		hidden: { y: number; opacity: number; blur?: number };
		visible: { y: number; opacity: number; blur?: number };
	};
	duration?: number;
	delay?: number;
	yOffset?: number;
	inView?: boolean;
	inViewMargin?: string;
	blur?: string;
};

export const BlurFade = ({
	children,
	className,
	// variant = {  // TODO: Re-enable when variant customization is implemented
	// 	hidden: { y: 20, opacity: 0, blur: 4 },
	// 	visible: { y: -10, opacity: 1, blur: 0 },
	// },
	duration = 0.4,
	delay = 0,
	yOffset = 6,
	inView = false,
	inViewMargin = "-50px",
	blur = "6px",
}: BlurFadeProps) => {
	const ref = useRef(null);
	const inViewResult = useInView(ref, {
		once: true,
		margin: inViewMargin as any,
	});
	const isInView = !inView || inViewResult;

	return (
		<motion.div
			ref={ref}
			initial="hidden"
			animate={isInView ? "visible" : "hidden"}
			variants={{
				hidden: { opacity: 0, y: yOffset, filter: `blur(${blur})` },
				visible: { opacity: 1, y: -yOffset, filter: "blur(0px)" },
			}}
			transition={{
				duration: duration,
				delay: delay,
			}}
			className={cn("will-change-transform", className)}
		>
			{children}
		</motion.div>
	);
};
