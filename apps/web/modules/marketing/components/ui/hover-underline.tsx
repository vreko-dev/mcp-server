"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { motion } from "motion/react";
import Link from "next/link";
import { forwardRef } from "react";

interface HoverUnderlineProps {
	children: React.ReactNode;
	href?: string;
	className?: string;
	underlineClass?: string;
	[key: string]: any;
}

export const HoverUnderline = forwardRef<
	HTMLAnchorElement,
	HoverUnderlineProps
>(({ children, href, className, underlineClass, ...props }, ref) => {
	const reducedMotion = useReducedMotion();

	const content = (
		<motion.div
			whileHover={reducedMotion ? {} : "hover"}
			className={cn("relative inline-block", className)}
		>
			{children}

			{/* Animated underline */}
			<motion.div
				className={cn(
					"absolute bottom-0 left-0 right-0 h-0.5 bg-snapback-green",
					underlineClass,
				)}
				variants={{
					initial: { scaleX: 0, originX: 0 },
					hover: { scaleX: 1, originX: 0 },
				}}
				initial="initial"
				animate={reducedMotion ? { scaleX: 1 } : "initial"}
				transition={{ duration: 0.3, ease: "easeOut" }}
			/>
		</motion.div>
	);

	if (href) {
		return (
			<Link href={href} ref={ref} {...props}>
				{content}
			</Link>
		);
	}

	return content;
});

HoverUnderline.displayName = "HoverUnderline";
