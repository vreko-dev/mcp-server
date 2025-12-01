"use client";

import { cn } from "@ui/lib";

export function Logo({
	withLabel = true,
	className,
	wordmark = false,
	wordmarkSize = "normal", // "normal" | "large"
}: {
	className?: string;
	withLabel?: boolean;
	wordmark?: boolean;
	wordmarkSize?: "normal" | "large";
}) {
	if (wordmark) {
		const sizeClasses = wordmarkSize === "large" ? "h-12 w-auto" : "h-8 w-auto";

		const width = wordmarkSize === "large" ? 180 : 120;
		const height = wordmarkSize === "large" ? 48 : 32;

		return (
			<div className={cn("nav-brand flex items-center", className)}>
				<img
					src="/images/logos/snapback-wordmark.svg"
					alt="SnapBack"
					className={`nav-logo ${sizeClasses}`}
					width={width}
					height={height}
				/>
			</div>
		);
	}

	return (
		<div className={cn("nav-brand flex items-center gap-3", className)}>
			<img
				src="/images/logos/snapback-logo.svg"
				alt="SnapBack"
				className="nav-logo h-8 w-8"
				width={32}
				height={32}
			/>
			{withLabel && <span className="nav-text">SnapBack</span>}
		</div>
	);
}
