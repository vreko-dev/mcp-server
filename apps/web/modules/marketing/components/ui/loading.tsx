"use client";

import React from "react";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-8 h-8",
		lg: "w-12 h-12",
	};

	return (
		<div
			className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]} ${className}`}
			role="status"
			aria-label="Loading"
			style={{
				// Optimize for GPU acceleration
				transform: "translateZ(0)",
				// Prevent layout shift
				contain: "layout",
			}}
		>
			<span className="sr-only">Loading...</span>
		</div>
	);
}

interface SkeletonProps {
	className?: string;
	lines?: number;
	animate?: boolean;
}

export function Skeleton({ className = "", lines = 1, animate = true }: SkeletonProps) {
	return (
		<div className={className}>
			{Array.from({ length: lines }, (_, i) => (
				<div
					key={i}
					className={`bg-muted/20 rounded h-4 mb-2 last:mb-0 ${animate ? "animate-pulse" : ""}`}
					style={{
						// Prevent layout shift with consistent dimensions
						width: i === lines - 1 ? "60%" : "100%",
						// Optimize for GPU
						transform: "translateZ(0)",
					}}
				/>
			))}
		</div>
	);
}

interface LazyLoadWrapperProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
	className?: string;
	threshold?: number;
}

export function LazyLoadWrapper({ children, fallback, className = "", threshold = 0.1 }: LazyLoadWrapperProps) {
	const [isVisible, setIsVisible] = React.useState(false);
	const [isLoaded, setIsLoaded] = React.useState(false);
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry?.isIntersecting) {
					setIsVisible(true);
					// Small delay to prevent layout thrashing
					setTimeout(() => setIsLoaded(true), 50);
				}
			},
			{ threshold, rootMargin: "50px" },
		);

		if (ref.current) {
			observer.observe(ref.current);
		}

		return () => observer.disconnect();
	}, [threshold]);

	return (
		<div ref={ref} className={className}>
			{isVisible ? (
				isLoaded ? (
					children
				) : (
					fallback || <Skeleton lines={3} />
				)
			) : (
				<div style={{ minHeight: "100px" }} /> // Reserve space
			)}
		</div>
	);
}

// Component for preventing layout shifts during image loading
interface ImagePlaceholderProps {
	width: number;
	height: number;
	className?: string;
	alt?: string;
}

export function ImagePlaceholder({ width, height, className = "", alt = "Loading image" }: ImagePlaceholderProps) {
	return (
		<div
			className={`bg-muted/10 flex items-center justify-center ${className}`}
			style={{
				width,
				height,
				aspectRatio: `${width}/${height}`,
			}}
			role="img"
			aria-label={alt}
		>
			<LoadingSpinner size="sm" />
		</div>
	);
}

// Hero section specific loading placeholder to prevent CLS
export function HeroPlaceholder() {
	return (
		<section
			className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero"
			style={{
				// Ensure consistent dimensions
				minHeight: "100vh",
			}}
		>
			<div className="container relative z-10 px-4">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
					{/* Content Side */}
					<div className="text-center lg:text-left">
						<Skeleton className="mb-6" lines={3} />
						<Skeleton className="mb-8" lines={2} />
						<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
							<div className="bg-muted/10 h-14 w-48 rounded-xl" />
							<div className="bg-muted/10 h-14 w-36 rounded-xl" />
						</div>
						<Skeleton lines={1} />
					</div>

					{/* Visual Side */}
					<div className="flex justify-center lg:justify-end">
						<ImagePlaceholder
							width={256}
							height={256}
							className="rounded-full"
							alt="SnapBack logo loading"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
