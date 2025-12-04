"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Lazy load the terminal component
const SnapBackTerminalUltimate = dynamic(
	() =>
		import("@ui/components/domain/terminal/snapback-terminal-ultimate").then(
			(mod) => mod.SnapBackTerminalUltimate,
		),
	{
		loading: () => (
			<div className="h-[600px] bg-black/90 rounded-lg animate-pulse flex items-center justify-center">
				<span className="text-green-400">Loading terminal...</span>
			</div>
		),
		ssr: false,
	},
);

export function OptimizedTerminal() {
	const [shouldLoad, setShouldLoad] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		// Check if we're on mobile
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		// Only start animation when in view
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setShouldLoad(true);
				}
			},
			{ rootMargin: "100px" },
		);

		const element = document.getElementById("terminal-container");
		if (element) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<div id="terminal-container" data-testid="terminal-container">
			{shouldLoad && (
				<div
					className={
						isMobile ? "h-[50vh] max-h-[400px] text-xs" : "h-[600px] text-sm"
					}
				>
					<SnapBackTerminalUltimate />
				</div>
			)}
		</div>
	);
}
