"use client";

import { cn } from "@ui/lib";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type React from "react";
import { useRef } from "react";

interface Card3DProps {
	children: React.ReactNode;
	className?: string;
	containerClassName?: string;
}

export const Card3D = ({ children, className, containerClassName }: Card3DProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useSpring(useTransform(y, [-100, 100], [30, -30]), {
		stiffness: 200,
		damping: 20,
	});
	const rotateY = useSpring(useTransform(x, [-100, 100], [-30, 30]), {
		stiffness: 200,
		damping: 20,
	});

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!ref.current) {
			return;
		}
		const rect = ref.current.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const rotX = (mouseY - height / 2) / 10;
		const rotY = (mouseX - width / 2) / 10;
		x.set(rotY);
		y.set(rotX);
	};

	const handleMouseLeave = () => {
		x.set(0);
		y.set(0);
	};

	return (
		<div
			ref={ref}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			className={cn("relative", containerClassName)}
		>
			<motion.div
				style={{
					rotateX,
					rotateY,
					transformStyle: "preserve-3d",
				}}
				className="relative"
			>
				<div
					style={{
						transform: "translateZ(50px)",
						transformStyle: "preserve-3d",
					}}
					className={cn(
						"rounded-2xl border border-neutral-200 bg-white dark:bg-black/[0.9] dark:border-white/[0.1] p-6",
						className,
					)}
				>
					{children}
				</div>
			</motion.div>
		</div>
	);
};
