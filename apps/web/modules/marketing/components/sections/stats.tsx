"use client";
import { m, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function StatsSection() {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const stats = [
		{
			value: 50000,
			label: "Developers protected",
			suffix: "+",
			color: "text-primary",
		},
		{
			value: 2000000,
			label: "Snaps back and counting",
			suffix: "+",
			color: "text-secondary",
		},
		{
			value: 100,
			label: "Recovery time",
			suffix: "ms",
			prefix: "<",
			color: "text-accent",
		},
		{
			value: 12000,
			label: "Saved per incident",
			suffix: "",
			prefix: "$",
			color: "text-warning",
		},
	];

	return (
		<div className="container mx-auto">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">
					Trusted by the community
				</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Real numbers from real developers using SnapBack every day
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
				{stats.map((stat, index) => (
					<StatCard
						key={index}
						stat={stat}
						index={index}
						isMounted={isMounted}
					/>
				))}
			</div>
		</div>
	);
}

const StatCard = ({
	stat,
	index,
	isMounted,
}: {
	stat: any;
	index: number;
	isMounted: boolean;
}) => {
	const [count, setCount] = useState(0);
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true });

	useEffect(() => {
		if (isInView) {
			const timer = setInterval(() => {
				setCount((prev) => {
					const increment = Math.ceil(stat.value / 100);
					const next = prev + increment;
					if (next >= stat.value) {
						clearInterval(timer);
						return stat.value;
					}
					return next;
				});
			}, 30);

			return () => clearInterval(timer);
		}
		return () => {}; // Return empty cleanup function if not in view
	}, [isInView, stat.value]);

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		}
		if (num >= 1000) {
			return `${(num / 1000).toFixed(0)}K`;
		}
		return num.toString();
	};

	return (
		<m.div
			ref={ref}
			className="text-center"
			initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
		>
			<div className={`text-4xl md:text-5xl font-black mb-2 ${stat.color}`}>
				{stat.prefix}
				{formatNumber(count)}
				{stat.suffix}
			</div>
			<div className="text-muted-foreground text-lg">{stat.label}</div>
		</m.div>
	);
};
