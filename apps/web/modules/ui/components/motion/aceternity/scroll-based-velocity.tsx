"use client";

import {
	motion,
	useAnimationFrame,
	useMotionValue,
	useScroll,
	useSpring,
	useTransform,
	useVelocity,
} from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface VelocityScrollProps {
	children: React.ReactNode;
	baseVelocity?: number;
	className?: string;
}

export const VelocityScroll = ({ children, baseVelocity = 5, className }: VelocityScrollProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const [clones, setClones] = useState<number>(0);

	const { scrollY } = useScroll();
	const velocity = useVelocity(scrollY);
	const smoothVelocity = useSpring(velocity, {
		damping: 50,
		stiffness: 400,
	});
	const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
		clamp: false,
	});

	const x = useMotionValue(0);

	useEffect(() => {
		if (containerRef.current && textRef.current) {
			const containerWidth = containerRef.current.offsetWidth;
			const textWidth = textRef.current.offsetWidth;

			// Calculate how many clones we need
			const neededClones = Math.ceil(containerWidth / textWidth) + 1;
			setClones(neededClones);
		}
	}, []);

	useAnimationFrame((_t, delta) => {
		if (!containerRef.current || !textRef.current) {
			return;
		}

		const moveBy = velocityFactor.get() * baseVelocity * (delta / 1000);
		x.set(x.get() + moveBy);
	});

	return (
		<div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
			<motion.div ref={textRef} className="inline-block" style={{ x }}>
				{children}
			</motion.div>
			{/* Clones for seamless looping */}
			{Array.from({ length: clones }).map((_, i) => (
				<motion.div key={i} className="inline-block" style={{ x }}>
					{children}
				</motion.div>
			))}
		</div>
	);
};
