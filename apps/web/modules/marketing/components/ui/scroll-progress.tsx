"use client";
import { m, useScroll, useSpring } from "motion/react";

const ScrollProgress = ({ className }: { className?: string }) => {
	const { scrollYProgress } = useScroll();
	const scaleX = useSpring(scrollYProgress, {
		stiffness: 100,
		damping: 30,
		restDelta: 0.001,
	});

	return (
		<m.div
			className={`fixed top-0 left-0 right-0 z-50 pointer-events-none ${className || ""}`}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 1, duration: 0.5 }}
		>
			<m.div className="h-1 bg-gradient-neon origin-left" style={{ scaleX }} aria-hidden="true" />
			<div
				className="absolute inset-0 bg-gradient-neon opacity-20 blur-sm"
				style={{ transform: `scaleX(${scrollYProgress})` }}
				aria-hidden="true"
			/>
		</m.div>
	);
};

export default ScrollProgress;
