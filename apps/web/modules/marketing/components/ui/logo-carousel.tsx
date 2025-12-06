"use client";
import React, { useCallback, useEffect, useState } from "react";

export const LogoCarousel = ({
	items,
	direction = "left",
	speed = "fast",
	pauseOnHover = true,
	className,
}: {
	items: {
		name: string;
		logo: string;
	}[];
	direction?: "left" | "right";
	speed?: "fast" | "normal" | "slow";
	pauseOnHover?: boolean;
	className?: string;
}) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const scrollerRef = React.useRef<HTMLUListElement>(null);
	const [start, setStart] = useState(false);

	const getDirection = useCallback(() => {
		if (containerRef.current) {
			if (direction === "left") {
				containerRef.current.style.setProperty("--animation-direction", "forwards");
			} else {
				containerRef.current.style.setProperty("--animation-direction", "reverse");
			}
		}
	}, [direction]);

	const getSpeed = useCallback(() => {
		if (containerRef.current) {
			if (speed === "fast") {
				containerRef.current.style.setProperty("--animation-duration", "20s");
			} else if (speed === "normal") {
				containerRef.current.style.setProperty("--animation-duration", "40s");
			} else {
				containerRef.current.style.setProperty("--animation-duration", "80s");
			}
		}
	}, [speed]);

	const addAnimation = useCallback(() => {
		if (containerRef.current && scrollerRef.current) {
			const scrollerContent = Array.from(scrollerRef.current.children);

			for (const item of scrollerContent) {
				const duplicatedItem = item.cloneNode(true);
				if (scrollerRef.current) {
					scrollerRef.current.appendChild(duplicatedItem);
				}
			}

			getDirection();
			getSpeed();
			setStart(true);
		}
	}, [getDirection, getSpeed]);

	useEffect(() => {
		addAnimation();
	}, []);

	return (
		<div
			ref={containerRef}
			className={`scroller relative z-20 w-full overflow-hidden ${className}`}
			style={{
				maskImage: "linear-gradient(to right, transparent, white 20%, white 80%, transparent)",
			}}
		>
			<ul
				ref={scrollerRef}
				className={`flex min-w-full shrink-0 gap-8 py-4 w-max flex-nowrap ${
					start ? "animate-scroll" : ""
				} ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
			>
				{items.map((item) => (
					<li
						className="w-[120px] flex-shrink-0 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
						key={item.name}
					>
						<div className="text-muted-foreground font-medium text-lg">{item.name}</div>
					</li>
				))}
			</ul>
		</div>
	);
};
