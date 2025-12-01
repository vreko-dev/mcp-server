"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";

interface StaggerContainerProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	staggerDelay?: number;
	direction?: "up" | "down" | "left" | "right";
}

export function StaggerContainer({
	children,
	className = "",
	delay = 0.2,
	staggerDelay = 0.1,
	direction = "up",
}: StaggerContainerProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);
	const getInitialPosition = () => {
		switch (direction) {
			case "up":
				return { y: 30, x: 0 };
			case "down":
				return { y: -30, x: 0 };
			case "left":
				return { y: 0, x: 30 };
			case "right":
				return { y: 0, x: -30 };
			default:
				return { y: 30, x: 0 };
		}
	};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: staggerDelay,
				delayChildren: delay,
				ease: "easeInOut" as const,
			},
		},
	};

	const itemVariants = {
		hidden: {
			opacity: 0,
			...getInitialPosition(),
		},
		visible: {
			opacity: 1,
			y: 0,
			x: 0,
			transition: {
				type: "spring" as const,
				stiffness: 400,
				damping: 25,
				mass: 0.5,
			},
		},
	};

	// Render static version on server-side
	if (!isMounted) {
		return <div className={className}>{children}</div>;
	}

	return (
		<m.div
			className={className}
			variants={containerVariants}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-100px" }}
		>
			{Array.isArray(children)
				? children.map((child, index) => (
						<m.div key={index} variants={itemVariants}>
							{child}
						</m.div>
					))
				: children}
		</m.div>
	);
}

interface StaggerItemProps {
	children: React.ReactNode;
	className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);
	const itemVariants = {
		hidden: {
			opacity: 0,
			y: 30,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring" as const,
				stiffness: 400,
				damping: 25,
				mass: 0.5,
			},
		},
	};

	// Render static version on server-side
	if (!isMounted) {
		return <div className={className}>{children}</div>;
	}

	return (
		<m.div className={className} variants={itemVariants}>
			{children}
		</m.div>
	);
}
