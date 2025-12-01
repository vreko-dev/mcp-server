"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

export default function NumberTicker({
	value,
	direction = "up",
	delay = 0,
	className,
}: {
	value: number;
	direction?: "up" | "down";
	delay?: number;
	className?: string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	const motionValue = useMotionValue(direction === "down" ? value : 0);
	const springValue = useSpring(motionValue, {
		damping: 60,
		stiffness: 100,
	});
	const isInView = useInView(ref, { once: true, margin: "0px" });

	useEffect(() => {
		if (isInView) {
			setTimeout(() => {
				motionValue.set(direction === "down" ? 0 : value);
			}, delay * 1000);
		}
	}, [motionValue, isInView, delay, value, direction]);

	useEffect(() => {
		const unsubscribe = springValue.on("change", (latest) => {
			if (ref.current) {
				ref.current.textContent = Intl.NumberFormat("en-US").format(
					Math.round(latest),
				);
			}
		});

		return () => unsubscribe();
	}, [springValue]);

	return <span className={className} ref={ref} />;
}
