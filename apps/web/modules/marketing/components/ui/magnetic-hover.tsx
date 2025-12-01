"use client";

import { useReducedMotion } from "@ui/lib/motion";
import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface MagneticHoverProps {
	children: React.ReactNode;
	className?: string;
	strength?: number;
	radius?: number;
}

export function MagneticHover({
	children,
	className = "",
	strength = 0.5,
	radius = 30,
}: MagneticHoverProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isHovered, setIsHovered] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!ref.current || reducedMotion) {
			return;
		}

		const rect = ref.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const deltaX = e.clientX - centerX;
		const deltaY = e.clientY - centerY;
		const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

		if (distance < radius) {
			const magnetForce = Math.max(0, 1 - distance / radius);
			setPosition({
				x: deltaX * strength * magnetForce,
				y: deltaY * strength * magnetForce,
			});
		} else {
			setPosition({ x: 0, y: 0 });
		}
	};

	const handleMouseEnter = () => {
		if (!reducedMotion) {
			setIsHovered(true);
		}
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		setPosition({ x: 0, y: 0 });
	};

	// Render static version on server-side or when reduced motion is enabled
	if (!isMounted || reducedMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<m.div
			ref={ref}
			className={className}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			animate={{
				x: position.x,
				y: position.y,
				scale: isHovered ? 1.05 : 1,
			}}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 25,
				mass: 0.5,
			}}
			style={{
				transformOrigin: "center",
			}}
		>
			{children}
		</m.div>
	);
}
