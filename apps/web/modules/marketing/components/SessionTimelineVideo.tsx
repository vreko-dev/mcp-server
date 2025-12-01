"use client";

import { AnalyticsEvents } from "@analytics";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

interface SessionTimelineVideoProps {
	className?: string;
	/** Optional overlay content */
	showOverlay?: boolean;
	/** Background color when video is loading */
	fallbackBg?: string;
}

/**
 * SessionTimelineVideo - Displays the session timeline video with autopause capability
 * Follows the same implementation pattern as the hero video
 */
export function SessionTimelineVideo({
	className = "",
	showOverlay = false,
	fallbackBg = "bg-gradient-to-br from-[#212121] to-[#4A7C59]",
}: SessionTimelineVideoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const videoElement = videoRef.current;
		if (!videoElement) return;

		// Mobile optimization: Pause when out of viewport
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (videoRef.current) {
						// Only play if more than 20% is visible to avoid rapid toggling
						if (entry.isIntersecting) {
							videoRef.current.play().catch(() => {
								// Autoplay might be blocked, handle gracefully
							});
						} else {
							videoRef.current.pause();
						}
					}
				});
			},
			{ threshold: 0.2 }, // Increased threshold for stability
		);

		observer.observe(videoElement);

		return () => {
			// Capture element reference before cleanup to avoid null ref issues
			observer.disconnect();
		};
	}, []);

	const handleVideoLoaded = () => {
		posthog.capture(AnalyticsEvents.DEMO_VIDEO_PLAYED, {
			video_name: "session-timeline",
			autoplay: true,
			timestamp: new Date().toISOString(),
		});
	};

	return (
		<div className={`relative w-full ${className}`}>
			{/* Fallback Gradient for Reduced Motion / Loading */}
			<div className={`absolute inset-0 ${fallbackBg} z-0`} />

			<video
				ref={videoRef}
				autoPlay
				loop
				muted
				playsInline
				preload="auto"
				onCanPlay={handleVideoLoaded}
				className="w-full object-cover motion-reduce:hidden relative z-10"
			>
				<source src="/assets/session-timeline.webm" type="video/webm" />
				<source src="/assets/session-timeline.mp4" type="video/mp4" />
			</video>

			{/* Optional Overlay */}
			{showOverlay && (
				<div
					className="absolute inset-0 z-20"
					style={{
						background:
							"linear-gradient(135deg, rgba(0, 0, 0, 0.45) 0%, rgba(74, 124, 89, 0.35) 100%)",
					}}
				/>
			)}
		</div>
	);
}
