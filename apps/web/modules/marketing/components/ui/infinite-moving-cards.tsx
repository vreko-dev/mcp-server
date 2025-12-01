"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
	items,
	direction = "left",
	speed = "fast",
	pauseOnHover = true,
	className,
}: {
	items: {
		name: string;
		title: string;
	}[];
	direction?: "left" | "right";
	speed?: "fast" | "normal" | "slow";
	pauseOnHover?: boolean;
	className?: string;
}) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const scrollerRef = React.useRef<HTMLUListElement>(null);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		if (!reducedMotion) {
			addAnimation();
		}
	}, [reducedMotion]);

	const [start, setStart] = useState(false);

	function addAnimation() {
		if (containerRef.current && scrollerRef.current) {
			const scrollerContent = Array.from(scrollerRef.current.children);

			scrollerContent.forEach((item) => {
				const duplicatedItem = item.cloneNode(true);
				if (scrollerRef.current) {
					scrollerRef.current.appendChild(duplicatedItem);
				}
			});

			getDirection();
			getSpeed();
			setStart(true);
		}
	}

	const getDirection = () => {
		if (containerRef.current) {
			if (direction === "left") {
				containerRef.current.style.setProperty(
					"--animation-direction",
					"forwards",
				);
			} else {
				containerRef.current.style.setProperty(
					"--animation-direction",
					"reverse",
				);
			}
		}
	};

	const getSpeed = () => {
		if (containerRef.current) {
			if (speed === "fast") {
				containerRef.current.style.setProperty("--animation-duration", "20s");
			} else if (speed === "normal") {
				containerRef.current.style.setProperty("--animation-duration", "40s");
			} else {
				containerRef.current.style.setProperty("--animation-duration", "80s");
			}
		}
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				"scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
				className,
			)}
		>
			<ul
				ref={scrollerRef}
				className={cn(
					"flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4",
					start && !reducedMotion && "animate-scroll",
					pauseOnHover && "hover:[animation-play-state:paused]",
				)}
			>
				{items.map((item, idx) => (
					<li
						className="relative w-[300px] max-w-full shrink-0 rounded-xl border border-white/10 bg-snapback-dark px-6 py-4 text-left md:w-[350px] transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg hover:-translate-y-2"
						key={`${item.name}-${idx}`}
						style={{
							transform: "perspective(1000px) rotateX(0deg)",
						}}
						onMouseEnter={(e) => {
							if (!reducedMotion) {
								e.currentTarget.style.transform =
									"perspective(1000px) rotateX(-5deg) translateY(-5px)";
							}
						}}
						onMouseLeave={(e) => {
							if (!reducedMotion) {
								e.currentTarget.style.transform =
									"perspective(1000px) rotateX(0deg) translateY(0px)";
							}
						}}
					>
						<blockquote>
							<div
								aria-hidden="true"
								className="user-select-none pointer-events-none absolute -top-0.5 -left-0.5 -z-1 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
							/>
							<span className="relative z-20 text-sm font-medium text-white">
								"{item.name}"
							</span>
							<div className="relative z-20 mt-4 flex flex-row items-center justify-start">
								<span className="flex flex-col">
									<span className="text-xs font-normal text-white/70">
										{item.title}
									</span>
								</span>
							</div>
						</blockquote>
					</li>
				))}
			</ul>
		</div>
	);
};
