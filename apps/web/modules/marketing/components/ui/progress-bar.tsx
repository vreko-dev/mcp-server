"use client";
import { useNProgress } from "@tanem/react-nprogress";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ProgressBar() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		setIsAnimating(true);
		const timer = setTimeout(() => setIsAnimating(false), 500);
		return () => clearTimeout(timer);
	}, [pathname, searchParams]);

	const { animationDuration, isFinished, progress } = useNProgress({
		isAnimating,
	});

	return (
		<>
			<style>{`
				.progress-bar {
					background: linear-gradient(
						90deg,
						transparent,
						hsl(140 100% 50%),
						transparent
					);
					height: 2px;
					left: 0;
					margin-left: ${(-1 + progress) * 100}%;
					position: fixed;
					top: 0;
					transition: margin-left ${animationDuration}ms ease-out;
					width: 100%;
					z-index: 1031;
				}
				.progress-spinner {
					box-shadow: 0 0 10px hsl(140 100% 50%),
						0 0 5px hsl(140 100% 50%);
					display: block;
					height: 100%;
					opacity: 1;
					position: absolute;
					right: 0;
					transform: rotate(3deg) translate(0px, -4px);
					width: 100px;
				}
			`}</style>

			{!isFinished && (
				<div className="progress-bar">
					<div className="progress-spinner" />
				</div>
			)}
		</>
	);
}
