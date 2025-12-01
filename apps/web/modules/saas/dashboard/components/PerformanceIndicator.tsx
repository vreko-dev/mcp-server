"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function PerformanceIndicator() {
	const [fps, setFps] = useState<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		let frameCount = 0;
		let lastTime = performance.now();

		const loop = () => {
			const now = performance.now();
			frameCount++;

			if (now - lastTime >= 1000) {
				const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
				setFps(currentFps);
				frameCount = 0;
				lastTime = now;
			}

			requestAnimationFrame(loop);
		};

		requestAnimationFrame(loop);

		return () => {
			// Cleanup if needed
		};
	}, []);

	if (fps === null) {
		return null;
	}

	const isGoodPerformance = fps >= 55;
	const isModeratePerformance = fps >= 30 && fps < 55;

	return (
		<Card className="border-[var(--snapback-border)] bg-[var(--snapback-surface)]">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium flex items-center gap-2">
					<Zap className="h-4 w-4 text-[var(--snapback-green)]" />
					Performance
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold text-white">
					{fps}{" "}
					<span className="text-sm font-normal text-neutral-400">FPS</span>
				</div>
				<p
					className={`text-xs ${
						isGoodPerformance
							? "text-green-400"
							: isModeratePerformance
								? "text-yellow-400"
								: "text-red-400"
					}`}
				>
					{isGoodPerformance
						? "Excellent"
						: isModeratePerformance
							? "Good"
							: "Needs improvement"}
				</p>
			</CardContent>
		</Card>
	);
}
