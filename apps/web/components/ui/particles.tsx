"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ParticlesProps {
	className?: string;
	quantity?: number;
	color?: string;
}

export function Particles({ className, quantity = 50, color = "#FFF" }: ParticlesProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
			{Array.from({ length: Math.min(quantity, 20) }).map((_, i) => (
				<div
					key={i}
					className="absolute rounded-full opacity-20 animate-pulse"
					style={{
						backgroundColor: color,
						width: Math.random() * 4 + 1 + "px",
						height: Math.random() * 4 + 1 + "px",
						top: Math.random() * 100 + "%",
						left: Math.random() * 100 + "%",
						animationDuration: Math.random() * 5 + 2 + "s",
					}}
				/>
			))}
		</div>
	);
}
