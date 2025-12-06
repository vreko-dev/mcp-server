"use client";

// import { useMobileOptimization } from "@marketing/hooks/use-mobile-optimization"; // TODO: Re-enable when mobile optimization is implemented
import { cn } from "@marketing/lib/utils";
import { forwardRef, type ReactNode } from "react";

interface MobileOptimizedProps {
	children: ReactNode;
	className?: string;
	mobileClassName?: string;
	tabletClassName?: string;
	desktopClassName?: string;
	// Performance options
	reduceAnimationsOnMobile?: boolean;
	lazyLoadImages?: boolean;
	// Touch-specific styling
	touchTargetSize?: "small" | "medium" | "large";
}

/**
 * Mobile-optimized wrapper component that applies responsive styles
 * and performance optimizations based on device characteristics
 */
export const MobileOptimized = forwardRef<HTMLDivElement, MobileOptimizedProps>(
	(
		{
			children,
			className,
			mobileClassName,
			tabletClassName,
			desktopClassName,
			reduceAnimationsOnMobile = true,
			lazyLoadImages = true,
			touchTargetSize = "medium",
			...props
		},
		ref,
	) => {
		// const mobileOptimization = useMobileOptimization(); // TODO: Re-enable when mobile optimization is implemented
		// const {
		// 	isMobile,
		// 	isTablet,
		// 	isDesktop,
		// 	isTouchDevice,
		// 	prefersReducedMotion,
		// 	shouldReduceAnimations,
		// 	isHighDPI,
		// } = mobileOptimization;

		// Build responsive classes - include all classes to prevent hydration mismatches
		const responsiveClasses = cn(
			className,
			// isMobile && mobileClassName, // TODO: Re-enable when mobile-specific styling is implemented
			// isTablet && tabletClassName, // TODO: Re-enable when tablet-specific styling is implemented
			// isDesktop && desktopClassName, // TODO: Re-enable when desktop-specific styling is implemented
			"touch-manipulation", // Always include touch classes
			// touchTargetSize === "small" && "touch-target-sm", // TODO: Re-enable when touch target sizing is implemented
			// touchTargetSize === "medium" && "touch-target-md", // TODO: Re-enable when touch target sizing is implemented
			// touchTargetSize === "large" && "touch-target-lg", // TODO: Re-enable when touch target sizing is implemented
			"motion-reduce", // Always include animation classes
			"high-dpi", // Always include high DPI class
		);

		// Performance attributes - only add data attributes that don't cause mismatches
		const performanceProps = {
			...props,
			...(lazyLoadImages && { "data-lazy-images": "true" }),
		};

		return (
			<div ref={ref} className={responsiveClasses} {...performanceProps}>
				{children}
			</div>
		);
	},
);

MobileOptimized.displayName = "MobileOptimized";

// Utility components for common patterns
export const MobileStack = forwardRef<HTMLDivElement, Omit<MobileOptimizedProps, "children"> & { children: ReactNode }>(
	({ children, className, ...props }, ref) => (
		<MobileOptimized
			ref={ref}
			className={cn("flex flex-col", className)}
			mobileClassName="gap-4"
			tabletClassName="gap-6"
			desktopClassName="gap-8"
			{...props}
		>
			{children}
		</MobileOptimized>
	),
);

MobileStack.displayName = "MobileStack";

export const MobileGrid = forwardRef<HTMLDivElement, Omit<MobileOptimizedProps, "children"> & { children: ReactNode }>(
	({ children, className, ...props }, ref) => (
		<MobileOptimized
			ref={ref}
			className={cn("grid", className)}
			mobileClassName="grid-cols-1 gap-4"
			tabletClassName="grid-cols-2 gap-6"
			desktopClassName="grid-cols-3 gap-8"
			{...props}
		>
			{children}
		</MobileOptimized>
	),
);

MobileGrid.displayName = "MobileGrid";
